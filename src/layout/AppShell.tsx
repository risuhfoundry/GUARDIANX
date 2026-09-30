import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, ClipboardList, GraduationCap,
  LayoutDashboard, Menu, Settings2, Users, UserRound, X,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, Dropdown, IconButton, cx } from '../components/ui';

export const navigationItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Dismissal Requests', icon: ClipboardList },
  { label: 'Students', icon: GraduationCap },
  { label: 'Guardians', icon: Users },
  { label: 'Classes', icon: BookOpen },
  { label: 'Teachers', icon: UserRound },
  { label: 'Settings', icon: Settings2 },
] satisfies Array<{ label: string; icon: LucideIcon }>;

export type SectionName = (typeof navigationItems)[number]['label'];

function BrandMark() {
  return <img className="brand-mark" src="/guardian-mark.svg" alt="" width="32" height="32" />;
}

function Sidebar({
  activeSection,
  collapsed,
  mobileOpen,
  onNavigate,
  onToggleCollapsed,
  onCloseMobile,
  sidebarRef,
}: {
  activeSection: SectionName;
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (section: SectionName) => void;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  sidebarRef: RefObject<HTMLElement | null>;
}) {
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
          {navigationItems.map(({ label, icon: Icon }) => {
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
                <Avatar name="School Administrator" initials="SA" size="sm" />
                <span className="account-trigger__copy"><strong>School Administrator</strong><small>Administrator</small></span>
              </span>
            }
          >
            <div className="account-menu-card">
              <Avatar name="School Administrator" initials="SA" size="md" />
              <span><strong>School Administrator</strong><small>Administrator</small></span>
            </div>
            <p className="account-menu-note">Account actions are reserved for a later implementation stage.</p>
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
  }, [activeSection]);

  return (
    <div className={cx('app-shell', collapsed && 'app-shell--collapsed')}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar
        activeSection={activeSection}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        sidebarRef={sidebarRef}
        onNavigate={onNavigate}
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
            <h1>{activeSection}</h1>
          </div>
          <div className="topbar__meta demo-badge"><span className="status-dot" aria-hidden="true" />Local session · no backend</div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1} ref={mainRef}>{children}</main>
        <footer className="app-footer"><span>GUARDIAN X</span><span>Student Dismissal System</span></footer>
      </div>
    </div>
  );
}
