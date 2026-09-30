import { lazy, Suspense, useState } from 'react';
import { Skeleton } from './components/ui';
import { AdminDataProvider } from './features/admin/AdminDataContext';
import { AppShell, type SectionName } from './layout/AppShell';

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

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionName>('Dashboard');
  const page = activeSection === 'Dashboard' ? <DashboardPage />
    : activeSection === 'Dismissal Requests' ? <DismissalRequestsPage />
      : activeSection === 'Students' ? <StudentsPage />
        : activeSection === 'Guardians' ? <GuardiansPage />
          : activeSection === 'Classes' ? <ClassesPage />
            : activeSection === 'Teachers' ? <TeachersPage />
              : <SettingsPage />;

  return (
    <AdminDataProvider>
      <AppShell activeSection={activeSection} onNavigate={setActiveSection}>
        <Suspense fallback={<PageLoading />}>{page}</Suspense>
      </AppShell>
    </AdminDataProvider>
  );
}
