import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { cx } from '../../components/ui';
import { demoRequests, featured } from './demoData';
import { Initials, MockCard, MockField, MockWindow } from './MockWindow';
import { PalmVisualization, type PalmState } from './PalmVisualization';
import { Status } from './primitives';
import { ease } from './motion';

type Phase = 'idle' | 'detected' | 'verifying' | 'verified' | 'presented';

const PHASES: Phase[] = ['idle', 'detected', 'verifying', 'verified', 'presented'];
const DURATION: Record<Phase, number> = { idle: 1700, detected: 1500, verifying: 2300, verified: 1300, presented: 3800 };
const CAPTION: Record<Phase, string> = {
  idle: 'Awaiting palm',
  detected: 'Palm presented',
  verifying: 'Verifying palm',
  verified: 'Verified',
  presented: 'Verified',
};
const PALM: Record<Phase, PalmState> = {
  idle: 'idle', detected: 'detected', verifying: 'scanning', verified: 'verified', presented: 'verified',
};

/**
 * Cycles the hero mockup through a dismissal. Pure presentation: a timer, not
 * a backend. Pauses off-screen, and holds the final state for reduced motion.
 */
function usePhaseLoop(active: boolean, reduce: boolean | null): Phase {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce || !active) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % PHASES.length), DURATION[PHASES[index]]);
    return () => window.clearTimeout(timer);
  }, [index, active, reduce]);
  return reduce ? 'presented' : PHASES[index];
}

export function HeroProduct() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { margin: '-10% 0px' });
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const phase = usePhaseLoop(visible && !paused, reduce);
  const step = PHASES.indexOf(phase);
  const approved = step >= 3;
  const guardianLit = step >= 1;

  return (
    <div ref={ref} className={cx('hero-product', paused && 'is-paused')}>
      <MockWindow
        section="Dismissal Requests"
        title="Dismissal"
        label={`Product demonstration with sample data: a dismissal request for ${featured.student}, class ${featured.className}, moving from awaiting guardian to verified.`}
      >
        <div className="hp">
          <div className="hp__col">
            <MockCard title="Dismissal request" meta={<span className="mono">DR-1042 · {featured.time}</span>}>
              <div className="hp-student">
                <Initials name={featured.student} tone="accent" />
                <div>
                  <strong>{featured.student}</strong>
                  <small>{featured.classLong} · {featured.admission}</small>
                </div>
              </div>
              <div className="hp-fields">
                <MockField label="Requested by">{featured.teacher}</MockField>
                <MockField label="Status">
                  <Status tone="pending">Pending</Status>
                </MockField>
              </div>
            </MockCard>

            <MockCard title="Linked guardians" meta="2">
              <div className="hp-list">
                <div className={cx('hp-row', guardianLit && 'is-lit')}>
                  <Initials name={featured.guardian} />
                  <span className="hp-row__name"><strong>{featured.guardian}</strong><small>Linked guardian</small></span>
                  {approved ? <Status tone="success">Verified</Status> : <Status tone="neutral">Palm registered</Status>}
                </div>
                <div className="hp-row">
                  <Initials name={featured.otherGuardian} />
                  <span className="hp-row__name"><strong>{featured.otherGuardian}</strong><small>Linked guardian</small></span>
                  <Status tone="neutral">Palm registered</Status>
                </div>
              </div>
            </MockCard>

            <MockCard title="Today" meta="Recent requests" className="hp-recent">
              <div className="hp-list hp-list--dense">
                {demoRequests.slice(1, 4).map((request) => (
                  <div key={request.student} className="hp-row hp-row--dense">
                    <span className="hp-row__name"><strong>{request.student}</strong><small>{request.className} · {request.guardian}</small></span>
                    <span className="hp-row__time mono">{request.time}</span>
                    <Status tone="success">{request.status}</Status>
                  </div>
                ))}
              </div>
            </MockCard>
          </div>

          <MockCard className="hp-verify" title="Palm verification" meta={<Status tone={approved ? 'success' : guardianLit ? 'accent' : 'neutral'} live={!approved && guardianLit}>{approved ? 'Verified' : 'Preview'}</Status>}>
            <PalmVisualization state={PALM[phase]} animateScan={!paused} className="hp-verify__palm" />
            <div className="hp-verify__caption">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.strong
                  key={CAPTION[phase]}
                  className={cx(approved && 'is-verified')}
                  initial={{ opacity: 0, y: 8, filter: reduce ? 'none' : 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: reduce ? 'none' : 'blur(4px)' }}
                  transition={{ duration: 0.4, ease }}
                >
                  {CAPTION[phase]}
                </motion.strong>
              </AnimatePresence>
              <div className="hp-dots" aria-hidden="true">
                {PHASES.map((p, i) => <span key={p} className={cx(i <= step && 'is-on', approved && 'is-done')} />)}
              </div>
            </div>
            <motion.div
              className="hp-presented"
              initial={false}
              animate={phase === 'presented' ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0.18, y: 6, filter: reduce ? 'none' : 'blur(3px)' }}
              transition={{ duration: 0.6, ease }}
            >
              <span className="hp-presented__label">Student</span>
              <div className="hp-presented__grid">
                <strong>{featured.student}</strong>
                <span className="mono">{featured.className}</span>
              </div>
              <span className="hp-presented__meta">Guardian · {featured.guardian}</span>
            </motion.div>
          </MockCard>
        </div>
      </MockWindow>
      <div className="hp-preview-controls"><span>Illustrative workflow · Sample data</span>
        {!reduce && <button type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? 'Play preview' : 'Pause preview'}<span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span></button>}
      </div>
    </div>
  );
}
