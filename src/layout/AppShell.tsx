import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, ClipboardList, GraduationCap,
  LayoutDashboard, LogOut, Menu, Settings2, Users, UserRound, X,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, Button, Dropdown, ErrorState, IconButton, Skeleton, cx } from '../components/ui';
import { useAdminData } from '../features/admin/AdminDataContext';
import { isAdminRole, roleLabel, useAuth, type AuthProfile } from '../features/auth/AuthContext';

const navigationItems = [
  { label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { label: 'Dismissal Requests', icon: ClipboardList, adminOnly: false },
  { label: 'Students', icon: GraduationCap, adminOnly: false },
  { label: 'Guardians', icon: Users, adminOnly: false },
  { label: 'Classes', icon: BookOpen, adminOnly: true },
  { label: 'Teachers', icon: UserRound, adminOnly: true },
  { label: 'Settings', icon: Settings2, adminOnly: false },
] satisfies Array<{ label: string; icon: LucideIcon; adminOnly: boolean }>;

export type SectionName = (typeof navigationItems)[number]['label'];

/**
 * The sections a signed-in account may navigate to.
 *
 * Classes and Teachers are administration modules. A teacher's own rows are
 * readable under RLS, but those pages would render as near-empty tables
 * describing nobody, so they are not offered. This is presentation only: a
 * teacher who reaches either page anyway still receives only what the
 * `authenticated` RLS policies permit.
 */
export function visibleNavigation(role: AuthProfile['role'] | null | undefined): typeof navigationItems {
  if (isAdminRole(role)) return navigationItems;
  return navigationItems.filter((item) => !item.adminOnly);
}

function BrandMark() {
  return <img className="brand-mark" src="/guardian-mark.svg" alt="" width="32" height="32" />;
}

/**
 * Two-letter initials from the profile's full name.
 *
 * `Avatar` takes initials as a prop rather than deriving them, so the signed-in
 * user's name needs reducing here. Words that are not names — "Dr", initials
 * already joined together, blank rows — are skipped so a profile saved as
 * "Shruti" or "A. Rao" still yields two readable letters.
 */
function initialsFor(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const skipped = new Set(['dr', 'mr', 'mrs', 'ms', 'miss', 'prof', 'sir', 'mam']);
  const meaningful = words.filter((word) => !skipped.has(word.toLowerCase().replace(/\./g, '')));
  const source = meaningful.length > 0 ? meaningful : words;
  if (source.length === 0) return '?';
  if (source.length === 1) return source[0].slice(0, 2).toUpperCase();
  return (source[0][0] + source[source.length - 1][0]).toUpperCase();
}

function Sidebar({
  activeSection,
  collapsed,
  mobileOpen,
  profile,
  onNavigate,
  onSignOut,
  onToggleCollapsed,
  onCloseMobile,
  sidebarRef,
}: {
  activeSection: SectionName;
  collapsed: boolean;
  mobileOpen: boolean;
  profile: AuthProfile;
  onNavigate: (section: SectionName) => void;
  onSignOut: () => void;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  sidebarRef: RefObject<HTMLElement | null>;
}) {
  const items = visibleNavigation(profile.role);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      {mobileOpen && <button className="mobile-scrim" type="button" tabIndex={-1} aria-hidden="true" onClick={onCloseMobile} />}
      <aside
        className={cx('sidebar', collapsed && 'sidebar--collapsed', mobileOpen && 'sidebar--mobile-open')}
        aria-label="Primary navigation"
        tabIndex={-1}
        ref={sidebarRef}
      >
        <div className="sidebar__brand-row">
          <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate('Dashboard'); }} aria-label="GUARDIAN X home">
            <BrandMark />
            <span className="brand__text"><strong>GUARDIAN X</strong><small>Student Dismissal System</small></span>
          </a>
          <IconButton className="sidebar__mobile-close" label="Close navigation" onClick={onCloseMobile}><X size={17} /></IconButton>
        </div>

        <div className="sidebar__nav-label">WORKSPACE</div>
        <nav className="sidebar__nav" id="primary-navigation">
          {items.map(({ label, icon: Icon }) => {
            const isActive = activeSection === label;
            return (
              <button
                className={cx('nav-item', isActive && 'nav-item--active')}
                key={label}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
                title={collapsed ? label : undefined}
                onClick={() => { onNavigate(label); onCloseMobile(); }}
              >
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar__spacer" />
        <div className="sidebar__account">
          <Dropdown
            className="account-dropdown"
            label={
              <span className="account-trigger">
                <Avatar name={profile.fullName} initials={initialsFor(profile.fullName)} size="sm" />
                <span className="account-trigger__copy"><strong>{profile.fullName}</strong><small>{roleLabel(profile.role)}</small></span>
              </span>
            }
          >
            <div className="account-menu-card">
              <Avatar name={profile.fullName} initials={initialsFor(profile.fullName)} size="md" />
              <span><strong>{profile.fullName}</strong><small>{roleLabel(profile.role)}</small></span>
            </div>
            <div className="account-menu-action">
              <Button variant="ghost" size="sm" loading={signingOut} onClick={() => { void handleSignOut(); }}>
                {!signingOut && <LogOut size={14} aria-hidden="true" />}
                Sign out
              </Button>
            </div>
          </Dropdown>
        </div>
        <button
          className="sidebar__collapse"
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </aside>
    </>
  );
}

export function AppShell({ activeSection, onNavigate, children }: { activeSection: SectionName; onNavigate: (section: SectionName) => void; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const isFirstRender = useRef(true);
  const { status, error } = useAdminData();
  const { profile, signOut } = useAuth();

  // AppShell renders only for an authenticated account, so a profile is always
  // present by the time this returns. The guard below is the backstop; it has to
  // sit after every hook, because returning early above one would change the
  // hook count between renders.
  //
  // A teacher also cannot be stranded on Classes or Teachers by a stale
  // navigation state, and the page title has to agree with what the sidebar
  // offers.
  const allowed = visibleNavigation(profile?.role);
  const section = allowed.some((item) => item.label === activeSection) ? activeSection : allowed[0].label;

  // The badge reuses the existing "demo-badge" styling rather than introducing
  // a new visual treatment; only the wording changes.
  const connectionLabel = status === 'ready'
    ? 'Live database · Supabase'
    : status === 'error' ? 'Database error' : 'Connecting to database…';

  const body = status === 'loading'
    ? <div className="page-loading" role="status" aria-label="Loading records"><Skeleton className="page-loading__line" /><Skeleton className="page-loading__line page-loading__line--short" /><Skeleton className="page-loading__block" /></div>
    : status === 'error'
      ? <ErrorState
          title="Could not load records"
          description={error ?? 'The database could not be reached. No records are shown, because showing nothing is safer than showing stale or invented data.'}
        />
      : children;

  // Escape closes the mobile drawer, but never while a modal dialog owns the keyboard.
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (document.querySelector('dialog[open]')) return;
      setMobileOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Move focus into the drawer when it opens; return it to the trigger when it closes.
  // The drawer stays visibility:hidden for the length of its slide-in transition, and a
  // hidden element cannot take focus, so wait for the transition to finish first.
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (mobileOpen) {
      if (!sidebar) return;
      const focusDrawer = () => sidebar.querySelector<HTMLElement>('.sidebar__mobile-close')?.focus();
      sidebar.addEventListener('transitionend', focusDrawer, { once: true });
      const fallback = window.setTimeout(focusDrawer, 250);
      return () => {
        sidebar.removeEventListener('transitionend', focusDrawer);
        window.clearTimeout(fallback);
      };
    }
    if (sidebar?.contains(document.activeElement)) menuButtonRef.current?.focus();
  }, [mobileOpen]);

  // Section changes replace the page in place, so move focus to the new content.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [section]);

  // Rendering a shell with no identity is the one state that must never reach
  // the screen. Unreachable while App mounts this only for authenticated users.
  if (!profile) return null;

  return (
    <div className={cx('app-shell', collapsed && 'app-shell--collapsed')}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar
        activeSection={section}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        profile={profile}
        sidebarRef={sidebarRef}
        onNavigate={onNavigate}
        onSignOut={signOut}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="app-shell__main">
        <header className="topbar">
          <IconButton className="topbar__menu" label="Open navigation" aria-expanded={mobileOpen} aria-controls="primary-navigation" onClick={() => setMobileOpen(true)} ref={menuButtonRef}>
            <Menu size={19} />
          </IconButton>
          <div className="topbar__title">
            <span className="topbar__breadcrumb">GUARDIAN X <span aria-hidden="true">/</span> WORKSPACE</span>
            <h1>{section}</h1>
          </div>
          <div className="topbar__meta demo-badge"><span className="status-dot" aria-hidden="true" />{connectionLabel}</div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1} ref={mainRef}>{body}</main>
        <footer className="app-footer"><span>GUARDIAN X</span><span>Student Dismissal System</span></footer>
      </div>
    </div>
  );
}
