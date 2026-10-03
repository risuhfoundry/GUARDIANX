// ============================================================================
// GUARDIAN X — Gate Controller Firmware  (VERIFICATION MODE)
// Build   : pio run -e verify -t upload
// Target  : ESP32-S3-DevKitC-1 (Arduino / PlatformIO)
// Display : 2.42" SSD1309 128x64 OLED — 4-wire HW SPI (U8g2, full buffer)
// Sensor  : DFRobot SEN0677 palm-vein / face module — UART 115200 8N1
//
// SEN0677 binary protocol (from DFRobot_AI10 library source):
//   Frame   : EF AA | MsgID | LenH LenL | Payload[Len] | XOR(MsgID..Payload)
//   Host -> : RESET 0x10 (len 0), VERIFY 0x12 (len 2: [continuous, timeout_s])
//   <- Host : REPLY 0x00 -> [cmdMid, result, data...]
//             NOTE  0x01 -> [nid, ...]  (progress / detection events)
//   VERIFY success data: [uidH, uidL, name[32], admin, ...]
//   UIDs 1..1000 = faces, UIDs > 1000 = palms.
// ============================================================================

#include <Arduino.h>
#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>

// ── Network / Backend Configuration ─────────────────────────────────────────
#define WIFI_SSID        "(>_<)"
#define WIFI_PASSWORD    "rishi@2312"
#define API_BASE_URL     "https://your-guardianx-app.vercel.app"
#define API_VERIFY_PATH  "/api/gate/verify"
#define DEVICE_ID        "GATE_01"
#define API_KEY_HEADER   "X-API-Key"
// Real key is injected at build time (see platformio.ini). Never commit it.
#ifndef DEVICE_API_KEY
#define DEVICE_API_KEY   ""
#endif

// ── OLED Pins (SSD1309, 4-wire HW SPI) ──────────────────────────────────────
#define OLED_SCK   12   // Display "SCL"/"CLK"
#define OLED_MOSI  11   // Display "SDA"/"DIN"
#define OLED_CS    10
#define OLED_DC     9
#define OLED_RST    8

// ── Sensor UART Pins (SEN0677) ──────────────────────────────────────────────
#define SENSOR_SERIAL   Serial1
#define SENSOR_BAUD     115200
#define SENSOR_RX_PIN   16   // ESP32 RX <- Sensor TX
#define SENSOR_TX_PIN   17   // ESP32 TX -> Sensor RX
#define SENSOR_RX_PIN    4   // ESP32 RX <- Sensor TX
#define SENSOR_TX_PIN    5   // ESP32 TX -> Sensor RX

// ── Timing ──────────────────────────────────────────────────────────────────
constexpr uint32_t WIFI_RETRY_INTERVAL_MS  = 5000;
constexpr uint32_t RESULT_HOLD_TIME_MS     = 4000;
constexpr uint8_t  VERIFY_TIMEOUT_S        = 20;    // Per recognition attempt
constexpr uint32_t SENSOR_RESET_TIMEOUT_MS = 1000;  // Wait for RESET reply
constexpr uint32_t SENSOR_REPLY_GRACE_MS   = 3000;  // Extra wait past timeout
constexpr uint32_t HTTP_CONNECT_TIMEOUT_MS = 5000;
constexpr uint32_t HTTP_TIMEOUT_MS         = 8000;

