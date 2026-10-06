import { useEffect, useRef, useState } from "react";

/** FEEL-001: how long a changed number takes to count to its new value. */
export const TICK_MS = 250;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

function decimalsOf(n: number): number {
  const text = String(n);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * FEEL-001 (owner brief 2026-10-05): a number that counts to its new value
 * when it changes (never on first show), in TICK_MS with no overshoot.
 * Reduced motion shows the new value at once. Only the display moves; the
 * value itself is always the real one.
 */
export function TickNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;
    if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
      setShown(value);
      return;
    }
    const places = Math.max(decimalsOf(from), decimalsOf(value));
    const start = performance.now();
    let frame = 0;
    const step = (time: number) => {
      const progress = Math.min(1, Math.max(0, (time - start) / TICK_MS));
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(progress === 1 ? value : Number((from + (value - from) * eased).toFixed(places)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      setShown(value);
    };
  }, [value]);
  return <span className="tick-number">{shown}</span>;
}
