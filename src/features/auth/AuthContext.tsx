import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { loadProfile, signOut as endSession, signInWithPassword, type AuthProfile } from './authService';

// The UI reads identity and role straight from this module, so the profile shape
// is re-exported here rather than making every consumer reach past it.
export type { AuthProfile, UserRole } from './authService';

/**
 * `loading`     — resolving the stored session; the workspace must not render yet.
 * `anonymous`   — no session; show the login page.
 * `inactive`    — a real session whose profile is unusable (deactivated, archived,
 *                 or missing). Authenticated but not permitted: access denied.
 * `error`       — the profile could not be read; distinct from "no permission",
 *                 because retrying may work.
 * `authenticated` — session plus an active profile with a role.
 */
export type AuthStatus = 'loading' | 'anonymous' | 'inactive' | 'error' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  profile: AuthProfile | null;
  error: string | null;
  /** True when Supabase itself is unreachable at build time. */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolves a session into a status. `generation` guards the async profile
  // read: signing out mid-flight would otherwise let a late response resurrect
  // the previous user's profile.
  const generation = useRef(0);

  const resolve = useCallback(async (nextSession: Session | null) => {
    const ticket = ++generation.current;

    if (!nextSession) {
      setSession(null);
      setProfile(null);
      setError(null);
      setStatus('anonymous');
      return;
    }

    setSession(nextSession);
    try {
      const loaded = await loadProfile(nextSession.user.id);
      if (ticket !== generation.current) return;
      if (!loaded || !loaded.isActive) {
        setProfile(null);
        setError(null);
        setStatus('inactive');
        return;
      }
      setProfile(loaded);
      setError(null);
      setStatus('authenticated');
    } catch (cause) {
      if (ticket !== generation.current) return;
      setProfile(null);
      setError(cause instanceof Error ? cause.message : 'Could not read your account profile.');
      setStatus('error');
    }
  }, [generation]);

  // Restore the stored session on load. getSession() reads the token
  // supabase-js persisted, which is what makes a refresh keep the user signed
  // in rather than bouncing them to the login page.
  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      setError('Supabase is not configured for this deployment.');
      return;
    }
    let active = true;
    supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(sessionError.message);
          setStatus('error');
          return;
        }
        void resolve(data.session);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Could not restore the session.');
        setStatus('error');
      });
    return () => { active = false; };
  }, [resolve]);

  // Keep React state in step with the client for sign-in, sign-out, token
  // refresh and cross-tab sign-out. INITIAL_SESSION is ignored: it is the event
  // that carries the restored session, already handled by the effect above, and
  // re-resolving it would duplicate that read.
  useEffect(() => {
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      void resolve(nextSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, [resolve]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { session: nextSession, error: signInError } = await signInWithPassword(email, password);
    if (signInError) return { ok: false, error: signInError };
    await resolve(nextSession);
    return { ok: true, error: null };
  }, [resolve]);

  const signOut = useCallback(async () => {
    // Resolve first so the protected tree unmounts immediately; a slow or failed
    // network revoke must not leave the workspace on screen.
    await resolve(null);
    await endSession();
  }, [resolve]);

  const value = useMemo(
    () => ({ status, session, profile, error, configured: isSupabaseConfigured, signIn, signOut }),
    [status, session, profile, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}

/** Display label for a role. Used by the account menu and the sidebar. */
export function roleLabel(role: AuthProfile['role']): string {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super administrator';
    case 'ADMIN': return 'Administrator';
    case 'TEACHER': return 'Teacher';
  }
}

/** Admins reach the administration workspace; teachers do not. */
export function isAdminRole(role: AuthProfile['role'] | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}