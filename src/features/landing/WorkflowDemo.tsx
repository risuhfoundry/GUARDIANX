import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';
import { cx } from '../../components/ui';
import { featured } from './demoData';
import { Initials, MockCard, MockField, MockWindow } from './MockWindow';
import { PalmVisualization } from './PalmVisualization';
import { Status, type Tone } from './primitives';
import { ease } from './motion';

export const WORKFLOW_STEPS = [
  { short: 'Request', text: 'Teacher requests dismissal.' },
  { short: 'Guardian', text: 'The associated guardian is identified.' },
  { short: 'Palm', text: 'Guardian palm verification takes place.' },
  { short: 'Verified', text: 'Student information is presented during the dismissal process.' },
  { short: 'Dismissal', text: 'Dismissal workflow is completed.' },
] as const;

const STATUS: Array<{ tone: Tone; label: string; live?: boolean }> = [
  { tone: 'pending', label: 'Awaiting verification', live: true },
  { tone: 'accent', label: 'Ready for verification' },
  { tone: 'accent', label: 'Verifying', live: true },
  { tone: 'success', label: 'Verified' },
  { tone: 'success', label: 'Completed' },
];

/* ----------------------------------------------------------------- panels */

function RequestPanel() {
  return (
    <div className="wd-panel wd-request">
      <MockCard title="Dismissal request" meta={<span className="mono">DR-1042</span>}>
        <div className="wd-fields">
          <MockField label="Student">{featured.student}</MockField>
          <MockField label="Class">{featured.className}</MockField>
          <MockField label="Requested by">{featured.teacher}</MockField>
          <MockField label="Requested at"><span className="mono">{featured.time}</span></MockField>
        </div>
      </MockCard>
      <div className="wd-note">
        <span>Status</span>
        <Status tone="pending" live>Awaiting verification</Status>
      </div>
    </div>
  );
}

function GuardianPanel() {
  return (
    <div className="wd-panel">
      <MockCard title="Guardian" meta="Linked to this student">
        <div className="hp-list">
          <div className="hp-row is-lit">
            <Initials name={featured.guardian} tone="accent" />
            <span className="hp-row__name"><strong>{featured.guardian}</strong><small>Palm registered</small></span>
            <Status tone="accent">Linked guardian</Status>
          </div>
          <div className="hp-row is-dim">
            <Initials name={featured.otherGuardian} />
            <span className="hp-row__name"><strong>{featured.otherGuardian}</strong><small>Palm registered</small></span>
            <Status tone="neutral">Linked</Status>
          </div>
        </div>
      </MockCard>
      <div className="wd-note">
        <span>Verification</span>
        <Status tone="accent">Ready</Status>
      </div>
    </div>
  );
}

function PalmPanel({ verified }: { verified: boolean }) {
  return (
    <div className="wd-panel wd-palm">
      <div className="wd-palm__visual">
        <PalmVisualization state={verified ? 'verified' : 'scanning'} />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={verified ? 'v' : 's'}
            className={cx('wd-palm__label', verified && 'is-verified')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease }}
          >
            {verified ? 'Verified' : 'Verifying palm'}
          </motion.span>
        </AnimatePresence>
      </div>
      <MockCard title={verified ? 'Student' : 'Guardian'} className="wd-palm__card">
        <AnimatePresence mode="wait" initial={false}>
          {verified ? (
            <motion.div key="student" className="wd-fields wd-fields--stack" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease }}>
              <div className="wd-verified-name">
                <Initials name={featured.student} tone="accent" />
                <span><strong>{featured.student}</strong><small>{featured.classLong}</small></span>
              </div>
              <MockField label="Class">{featured.className}</MockField>
              <MockField label="Guardian">{featured.guardian}</MockField>
              <MockField label="Guardian status"><Status tone="success">Verified</Status></MockField>
            </motion.div>
          ) : (
            <motion.div key="guardian" className="wd-fields wd-fields--stack" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease }}>
              <MockField label="Guardian">{featured.guardian}</MockField>
              <MockField label="Palm">Registered</MockField>
              <MockField label="Verification"><Status tone="accent" live>In progress</Status></MockField>
            </motion.div>
          )}
        </AnimatePresence>
      </MockCard>
    </div>
  );
}

function DismissalPanel() {
  const events = [
    { label: 'Dismissal requested', meta: featured.teacher, time: '2:41 PM' },
    { label: 'Guardian verified', meta: featured.guardian, time: '2:44 PM' },
    { label: 'Dismissal completed', meta: `${featured.student} · ${featured.className}`, time: '2:45 PM' },
  ];
  return (
    <div className="wd-panel wd-done">
      <div className="wd-done__hero">
        <motion.span
          className="wd-done__check"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        >
          <Check size={18} strokeWidth={2.4} />
        </motion.span>
        <div>
          <strong>Dismissal completed</strong>
          <small>{featured.student} left with {featured.guardian}.</small>
        </div>
      </div>
      <MockCard title="Request history">
        <ol className="wd-timeline">
          {events.map((event, i) => (
            <motion.li
              key={event.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease, delay: 0.15 + i * 0.1 }}
            >
              <span className="wd-timeline__dot" />
              <span className="wd-timeline__copy"><strong>{event.label}</strong><small>{event.meta}</small></span>
              <span className="mono wd-timeline__time">{event.time}</span>
            </motion.li>
          ))}
        </ol>
      </MockCard>
    </div>
  );
}

/* ------------------------------------------------------------------- demo */

/**
 * One request screen that evolves through the five workflow steps. The frame,
 * header and progress stay put; only the stage content changes, so it reads
 * as a single product screen over time rather than five slides.
 */
export function WorkflowDemo({ step }: { step: number }) {
  const reduce = useReducedMotion();
  const status = STATUS[step];
  // Steps 3 and 4 (palm → verified) share one panel so the palm never re-mounts.
  const stageKey = step === 2 || step === 3 ? 'palm' : String(step);

  let panel: ReactNode;
  if (step === 0) panel = <RequestPanel />;
  else if (step === 1) panel = <GuardianPanel />;
  else if (step === 4) panel = <DismissalPanel />;
  else panel = <PalmPanel verified={step === 3} />;

  return (
    <MockWindow
      section="Dismissal Requests"
      title="Request DR-1042"
      className="wd"
      label={`Workflow demonstration with sample data, step ${step + 1} of 5: ${WORKFLOW_STEPS[step].text}`}
    >
      <div className="wd-head">
        <div className="wd-head__who">
          <Initials name={featured.student} tone="accent" />
          <span><strong>{featured.student}</strong><small>Class {featured.className} · {featured.admission}</small></span>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={status.label}
            initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
            transition={{ duration: 0.35, ease }}
          >
            <Status tone={status.tone} live={status.live}>{status.label}</Status>
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="wd-progress" aria-hidden="true">
        {WORKFLOW_STEPS.map((s, i) => (
          <div key={s.short} className={cx('wd-progress__seg', i <= step && 'is-on', i === step && 'is-current')}>
            <span className="wd-progress__bar">
              <motion.span
                className="wd-progress__fill"
                initial={false}
                animate={{ scaleX: i <= step ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : 0.6, ease }}
              />
            </span>
            <span className="wd-progress__label">{s.short}</span>
          </div>
        ))}
      </div>

      <div className="wd-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stageKey}
            className="wd-stage__inner"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.985, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease }}
          >
            {panel}
          </motion.div>
        </AnimatePresence>
      </div>
    </MockWindow>
  );
}
