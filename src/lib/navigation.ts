import { flushSync } from 'react-dom';

/**
 * The authenticated application lives under this path. Its own gate decides
 * between the existing login screen and the workspace; the landing page only
 * ever links here and never touches authentication itself.
 */
export const APP_PATH = '/app';

export const NAVIGATE_EVENT = 'guardianx:navigate';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

/** Warm the application chunk before the click lands (hover / focus). */
export function prefetchApp(): void {
  void import('../App');
}

/**
 * Client-side navigation between the landing page and the application.
 *
 * Uses the History API so the switch is instant, and wraps it in a native View
 * Transition where the browser supports one, which gives a short crossfade
 * without any loading screen. Falls back to a plain swap everywhere else.
 */
export function navigate(path: string): void {
  if (path === window.location.pathname) return;
  const commit = () => {
    window.history.pushState({}, '', path);
    flushSync(() => { window.dispatchEvent(new Event(NAVIGATE_EVENT)); });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };
  const doc = document as ViewTransitionDocument;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduced) doc.startViewTransition(commit);
  else commit();
}
