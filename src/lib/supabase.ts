import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { readSupabaseConfig } from './supabaseConfig';

const config = readSupabaseConfig(import.meta.env);
let client: SupabaseClient<Database> | null = null;
let configurationError: string | null = config.ok ? null : config.message;

if (config.ok) {
  try {
    client = createClient<Database>(config.url, config.publicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    });
  } catch {
    configurationError = 'Supabase could not initialize. Check this deployment’s public configuration and browser storage availability.';
  }
}

export const supabase = client;
export const supabaseConfigurationError = configurationError;
export const isSupabaseConfigured = client !== null;
