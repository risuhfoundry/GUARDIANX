import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Only the browser-safe anon / publishable key is ever read here. The
// service_role key is deliberately not referenced anywhere in the client
// bundle, so it cannot be leaked by shipping this app.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Session persistence is what makes a signed-in user survive a page refresh, and
// auto-refresh keeps the access token valid without a manual re-login. Both were
// switched off while the app ran unauthenticated; with Supabase Auth in front of
// the workspace they have to be on, so the session stored by sign-in is restored
// on the next load instead of silently dropping the user back to the login page.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    })
  : null;
