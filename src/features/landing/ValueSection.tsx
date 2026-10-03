import { motion } from 'motion/react';
import { ease, inView } from './motion';
import { SectionIntro } from './primitives';

const PILLARS = [
  { n: '01', title: 'Students', body: 'Manage student and class information in one focused system.' },
  { n: '02', title: 'Guardians', body: 'Connect guardians with the students they are responsible for.' },
  { n: '03', title: 'Verification', body: 'Use registered guardian palms as part of the dismissal workflow.' },
];

export function ValueSection() {
  return (
    <section className="lp-section lp-value" id="product" aria-labelledby="value-title">
      <div className="lp-container">
        <div className="lp-value__head">
          <SectionIntro id="value-title" eyebrow="The idea" lines={['Built around', 'one simple idea.']} />
          <motion.p
            className="lp-value__statement"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: 0.9, ease, delay: 0.2 }}
          >
            The right student should leave with <em>the right guardian.</em>
          </motion.p>
        </div>

        <ol className="lp-value__pillars">
          {PILLARS.map((pillar, i) => (
            <motion.li
              key={pillar.n}
              className="lp-pillar"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.8, ease, delay: 0.12 * i }}
            >
              <motion.span
                className="lp-pillar__rule"
                aria-hidden="true"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={inView}
                transition={{ duration: 1.1, ease, delay: 0.12 * i + 0.1 }}
              />
              <span className="lp-pillar__n mono">{pillar.n}</span>
              <h3 className="lp-pillar__title">{pillar.title}</h3>
              <p className="lp-pillar__body">{pillar.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
