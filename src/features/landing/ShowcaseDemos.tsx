import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { ChevronDown, FileSpreadsheet, Plus, Search } from 'lucide-react';
import { cx } from '../../components/ui';
import { dismissalStatusTone } from '../../data/adminData';
import { demoGuardians, demoRequests, demoStudents, featured } from './demoData';
import { Initials, MockCard, MockField, MockWindow } from './MockWindow';
import { PalmVisualization } from './PalmVisualization';
import { Status } from './primitives';
import { ease } from './motion';

/* Rows cascade in once the table scrolls into view. */
const table = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } };
const row = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };
const inViewOnce = { once: true, margin: '0px 0px -15% 0px' } as const;

function Toolbar({ placeholder, filters, primary, secondary }: { placeholder: string; filters: string[]; primary: string; secondary?: string }) {
  return (
    <div className="mt-toolbar">
      <span className="mt-search"><Search size={13} />{placeholder}</span>
      {filters.map((f) => <span key={f} className="mt-select">{f}<ChevronDown size={12} /></span>)}
      <span className="mt-toolbar__spacer" />
      {secondary && <span className="mt-btn mt-btn--ghost"><FileSpreadsheet size={13} />{secondary}</span>}
      <span className="mt-btn"><Plus size={13} />{primary}</span>
    </div>
  );
}

/* --------------------------------------------------------------- students */

export function StudentDemo() {
  return (
    <MockWindow section="Students" label="Students screen with sample data: a searchable list of students with class and linked guardians.">
      <MockCard title="Student records" meta={`${demoStudents.length} of ${demoStudents.length} students`}>
        <Toolbar placeholder="Search name, admission no. or class" filters={['All classes']} secondary="Import Excel" primary="Add student" />
        <div className="mt-table mt-table--students">
          <div className="mt-tr mt-th"><span>Student</span><span>Class</span><span>Guardians</span><span>Status</span></div>
          <motion.div variants={table} initial="hidden" whileInView="show" viewport={inViewOnce}>
            {demoStudents.map((s, i) => (
              <motion.div key={s.admission} variants={row} className={cx('mt-tr', i === 0 && 'is-focus')}>
                <span className="mt-who"><Initials name={s.name} tone={i === 0 ? 'accent' : 'neutral'} /><span><strong>{s.name}</strong><small className="mono">{s.admission}</small></span></span>
                <span>{s.className}</span>
                <span className="mono">{s.guardians}</span>
                <span>{s.guardians > 0 ? <Status tone="success">Guardian linked</Status> : <Status tone="pending">No guardian</Status>}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </MockCard>
    </MockWindow>
  );
}

/* -------------------------------------------------------------- guardians */

export function GuardianDemo() {
  return (
    <MockWindow section="Guardians" label="Guardians screen with sample data: guardians with their linked student and palm registration.">
      <MockCard title="Guardian records" meta={`${demoGuardians.length} guardians`}>
        <Toolbar placeholder="Search guardian or student" filters={[]} primary="Add guardian" />
        <div className="mt-table mt-table--guardians">
          <div className="mt-tr mt-th"><span>Guardian</span><span>Linked student</span><span>Palm registration</span></div>
          <motion.div variants={table} initial="hidden" whileInView="show" viewport={inViewOnce}>
            {demoGuardians.map((g, i) => (
              <motion.div key={g.name} variants={row} className={cx('mt-tr', i === 0 && 'is-focus')}>
                <span className="mt-who"><Initials name={g.name} tone={i === 0 ? 'accent' : 'neutral'} /><span><strong>{g.name}</strong></span></span>
                <span className="mt-ward"><strong>{g.ward}</strong><small>{g.wardClass}</small></span>
                <span><Status tone={g.palm === 'Registered' ? 'success' : 'pending'}>{g.palm}</Status></span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </MockCard>
    </MockWindow>
  );
}

/* ------------------------------------------------------------------ palms */

export function PalmDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -25% 0px' });
  const reduce = useReducedMotion();
  const registered = seen || reduce;

  return (
    <div ref={ref}>
      <MockWindow section="Guardians" title="Rajesh Sharma" label="Guardian palm registration screen with sample data: palm status Registered.">
        <div className="pd">
          <MockCard title="Guardian details" className="pd__details">
            <div className="wd-verified-name">
              <Initials name={featured.guardian} tone="accent" />
              <span><strong>{featured.guardian}</strong></span>
            </div>
            <div className="wd-fields wd-fields--stack">
              <MockField label="Linked student">{featured.student}</MockField>
              <MockField label="Class">{featured.className}</MockField>
              <MockField label="Palm status">
                {registered ? <Status tone="success">Registered</Status> : <Status tone="pending">Not registered</Status>}
              </MockField>
            </div>
          </MockCard>
          <MockCard title="Registered palm" className="pd__palm" meta={registered ? <Status tone="success">Registered</Status> : undefined}>
            <PalmVisualization state={registered ? 'verified' : 'idle'} />
            <span className="pd__caption">Used during dismissal verification for {featured.student}.</span>
          </MockCard>
        </div>
      </MockWindow>
    </div>
  );
}

/* -------------------------------------------------------------- dismissal */

export function DismissalDemo() {
  return (
    <MockWindow section="Dismissal Requests" label="Dismissal requests screen with sample data: a new request form and a list of requests with their status.">
      <div className="dd">
        <MockCard title="New dismissal request" className="dd__form">
          <div className="dd__fields">
            <span className="dd__input"><small>Student</small><strong>{featured.student} · {featured.className}</strong><ChevronDown size={12} /></span>
            <span className="dd__input"><small>Guardian</small><strong>{featured.guardian}</strong><ChevronDown size={12} /></span>
            <span className="mt-btn dd__send">Send request</span>
          </div>
        </MockCard>
        <MockCard title="Dismissal requests" meta={`${demoRequests.length} today`}>
          <div className="mt-table mt-table--requests">
            <div className="mt-tr mt-th"><span>Student</span><span>Class</span><span>Guardian</span><span>Time</span><span>Status</span></div>
            <motion.div variants={table} initial="hidden" whileInView="show" viewport={inViewOnce}>
              {demoRequests.map((r, i) => (
                <motion.div key={r.student} variants={row} className={cx('mt-tr', i === 0 && 'is-focus')}>
                  <span className="mt-who"><span><strong>{r.student}</strong></span></span>
                  <span>{r.className}</span>
                  <span>{r.guardian}</span>
                  <span className="mono">{r.time}</span>
                  <span><Status tone={dismissalStatusTone(r.status)} live={r.status === 'Pending'}>{r.status}</Status></span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </MockCard>
      </div>
    </MockWindow>
  );
}
