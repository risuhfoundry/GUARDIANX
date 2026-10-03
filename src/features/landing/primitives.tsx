import type { MouseEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { cx } from '../../components/ui';
import { navigate, prefetchApp } from '../../lib/navigation';
import { ease, inView, rise, stagger } from './motion';

/* ------------------------------------------------------------------ links */

type LinkVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Anchor styled as a button. Internal paths use client-side navigation so the
 * application opens without a full reload; modified clicks (new tab, etc.) are
 * left to the browser.
 */
export function CtaLink({
  href, children, variant = 'primary', size = 'md', arrow = false, className, onClick,
}: {
  href: string;
  children: ReactNode;
  variant?: LinkVariant;
  size?: 'sm' | 'md' | 'lg';
  arrow?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const internal = href.startsWith('/');
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.();
    if (!internal || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href);
  }
  return (
    <a
      href={href}
      className={cx('lp-btn', `lp-btn--${variant}`, `lp-btn--${size}`, className)}
      onClick={handleClick}
      onMouseEnter={internal ? prefetchApp : undefined}
      onFocus={internal ? prefetchApp : undefined}
    >
      <span>{children}</span>
      {arrow && <ArrowRight className="lp-btn__arrow" size={15} strokeWidth={2} aria-hidden="true" />}
    </a>
  );
}

/* ------------------------------------------------------------------ brand */

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="lp-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M16 49V29a13 13 0 0 1 13-13h12" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m38 24 9 8-9 8" fill="none" stroke="var(--lp-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ----------------------------------------------------------------- status */

export type Tone = 'success' | 'pending' | 'danger' | 'accent' | 'neutral';

/** Mirrors the application's StatusIndicator: a dot and a short label. */
export function Status({ tone, children, live = false, className }: { tone: Tone; children: ReactNode; live?: boolean; className?: string }) {
  return (
    <span className={cx('lp-status', `lp-status--${tone}`, live && 'lp-status--live', className)}>
      <span className="lp-status__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- headings */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('lp-eyebrow', className)}>{children}</span>;
}

/**
 * Section intro: eyebrow, a multi-line display heading, optional lead.
 * Each line of the heading rises on its own for a measured entrance.
 */
export function SectionIntro({
  eyebrow, lines, lead, align = 'left', id, className,
}: {
  eyebrow?: string;
  lines: string[];
  lead?: ReactNode;
  align?: 'left' | 'center';
  id?: string;
  className?: string;
}) {
  return (
    <motion.div
      className={cx('lp-intro', `lp-intro--${align}`, className)}
      variants={stagger(0.09)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      {eyebrow && <motion.div variants={rise}><Eyebrow>{eyebrow}</Eyebrow></motion.div>}
      <h2 className="lp-h2" id={id}>
        {lines.map((line) => (
          <motion.span key={line} className="lp-line" variants={rise}>{line}</motion.span>
        ))}
      </h2>
      {lead && <motion.p className="lp-lead" variants={rise}>{lead}</motion.p>}
    </motion.div>
  );
}

/** Generic one-shot reveal wrapper. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: rise.hidden, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease, delay } } }}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      {children}
    </motion.div>
  );
}
