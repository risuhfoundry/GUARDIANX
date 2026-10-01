import { lazy, Suspense, useState } from 'react';
import { Button, Card, ErrorState, Skeleton } from './components/ui';
import { AdminDataProvider } from './features/admin/AdminDataContext';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { AppShell, type SectionName } from './layout/AppShell';
import LoginPage from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DismissalRequestsPage = lazy(() => import('./pages/DismissalRequestsPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const GuardiansPage = lazy(() => import('./pages/GuardiansPage'));
const ClassesPage = lazy(() => import('./pages/ClassesPage'));
const TeachersPage = lazy(() => import('./pages/TeachersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function PageLoading() {
  return <div className="page-loading" role="status" aria-label="Loading section"><Skeleton className="page-loading__line" /><Skeleton className="page-loading__line page-loading__line--short" /><Skeleton className="page-loading__block" /></div>;
}

/**
 * Shown when Supabase Auth accepted the session but the database will not issue
 * this account a role — the user was deactivated, archived, or never had a
 * profile created. The wording avoids saying which, because confirming that
 * would turn the login page into an account-enumeration oracle.
 *
 * Sign-out stays available: an admin may simply have disabled the account
 * mid-session, and the user must be able to leave.
 */
function AccessDenied({ reason }: { reason: string }) {
  const { signOut } = useAuth();
  return (
    <div className="auth-shell">
      <Card className="auth-panel">
        <span className="eyebrow">ACCOUNT NOT PERMITTED</span>
        <h1 className="auth-panel__title">Access denied</h1>
        <div className="auth-denied">
          <p className="auth-denied__reason">{reason}</p>
          <Button variant="secondary" onClick={() => { void signOut(); }}>Sign out</Button>
        </div>
      </Card>
    </div>
  );
}

function SessionLoading() {
  return (
    <div className="auth-shell">
      <div className="page-loading" role="status" aria-label="Restoring session">
        <Skeleton className="page-loading__line" />
        <Skeleton className="page-loading__line page-loading__line--short" />
      </div>
    </div>
  );
}

function Workspace() {
  const [activeSection, setActiveSection] = useState<SectionName>('Dashboard');
  const page = activeSection === 'Dashboard' ? <DashboardPage />
    : activeSection === 'Dismissal Requests' ? <DismissalRequestsPage />
      : activeSection === 'Students' ? <StudentsPage />
        : activeSection === 'Guardians' ? <GuardiansPage />
          : activeSection === 'Classes' ? <ClassesPage />
            : activeSection === 'Teachers' ? <TeachersPage />
              : <SettingsPage />;

  return (
    // Mounted only once authenticated, so signing out tears this down and every
    // cached student and guardian record leaves memory with it.
    <AdminDataProvider>
      <AppShell activeSection={activeSection} onNavigate={setActiveSection}>
        <Suspense fallback={<PageLoading />}>{page}</Suspense>
      </AppShell>
    </AdminDataProvider>
  );
}

/**
 * The single gate between the browser and the workspace.
 *
 * Every database read in the application happens under `AdminDataProvider`, which
 * is only ever mounted in the authenticated branch — so an anonymous visitor
 * cannot reach the data layer at all, and the RLS policies deny them underneath.
 * The role checks further down (nav filtering, account menu) are for appearance
 * only; they are never what stops a request.
 */
function AuthGate() {
  const { status, error, signOut } = useAuth();

  if (status === 'loading') return <SessionLoading />;
  if (status === 'anonymous') return <LoginPage />;

  if (status === 'inactive') {
    return <AccessDenied reason="Your account is signed in but not currently active for GUARDIAN X. An administrator can reactivate it." />;
  }

  if (status === 'error') {
    return (
      <div className="auth-shell">
        <Card className="auth-panel">
          <ErrorState
            title="Could not verify your session"
            description={error ?? 'The account service could not be reached.'}
            action={<Button variant="secondary" onClick={() => { void signOut(); }}>Sign out</Button>}
          />
        </Card>
      </div>
    );
  }

  return <Workspace />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