// ============================================================================
//  SEN0677 Protocol Layer
// ============================================================================
namespace sen {

constexpr uint8_t SYNC_HIGH = 0xEF;
constexpr uint8_t SYNC_LOW  = 0xAA;

constexpr uint8_t MID_REPLY  = 0x00;
constexpr uint8_t MID_NOTE   = 0x01;
constexpr uint8_t MID_RESET  = 0x10;
constexpr uint8_t MID_VERIFY = 0x12;

constexpr uint8_t NID_READY  = 0x00;  // Module boot/ready note — not activity

constexpr uint8_t RESULT_SUCCESS      = 0;
constexpr uint8_t RESULT_UNKNOWN_USER = 8;
constexpr uint8_t RESULT_TIMEOUT      = 13;

constexpr uint16_t PALM_UID_MIN = 1001;

constexpr size_t   MAX_PAYLOAD            = 300;
constexpr uint32_t INTERBYTE_TIMEOUT_MS   = 100;

struct Frame {
  uint8_t  msgId;
  uint16_t len;
  uint8_t  data[MAX_PAYLOAD];
};

// Byte-at-a-time frame parser — never blocks.
class Parser {
 public:
  // Returns true when a complete, checksum-valid frame has been received.
  bool feed(uint8_t b, uint32_t now) {
    // Drop a half-received frame if the line went quiet mid-packet.
    if (phase_ != Phase::WAIT_SYNC_HIGH &&
        now - lastByteAt_ > INTERBYTE_TIMEOUT_MS) {
      phase_ = Phase::WAIT_SYNC_HIGH;
    }
    lastByteAt_ = now;

    switch (phase_) {
      case Phase::WAIT_SYNC_HIGH:
        if (b == SYNC_HIGH) phase_ = Phase::WAIT_SYNC_LOW;
        break;

      case Phase::WAIT_SYNC_LOW:
        if (b == SYNC_LOW)       phase_ = Phase::MSG_ID;
        else if (b != SYNC_HIGH) phase_ = Phase::WAIT_SYNC_HIGH;
        break;

      case Phase::MSG_ID:
        frame_.msgId = b;
        checksum_    = b;
        phase_       = Phase::LEN_HIGH;
        break;

      case Phase::LEN_HIGH:
        frame_.len = static_cast<uint16_t>(b) << 8;
        checksum_ ^= b;
        phase_     = Phase::LEN_LOW;
        break;

      case Phase::LEN_LOW:
        frame_.len |= b;
        checksum_  ^= b;
        index_      = 0;
        if (frame_.len > MAX_PAYLOAD) {
          phase_ = Phase::WAIT_SYNC_HIGH;  // Oversized / corrupt — resync
        } else {
          phase_ = (frame_.len == 0) ? Phase::CHECKSUM : Phase::PAYLOAD;
        }
        break;

      case Phase::PAYLOAD:
        frame_.data[index_++] = b;
        checksum_ ^= b;
        if (index_ >= frame_.len) phase_ = Phase::CHECKSUM;
        break;

      case Phase::CHECKSUM:
        phase_ = Phase::WAIT_SYNC_HIGH;
        return b == checksum_;
    }
    return false;
  }

  const Frame& frame() const { return frame_; }

 private:
  enum class Phase : uint8_t {
    WAIT_SYNC_HIGH, WAIT_SYNC_LOW, MSG_ID, LEN_HIGH, LEN_LOW, PAYLOAD, CHECKSUM
  };

  Phase    phase_      = Phase::WAIT_SYNC_HIGH;
  Frame    frame_      = {};
  uint16_t index_      = 0;
  uint8_t  checksum_   = 0;
  uint32_t lastByteAt_ = 0;
};

void send(HardwareSerial& port, uint8_t msgId,
          const uint8_t* payload, uint16_t len) {
  const uint8_t header[5] = {
      SYNC_HIGH, SYNC_LOW, msgId,
      static_cast<uint8_t>(len >> 8), static_cast<uint8_t>(len & 0xFF)};

  uint8_t checksum = header[2] ^ header[3] ^ header[4];
  for (uint16_t i = 0; i < len; ++i) checksum ^= payload[i];

  port.write(header, sizeof(header));
  if (len > 0) port.write(payload, len);
  port.write(checksum);
}

}  // namespace sen

// ============================================================================
//  Hardware Objects
// ============================================================================
U8G2_SSD1309_128X64_NONAME0_F_4W_HW_SPI u8g2(
    U8G2_R0, OLED_CS, OLED_DC, OLED_RST);

static sen::Parser sensorParser;

// ============================================================================
//  Application FSM
// ============================================================================
enum SystemState {
  STATE_WIFI_CONNECTING,
  STATE_READY,
  STATE_SCANNING,
  STATE_AWAITING_API,
  STATE_SHOW_RESULT
};

enum ResultType {
  RESULT_VERIFIED,
  RESULT_NOT_REGISTERED,
  RESULT_AUTH_FAILED,
  RESULT_ERROR
};

static SystemState currentState   = STATE_WIFI_CONNECTING;
static ResultType  lastResult     = RESULT_ERROR;
static bool        displayDirty   = true;
static uint32_t    stateEnteredAt = 0;
static uint32_t    lastWifiAttemptAt = 0;

static uint16_t detectedPalmId = 0;
static String   studentName;
static String   className;

// ── Sensor link sub-state (independent of the UI FSM) ───────────────────────
enum class SensorPhase { IDLE, RESETTING, VERIFYING };
static SensorPhase sensorPhase   = SensorPhase::IDLE;
static uint32_t    sensorPhaseAt = 0;

