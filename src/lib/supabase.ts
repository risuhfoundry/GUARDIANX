import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Only the browser-safe anon / publishable key is ever read here. The
// service_role key is deliberately not referenced anywhere in the client
// bundle, so it cannot be leaked by shipping this app.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
