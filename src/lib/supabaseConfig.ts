/** Shared by the Vite build and browser. Never include supplied values in errors. */
export type SupabaseConfig =
  | { ok: true; url: string; publicKey: string }
  | { ok: false; code: 'missing' | 'invalid-url' | 'invalid-key' | 'privileged-key'; message: string };

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const BASE64_LOOKUP: readonly number[] = (() => {
  const table = new Array<number>(256).fill(-1);
  for (let i = 0; i < BASE64_CHARS.length; i += 1) {
    table[BASE64_CHARS.charCodeAt(i)] = i;
  }
  return table;
})();

function decodeBase64(encoded: string): string {
  const sanitized = encoded.replace(/=+$/, '');
  const length = sanitized.length;
  const bytes = new Uint8Array(length * 6);
  let byteIndex = 0;
  for (let i = 0; i < length; i += 4) {
    const a = BASE64_LOOKUP[sanitized.charCodeAt(i)] ?? -1;
    const b = BASE64_LOOKUP[sanitized.charCodeAt(i + 1)] ?? -1;
    if (a < 0 || b < 0) break;
    bytes[byteIndex++] = (a << 2) | ((b >> 4) & 3);
    let c = -1;
    if (i + 2 < length) {
      c = BASE64_LOOKUP[sanitized.charCodeAt(i + 2)] ?? -1;
      if (c < 0) break;
      bytes[byteIndex++] = ((b & 15) << 4) | ((c >> 2) & 15);
    }
    if (i + 3 < length) {
      const d = BASE64_LOOKUP[sanitized.charCodeAt(i + 3)] ?? -1;
      if (d < 0) break;
      bytes[byteIndex++] = ((c & 3) << 6) | d;
    }
  }
  return new TextDecoder().decode(bytes.slice(0, byteIndex));
}

export function readSupabaseConfig(env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string }): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publicKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  const missing = [!url && 'VITE_SUPABASE_URL', !publicKey && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean);
  if (missing.length) return { ok: false, code: 'missing', message: `Missing ${missing.join(' and ')}. Set the existing Supabase project's public configuration and rebuild the application.` };
  if (!url || !publicKey) return { ok: false, code: 'missing', message: 'Supabase public configuration is missing.' };

  try {
    const parsed = new globalThis.URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      return { ok: false, code: 'invalid-url', message: 'VITE_SUPABASE_URL must be the HTTPS project URL (HTTP is allowed only for local Supabase).' };
    }
  } catch {
    return { ok: false, code: 'invalid-url', message: 'VITE_SUPABASE_URL is not a valid project URL.' };
  }

  if (publicKey.startsWith('sb_secret_')) return { ok: false, code: 'privileged-key', message: 'A server-only key was supplied to VITE_SUPABASE_ANON_KEY. Use the publishable or legacy anon key instead.' };
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publicKey)) return { ok: true, url: url.replace(/\/$/, ''), publicKey };

  // This checks key type/shape, not authenticity. Supabase still validates it.
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(publicKey)) {
    try {
      const encoded = publicKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
      const decoded = decodeBase64(padded);
      const payload: unknown = JSON.parse(decoded);
      if (typeof payload === 'object' && payload !== null && 'role' in payload) {
        if (payload.role === 'anon') return { ok: true, url: url.replace(/\/$/, ''), publicKey };
        return { ok: false, code: 'privileged-key', message: 'Only the legacy anon key may be used in the browser. Do not use a service-role key or a user session token.' };
      }
    } catch {
      return { ok: false, code: 'invalid-key', message: 'VITE_SUPABASE_ANON_KEY is not a valid public key format.' };
    }
  }
  return { ok: false, code: 'invalid-key', message: 'VITE_SUPABASE_ANON_KEY must be a publishable key or a legacy anon key from the existing Supabase project.' };
}
