import { motion } from 'motion/react';
import { APP_PATH } from '../../lib/navigation';
import { inView, rise, stagger } from './motion';
import { CtaLink, SectionIntro } from './primitives';

export function FinalCta() {
  return (
    <section className="lp-section lp-cta">
      <div className="lp-cta__glow" aria-hidden="true" />
      <div className="lp-container lp-cta__inner">
        <SectionIntro
          eyebrow="GUARDIAN X"
          lines={['A clearer way', 'to manage dismissal.']}
          lead="Keep students, guardians and the dismissal workflow connected in one focused workspace."
          align="center"
        />
        <motion.div
          className="lp-cta__actions"
          variants={stagger(0.1, 0.3)}
          initial="hidden"
          whileInView="show"
          viewport={inView}
        >
          <motion.div variants={rise}>
            <CtaLink href={APP_PATH} variant="primary" size="lg" arrow>Open GUARDIAN X</CtaLink>
          </motion.div>
          <motion.div variants={rise}>
            <CtaLink href="#how-it-works" variant="secondary" size="lg">Revisit the workflow</CtaLink>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer__inner">
        <div className="lp-footer__brand">
          <strong>GUARDIAN X</strong>
          <small>Guardian-verified student dismissal.</small>
        </div>
        <nav className="lp-footer__nav" aria-label="Footer">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href={APP_PATH}>Sign in</a>
        </nav>
        <div className="lp-footer__copy">
          © {new Date().getFullYear()} GUARDIAN X
        </div>
      </div>
    </footer>
  );
}
