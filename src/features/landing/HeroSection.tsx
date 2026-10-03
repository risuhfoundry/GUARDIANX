import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown } from 'lucide-react';
import { APP_PATH } from '../../lib/navigation';
import { HeroProduct } from './HeroProduct';
import { MotionSurface } from './MotionSurface';
import { ease, rise, stagger } from './motion';
import { CtaLink, Eyebrow } from './primitives';

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.975, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [5, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -36]);
  const glow = useTransform(scrollYProgress, [0, 0.8], [0.8, 0.25]);

  return (
    <section ref={ref} className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-hero__grid" aria-hidden="true" />
      <motion.div className="lp-hero__light" style={{ opacity: reduce ? 0.6 : glow }} aria-hidden="true" />
      <motion.div className="lp-container lp-hero__copy" initial="hidden" animate="show" variants={stagger(0.12, 0.18)}>
        <motion.div className="lp-hero__eyebrow" variants={rise}>
          <Eyebrow><span className="lp-hero__pip" aria-hidden="true" />Guardian-verified student dismissal</Eyebrow>
        </motion.div>
        <h1 className="lp-h1" id="hero-title">
          {['Student dismissal.', 'Guardian verified.'].map((line, i) => (
            <span className="lp-hero__line-mask" key={line}>
              <motion.span className={i === 1 ? 'lp-line lp-line--dim' : 'lp-line'}
                variants={{ hidden: { y: reduce ? 0 : '105%', opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.9, ease } } }}>
                {line}
              </motion.span>
            </span>
          ))}
        </h1>
        <div className="lp-hero__support">
          <motion.p className="lp-hero__lead" variants={rise}>
            Connect students with their guardians. Bring registered palm verification into one focused dismissal workflow.
          </motion.p>
          <motion.div className="lp-hero__ctas" variants={rise}>
            <CtaLink href="#how-it-works" variant="primary" size="lg" arrow>See how it works</CtaLink>
            <CtaLink href={APP_PATH} variant="secondary" size="lg">Sign in</CtaLink>
          </motion.div>
        </div>
      </motion.div>
      <div className="lp-container lp-hero__stage">
        <motion.div className="lp-hero__product" style={reduce ? undefined : { scale, rotateX, y }}>
          <motion.div initial={reduce ? false : { opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.65, ease }}>
            <div className="lp-hero__stage-label"><span>THE DISMISSAL WORKSPACE</span><span>PRODUCT PREVIEW · SAMPLE DATA</span></div>
            <MotionSurface><HeroProduct /></MotionSurface>
          </motion.div>
        </motion.div>
      </div>
      <div className="lp-container lp-hero__foot">
        <span>Students. Guardians. One connected workflow.</span>
        <a href="#product">Explore the system <ArrowDown size={13} aria-hidden="true" /></a>
      </div>
    </section>
  );
}
