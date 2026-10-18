import { useEffect, type CSSProperties } from "react";
import type { ShiftClockPhase } from "./shiftClock";

/** Presentation only. Real clock controls the city; a pin controls the suit only. */
export function cityLight(hour: number, workDay: boolean): { sky: number; windows: number } {
  const sky = hour >= 17 ? Math.min(1, (hour - 17) / 3) : hour < 6 ? 1 : hour < 8 ? (8 - hour) / 2 : 0;
  const windows = !workDay ? .08 : hour >= 16.5 && hour < 18 ? .85 : hour >= 18 ? .75 - (hour - 18) * .065 : hour < 6 ? .36 - hour * .05 : .04;
  return { sky, windows };
}

export function SuitMode({ mode }: { mode: ShiftClockPhase | null }) {
  useEffect(() => {
    document.documentElement.dataset.suitMode = mode ?? "UNSET";
    window.dispatchEvent(new CustomEvent("beyond-mode", { detail: mode }));
    return () => { delete document.documentElement.dataset.suitMode; };
  }, [mode]);
  return null;
}

export function ModeCity({ now, workDay, hasAction }: { now: Date; workDay: boolean; hasAction: boolean }) {
  const light = cityLight(now.getHours() + now.getMinutes() / 60, workDay);
  return <div className="mode-city" aria-hidden="true" style={{ "--sky": light.sky, "--windows": light.windows } as CSSProperties}>
    <div className="mode-city__sky" />
    {hasAction && <div className="mode-city__beam" />}
    <svg viewBox="0 0 400 90" preserveAspectRatio="none" className="mode-city__buildings">
      <path d="M0 90V65H18V40H35V64H48V29H58V19H64V29H76V70H91V48H110V22H122V7H125V22H139V58H153V40H176V65H188V30H200V16H205V30H220V55H242V37H257V62H274V20H292V10H296V20H310V67H329V46H347V61H360V34H378V55H400V90" />
      <g className="mode-city__windows">{Array.from({ length: 34 }, (_, i) => <path key={i} d={`M${22 + i * 11} ${68 - (i % 3) * 9}h3m-3 7h3`} />)}</g>
    </svg>
  </div>;
}
