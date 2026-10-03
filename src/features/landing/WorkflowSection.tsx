import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react';
import { cx } from '../../components/ui';
import { ease } from './motion';
import { SectionIntro } from './primitives';
import { WORKFLOW_STEPS, WorkflowDemo } from './WorkflowDemo';

const COUNT = WORKFLOW_STEPS.length;

/**
 * Scroll-driven workflow. The track is tall; a sticky stage inside it holds the
 * step list and the demo screen while scroll progress selects the step.
 */
export function WorkflowSection() {
  const track = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  const rail = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.6 });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = Math.min(COUNT - 1, Math.max(0, Math.floor(p * COUNT * 0.999)));
    setStep((current) => (current === next ? current : next));
  });

  /** Jump the page to the scroll position that shows a given step. */
  function goTo(index: number) {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * ((index + 0.5) / COUNT), behavior: 'smooth' });
  }

  return (
    <section className="lp-section lp-workflow" id="how-it-works" aria-labelledby="workflow-title">
      <div className="lp-container">
        <SectionIntro
          id="workflow-title"
          eyebrow="How it works"
          lines={['From request', 'to verified dismissal.']}
          lead="Five steps, one screen. Scroll to follow a single request from the classroom to the gate."
        />
      </div>

      <div ref={track} className="wf-track" style={{ height: `${COUNT * 85 + 40}vh` }}>
        <div className="wf-sticky">
          <div className="lp-container wf-grid">
            <div className="wf-side">
              <div className="wf-steps">
                <span className="wf-steps__rail" aria-hidden="true">
                  <motion.span className="wf-steps__fill" style={{ scaleY: rail }} />
                </span>
                <ol className="wf-steps__list">
                  {WORKFLOW_STEPS.map((s, i) => (
                    <li key={s.short}>
                      <button
                        type="button"
                        className={cx('wf-step', i === step && 'is-active', i < step && 'is-past')}
                        aria-current={i === step ? 'step' : undefined}
                        onClick={() => goTo(i)}
                      >
                        <span className="wf-step__n mono">{String(i + 1).padStart(2, '0')}</span>
                        <span className="wf-step__text">{s.text}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Compact caption for narrow screens, where the list is hidden. */}
              <div className="wf-caption" aria-live="polite">
                <span className="wf-caption__n mono">{String(step + 1).padStart(2, '0')} / {String(COUNT).padStart(2, '0')}</span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={step}
                    className="wf-caption__text"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease }}
                  >
                    {WORKFLOW_STEPS[step].text}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            <motion.div
              className="wf-demo"
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '0px 0px -20% 0px' }}
              transition={{ duration: 1, ease }}
            >
              <WorkflowDemo step={step} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
