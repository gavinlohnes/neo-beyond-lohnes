import { useLayoutEffect, type CSSProperties } from "react";
import type { ShiftClockPhase } from "./shiftClock";

/** Presentation only. Real clock controls the city; a pin controls the suit only. */
export function cityLight(hour: number, workDay: boolean): { sky: number; windows: number } {
  const sky = hour >= 17 ? Math.min(1, (hour - 17) / 3) : hour < 6 ? 1 : hour < 8 ? (8 - hour) / 2 : 0;
  const windows = !workDay ? .08 : hour >= 16.5 && hour < 18 ? .85 : hour >= 18 ? .75 - (hour - 18) * .065 : hour < 6 ? .36 - hour * .05 : .04;
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

/** Stable original buildings; clock changes only the fraction of lit windows. */
const CITY = (() => {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let x = 0, path = "M0 92";
  const windows: { x: number; y: number }[] = [];
  while (x < 400) {
    const width = 10 + Math.round(random() * 22);
    const height = 18 + Math.round(Math.pow(random(), 1.6) * 62);
    const top = 92 - height;
    const cut = random() > .7 ? Math.min(8, width / 2) : 0;
    path += ` L${x} ${top + cut} L${x + cut} ${top} L${x + width} ${top}`;
    for (let y = top + cut + 6; y < 88; y += 6)
      for (let wx = x + 3; wx < x + width - 3; wx += 5) windows.push({ x: wx, y });
    x += width;
    path += ` L${x} ${92 - (8 + Math.round(random() * 10))}`;
  }
  for (let i = windows.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [windows[i], windows[j]] = [windows[j]!, windows[i]!];
  }
  return { path: path + " L400 92 Z", windows };
})();

export function ModeCity({ now, workDay, hasAction }: { now: Date; workDay: boolean; hasAction: boolean }) {
  const light = cityLight(now.getHours() + now.getMinutes() / 60, workDay);
  return <div className="mode-city" aria-hidden="true" style={{ "--sky": light.sky } as CSSProperties}>
    <div className="mode-city__sky" />
    {hasAction && <div className="mode-city__beam" />}
    <svg viewBox="0 0 400 92" preserveAspectRatio="none" className="mode-city__buildings">
      <path d={CITY.path} />
      <g className="mode-city__windows">{CITY.windows.slice(0, Math.round(CITY.windows.length * light.windows * .35)).map((window, i) =>
        <rect key={i} x={window.x} y={window.y} width="1.6" height="2" />)}</g>
    </svg>
  </div>;
}
