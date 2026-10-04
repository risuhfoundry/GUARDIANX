import { useState, type FormEvent } from 'react';
import { LockKeyhole, ShieldAlert } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { useAuth } from '../features/auth/AuthContext';

/**
 * The only unauthenticated screen in the application.
 *
 * Sign-up is intentionally absent. Accounts are created by an administrator in
 * the Supabase Dashboard, so a visitor who finds this URL cannot register their
 * way into a system holding children's records.
 */
export default function LoginPage() {
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn(email, password);
      if (!result.ok) setError(result.error);
      // On success AuthProvider flips the app into the workspace, so this
      // screen unmounts itself and there is nothing to navigate to.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!configured) {
    return (
      <div className="auth-shell">
        <div className="auth-panel">
          <div className="auth-brand">
            <img className="brand-mark" src="/guardian-mark.svg" alt="" width="28" height="28" />
            <span className="brand__text"><strong>GUARDIAN X</strong><small>Student Dismissal System</small></span>
          </div>
          <div className="auth-error">
            <ShieldAlert size={16} aria-hidden="true" />
            <div>
              <strong>Supabase is not configured</strong>
              <p>This deployment is missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, so no account can be checked.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <img className="brand-mark" src="/guardian-mark.svg" alt="" width="28" height="28" />
          <span className="brand__text"><strong>GUARDIAN X</strong><small>Student Dismissal System</small></span>
        </div>

        <div className="auth-header">
          <span className="eyebrow">STAFF ACCESS</span>
          <h1 className="auth-panel__title">Sign in</h1>
          <p className="auth-panel__lead">
            Use the school account issued to you. Student and guardian records are only
            shown to accounts authorised for them.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && (
            <div className="form-error" role="alert">
              <ShieldAlert size={14} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={submitting} className="auth-submit">
            {!submitting && <LockKeyhole size={14} aria-hidden="true" />}
            Sign in
          </Button>
        </form>

        <p className="auth-panel__foot">
          Accounts are issued by an administrator. If you cannot sign in, contact the
          school office.
        </p>
      </div>
    </div>
  );
}