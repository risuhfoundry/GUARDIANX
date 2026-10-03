import type { ReactNode } from 'react';
import {
  BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Settings2, UserRound, Users, type LucideIcon,
} from 'lucide-react';
import { cx } from '../../components/ui';
import { BrandMark, Status } from './primitives';

/** Same sections, order and icons as the real AppShell navigation. */
const NAV: Array<{ label: MockSection; icon: LucideIcon }> = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Dismissal Requests', icon: ClipboardList },
  { label: 'Students', icon: GraduationCap },
  { label: 'Guardians', icon: Users },
  { label: 'Classes', icon: BookOpen },
  { label: 'Teachers', icon: UserRound },
  { label: 'Settings', icon: Settings2 },
];

export type MockSection =
  | 'Dashboard' | 'Dismissal Requests' | 'Students' | 'Guardians' | 'Classes' | 'Teachers' | 'Settings';

/**
 * A static, non-interactive rendering of the GUARDIAN X workspace frame.
 *
 * Every product visual on the landing page is drawn inside this one frame so
 * they read as screens from the same application. It is decorative: marked
 * `aria-hidden` by default, with an accessible description supplied by the
 * caller where the visual carries meaning.
 */
export function MockWindow({
  section, title, children, label, className, actions,
}: {
  section: MockSection;
  title?: string;
  children: ReactNode;
  /** Accessible description; when omitted the frame is hidden from assistive tech. */
  label?: string;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <figure
      className={cx('mw', className)}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <div className="mw__chrome">
        <span className="mw__lights"><i /><i /><i /></span>
        <span className="mw__chrome-title">GUARDIAN X</span>
        <span className="mw__chrome-spacer" />
      </div>
      <div className="mw__body">
        <div className="mw__side">
          <div className="mw__brand">
            <BrandMark size={18} />
            <span><strong>GUARDIAN X</strong><small>Student Dismissal System</small></span>
          </div>
          <div className="mw__nav-label">Workspace</div>
          <div className="mw__nav">
            {NAV.map(({ label: item, icon: Icon }) => (
              <span key={item} className={cx('mw__nav-item', item === section && 'is-active')}>
                <Icon size={14} strokeWidth={1.8} />
                <span>{item}</span>
              </span>
            ))}
          </div>
          <div className="mw__account">
            <span className="mw__avatar">GX</span>
            <span><strong>Demo workspace</strong><small>Sample records</small></span>
          </div>
        </div>
        <div className="mw__main">
          <div className="mw__top">
            <div className="mw__title">
              <span className="mw__crumb">GUARDIAN X / Workspace</span>
              <strong>{title ?? section}</strong>
            </div>
            <div className="mw__top-actions">
              {actions}
              <Status tone="neutral" className="mw__demo">Sample data</Status>
            </div>
          </div>
          <div className="mw__content">{children}</div>
        </div>
      </div>
    </figure>
  );
}

/** Card surface used inside mockups (mirrors the app's Card). */
export function MockCard({ children, className, title, meta }: { children: ReactNode; className?: string; title?: string; meta?: ReactNode }) {
  return (
    <div className={cx('mc', className)}>
      {(title || meta) && (
        <div className="mc__head">
          {title && <strong>{title}</strong>}
          {meta && <span className="mc__meta">{meta}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Small label/value row used in detail panels. */
export function MockField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mf">
      <span className="mf__label">{label}</span>
      <span className="mf__value">{children}</span>
    </div>
  );
}

export function Initials({ name, tone = 'neutral' }: { name: string; tone?: 'neutral' | 'accent' }) {
  const parts = name.split(' ');
  const text = (parts[0][0] + (parts[parts.length - 1][0] ?? '')).toUpperCase();
  return <span className={cx('mw-initials', tone === 'accent' && 'mw-initials--accent')}>{text}</span>;
}
