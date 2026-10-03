// ============================================================================
// GUARDIAN X — Gate Controller Firmware  (ENROLLMENT MODE)
// Build   : pio run -e enroll -t upload
// Target  : ESP32-S3-DevKitC-1 (Arduino / PlatformIO)
// Display : 2.42" SSD1309 128x64 OLED — 4-wire HW SPI (U8g2, full buffer)
// Sensor  : DFRobot SEN0677 palm-vein / face module — UART 115200 8N1
//
// Flow: press the Admin Button -> place palm -> sensor stores the template
//       and returns its local UID -> UID shown on OLED + Serial so it can be
//       linked to the parent's record in Supabase.
//
// SEN0677 binary protocol (from DFRobot_AI10 library source):
//   Frame   : EF AA | MsgID | LenH LenL | Payload[Len] | XOR(MsgID..Payload)
//   Host -> : RESET 0x10 (len 0)
//             ENROLL_SINGLE 0x1D (len 35: admin, name[32], faceDir, timeout_s)
//             DEL_USER 0x20 (len 2: uidH, uidL)
//   <- Host : REPLY 0x00 -> [cmdMid, result, data...]
//             NOTE  0x01 -> [nid, ...]
//   ENROLL success data: [uidH, uidL, ...]. UIDs > 1000 = palms.
//   ENROLL result 10 (already enrolled): same bytes carry the EXISTING UID.
// ============================================================================

#include <Arduino.h>
#include <SPI.h>
#include <U8g2lib.h>

// ── Admin Button ────────────────────────────────────────────────────────────
#define ADMIN_BUTTON_PIN     0     // BOOT button on ESP32-S3-DevKitC-1
#define ADMIN_BUTTON_ACTIVE  LOW   // Pressed = pulled to GND

// ── OLED Pins (SSD1309, 4-wire HW SPI) ──────────────────────────────────────
#define OLED_SCK   12   // Display "SCL"/"CLK"
#define OLED_MOSI  11   // Display "SDA"/"DIN"
#define OLED_CS    10
#define OLED_DC     9
#define OLED_RST    8

// ── Sensor UART Pins (SEN0677) ──────────────────────────────────────────────
#define SENSOR_SERIAL   Serial1
#define SENSOR_BAUD     115200
#define SENSOR_RX_PIN    4   // ESP32 RX <- Sensor TX
#define SENSOR_TX_PIN    5   // ESP32 TX -> Sensor RX

// ── Timing ──────────────────────────────────────────────────────────────────
constexpr uint32_t BUTTON_DEBOUNCE_MS      = 50;
constexpr uint8_t  ENROLL_TIMEOUT_S        = 20;    // Time allowed to present palm
constexpr uint32_t SENSOR_RESET_TIMEOUT_MS = 1000;
constexpr uint32_t SENSOR_REPLY_GRACE_MS   = 3000;
constexpr uint32_t RESULT_HOLD_TIME_MS     = 20000; // Then back to ADMIN MODE

