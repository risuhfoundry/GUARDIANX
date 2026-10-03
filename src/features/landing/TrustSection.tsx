import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { PalmVisualization } from './PalmVisualization';
import { ease, inView } from './motion';
import { SectionIntro } from './primitives';

export function TrustSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  
  // Parallax the central palm visualization as we scroll through the dark space.
  const palmScale = useTransform(scrollYProgress, [0, 0.5], [reduce ? 1 : 0.85, 1]);
  const palmY = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 80, reduce ? 0 : -80]);
  const ringProgress = useTransform(scrollYProgress, [0.35, 0.65], [0, 1]);

  return (
    <section ref={ref} className="lp-section lp-trust">
      <div className="lp-trust__bg">
        <div className="lp-trust__glow" />
      </div>

      <div className="lp-container lp-trust__inner">
        <motion.div className="lp-trust__title" style={{ y: useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 40, reduce ? 0 : -40]) }}>
          <SectionIntro
            eyebrow="Verification"
            lines={['Identity meets', 'dismissal.']}
            align="center"
          />
        </motion.div>

        <motion.div className="lp-trust__center" style={{ scale: palmScale, y: palmY }}>
          <div className="lp-trust__palm-frame">
            <PalmVisualization state="verified" progress={reduce ? undefined : ringProgress} size={320} />
          </div>
        </motion.div>

        <div className="lp-trust__flow">
          <SectionIntro
            eyebrow="The philosophy"
            lines={['Designed around', 'verification.']}
            align="center"
          />
          
          <div className="lp-flow">
            <motion.div className="lp-flow__track" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={inView} transition={{ duration: 1.2, ease }} />
            
            {['Registered Guardian', 'Guardian Palm', 'Verification', 'Student Information', 'Dismissal Workflow'].map((node, i) => (
              <motion.div
                key={node}
                className="lp-flow__node"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={inView}
                transition={{ duration: 0.6, ease, delay: 0.15 * i }}
              >
                <span className="lp-flow__dot" />
                <span>{node}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
