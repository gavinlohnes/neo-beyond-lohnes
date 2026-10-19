import { useLayoutEffect, type CSSProperties } from "react";
import type { ShiftClockPhase } from "./shiftClock";

/** Linear interpolation through (hour, value) points, wrapping at 24. */
function curve(points: readonly (readonly [number, number])[], hour: number): number {
  for (let i = 1; i < points.length; i++) {
    const [h1, v1] = points[i - 1]!, [h2, v2] = points[i]!;
    if (hour <= h2) return v1 + (v2 - v1) * ((hour - h1) / (h2 - h1 || 1));
  }
  return points.at(-1)![1];
}

/**
 * Presentation only. The real clock controls the city; a pin controls the suit only.
 * POLISH-002: the curves pass through the approved prototype's scenes — dusk 17:10 (sky .55,
 * windows .9), mid-shift 23:40 (sky 1, ~.5), 07:30 (sky .2, .04), 15:10 (.1, .12), 11:00 (0).
 * On a work day the windows go dark across the shift, so the city shows how far through it you are.
 */
export function cityLight(hour: number, workDay: boolean): { sky: number; windows: number } {
  const sky = curve([[0, 1], [5, 1], [7.5, .2], [9, 0], [14, 0], [15.17, .1], [16.5, .3], [17.17, .55], [20, 1], [24, 1]], hour);
  const windows = !workDay ? .08 : curve([[0, .37], [6, .04], [13, .04], [14, .12], [16.49, .12], [16.5, .9], [18, .9], [24, .37]], hour);
  return { sky, windows };
}

export function SuitMode({ mode }: { mode: ShiftClockPhase | null }) {
  useLayoutEffect(() => {
    document.documentElement.dataset.suitMode = mode ?? "UNSET";
    window.dispatchEvent(new CustomEvent("beyond-mode", { detail: mode }));
    return () => { delete document.documentElement.dataset.suitMode; };
  }, [mode]);
  return null;
}

/** The prototype's skyline, generated exactly as it is there (seed 7, antennas included). */
const CITY = (() => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let x = 0, d = "M0 92";
  const antennas: string[] = [];
  const windows: [number, number][] = [];
  while (x < 400) {
    const w = 10 + Math.round(rnd() * 22), h = 18 + Math.round(Math.pow(rnd(), 1.6) * 62);
    const tp = 92 - h, cut = rnd() > 0.7 ? Math.min(8, w / 2) : 0;
    d += ` L${x} ${tp + cut} L${x + cut} ${tp} L${x + w} ${tp}`;
    if (h > 62 && rnd() > 0.4) antennas.push(`M${x + w / 2} ${tp} V${tp - 10}`);
    for (let wy = tp + cut + 6; wy < 88; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) windows.push([wx, wy]);
    x += w; d += ` L${x} ${92 - (8 + Math.round(rnd() * 10))}`;
  }
  for (let i = windows.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [windows[i], windows[j]] = [windows[j]!, windows[i]!];
  }
  return { path: d + " L400 92 Z", antennas, windows };
})();

/** The prototype's gargoyle perch: foreground stone, an original drawing. */
const PERCH = "M0 76 H100 V81 H94 V90 H6 V81 H0 Z M20 76 L13 76 L18 72 L22 70 L22 62 L16 60 L10 58 L5 59 L8 55 L14 54 L20 54 L22 50 L14 48 L3 45 L6 42 L12 41 L16 38 L13 29 L20 35 L24 36 L26 40 L30 40 L34 26 L36 6 L42 22 L50 3 L54 24 L60 12 L62 30 L64 44 L68 58 L66 68 L72 76 Z M72 76 Q84 66 93 71 L90 76 Z";

/**
 * POLISH-002: the scene layers of the prototype's mode hero (sky, beam, skyline, perch, scanlines).
 * Absolutely positioned inside `.cc-mode`, behind its text. The beam only shows when BEYOND has a
 * real next action, never ON SHIFT.
 */
export function ModeCity({ now, workDay, hasAction, onShift = false }: { now: Date; workDay: boolean; hasAction: boolean; onShift?: boolean }) {
  const light = cityLight(now.getHours() + now.getMinutes() / 60, workDay);
  const lit = CITY.windows.slice(0, Math.round(CITY.windows.length * light.windows * .35));
  return <>
    <div className="cc-sky mode-city__sky" aria-hidden="true" style={{ opacity: light.sky } as CSSProperties} />
    {hasAction && !onShift && <div className="cc-beam mode-city__beam" aria-hidden="true" />}
    <svg className="cc-skyline mode-city__buildings" viewBox="0 0 400 92" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path className="cc-city" d={CITY.path} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <g className="cc-ant" strokeWidth="1">{CITY.antennas.map((a) => <path key={a} d={a} />)}</g>
      <g className="mode-city__windows">{lit.map(([wx, wy], i) => <rect key={i} className="cc-w" x={wx} y={wy} width="1.6" height="2" />)}</g>
    </svg>
    <svg className="cc-perch" viewBox="0 0 100 90" aria-hidden="true"><path className="cc-stone" strokeWidth="1" vectorEffect="non-scaling-stroke" d={PERCH} /></svg>
    <div className="cc-scan" aria-hidden="true" />
  </>;
}
