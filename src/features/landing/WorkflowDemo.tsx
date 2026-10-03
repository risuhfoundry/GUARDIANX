import { motion, useReducedMotion, type MotionValue } from 'motion/react';
import { Check, ClipboardList, ScanLine, UserRound } from 'lucide-react';
import { cx } from '../../components/ui';
import { featured } from './demoData';
import { Initials, MockCard, MockField, MockWindow } from './MockWindow';
import { PalmVisualization, type PalmState } from './PalmVisualization';
import { Status, type Tone } from './primitives';
import { ease } from './motion';

export const WORKFLOW_STEPS = [
  { short: 'Request', text: 'One request holds the details.', description: 'Student, class, guardian and teacher are associated with a dismissal request.' },
  { short: 'Guardian', text: 'The guardian is connected.', description: 'Linked guardians and their palm registration provide the context for verification.' },
  { short: 'Palm', text: 'A registered palm is verified.', description: 'The guardian presents their palm as part of the dismissal workflow.' },
  { short: 'Identity', text: 'The guardian is confirmed.', description: 'A verified result confirms the guardian associated with the registered palm.' },
  { short: 'Student', text: 'The student comes into view.', description: 'The verification result shows the student’s name and class during dismissal.' },
] as const;

export type WorkflowState = 'request' | 'guardian' | 'scanning' | 'verified' | 'student-confirmed';
const STATES: readonly WorkflowState[] = ['request', 'guardian', 'scanning', 'verified', 'student-confirmed'];
const STATUS: ReadonlyArray<{ tone: Tone; label: string }> = [
  { tone: 'pending', label: 'Pending' },
  { tone: 'accent', label: 'Guardian linked' },
  { tone: 'accent', label: 'Verifying palm' },
  { tone: 'success', label: 'Guardian verified' },
  { tone: 'success', label: 'Student displayed' },
];
const PALM: readonly PalmState[] = ['idle', 'detected', 'scanning', 'verified', 'verified'];

/** Scroll is the clock: a position always maps to the same supported workflow state. */
export function workflowStep(progress: number): number {
  return Math.min(STATES.length - 1, Math.max(0, Math.floor(progress * STATES.length)));
}

/** All stages share this screen, palm and identity fields; nothing replaces the whole panel. */
export function WorkflowDemo({ step, progress }: { step: number; progress?: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const status = STATUS[step];
  const verified = step >= 3;
  const presented = step === 4;
  return (
    <MockWindow section="Dismissal Requests" title="Request DR-1042" className="wd"
      label={`Illustrative dismissal workflow with sample data. ${WORKFLOW_STEPS[step].text}`}>
      <div className="wd-head">
        <div className="wd-head__who"><Initials name={featured.student} tone="accent" />
          <span><strong>{featured.student}</strong><small>Class {featured.className} · {featured.admission}</small></span>
        </div>
        <Status tone={status.tone}>{status.label}</Status>
      </div>
      <div className="wd-progress" aria-hidden="true">
        {WORKFLOW_STEPS.map((s, i) => (
          <div key={s.short} className={cx('wd-progress__seg', i <= step && 'is-on', i === step && 'is-current')}>
            <span className="wd-progress__bar"><motion.span className="wd-progress__fill" initial={false}
              animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.45, ease }} /></span>
            <span className="wd-progress__label">{s.short}</span>
          </div>
        ))}
      </div>
      <div className="wd-scene" data-state={STATES[step]}>
        <MockCard title="Request details" className="wd-record" meta={<ClipboardList size={14} />}>
          <div className="wd-fields">
            <MockField label="Student">{featured.student}</MockField>
            <MockField label="Class">{featured.className}</MockField>
            <MockField label="Requested by">{featured.teacher}</MockField>
            <MockField label="Requested at"><span className="mono">{featured.time}</span></MockField>
          </div>
          <div className={cx('wd-guardian', step >= 1 && 'is-active')}>
            <Initials name={featured.guardian} />
            <span><strong>{featured.guardian}</strong><small>Linked guardian · Palm registered</small></span>
            {verified && <Check size={16} className="wd-success" aria-hidden="true" />}
          </div>
        </MockCard>
        <div className="wd-verification">
          <span className="wd-verification__label">GUARDIAN PALM VERIFICATION</span>
          <PalmVisualization state={PALM[step]} progress={reduce ? undefined : progress} />
          <span className={cx('wd-verification__caption', verified && 'wd-success')}>
            {presented ? 'Student information displayed' : verified ? 'Guardian identity confirmed' : step === 2 ? 'Verifying registered palm' : 'Awaiting guardian palm'}
          </span>
        </div>
        <motion.div className={cx('wd-student', verified && 'is-confirmed')} initial={false}
          animate={{ opacity: presented ? 1 : 0.38, y: reduce ? 0 : presented ? 0 : 5 }} transition={{ duration: 0.5, ease }}>
          <span className="wd-student__icon">{presented ? <Check size={18} /> : <UserRound size={18} />}</span>
          <div><small>{presented ? 'STUDENT INFORMATION DISPLAYED' : 'STUDENT INFORMATION'}</small><strong>{featured.student}</strong><span>Class {featured.className} · Guardian: {featured.guardian}</span></div>
          <span className="wd-student__state">{presented ? 'Student displayed' : verified ? 'Verified guardian' : 'Awaiting verification'}</span>
        </motion.div>
      </div>
    </MockWindow>
  );
}

/** Mobile uses a readable timeline rather than trapping a tall screen in a sticky viewport. */
export function MobileWorkflowVisual({ step }: { step: number }) {
  if (step === 2 || step === 3) return (
    <div className="wf-mobile__verification">
      <PalmVisualization state={step === 2 ? 'scanning' : 'verified'} size={156} />
      <div><small>{step === 2 ? 'REGISTERED GUARDIAN' : 'GUARDIAN IDENTITY'}</small>
        <strong>{featured.guardian}</strong>
        <span>{step === 2 ? 'Palm verification in progress' : `Linked to ${featured.student}`}</span>
        <Status tone={step === 2 ? 'accent' : 'success'}>{step === 2 ? 'Verifying palm' : 'Guardian verified'}</Status>
      </div>
    </div>
  );
  const Icon = step === 4 ? Check : step === 1 ? UserRound : ScanLine;
  return (
    <div className={cx('wf-mobile__record', step === 4 && 'is-complete')}>
      <span className="wf-mobile__icon"><Icon size={20} /></span>
      <div><small>{step === 4 ? 'STUDENT INFORMATION DISPLAYED' : step === 1 ? 'LINKED GUARDIAN' : 'REQUEST DR-1042'}</small>
        <strong>{step === 1 ? featured.guardian : featured.student}</strong>
        <span>{step === 1 ? `${featured.student} · Palm registered` : `Class ${featured.className} · ${step === 4 ? featured.guardian : featured.teacher}`}</span>
      </div>
    </div>
  );
}
