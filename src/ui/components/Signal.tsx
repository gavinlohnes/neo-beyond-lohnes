import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import "./signal.css";

function reducedMotion(): boolean {
  try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/**
 * SUIT-001: glitch as a signal. Exactly four signals use it (stale reading,
 * offline, backup overdue, save failed), always beside their plain words.
 * It plays once when the signal first appears (2 × 0.36 s), then settles:
 * a re-render, or the pane being hidden and shown, never replays it. Under
 * reduced motion it never plays; the text alone carries the signal.
 * Wrap the signal's words, never the control being operated.
 */
export function useSignalGlitch(active: boolean) {
  const [playing, setPlaying] = useState(false);
  const shown = useRef(false);
  useEffect(() => {
    if (active && !shown.current && !reducedMotion()) setPlaying(true);
    if (!active) setPlaying(false);
    shown.current = active;
  }, [active]);
  return {
    playing,
    className: playing ? "signal-glitch" : "",
    onAnimationEnd: () => setPlaying(false),
  };
}

export function Signal({ children, as: Tag = "span", className = "", ...rest }: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  role?: string;
  "aria-live"?: "polite" | "assertive";
  "data-signal"?: string;
  style?: CSSProperties;
  tabIndex?: number;
}) {
  const glitch = useSignalGlitch(true);
  return <Tag {...rest} className={[className, glitch.className].filter(Boolean).join(" ")} onAnimationEnd={glitch.onAnimationEnd}>{children}</Tag>;
}
