import { lazy, Suspense, useEffect, useState } from 'react';
import { NAVIGATE_EVENT } from './lib/navigation';

/**
 * Top-level split between the public landing page and the application.
 *
 * `/` renders the marketing page. Every other path renders the existing `App`
 * untouched, so its AuthGate keeps deciding between the login screen and the
 * workspace exactly as before. Both branches are lazy so the landing page never
 * downloads Supabase, and the application never downloads the landing page.
 */
const LandingPage = lazy(() => import('./pages/LandingPage'));
const App = lazy(() => import('./App'));

function isLandingPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/index.html';
}

export default function Root() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', sync);
    window.addEventListener(NAVIGATE_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(NAVIGATE_EVENT, sync);
    };
  }, []);

  return (
    <Suspense fallback={null}>
      {isLandingPath(pathname) ? <LandingPage /> : <App />}
    </Suspense>
  );
}
