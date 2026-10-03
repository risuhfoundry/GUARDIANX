import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { cx } from '../../components/ui';
import { inView, rise, stagger } from './motion';
import { Eyebrow, SectionIntro } from './primitives';
import { DismissalDemo, GuardianDemo, PalmDemo, StudentDemo } from './ShowcaseDemos';

interface Feature {
  eyebrow: string;
  title: string[];
  body: string;
  points: string[];
  visual: ReactNode;
}

const FEATURES: Feature[] = [
  {
    eyebrow: 'Student management',
    title: ['Students,', 'organized.'],
    body: 'Keep classes and student information structured in one focused workspace.',
    points: ['Search by name, admission number or class', 'Filter the roster by class', 'Import students from an Excel workbook'],
    visual: <StudentDemo />,
  },
  {
    eyebrow: 'Guardian management',
    title: ['Guardians,', 'connected.'],
    body: 'Link each guardian to the students they are responsible for, and see every connection in one place.',
    points: ['Linked students and their classes', 'Palm registration state at a glance', 'Search by guardian or student name'],
    visual: <GuardianDemo />,
  },
  {
    eyebrow: 'Registered guardian palms',
    title: ['Registered for', 'verification.'],
    body: 'Each guardian’s palm registration is recorded against their profile, alongside the students they are linked to.',
    points: ['Registration status for every guardian', 'Shown wherever the guardian appears', 'Used as part of the dismissal workflow'],
    visual: <PalmDemo />,
  },
  {
    eyebrow: 'Dismissal requests',
    title: ['Dismissal,', 'made clear.'],
    body: 'Teachers raise a request; everyone sees the student, class, guardian and where the request stands.',
    points: ['Raised by the teacher', 'Student, class and guardian on every request', 'Pending, approved, rejected or completed'],
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
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.3, 1]);
  return (
    <motion.div ref={ref} className="sc-visual" style={{ scale, y, opacity }}>
      {children}
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
    <section className="lp-section lp-showcase" aria-labelledby="showcase-title">
      <div className="lp-container">
        <SectionIntro
          id="showcase-title"
          eyebrow="The product"
          lines={['The system,', 'in focus.']}
          lead="Four parts of one workspace. Every screen below is drawn from the same application, shown with sample data."
          align="center"
        />
        <div className="sc-rows">
          {FEATURES.map((feature, i) => <FeatureRow key={feature.eyebrow} feature={feature} index={i} />)}
        </div>
      </div>
    </section>
  );
}
