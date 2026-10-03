import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion, useIsPresent, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { cx } from '../../components/ui';
import { APP_PATH } from '../../lib/navigation';
import { ease } from './motion';
import { BrandMark, CtaLink, focusAnchorTarget } from './primitives';

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#verification', label: 'Verification' },
];

function MobileMenu({ active, onClose }: { active: string; onClose: () => void }) {
  const present = useIsPresent();
  const reduce = useReducedMotion();
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : -6, transition: { duration: 0.16, ease } },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease } },
  };

  function followLink(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    focusAnchorTarget(href);
    onClose();
  }

  return (
    <motion.nav
      id="lp-mobile-menu"
      className="lp-nav__sheet"
      aria-label="Mobile primary"
      aria-hidden={!present || undefined}
      inert={!present}
      initial="hidden"
      animate="show"
      exit="hidden"
      variants={{
        hidden: {
          opacity: 0, y: reduce ? 0 : -8,
          transition: { duration: 0.18, ease, when: 'afterChildren', staggerChildren: reduce ? 0 : 0.025, staggerDirection: -1 },
        },
        show: {
          opacity: 1, y: 0,
          transition: { duration: 0.24, ease, when: 'beforeChildren', staggerChildren: reduce ? 0 : 0.045 },
        },
      }}
    >
      <div className="lp-nav__sheet-inner">
        {LINKS.map((link) => (
          <motion.a
            key={link.href}
            href={link.href}
            className={cx('lp-nav__sheet-link', active === link.href && 'is-active')}
            aria-current={active === link.href ? 'location' : undefined}
            onClick={(event) => followLink(event, link.href)}
            variants={item}
          >
            {link.label}
          </motion.a>
        ))}
        <motion.div className="lp-nav__sheet-actions" variants={item}>
          <CtaLink href={APP_PATH} variant="secondary" size="lg" onClick={onClose}>Sign in</CtaLink>
          <CtaLink href={APP_PATH} variant="primary" size="lg" arrow onClick={onClose}>Open dashboard</CtaLink>
        </motion.div>
      </div>
    </motion.nav>
  );
}

export function LandingNavbar() {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(() => window.scrollY > 12);
  const [open, setOpen] = useState(false);
  const activeRef = useRef(active);
  const scrolledRef = useRef(scrolled);

  const updateActive = useCallback((href: string) => {
    if (href === activeRef.current) return;
    activeRef.current = href;
    setActive(href);
  }, []);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const nextScrolled = y > 12;
    if (nextScrolled !== scrolledRef.current) {
      scrolledRef.current = nextScrolled;
      setScrolled(nextScrolled);
    }
    if (y < 200) updateActive('');
  });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) updateActive(entry.target.getAttribute('data-nav-section') ?? `#${entry.target.id}`);
    }, { rootMargin: '-15% 0px -60% 0px' });
    for (const section of document.querySelectorAll(`${LINKS.map((link) => link.href).join(', ')}, [data-nav-section]`)) observer.observe(section);
    return () => observer.disconnect();
  }, [updateActive]);

  // Escape closes the mobile menu; widening past the breakpoint resets it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    const media = window.matchMedia('(min-width: 820px)');
    const onMedia = () => {
      if (!media.matches) return;
      if (document.activeElement && document.getElementById('lp-mobile-menu')?.contains(document.activeElement)) {
        header.current?.querySelector<HTMLAnchorElement>('.lp-nav__links a')?.focus();
      }
      setOpen(false);
    };
    const onOutside = (event: PointerEvent) => { if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);
    media.addEventListener('change', onMedia);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onKey);
      media.removeEventListener('change', onMedia);
    };
  }, [open]);

  return (
    <motion.header
      ref={header}
      className={cx('lp-nav', (scrolled || open) && 'is-scrolled')}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      initial={{ opacity: 0, y: reduce ? 0 : -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease, delay: 0.1 }}
    >
      <div className="lp-nav__inner">
        <a className="lp-nav__brand" href="/" aria-label="GUARDIAN X home">
          <BrandMark size={20} />
          <span>GUARDIAN X</span>
        </a>

        <nav className="lp-nav__links" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className={cx(active === link.href && 'is-active')}
              aria-current={active === link.href ? 'location' : undefined}
              onClick={(event) => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) focusAnchorTarget(link.href);
              }}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="lp-nav__actions">
          <CtaLink href={APP_PATH} variant="ghost" size="sm">Sign in</CtaLink>
          <CtaLink href={APP_PATH} variant="primary" size="sm">Open dashboard</CtaLink>
        </div>

        <button
          ref={toggle}
          type="button"
          className="lp-nav__toggle"
          aria-expanded={open}
          aria-controls="lp-mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? 'x' : 'menu'}
              initial={{ opacity: 0, rotate: reduce ? 0 : -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: reduce ? 0 : 45 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'grid' }}
            >
              {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {open && <MobileMenu active={active} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </motion.header>
  );
}
