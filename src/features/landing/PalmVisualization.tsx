import { useId } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, type MotionValue } from 'motion/react';
import { cx } from '../../components/ui';
import { ease } from './motion';

export type PalmState = 'idle' | 'detected' | 'scanning' | 'verified';

/**
 * Abstract open-palm outline, drawn once as a single stroke. It is a symbol of
 * the guardian presenting a registered palm, not a rendering of biometric
 * data: no minutiae, no measurements, no confidence figures.
 */
const HAND =
  'M62 232 L58 178 C44 168 26 146 22 128 C20 118 30 112 37 120 C46 130 54 138 62 142 ' +
  'L60 62 C60 50 78 50 78 62 L79 104 C79 108 83 108 83 104 ' +
  'L83 48 C83 36 102 36 102 48 L102 104 C102 108 106 108 106 104 ' +
  'L106 56 C106 44 124 44 124 56 L124 108 C124 112 128 112 128 108 ' +
  'L128 78 C128 67 144 67 144 78 L144 130 C146 160 144 196 138 232';
const LINES = 'M142 136 C124 132 100 134 84 124 M64 148 C84 152 110 156 132 160 M66 152 C74 174 80 198 82 222';
const HAND_TRANSFORM = 'translate(120 124) scale(0.8) translate(-83 -134)';

const STROKE: Record<PalmState, string> = {
  idle: 'rgba(250,250,250,0.38)',
  detected: 'rgba(250,250,250,0.72)',
  scanning: 'rgba(160,178,255,0.95)',
  verified: 'rgba(134,194,159,0.95)',
};
const RING: Record<PalmState, number> = { idle: 0, detected: 0.1, scanning: 1, verified: 1 };
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

export function PalmVisualization({
  state, className, progress, size,
}: {
  state: PalmState;
  className?: string;
  /** Optional scroll-driven ring progress (0–1). Overrides the state-driven ring. */
  progress?: MotionValue<number>;
  size?: number;
}) {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const verified = state === 'verified';
  const ringColor = verified ? '#86C29F' : '#8EA2FF';
  const fallback = useMotionValue(0);
  const ringLength = progress ?? fallback;

  return (
    <div className={cx('palm', `palm--${state}`, className)} style={size ? { width: size, height: size } : undefined} aria-hidden="true">
      <svg viewBox="0 0 240 240" className="palm__svg">
        <defs>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={verified ? '#86C29F' : '#7C93FF'} stopOpacity="0.26" />
            <stop offset="100%" stopColor={verified ? '#86C29F' : '#7C93FF'} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-band`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8EA2FF" stopOpacity="0" />
            <stop offset="55%" stopColor="#8EA2FF" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#B9C6FF" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <path d={`${HAND} Z`} transform={HAND_TRANSFORM} />
          </clipPath>
        </defs>

        {/* Soft field behind the palm, brighter only while something is happening. */}
        <motion.circle
          cx="120" cy="120" r="100" fill={`url(#${id}-glow)`}
          initial={false}
          animate={{ opacity: state === 'idle' ? 0.25 : state === 'detected' ? 0.55 : 1 }}
          transition={{ duration: reduce ? 0 : 0.8, ease }}
        />

        {/* Precision ticks: static, very faint. */}
        <g className="palm__ticks">
          {TICKS.map((deg) => (
            <line key={deg} x1="120" y1="6" x2="120" y2={deg % 30 === 0 ? 13 : 10} transform={`rotate(${deg} 120 120)`} />
          ))}
        </g>

        <circle cx="120" cy="120" r="104" className="palm__track" />
        {progress ? (
          <motion.circle
            cx="120" cy="120" r="104" className="palm__ring"
            stroke={ringColor} transform="rotate(-90 120 120)"
            style={{ pathLength: ringLength }}
          />
        ) : (
          <motion.circle
            cx="120" cy="120" r="104" className="palm__ring"
            transform="rotate(-90 120 120)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: RING[state], stroke: ringColor }}
            transition={{ pathLength: { duration: reduce ? 0 : state === 'scanning' ? 2.1 : 0.7, ease: [0.45, 0, 0.2, 1] }, stroke: { duration: 0.5 } }}
          />
        )}

        {/* The palm itself. Draws on once, then only its colour responds to state. */}
        <g transform={HAND_TRANSFORM}>
          <motion.path
            d={HAND} className="palm__hand"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1, stroke: STROKE[state] }}
            transition={{ pathLength: { duration: 1.6, ease }, opacity: { duration: 0.4 }, stroke: { duration: 0.6 } }}
          />
          <motion.path
            d={LINES} className="palm__lines"
            initial={false}
            animate={{ opacity: state === 'idle' ? 0.25 : 0.6, stroke: STROKE[state] }}
            transition={{ duration: 0.6 }}
          />
        </g>

        {/* A single soft band passes over the palm while verifying. */}
        <AnimatePresence>
          {state === 'scanning' && !reduce && (
            <motion.g key="band" clipPath={`url(#${id}-clip)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <motion.rect
                x="0" width="240" height="56" fill={`url(#${id}-band)`}
                initial={{ y: 10 }}
                animate={{ y: [10, 196, 10] }}
                transition={{ duration: 2.1, ease: 'easeInOut', repeat: Infinity }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {verified && (
            <motion.g
              key="check"
              initial={reduce ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              style={{ transformOrigin: '120px 224px' }}
            >
              <circle cx="120" cy="224" r="12" className="palm__check-bg" />
              <path d="M114.5 224.2 L118.4 228 L125.6 220.4" className="palm__check" />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}
