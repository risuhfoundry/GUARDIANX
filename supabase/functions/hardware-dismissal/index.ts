import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";
import type { Database } from "jsr:@supabase/functions-js/edge-runtime";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

const error = (message: string, status = 400) =>
  json({ error: message }, status);

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function authenticateDevice(req: Request) {
  const raw = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!raw) return { ok: false as const, status: 401, error: "Missing Authorization header." };

  const keyHash = await sha256Hex(raw);

  const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: apiKey, error: keyError } = await adminClient
    .from("hardware_api_keys")
    .select("id, device_name, status, created_by")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyError || !apiKey) {
    return { ok: false as const, status: 401, error: "Invalid API key." };
  }

  if (apiKey.status !== "active") {
    return { ok: false as const, status: 401, error: "API key has been revoked." };
  }

  await adminClient
    .from("hardware_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id);

  return { ok: true as const, key: apiKey };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return error("Method not allowed.", 405);
  }

  const auth = await authenticateDevice(req);
  if (!auth.ok) return error(auth.error, auth.status);

  let payload: {
    student_id?: string;
    guardian_id?: string;
    palm_id?: string;
    device_id?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return error("Invalid JSON body.", 400);
  }

  const { student_id, guardian_id, palm_id, device_id } = payload;

  if (!student_id || !guardian_id || !palm_id) {
    return error("student_id, guardian_id, and palm_id are required.", 400);
  }

  const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: guardian, error: guardianError } = await adminClient
    .from("guardians")
    .select("id, name, palm_status, palm_id")
    .eq("id", guardian_id)
    .maybeSingle();

  if (guardianError || !guardian) {
    return error("Guardian not found.", 404);
  }

  if (guardian.palm_status !== "Registered") {
    return json({
      verified: false,
      reason: "Palm is not registered for this guardian.",
      guardian_name: guardian.name,
    }, 403);
  }

  if (guardian.palm_id && guardian.palm_id !== palm_id) {
    return json({
      verified: false,
      reason: "Palm identifier does not match the registered palm.",
      guardian_name: guardian.name,
    }, 403);
  }

  const { data: link, error: linkError } = await adminClient
    .from("student_guardians")
    .select("student_id, guardian_id")
    .eq("student_id", student_id)
    .eq("guardian_id", guardian_id)
    .maybeSingle();

  if (linkError || !link) {
    return json({
      verified: false,
      reason: "This guardian is not linked to the provided student.",
      guardian_name: guardian.name,
    }, 403);
  }

  const { data: student, error: studentError } = await adminClient
    .from("students")
    .select("id, name, admission_number, class_id")
    .eq("id", student_id)
    .maybeSingle();

  if (studentError || !student) {
    return error("Student not found.", 404);
  }

  const { data: schoolClass, error: classError } = await adminClient
    .from("classes")
    .select("id, name, section")
    .eq("id", student.class_id)
    .maybeSingle();

  if (classError || !schoolClass) {
    return error("Class not found for student.", 404);
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: insertError } = await adminClient
    .from("dismissal_requests")
    .insert({
      id: requestId,
      student_id: student.id,
      guardian_id: guardian.id,
      status: "Completed",
      requested_at: now,
    });

  if (insertError) {
    return error("Could not record dismissal request.", 500);
  }

  return json({
    verified: true,
    request_id: requestId,
    dismissed_at: now,
    student: {
      id: student.id,
      name: student.name,
      admission_number: student.admission_number,
    },
    guardian: {
      id: guardian.id,
      name: guardian.name,
    },
    class: {
      id: schoolClass.id,
      name: schoolClass.name,
      section: schoolClass.section,
    },
    device_id: device_id ?? null,
  });
});
