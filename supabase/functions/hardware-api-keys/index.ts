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

const sha256Hex = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

function randomKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

type MaybeProfile = {
  role: string;
  is_active: boolean | null;
} | null;

async function authenticateAdmin(req: Request): Promise<MaybeProfile> {
  const token = bearerToken(req);
  if (!token) return null;

  const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error: tokenError } = await adminClient.auth.getUser(token);
  if (tokenError || !data.user) return null;

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN" || profile.is_active !== true) {
    return null;
  }

  return profile as MaybeProfile;
}

async function createKey(adminClient: ReturnType<typeof createClient<Database>>, deviceName: string, createdBy: string) {
  const rawKey = `gx_live_${randomKey()}`;
  const keyHash = await sha256Hex(rawKey);
  const keyPrefix = rawKey.slice(-8);

  const id = crypto.randomUUID();

  const { error: insertError } = await adminClient
    .from("hardware_api_keys")
    .insert({
      id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      device_name: deviceName,
      created_by: createdBy,
      status: "active",
    });

  if (insertError) {
    return { key: null as string | null, error: insertError.message };
  }

  return { key: rawKey, error: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const profile = await authenticateAdmin(req);
  if (!profile) {
    return error("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const keyId = url.pathname.split("/").filter(Boolean).pop();
  if (keyId === 'hardware-api-keys') keyId = null;

  try {
    if (req.method === "GET" && !keyId) {
      const { data: keys, error: fetchError } = await adminClient
        .from("hardware_api_keys")
        .select("id, key_prefix, device_name, status, created_at, last_used_at, created_by")
        .order("created_at", { ascending: false });

      if (fetchError) return error(fetchError.message, 500);

      return json({ keys: keys ?? [] });
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { device_name?: string };
      const deviceName = (body.device_name ?? "").trim();

      if (!deviceName) {
        return error("device_name is required.", 400);
      }

      const { data: session } = await adminClient.auth.getUser(req.headers.get("Authorization") ?? "");
      const createdBy = session.user?.id ?? null;

      const { key, error: keyError } = await createKey(adminClient, deviceName, createdBy);
      if (keyError) return error(keyError, 500);

      return json({ key, device_name: deviceName }, 201);
    }

    if (req.method === "PATCH" && keyId) {
      const body = (await req.json().catch(() => ({}))) as { status?: string };
      const status = body.status;

      if (!["active", "revoked"].includes(status ?? "")) {
        return error("status must be 'active' or 'revoked'.", 400);
      }

      const { error: updateError } = await adminClient
        .from("hardware_api_keys")
        .update({ status })
        .eq("id", keyId);

      if (updateError) return error(updateError.message, 500);

      return json({ id: keyId, status });
    }

    if (req.method === "DELETE" && keyId) {
      const { error: deleteError } = await adminClient
        .from("hardware_api_keys")
        .delete()
        .eq("id", keyId);

      if (deleteError) return error(deleteError.message, 500);

      return json({ deleted: keyId });
    }

    return error("Not found", 404);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Unexpected error.", 500);
  }
});
