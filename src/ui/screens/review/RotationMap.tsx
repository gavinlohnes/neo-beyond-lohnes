import { useState } from "react";
import type { PictureRow } from "../../../application/wholePictureProjection";
import type { WeekAheadDay } from "../../../application/weekAheadQueries";
import { groupRuns, nextForecastRun, type RotationRun } from "../../../application/rotationProjection";

const day = (at: string) => new Date(at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const short = (at: string) => new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const hours = (h: number | undefined) => { if (h === undefined) return "—"; const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
const RUN_PAGE = 8;

function runTitle(run: RotationRun): string {
  const n = run.rows.length;
  const span = n === 1 ? short(run.rows[0]!.start) : `${short(run.rows[0]!.start)}–${short(run.rows.at(-1)!.start)}`;
  if (run.context === "WORK") return `Work run · ${span} · ${n} ${n === 1 ? "shift" : "shifts"}`;
  if (run.context === "OFF") return `Days off · ${span} · ${n} ${n === 1 ? "day" : "days"}`;
  return `Context not recorded · ${span} · ${n} ${n === 1 ? "day" : "days"}`;
}

/**
 * ROTATION-001 phase 1: your recent lived days as runs, newest first, each day a cell with main sleep,
 * check-in energy and training. Tapping a day opens Whole Picture's own day inspector and its source
 * records. Recorded values only; missing stays missing; no score and no Engine input.
 */
export function RotationMap({ rows, weekAhead, onInspect }: { rows: readonly PictureRow[]; weekAhead: readonly WeekAheadDay[]; onInspect: (row: PictureRow) => void }) {
  const [limit, setLimit] = useState(RUN_PAGE);
  const runs = groupRuns(rows).reverse();
  const workRuns = runs.filter((run) => run.context === "WORK").length;
  const next = nextForecastRun(weekAhead);
  return <section className="rotation" aria-label="Your rotation">
    <div className="section-head"><div><p className="eyebrow">Rotation / runs, not calendar weeks</p><h2>The way you actually live.</h2></div><span className="section-number">{workRuns} WORK {workRuns === 1 ? "RUN" : "RUNS"} · LAST {rows.length} DAYS</span></div>
    <p className="muted small">Each run is a stretch of recorded work days or days off. Each day shows main sleep, check-in energy and training. Tap a day for its records. Days without a recorded work context sit in their own run.</p>
    {next && <p className="rotation-next" data-rotation-next>Next predicted: {next.work === "WORK" ? `work run from ${day(next.from + "T12:00:00")} · ${next.days} ${next.days === 1 ? "shift" : "shifts"}` : `days off from ${day(next.from + "T12:00:00")} · ${next.days} ${next.days === 1 ? "day" : "days"}`}. From your schedule; a prediction, not a calendar.</p>}
    <ol className="rotation-runs">{runs.slice(0, limit).map((run) => <li key={run.rows[0]!.start} className={`rotation-run rotation-run--${run.context.toLowerCase()}`}>
      <h3>{runTitle(run)}</h3>
      <ol className="rotation-days">{run.rows.map((row, index) => <li key={row.start}><button type="button" onClick={() => onInspect(row)}
        aria-label={`${day(row.start)}${run.context === "WORK" ? `, shift ${index + 1} of ${run.rows.length}` : ""}: main sleep ${row.ambiguousSleep ? "ambiguous" : row.sleepHours === undefined ? "not recorded" : hours(row.sleepHours)}, energy ${row.energy ?? "not recorded"}, ${row.sessions ? `${row.sessions} workout${row.sessions === 1 ? "" : "s"}` : "no workout"}. Open records.`}>
        <span className="mono">{run.context === "WORK" ? `#${index + 1}` : short(row.start)}</span>
        <strong>{row.ambiguousSleep ? "?" : hours(row.sleepHours)}</strong>
        <small>E {row.energy ?? "—"}{row.sessions ? " · ◆" : ""}</small>
      </button></li>)}</ol>
    </li>)}</ol>
    {runs.length > limit && <button type="button" className="textbutton" onClick={() => setLimit((n) => n + RUN_PAGE)}>SHOW MORE RUNS ({runs.length - limit} remaining)</button>}
    <details className="coverage"><summary>How runs are formed</summary><p>Runs use each lived day's recorded work context, not today's schedule applied to the past. Sleep is the day's main sleep (Garmin or yours); "?" means more than one main sleep was recorded. E is the latest check-in's energy (1–5); ◆ marks a counted workout. Missing values stay missing. Patterns across runs come in a later phase, once enough runs are recorded.</p></details>
  </section>;
}