// ============================================================================
//  SEN0677 Protocol Layer
// ============================================================================
namespace sen {

constexpr uint8_t SYNC_HIGH = 0xEF;
constexpr uint8_t SYNC_LOW  = 0xAA;

constexpr uint8_t MID_REPLY         = 0x00;
constexpr uint8_t MID_NOTE          = 0x01;
constexpr uint8_t MID_RESET         = 0x10;
constexpr uint8_t MID_ENROLL_SINGLE = 0x1D;
constexpr uint8_t MID_DEL_USER      = 0x20;

constexpr uint8_t NID_READY = 0x00;

constexpr uint8_t RESULT_SUCCESS          = 0;
constexpr uint8_t RESULT_FAILED_CAMERA    = 4;
constexpr uint8_t RESULT_MAX_USERS        = 9;
constexpr uint8_t RESULT_ALREADY_ENROLLED = 10;
constexpr uint8_t RESULT_LIVENESS_FAILED  = 12;
constexpr uint8_t RESULT_TIMEOUT          = 13;

constexpr uint8_t  USER_NORMAL          = 0x00;
constexpr uint8_t  FACE_DIR_UNDEFINED   = 0x00;
constexpr size_t   ENROLL_NAME_LEN      = 32;
constexpr size_t   ENROLL_PAYLOAD_LEN   = 1 + ENROLL_NAME_LEN + 1 + 1;  // 35

constexpr uint16_t PALM_UID_MIN = 1001;

constexpr size_t   MAX_PAYLOAD          = 300;
constexpr uint32_t INTERBYTE_TIMEOUT_MS = 100;

struct Frame {
  uint8_t  msgId;
  uint16_t len;
  uint8_t  data[MAX_PAYLOAD];
};

// Byte-at-a-time frame parser — never blocks.
class Parser {
 public:
  bool feed(uint8_t b, uint32_t now) {
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
          phase_ = Phase::WAIT_SYNC_HIGH;
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
//  Enrollment FSM
// ============================================================================
enum EnrollState {
  ENR_ADMIN_IDLE,          // "ADMIN MODE" — waiting for button
  ENR_RESETTING,           // RESET sent, waiting for ack before ENROLL
  ENR_WAIT_PALM,           // "Place Palm to Register"
  ENR_PROCESSING,          // "Processing..." — sensor reported activity
  ENR_SUCCESS,             // "SUCCESS / Assigned ID: X"
  ENR_ALREADY_REGISTERED,  // "ALREADY REGISTERED / Existing ID: X"
  ENR_FAILED
};

static EnrollState currentState   = ENR_ADMIN_IDLE;
static uint32_t    stateEnteredAt = 0;
static bool        displayDirty   = true;
static uint32_t    shownSecondsLeft = 0;

static uint16_t    assignedId = 0;   // New UID   (ENR_SUCCESS)
static uint16_t    existingId = 0;   // Matched UID (ENR_ALREADY_REGISTERED)
static const char* failLine1  = "";
static const char* failLine2  = "";
static char        failCodeText[24];

static const char* stateName(EnrollState s) {
  switch (s) {
    case ENR_ADMIN_IDLE:         return "ADMIN_IDLE";
    case ENR_RESETTING:          return "RESETTING";
    case ENR_WAIT_PALM:          return "WAIT_PALM";
    case ENR_PROCESSING:         return "PROCESSING";
    case ENR_SUCCESS:            return "SUCCESS";
    case ENR_ALREADY_REGISTERED: return "ALREADY_REGISTERED";
    case ENR_FAILED:             return "FAILED";
  }
  return "?";
}

// True for screens that hold a result for RESULT_HOLD_TIME_MS.
static bool isResultState(EnrollState s) {
  return s == ENR_SUCCESS || s == ENR_ALREADY_REGISTERED || s == ENR_FAILED;
}

void enterState(EnrollState next) {
  currentState   = next;
  stateEnteredAt = millis();
  displayDirty   = true;
  Serial.printf("[FSM] -> %s\n", stateName(next));
}

void failWith(const char* line1, const char* line2) {
  failLine1 = line1;
  failLine2 = line2;
  Serial.printf("[ENROLL] FAILED: %s %s\n", line1, line2);
  enterState(ENR_FAILED);
}

// ============================================================================
//  Display Rendering (clearBuffer -> draw -> sendBuffer, only when dirty)
// ============================================================================
static void drawCentered(const char* text, int y) {
  const int w = u8g2.getStrWidth(text);
  u8g2.drawStr(w < 128 ? (128 - w) / 2 : 0, y, text);
}

static uint32_t enrollSecondsLeft() {
  const uint32_t elapsed = (millis() - stateEnteredAt) / 1000;
  return elapsed >= ENROLL_TIMEOUT_S ? 0 : ENROLL_TIMEOUT_S - elapsed;
}

void renderDisplay() {
  // Live countdown while waiting for a palm.
  if (currentState == ENR_WAIT_PALM) {
    const uint32_t left = enrollSecondsLeft();
    if (left != shownSecondsLeft) {
      shownSecondsLeft = left;
      displayDirty = true;
    }
  }

  if (!displayDirty) return;
  displayDirty = false;

  char line[24];
  u8g2.clearBuffer();

  switch (currentState) {
    case ENR_ADMIN_IDLE:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("ADMIN MODE", 18);
      u8g2.setFont(u8g2_font_6x10_tf);
      drawCentered("Press Admin Button", 40);
      drawCentered("to register a palm", 54);
      break;

    case ENR_RESETTING:
    case ENR_WAIT_PALM:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("Place Palm", 16);
      drawCentered("to Register", 32);
      u8g2.setFont(u8g2_font_6x10_tf);
      drawCentered("~15 cm from sensor", 48);
      snprintf(line, sizeof(line), "%lus  (btn = cancel)",
               static_cast<unsigned long>(shownSecondsLeft));
      drawCentered(line, 62);
      break;

    case ENR_PROCESSING:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("Processing...", 30);
      u8g2.setFont(u8g2_font_6x10_tf);
      drawCentered("Hold palm still", 50);
      break;

    case ENR_SUCCESS:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("SUCCESS", 16);
      snprintf(line, sizeof(line), "Assigned ID: %u", assignedId);
      drawCentered(line, 34);
      u8g2.setFont(u8g2_font_6x10_tf);
      drawCentered("Link ID in Supabase", 50);
      drawCentered("Btn = next parent", 62);
      break;

    case ENR_ALREADY_REGISTERED:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("ALREADY REGISTERED", 16);
      if (existingId != 0) {
        snprintf(line, sizeof(line), "Existing ID: %u", existingId);
      } else {
        snprintf(line, sizeof(line), "Existing ID: ?");
      }
      drawCentered(line, 34);
      u8g2.setFont(u8g2_font_6x10_tf);
      drawCentered("No new ID created", 50);
      drawCentered("Btn = next parent", 62);
      break;

    case ENR_FAILED:
      u8g2.setFont(u8g2_font_7x14B_tf);
      drawCentered("FAILED", 16);
      u8g2.setFont(u8g2_font_6x10_tf);
      drawCentered(failLine1, 34);
      drawCentered(failLine2, 46);
      drawCentered("Btn = try again", 62);
      break;
  }

  u8g2.sendBuffer();
}

// ============================================================================
//  Sensor Commands
// ============================================================================
void sendReset() {
  sen::send(SENSOR_SERIAL, sen::MID_RESET, nullptr, 0);
}

void sendEnrollCommand() {
  uint8_t payload[sen::ENROLL_PAYLOAD_LEN] = {0};

  // Module requires a name; make it unique-ish. The UID is what matters.
  char name[sen::ENROLL_NAME_LEN];
  snprintf(name, sizeof(name), "GX%lu",
           static_cast<unsigned long>(millis() % 100000000UL));

  payload[0] = sen::USER_NORMAL;
  memcpy(&payload[1], name, strnlen(name, sen::ENROLL_NAME_LEN));
  payload[1 + sen::ENROLL_NAME_LEN]     = sen::FACE_DIR_UNDEFINED;
  payload[1 + sen::ENROLL_NAME_LEN + 1] = ENROLL_TIMEOUT_S;

  sen::send(SENSOR_SERIAL, sen::MID_ENROLL_SINGLE, payload, sizeof(payload));
  Serial.printf("[SENSOR] ENROLL_SINGLE sent (name=%s, timeout=%us)\n",
                name, ENROLL_TIMEOUT_S);
}

void sendDeleteUser(uint16_t uid) {
  const uint8_t payload[2] = {static_cast<uint8_t>(uid >> 8),
                              static_cast<uint8_t>(uid & 0xFF)};
  sen::send(SENSOR_SERIAL, sen::MID_DEL_USER, payload, sizeof(payload));
}

void startEnrollment() {
  Serial.println("[ENROLL] Admin button pressed — starting enrollment");
  sendReset();  // Abort anything in progress; ENROLL follows the ack
  enterState(ENR_RESETTING);
}

// ============================================================================
//  Enrollment Reply Handling
// ============================================================================
// UID lives in payload bytes [2] (high) and [3] (low) for both a new
// enrollment and an already-enrolled match. Returns 0 if the frame is short.
static uint16_t extractUid(const sen::Frame& f) {
  if (f.len < 4) return 0;
  return (static_cast<uint16_t>(f.data[2]) << 8) | f.data[3];
}

void handleEnrollReply(uint8_t result, const sen::Frame& f) {
  // ── 1. New registration ───────────────────────────────────────────────
  if (result == sen::RESULT_SUCCESS) {
    const uint16_t uid = extractUid(f);

    if (uid == 0) {
      failWith("Sensor sent", "no ID");
      return;
    }

    if (uid < sen::PALM_UID_MIN) {
      // The module enrolled a FACE instead of a palm — undo it.
      Serial.printf("[ENROLL] Face enrolled as UID %u — deleting it\n", uid);
      sendDeleteUser(uid);
      failWith("Face detected,", "use PALM only");
      return;
    }

    assignedId = uid;
    Serial.println();
    Serial.println("==============================================");
    Serial.println("  ENROLLMENT SUCCESS");
    Serial.printf ("  Assigned palm_id : %u\n", uid);
    Serial.println("  -> Link this palm_id to the parent in Supabase");
    Serial.println("==============================================");
    Serial.println();
    enterState(ENR_SUCCESS);
    return;
  }

  // ── 2. Palm already registered — report the existing UID ──────────────
  if (result == sen::RESULT_ALREADY_ENROLLED) {
    existingId = extractUid(f);
    Serial.println();
    Serial.println("==============================================");
    Serial.println("  ALREADY REGISTERED (no new template saved)");
    if (existingId != 0) {
      Serial.printf("  Existing palm_id : %u\n", existingId);
    } else {
      Serial.println("  Existing palm_id : (not included in reply)");
    }
    Serial.println("==============================================");
    Serial.println();
    enterState(ENR_ALREADY_REGISTERED);
    return;
  }

  // ── 3. Other failures ─────────────────────────────────────────────────
  switch (result) {
    case sen::RESULT_MAX_USERS:        failWith("Sensor memory", "full");        break;
    case sen::RESULT_TIMEOUT:          failWith("No palm", "detected");          break;
    case sen::RESULT_FAILED_CAMERA:    failWith("Camera", "error");              break;
    case sen::RESULT_LIVENESS_FAILED:  failWith("Liveness check", "failed");     break;
    default:
      snprintf(failCodeText, sizeof(failCodeText), "code %u", result);
      failWith("Sensor error", failCodeText);
      break;
  }
}

// ============================================================================
//  Non-Blocking SEN0677 Reader
// ============================================================================
void pollSensor() {
  const uint32_t now = millis();

  // Watchdogs for lost replies.
  if (currentState == ENR_RESETTING &&
      now - stateEnteredAt >= SENSOR_RESET_TIMEOUT_MS) {
    Serial.println("[SENSOR] No RESET reply — sending ENROLL anyway");
    sendEnrollCommand();
    enterState(ENR_WAIT_PALM);
  } else if ((currentState == ENR_WAIT_PALM ||
              currentState == ENR_PROCESSING) &&
             now - stateEnteredAt >=
                 ENROLL_TIMEOUT_S * 1000UL + SENSOR_REPLY_GRACE_MS) {
    sendReset();
    failWith("No response", "from sensor");
  }

  while (SENSOR_SERIAL.available() > 0) {
    const uint8_t byteIn = static_cast<uint8_t>(SENSOR_SERIAL.read());
    if (!sensorParser.feed(byteIn, now)) continue;

    const sen::Frame& f = sensorParser.frame();

    if (f.msgId == sen::MID_NOTE) {
      if (currentState == ENR_WAIT_PALM && f.len >= 1 &&
          f.data[0] != sen::NID_READY) {
        enterState(ENR_PROCESSING);
      }
      continue;
    }

    if (f.msgId != sen::MID_REPLY || f.len < 2) continue;

    const uint8_t replyMid = f.data[0];
    const uint8_t result   = f.data[1];

    switch (replyMid) {
      case sen::MID_RESET:
        if (currentState == ENR_RESETTING) {
          sendEnrollCommand();
          enterState(ENR_WAIT_PALM);
        }
        break;

      case sen::MID_ENROLL_SINGLE:
        if (currentState == ENR_WAIT_PALM || currentState == ENR_PROCESSING) {
          handleEnrollReply(result, f);
        }
        break;

      case sen::MID_DEL_USER:
        Serial.printf("[SENSOR] DEL_USER result %u\n", result);
        break;

      default:
        break;
    }
  }
}

// ============================================================================
//  Admin Button (debounced, edge-triggered, non-blocking)
// ============================================================================
bool adminButtonPressed() {
  static int      stableLevel = !ADMIN_BUTTON_ACTIVE;
  static int      lastLevel   = !ADMIN_BUTTON_ACTIVE;
  static uint32_t changedAt   = 0;

  const uint32_t now   = millis();
  const int      level = digitalRead(ADMIN_BUTTON_PIN);

  if (level != lastLevel) {
    lastLevel = level;
    changedAt = now;
  }

  if (now - changedAt >= BUTTON_DEBOUNCE_MS && level != stableLevel) {
    stableLevel = level;
    return stableLevel == ADMIN_BUTTON_ACTIVE;
  }
  return false;
}

// ============================================================================
//  setup()
// ============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n===== GUARDIAN X — Enrollment Mode =====");

  pinMode(ADMIN_BUTTON_PIN, INPUT_PULLUP);

  SENSOR_SERIAL.setRxBufferSize(1024);
  SENSOR_SERIAL.begin(SENSOR_BAUD, SERIAL_8N1, SENSOR_RX_PIN, SENSOR_TX_PIN);
  sendReset();

  SPI.begin(OLED_SCK, -1, OLED_MOSI, OLED_CS);
  u8g2.begin();
  u8g2.setContrast(255);

  enterState(ENR_ADMIN_IDLE);
  renderDisplay();
}

// ============================================================================
//  loop()  —  Non-blocking FSM (no delay() anywhere)
// ============================================================================
void loop() {
  const uint32_t now = millis();

  pollSensor();

  if (adminButtonPressed()) {
    switch (currentState) {
      case ENR_ADMIN_IDLE:
      case ENR_SUCCESS:
      case ENR_ALREADY_REGISTERED:
      case ENR_FAILED:
        startEnrollment();
        break;

      case ENR_RESETTING:
      case ENR_WAIT_PALM:
      case ENR_PROCESSING:
        Serial.println("[ENROLL] Cancelled by admin");
        sendReset();
        enterState(ENR_ADMIN_IDLE);
        break;
    }
  }

  if (isResultState(currentState) &&
      now - stateEnteredAt >= RESULT_HOLD_TIME_MS) {
    enterState(ENR_ADMIN_IDLE);
  }

  renderDisplay();
}
