import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { cx } from '../../components/ui';
import { inView, rise, stagger } from './motion';
import { Eyebrow, SectionIntro } from './primitives';
import { DismissalDemo, GuardianDemo, PalmDemo, StudentDemo } from './ShowcaseDemos';
import { MotionSurface } from './MotionSurface';

interface Feature {
  eyebrow: string;
  title: string[];
  body: string;
  points: string[];
  visual: ReactNode;
}

const FEATURES: Feature[] = [
  {
    eyebrow: 'Student records',
    title: ['Students,', 'organized.'],
    body: 'Find a student, see their class and understand the guardian connections behind each record.',
    points: ['Search by name or admission number', 'Filter the roster by class', 'View linked guardians and palm status'],
    visual: <StudentDemo />,
  },
  {
    eyebrow: 'Guardian directory',
    title: ['Guardians,', 'connected.'],
    body: 'See each guardian alongside their linked students, with the details that matter at dismissal.',
    points: ['Linked students and their classes', 'Palm registration state at a glance', 'Search by guardian or student name'],
    visual: <GuardianDemo />,
  },
  {
    eyebrow: 'Registered guardian palms',
    title: ['Registered for', 'verification.'],
    body: 'See whether a guardian’s palm is registered, alongside the student connection it belongs to.',
    points: ['Registered or not registered, clearly shown', 'Palm status within the guardian record', 'Linked student and class information'],
    visual: <PalmDemo />,
  },
  {
    eyebrow: 'Dismissal requests',
    title: ['Dismissal,', 'made clear.'],
    body: 'Review the people behind each dismissal request and see where it stands, from pending to completed.',
    points: ['Teacher and request time in context', 'Student, class and linked guardian', 'Pending, approved, rejected or completed'],
    visual: <DismissalDemo />,
  },
];

/** The visual eases from slightly small and low to full size as it reaches centre. */
function ScrollVisual({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.94, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 60, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.6, 1]);
  return (
    <motion.div ref={ref} className="sc-visual" style={reduce ? undefined : { scale, y, opacity }}>
      <MotionSurface>{children}</MotionSurface>
    </motion.div>
  );
}

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  return (
    <article className={cx('sc-row', index % 2 === 1 && 'sc-row--reverse')} aria-labelledby={`feature-${index}`}>
      <motion.div className="sc-copy" variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={inView}>
        <motion.div variants={rise}><Eyebrow><span className="mono sc-index">{String(index + 1).padStart(2, '0')}</span>{feature.eyebrow}</Eyebrow></motion.div>
        <motion.h3 className="lp-h3" id={`feature-${index}`} variants={rise}>
          {feature.title.map((line) => <span key={line} className="lp-line">{line}</span>)}
        </motion.h3>
        <motion.p className="sc-body" variants={rise}>{feature.body}</motion.p>
        <motion.ul className="sc-points" variants={stagger(0.06)}>
          {feature.points.map((point) => <motion.li key={point} variants={rise}>{point}</motion.li>)}
        </motion.ul>
      </motion.div>
      <ScrollVisual>{feature.visual}</ScrollVisual>
    </article>
  );
}

export function ProductShowcase() {
  return (
    <section className="lp-section lp-showcase" data-nav-section="#product" aria-labelledby="showcase-title">
      <div className="lp-container">
        <SectionIntro
          id="showcase-title"
          eyebrow="03 / The product"
          lines={['The system,', 'in focus.']}
          lead="Student records, guardian connections, registered palms and dismissal requests. One focused workspace."
        />
        <div className="sc-rows">
          {FEATURES.map((feature, i) => <FeatureRow key={feature.eyebrow} feature={feature} index={i} />)}
        </div>
      </div>
    </section>
  );
}
