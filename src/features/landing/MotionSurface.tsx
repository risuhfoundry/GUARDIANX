import { useEffect, useState, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

/** Tiny pointer response, using motion values rather than rendering on every move. */
export function MotionSurface({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 100, damping: 24 });
  const rotateY = useSpring(y, { stiffness: 100, damping: 24 });

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => {
      const canRespond = media.matches && !reduce;
      setEnabled(canRespond);
      if (!canRespond) { x.set(0); y.set(0); }
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [reduce, x, y]);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!enabled || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    x.set(clamp((0.5 - (event.clientY - rect.top) / rect.height) * 2));
    y.set(clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2));
  }

  return (
    <motion.div className={className} style={enabled ? { rotateX, rotateY, transformPerspective: 1400 } : undefined}
      onPointerMove={move} onPointerLeave={() => { x.set(0); y.set(0); }}
      onPointerCancel={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.div>
  );
}
