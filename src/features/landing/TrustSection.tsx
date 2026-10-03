import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Check, ClipboardCheck, GraduationCap, ScanLine, UserRound } from 'lucide-react';
import { cx } from '../../components/ui';
import { featured } from './demoData';
import { PalmVisualization } from './PalmVisualization';
import { SectionIntro } from './primitives';

const NODES = [
  { label: 'Linked guardian', detail: featured.guardian, icon: UserRound },
  { label: 'Registered palm', detail: 'Presented for verification', icon: ScanLine },
  { label: 'Identity confirmation', detail: 'Guardian verified', icon: Check },
  { label: 'Student information', detail: `${featured.student} · ${featured.className}`, icon: GraduationCap },
  { label: 'Dismissal', detail: 'A connected request record', icon: ClipboardCheck },
];

export function TrustSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.75'] });
  const ring = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [24, -12]);
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = Math.min(4, Math.floor(p * 5));
    if (next !== activeRef.current) { activeRef.current = next; setActive(next); }
  });
  const current = reduce ? 4 : active;
  return (
    <section ref={ref} className="lp-section lp-trust" id="verification" aria-labelledby="trust-title">
      <div className="lp-container">
        <SectionIntro id="trust-title" eyebrow="04 / The verification connection"
          lines={['A verified guardian.', 'A connected student.']}
          lead="Identity, student information and dismissal belong to the same workflow. Each connection has a purpose." />
        <div className="lp-trust__diagram">
          <motion.div className="lp-trust__center" style={reduce ? undefined : { y }}>
            <div className="lp-trust__palm-frame">
              <span className="lp-trust__corner lp-trust__corner--tl" /><span className="lp-trust__corner lp-trust__corner--br" />
              <PalmVisualization state={current >= 2 ? 'verified' : current === 1 ? 'scanning' : 'idle'} progress={reduce ? undefined : ring} size={280} />
            </div>
            <span className="lp-trust__caption">GUARDIAN PALM VERIFICATION</span>
            <span className="lp-trust__subcaption">The connection at the heart of dismissal.</span>
          </motion.div>
          <div className="lp-flow-wrap">
            <span className="lp-flow__track" aria-hidden="true"><motion.span style={{ scaleY: reduce ? 1 : scrollYProgress }} /></span>
          <ol className="lp-flow">
            {NODES.map(({ label, detail, icon: Icon }, i) => (
              <li key={label} className={cx('lp-flow__node', i <= current && 'is-active', i >= 2 && current >= i && 'is-verified')}>
                <span className="lp-flow__dot" aria-hidden="true"><Icon size={16} strokeWidth={1.6} /></span>
                <span><strong>{label}</strong><small>{detail}</small></span>
                <span className="lp-flow__number mono">{String(i + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
