import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { PCBTraceOverlay } from "./PCBTraceOverlay";

/**
 * DEPTH-001: shared wrapper for every WHY/diagnostic-detail disclosure —
 * TODAY's RecommendationCard, TRAIN's variant-suggestion and exercise-
 * detail panels, MORE's SYSTEM diagnostics. Same real content these
 * already rendered inside a plain `<details className="why">`, now paired
 * with the "exposed machinery" reveal (PCBTraceOverlay) while open.
 *
 * The disclosure's own content stays plain native `<details>` semantics —
 * instant, unconditional on any animation — so nothing here can gate what
 * a test or a screen reader sees. The overlay is a portal-rendered,
 * `aria-hidden`, `pointer-events: none` decoration that mounts on open and
 * unmounts on close; it never controls the real content's visibility.
 *
 * DEPTH-002: the overlay's own CSS animation (`.machinery-reveal-overlay`
 * in global.css) fades itself back to transparent a beat after the
 * flash, regardless of whether the disclosure is still open — it stays
 * mounted (harmless: invisible, `pointer-events: none`) until close, but
 * visually it never blocks the real content for longer than the reveal
 * itself takes.
 *
 * Two or more `WhyDisclosure`s open at once (e.g. TRAIN's two panels) each
 * render their own overlay — accepted as harmless visual doubling rather
 * than adding a shared single-overlay coordinator for a rare case (see
 * docs/agent/drops/DEPTH-001.md).
 */
export function WhyDisclosure({
  summary,
  style,
  children,
}: {
  summary: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [revealSeed, setRevealSeed] = useState<number | null>(null);

  function handleToggle(e: SyntheticEvent<HTMLDetailsElement>) {
    if (!e.currentTarget.open) {
      setRevealSeed(null);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRevealSeed(reduced ? null : Date.now());
  }

  return (
    <details className="why" style={style} onToggle={handleToggle}>
      <summary>{summary}</summary>
      {children}
      {revealSeed !== null && createPortal(<PCBTraceOverlay seed={revealSeed} />, document.body)}
    </details>
  );
}