enum class SensorEventType {
  NONE,
  ACTIVITY,       // Sensor reports something in view (palm being analysed)
  RECOGNIZED,     // Palm matched an enrolled template -> palmId valid
  UNKNOWN_PALM,   // Palm seen but not in the sensor's template database
  ATTEMPT_ENDED   // Attempt timed out / failed — sensor already re-armed
};

struct SensorEvent {
  SensorEventType type;
  uint16_t        palmId;
};

// ============================================================================
//  State Transitions
// ============================================================================
static const char* stateName(SystemState s) {
  switch (s) {
    case STATE_WIFI_CONNECTING: return "WIFI_CONNECTING";
    case STATE_READY:           return "READY";
    case STATE_SCANNING:        return "SCANNING";
    case STATE_AWAITING_API:    return "AWAITING_API";
    case STATE_SHOW_RESULT:     return "SHOW_RESULT";
  }
  return "?";
}

void enterState(SystemState next) {
  currentState   = next;
  stateEnteredAt = millis();
  displayDirty   = true;
  Serial.printf("[FSM] -> %s\n", stateName(next));
}

// ============================================================================
//  Display Rendering (clearBuffer -> draw -> sendBuffer, only when dirty)
// ============================================================================
static void drawCentered(const char* text, int y) {
  const int w = u8g2.getStrWidth(text);
  u8g2.drawStr(w < 128 ? (128 - w) / 2 : 0, y, text);
}

void renderDisplay() {
  if (!displayDirty) return;
  displayDirty = false;

  char line[24];
  u8g2.clearBuffer();

  switch (currentState) {
    case STATE_WIFI_CONNECTING:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("GUARDIAN X", 20);
      u8g2.setFont(u8g2_font_6x10_tf);
      drawCentered("Connecting to", 40);
      drawCentered("Wi-Fi...", 52);
      break;

    case STATE_READY:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("GUARDIAN X", 16);
      drawCentered("READY", 34);
      u8g2.setFont(u8g2_font_6x10_tf);
      drawCentered("Place your palm", 50);
      drawCentered("over the sensor", 62);
      break;

    case STATE_SCANNING:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("SCANNING...", 30);
      u8g2.setFont(u8g2_font_6x10_tf);
      drawCentered("Hold palm still", 50);
      break;

    case STATE_AWAITING_API:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("VERIFYING...", 30);
      u8g2.setFont(u8g2_font_6x10_tf);
      snprintf(line, sizeof(line), "Palm ID: %u", detectedPalmId);
      drawCentered(line, 50);
      break;

    case STATE_SHOW_RESULT:
      if (lastResult == RESULT_VERIFIED) {
        u8g2.setFont(u8g2_font_7x14B_tf);
        drawCentered("GUARDIAN VERIFIED", 14);
        u8g2.setFont(u8g2_font_6x10_tf);
        drawCentered(studentName.c_str(), 32);
        drawCentered(className.c_str(), 46);
        drawCentered("Dismissal Requested", 62);
      } else if (lastResult == RESULT_NOT_REGISTERED) {
        u8g2.setFont(u8g2_font_7x14B_tf);
        drawCentered("NOT REGISTERED", 28);
        u8g2.setFont(u8g2_font_6x10_tf);
        drawCentered("Contact Reception", 48);
      } else if (lastResult == RESULT_AUTH_FAILED) {
        u8g2.setFont(u8g2_font_7x14B_tf);
        drawCentered("AUTH FAILED", 28);
        u8g2.setFont(u8g2_font_6x10_tf);
        drawCentered("Device not authorized", 48);
      } else {
        u8g2.setFont(u8g2_font_7x14B_tf);
        drawCentered("SERVER ERROR", 28);
        u8g2.setFont(u8g2_font_6x10_tf);
        drawCentered("Please try again", 48);
      }
      break;
  }

  u8g2.sendBuffer();
}

// ============================================================================
//  Sensor Control
// ============================================================================
static void sensorSendVerify() {
  const uint8_t payload[2] = {
      0x00,              // 0 = single-shot recognition
      VERIFY_TIMEOUT_S   // seconds the module keeps looking
  };
  sen::send(SENSOR_SERIAL, sen::MID_VERIFY, payload, sizeof(payload));
  sensorPhase   = SensorPhase::VERIFYING;
  sensorPhaseAt = millis();
}

// Abort whatever the module is doing, then start a fresh recognition attempt
// once the RESET reply arrives (handled in readPalmSensor()).
void armSensor() {
  sen::send(SENSOR_SERIAL, sen::MID_RESET, nullptr, 0);
  sensorPhase   = SensorPhase::RESETTING;
  sensorPhaseAt = millis();
}

