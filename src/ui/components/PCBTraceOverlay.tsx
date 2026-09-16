import { useMemo } from "react";
import { generateTraceNetwork } from "../effects/pcbTrace";

/**
 * DEPTH-001 (direct owner review of four rendered mockup passes,
 * 2026-09-16): the "exposed machinery" reveal — a full-viewport, purely
 * decorative PCB-style trace network shown for as long as an adjacent
 * WHY/diagnostic disclosure (see WhyDisclosure.tsx) stays open. Flat,
 * unglowing red matched to real circuit-board photography — no SVG blur/
 * glow filter; an earlier reviewed pass had one and the owner corrected it
 * ("not glow like it is in the mockup").
 *
 * `aria-hidden`: the disclosure's own real content (State input/Derived/
 * Rules evaluated, or MORE's diagnostic counts) is what assistive tech
 * needs — this is decoration only, same convention as every icon in
 * ui/icons/Icon.tsx. `pointer-events: none` (see global.css) so it never
 * intercepts a tap meant for the still-legible content sitting on top.
 */
export function PCBTraceOverlay({ seed }: { seed: number }) {
  const { width, height } = useMemo(
    () => ({ width: window.innerWidth, height: window.innerHeight }),
    [],
  );
  const { segments, dots } = useMemo(
    () => generateTraceNetwork(width, height, seed, 0.5, 0.32),
    [width, height, seed],
  );

  return (
    <div className="machinery-reveal-overlay" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <rect width={width} height={height} fill="#050202" />
        {segments.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d81f1f" strokeWidth={2.6} strokeLinecap="round" />
        ))}
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="#e63333" />
        ))}
      </svg>
    </div>
  );
}
