import type { Transition, Variants } from 'motion/react';

/** One easing curve for the whole page: fast start, long soft settle. */
export const ease = [0.22, 1, 0.36, 1] as const;

export const spring: Transition = { type: 'spring', stiffness: 100, damping: 20, mass: 1 };
export const softSpring: Transition = { type: 'spring', stiffness: 70, damping: 20, mass: 1.2 };

/** Opacity + rise + blur reduction. The default entrance for text blocks. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: spring },
};

/** Parent that staggers its `rise` children. */
export const stagger = (gap = 0.1, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/** Viewport settings shared by every scroll reveal. */
export const inView = { once: true, margin: '0px 0px -12% 0px' } as const;
