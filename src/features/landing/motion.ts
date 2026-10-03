import type { Transition, Variants } from 'motion/react';

/** One easing curve for the whole page: fast start, long soft settle. */
export const ease = [0.22, 1, 0.36, 1] as const;

export const spring: Transition = { type: 'spring', stiffness: 100, damping: 20, mass: 1 };
export const softSpring: Transition = { type: 'spring', stiffness: 70, damping: 20, mass: 1.2 };

/** Text moves as a group; opacity keeps the same rhythm in reduced-motion mode. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, ease } },
};

/** Heading lines emerge from a quiet mask rather than floating into place. */
export const lineReveal: Variants = {
  hidden: { opacity: 0, y: '105%' },
  show: { opacity: 1, y: '0%', transition: { duration: 0.8, ease } },
};

/** Parent that staggers its `rise` children. */
export const stagger = (gap = 0.1, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/** Viewport settings shared by every scroll reveal. */
export const inView = { once: true, margin: '0px 0px -12% 0px' } as const;
