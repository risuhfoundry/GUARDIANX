/** Shared by the Vite build and browser. Never include supplied values in errors. */
export type SupabaseConfig =
  | { ok: true; url: string; publicKey: string }
  | { ok: false; code: 'missing' | 'invalid-url' | 'invalid-key' | 'privileged-key'; message: string };

export function readSupabaseConfig(env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string }): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publicKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  const missing = [!url && 'VITE_SUPABASE_URL', !publicKey && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean);
  if (missing.length) return { ok: false, code: 'missing', message: `Missing ${missing.join(' and ')}. Set the existing Supabase project's public configuration and rebuild the application.` };
  if (!url || !publicKey) return { ok: false, code: 'missing', message: 'Supabase public configuration is missing.' };

  try {
    const parsed = new URL(url);
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
      const payload: unknown = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
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
