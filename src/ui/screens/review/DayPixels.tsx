import { useState } from "react";
import type { PictureRow } from "../../../application/wholePictureProjection";

/**
 * PIXELS-001 (APPS-PICKS-002 pick 23, after Daylio's year in pixels): one square per lived day in the
 * Whole Picture window, shaded by a recorded value. Descriptive only — no streaks, goals or scores, and a
 * day without the record stays an empty square, never a zero.
 */
type Measure = "energy" | "sleepHours";
const LABEL: Record<Measure, string> = { energy: "Check-in energy", sleepHours: "Main sleep" };
const describe = (measure: Measure, value: number) => measure === "energy" ? `energy ${value} of 5` : `${Math.floor(value)} h ${Math.round((value % 1) * 60)} min main sleep`;
/** 1 (lightest) … 4 (strongest). Sleep bands are descriptive (under 5 h … 8 h or more), not targets. */
const level = (measure: Measure, value: number) => measure === "energy" ? Math.min(4, Math.max(1, Math.round(value) - 1)) : value < 5 ? 1 : value < 6.5 ? 2 : value < 8 ? 3 : 4;

export function DayPixels({ rows, onInspect }: { rows: readonly PictureRow[]; onInspect: (row: PictureRow) => void }) {
  const [measure, setMeasure] = useState<Measure>("energy");
  const valueOf = (row: PictureRow) => { const v = row[measure]; return typeof v === "number" && !(measure === "sleepHours" && row.ambiguousSleep) ? v : undefined; };
  const recorded = rows.filter((row) => valueOf(row) !== undefined).length;
  return <section className="day-pixels" aria-labelledby="day-pixels-title">
    <p className="eyebrow">In pixels</p>
    <h2 id="day-pixels-title">Your days, one square each</h2>
    <div className="filter-row" role="group" aria-label="Shade squares by">
      {(Object.keys(LABEL) as Measure[]).map((key) => <button type="button" key={key} aria-pressed={measure === key} onClick={() => setMeasure(key)}>{LABEL[key]}</button>)}
    </div>
    <ol className="day-pixels__grid" aria-label={`${LABEL[measure]} by day`}>
      {rows.map((row) => {
        const value = valueOf(row);
        const day = new Date(row.start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return <li key={row.start}><button type="button" className="day-pixels__day" data-level={value === undefined ? "none" : level(measure, value)}
          aria-label={`${day}: ${value === undefined ? "not recorded" : describe(measure, value)}. Open records.`} onClick={() => onInspect(row)} /></li>;
      })}
    </ol>
    <p className="small muted">{recorded ? `${recorded} of ${rows.length} days have ${LABEL[measure].toLowerCase()} recorded. Empty squares are days without it, not zero.` : `No ${LABEL[measure].toLowerCase()} recorded in these ${rows.length} days yet.`}</p>
  </section>;
}
