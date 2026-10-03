import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { cx } from '../../components/ui';
import { APP_PATH } from '../../lib/navigation';
import { ease } from './motion';
import { BrandMark, CtaLink } from './primitives';

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How it works' },
];

export function LandingNavbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12));

  // Escape closes the mobile menu; widening past the breakpoint resets it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const media = window.matchMedia('(min-width: 820px)');
    const onMedia = () => { if (media.matches) setOpen(false); };
    document.addEventListener('keydown', onKey);
    media.addEventListener('change', onMedia);
    return () => {
      document.removeEventListener('keydown', onKey);
      media.removeEventListener('change', onMedia);
    };
  }, [open]);

  return (
    <motion.header
      className={cx('lp-nav', (scrolled || open) && 'is-scrolled')}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease, delay: 0.1 }}
    >
      <div className="lp-nav__inner">
        <a className="lp-nav__brand" href="/" aria-label="GUARDIAN X home">
          <BrandMark size={20} />
          <span>GUARDIAN X</span>
        </a>

        <nav className="lp-nav__links" aria-label="Primary">
          {LINKS.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>

        <div className="lp-nav__actions">
          <CtaLink href={APP_PATH} variant="ghost" size="sm">Sign in</CtaLink>
          <CtaLink href={APP_PATH} variant="primary" size="sm">Open dashboard</CtaLink>
        </div>

        <button
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
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 45 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'grid' }}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="lp-mobile-menu"
            className="lp-nav__sheet"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <motion.div
              className="lp-nav__sheet-inner"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } } }}
            >
              {LINKS.map((link) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className="lp-nav__sheet-link"
                  onClick={() => setOpen(false)}
                  variants={{ hidden: { opacity: 0, y: -6 }, show: { opacity: 1, y: 0 } }}
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.div className="lp-nav__sheet-actions" variants={{ hidden: { opacity: 0, y: -6 }, show: { opacity: 1, y: 0 } }}>
                <CtaLink href={APP_PATH} variant="secondary" size="lg">Sign in</CtaLink>
                <CtaLink href={APP_PATH} variant="primary" size="lg" arrow>Open dashboard</CtaLink>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
