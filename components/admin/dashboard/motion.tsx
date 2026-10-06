"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

/** Fades and lifts its children into place; `delay` staggers siblings. No-op for people who prefer reduced motion. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`h-full ${className ?? ""}`}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A number that counts up to its value on first paint, then smoothly to any new value.
 * The server-rendered text is already the final value, so there is never a wrong number on screen.
 */
export function CountUp({ value, format, duration = 1.1, className }: { value: number; format: (n: number) => string; duration?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) { setShown(value); return undefined; }
    const start = from.current ?? 0;
    const controls = animate(start, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(v) });
    from.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <span className={className}>{format(shown)}</span>;
}