// Abort the current attempt and stay idle.
void disarmSensor() {
  sen::send(SENSOR_SERIAL, sen::MID_RESET, nullptr, 0);
  sensorPhase = SensorPhase::IDLE;
}

// ============================================================================
//  Non-Blocking SEN0677 Reader
// ============================================================================
//  Drains Serial1, parses frames and converts them into a single event.
//  Ended / failed attempts are re-armed here so the caller only deals with
//  UI-level outcomes.
SensorEvent readPalmSensor() {
  const uint32_t now = millis();
  SensorEvent event = {SensorEventType::NONE, 0};

  // Watchdogs for lost replies.
  if (sensorPhase == SensorPhase::RESETTING &&
      now - sensorPhaseAt >= SENSOR_RESET_TIMEOUT_MS) {
    Serial.println("[SENSOR] No RESET reply — sending VERIFY anyway");
    sensorSendVerify();
  } else if (sensorPhase == SensorPhase::VERIFYING &&
             now - sensorPhaseAt >=
                 VERIFY_TIMEOUT_S * 1000UL + SENSOR_REPLY_GRACE_MS) {
    Serial.println("[SENSOR] VERIFY reply overdue — re-arming");
    armSensor();
    return {SensorEventType::ATTEMPT_ENDED, 0};
  }

  while (SENSOR_SERIAL.available() > 0) {
    const uint8_t byteIn = static_cast<uint8_t>(SENSOR_SERIAL.read());
    if (!sensorParser.feed(byteIn, now)) continue;

    const sen::Frame& f = sensorParser.frame();

    // ── NOTE frames: detection progress ─────────────────────────────────
    if (f.msgId == sen::MID_NOTE) {
      if (sensorPhase == SensorPhase::VERIFYING && f.len >= 1 &&
          f.data[0] != sen::NID_READY) {
        event.type = SensorEventType::ACTIVITY;
      }
      continue;
    }

    if (f.msgId != sen::MID_REPLY || f.len < 2) continue;

    const uint8_t replyMid = f.data[0];
    const uint8_t result   = f.data[1];

    // ── RESET acknowledged -> start recognition ─────────────────────────
    if (replyMid == sen::MID_RESET) {
      if (sensorPhase == SensorPhase::RESETTING) sensorSendVerify();
      continue;
    }

    if (replyMid != sen::MID_VERIFY || sensorPhase != SensorPhase::VERIFYING) {
      continue;
    }

    // ── VERIFY result ───────────────────────────────────────────────────
    if (result == sen::RESULT_SUCCESS && f.len >= 4) {
      const uint16_t uid = (static_cast<uint16_t>(f.data[2]) << 8) | f.data[3];
      if (uid >= sen::PALM_UID_MIN) {
        Serial.printf("[SENSOR] Palm recognised — ID %u\n", uid);
        sensorPhase = SensorPhase::IDLE;
        return {SensorEventType::RECOGNIZED, uid};
      }
      Serial.printf("[SENSOR] Face ID %u ignored (palm-only gate)\n", uid);
      armSensor();
      return {SensorEventType::ATTEMPT_ENDED, 0};
    }

    if (result == sen::RESULT_UNKNOWN_USER) {
      Serial.println("[SENSOR] Palm not in sensor database");
      sensorPhase = SensorPhase::IDLE;
      return {SensorEventType::UNKNOWN_PALM, 0};
    }

    if (result != sen::RESULT_TIMEOUT) {
      Serial.printf("[SENSOR] VERIFY failed, result code %u\n", result);
    }
    armSensor();
    return {SensorEventType::ATTEMPT_ENDED, 0};
  }

  return event;
}

