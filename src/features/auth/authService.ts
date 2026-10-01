import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

export type UserRole = Database['public']['Enums']['user_role'];

/** The signed-in account as the application needs it: identity plus authorisation. */
export interface AuthProfile {
  id: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    this.name = 'SupabaseNotConfiguredError';
  }
}

// The client is null only when the build has no VITE_SUPABASE_* values, i.e. a
// broken configuration rather than a signed-out visitor. Throwing keeps a missing
// deployment loud instead of silently behaving like a login that never works.
function client() {
  if (!supabase) throw new SupabaseNotConfiguredError();
  return supabase;
}

/**
 * Reads the caller's own profile row.
 *
 * Returning `null` is a real outcome, not a failure: the existing
 * `profiles_select_self` policy requires `current_role() IS NOT NULL`, and
 * `current_role()` filters on `is_active = true`. An account that exists in
 * `auth.users` but is deactivated, archived, or has no profile therefore matches
 * zero rows and is reported as "no usable profile" rather than as an error. The
 * caller turns that into the access-denied state.
 *
 * Only these four columns are requested. The role is read from the database
 * rather than from the JWT so the value that drives the UI is the value RLS is
 * already enforcing.
 */
export async function loadProfile(userId: string): Promise<AuthProfile | null> {
  const db = client();

  const { data, error } = await db
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    isActive: data.is_active,
  };
}

/**
 * Exchanges an email and password for a session.
 *
 * The password is handed straight to Supabase Auth and is never stored, logged
 * or written anywhere by this application. A wrong-credentials response is
 * returned as-is: Supabase deliberately gives the same message for an unknown
 * address and a wrong password so the form cannot be used to discover which
 * school accounts exist.
 */
export async function signInWithPassword(email: string, password: string): Promise<{ session: Session | null; error: string | null }> {
  const db = client();

  const { data, error } = await db.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { session: null, error: error.message };
  return { session: data.session, error: null };
}

/**
 * Ends the session.
 *
 * Errors are swallowed deliberately: a user who clicked "Sign out" must be
 * signed out locally even if the network call fails. `SupabaseClient.signOut`
 * already clears the persisted session before the request is sent, so a failed
 * revoke cannot leave a usable token behind in this browser.
 */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // Intentionally ignored — see above.
  }
}