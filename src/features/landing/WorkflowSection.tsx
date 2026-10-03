import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { cx } from '../../components/ui';
import { ease, inView } from './motion';
import { SectionIntro } from './primitives';
import { WORKFLOW_STEPS, MobileWorkflowVisual, WorkflowDemo, workflowStep } from './WorkflowDemo';

export function WorkflowSection() {
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  const palmProgress = useTransform(scrollYProgress, [0.4, 0.6], [0.05, 1]);
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = workflowStep(p);
    if (!reduce && next !== stepRef.current) { stepRef.current = next; setStep(next); }
  });

  function goTo(index: number) {
    if (reduce) { setStep(index); return; }
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * ((index + 0.5) / WORKFLOW_STEPS.length), behavior: 'smooth' });
  }

  return (
    <section className="lp-section lp-workflow" id="how-it-works" aria-labelledby="workflow-title">
      <div className="lp-container">
        <SectionIntro id="workflow-title" eyebrow="02 / The dismissal workflow"
          lines={['One request.', 'A connected journey.']}
          lead="Follow Aarav’s dismissal, from the request details to guardian verification and student information." />
      </div>
      <div ref={track} className={cx('wf-track', reduce && 'wf-track--reduced')}>
        <div className="wf-sticky">
          <div className="lp-container wf-grid">
            <div className="wf-side">
              <span className="wf-side__eyebrow">FOLLOW THE REQUEST</span>
              <div className="wf-steps">
                <span className="wf-steps__rail" aria-hidden="true"><motion.span className="wf-steps__fill" style={{ scaleY: reduce ? (step + 1) / 5 : scrollYProgress }} /></span>
                <ol className="wf-steps__list">
                  {WORKFLOW_STEPS.map((s, i) => (
                    <li key={s.short}><button type="button" className={cx('wf-step', i === step && 'is-active', i < step && 'is-past')}
                      aria-current={i === step ? 'step' : undefined} onClick={() => goTo(i)}>
                      <span className="wf-step__n mono">{String(i + 1).padStart(2, '0')}</span>
                      <span className="wf-step__text"><strong>{s.text}</strong><span>{s.description}</span></span>
                    </button></li>
                  ))}
                </ol>
              </div>
              <span className="wf-side__hint">{reduce ? 'Select a step to explore' : 'Scroll to follow · Select a step to jump'}</span>
            </div>
            <motion.div className="wf-demo" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={inView} transition={{ duration: 0.7, ease }}>
              <WorkflowDemo step={step} progress={palmProgress} />
              <p className="wf-demo__note">Illustrative product workflow · Sample data</p>
            </motion.div>
          </div>
        </div>
      </div>
      <ol className="lp-container wf-mobile">
        {WORKFLOW_STEPS.map((s, i) => (
          <motion.li key={s.short} className="wf-mobile__step" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={inView} transition={{ duration: 0.6, ease }}>
            <div className="wf-mobile__heading"><span className="mono">{String(i + 1).padStart(2, '0')} / 05</span><h3>{s.text}</h3></div>
            <p>{s.description}</p>
            <MobileWorkflowVisual step={i} />
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