// ============================================================================
//  HTTPS API Call  (blocking — the OLED already shows "VERIFYING...")
// ============================================================================
ResultType verifyPalmWithApi(uint16_t palmId) {
  if (DEVICE_API_KEY[0] == '\0') {
    Serial.println("[API] Device API key not configured — refusing verify");
    return RESULT_AUTH_FAILED;
  }

  WiFiClientSecure client;
  client.setInsecure();  // TODO: replace with setCACert() for production

  HTTPClient http;
  http.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);

  if (!http.begin(client, API_BASE_URL API_VERIFY_PATH)) {
    Serial.println("[API] http.begin() failed");
    return RESULT_ERROR;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader(API_KEY_HEADER, DEVICE_API_KEY);

  // {"device_id":"GATE_01","palm_id":1003} — key is a header, not the body
  JsonDocument request;
  request["device_id"] = DEVICE_ID;
  request["palm_id"]   = palmId;

  String requestBody;
  serializeJson(request, requestBody);
  Serial.printf("[API] POST %s %s\n", API_BASE_URL API_VERIFY_PATH,
                requestBody.c_str());

  const int httpCode = http.POST(requestBody);
  if (httpCode <= 0) {
    Serial.printf("[API] Request failed: %s\n",
                  http.errorToString(httpCode).c_str());
    http.end();
    return RESULT_ERROR;
  }

  const String responseBody = http.getString();
  http.end();
  Serial.printf("[API] HTTP %d %s\n", httpCode, responseBody.c_str());

  if (httpCode == 401 || httpCode == 403) {
    Serial.printf("[API] Device authentication failed (HTTP %d)\n", httpCode);
    return RESULT_AUTH_FAILED;
  }

  JsonDocument response;
  const DeserializationError err = deserializeJson(response, responseBody);
  if (err) {
    Serial.printf("[API] JSON parse error: %s\n", err.c_str());
    return RESULT_ERROR;
  }

  const char* status = response["status"] | "";
  if (strcmp(status, "VERIFIED") == 0) {
    studentName = response["student_name"] | "Unknown Student";
    className   = response["class_name"]   | "Unknown Class";
    return RESULT_VERIFIED;
  }

  if (httpCode >= 500) return RESULT_ERROR;
  return RESULT_NOT_REGISTERED;
}

// ============================================================================
//  Wi-Fi Helper
// ============================================================================
void beginWifiConnection() {
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttemptAt = millis();
  Serial.printf("[WIFI] Connecting to \"%s\"...\n", WIFI_SSID);
}

// ============================================================================
//  setup()
// ============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n===== GUARDIAN X — Verification Mode =====");

  // Sensor UART. Larger RX buffer so frames survive the blocking HTTPS call.
  SENSOR_SERIAL.setRxBufferSize(1024);
  SENSOR_SERIAL.begin(SENSOR_BAUD, SERIAL_8N1, SENSOR_RX_PIN, SENSOR_TX_PIN);
  disarmSensor();

  // Bind the HW SPI bus to our pins before U8g2 calls SPI.begin() itself.
  SPI.begin(OLED_SCK, -1, OLED_MOSI, OLED_CS);
  u8g2.begin();
  u8g2.setContrast(255);

  WiFi.mode(WIFI_STA);
  enterState(STATE_WIFI_CONNECTING);
  renderDisplay();
  beginWifiConnection();
}

// ============================================================================
//  loop()  —  Non-blocking FSM (no delay() anywhere)
// ============================================================================
void loop() {
  const uint32_t now = millis();

  // ── Wi-Fi watchdog ────────────────────────────────────────────────────
  if (currentState != STATE_WIFI_CONNECTING && WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Connection lost");
    disarmSensor();
    enterState(STATE_WIFI_CONNECTING);
    beginWifiConnection();
  }

  // Always drain the sensor UART so stale frames never pile up.
  const SensorEvent ev = readPalmSensor();

  switch (currentState) {
    case STATE_WIFI_CONNECTING:
      if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[WIFI] Connected — IP %s\n",
                      WiFi.localIP().toString().c_str());
        enterState(STATE_READY);
        armSensor();
      } else if (now - lastWifiAttemptAt >= WIFI_RETRY_INTERVAL_MS) {
        beginWifiConnection();
      }
      break;

    case STATE_READY:
    case STATE_SCANNING:
      switch (ev.type) {
        case SensorEventType::ACTIVITY:
          if (currentState == STATE_READY) enterState(STATE_SCANNING);
          break;
        case SensorEventType::RECOGNIZED:
          detectedPalmId = ev.palmId;
          enterState(STATE_AWAITING_API);
          break;
        case SensorEventType::UNKNOWN_PALM:
          lastResult = RESULT_NOT_REGISTERED;
          enterState(STATE_SHOW_RESULT);
          break;
        case SensorEventType::ATTEMPT_ENDED:
          if (currentState == STATE_SCANNING) enterState(STATE_READY);
          break;
        case SensorEventType::NONE:
          break;
      }
      break;

    case STATE_AWAITING_API:
      renderDisplay();  // Make sure "VERIFYING..." is on screen first
      lastResult = verifyPalmWithApi(detectedPalmId);
      enterState(STATE_SHOW_RESULT);
      break;

    case STATE_SHOW_RESULT:
      if (now - stateEnteredAt >= RESULT_HOLD_TIME_MS) {
        enterState(STATE_READY);
        armSensor();
      }
      break;
  }

  renderDisplay();
}