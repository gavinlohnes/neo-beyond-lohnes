import { useState } from "react";
import type { PictureRow } from "../../../application/wholePictureProjection";
import type { WeekAheadDay } from "../../../application/weekAheadQueries";
import { groupRuns, nextDaysOff, nextForecastRun, runPositions, RUN_MEAN_FLOOR, type RotationRun, type RunPosition } from "../../../application/rotationProjection";
import { clockAfter, describePosition, describeTiming, duration, lastWorkout, mostTrainedDayOff, patternsGoal, positionName, shortDate } from "./rotationCopy";

const day = (at: string) => new Date(at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const short = (at: string) => new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const hours = (h: number | undefined) => h === undefined ? "—" : duration(h);
const RUN_PAGE = 8;
const DAY_MINUTES = 24 * 60;

function runTitle(run: RotationRun): string {
  const n = run.rows.length;
  const span = n === 1 ? short(run.rows[0]!.start) : `${short(run.rows[0]!.start)}–${short(run.rows.at(-1)!.start)}`;
  if (run.context === "WORK") return `Work run · ${span} · ${n} ${n === 1 ? "shift" : "shifts"}`;
  if (run.context === "OFF") return `Days off · ${span} · ${n} ${n === 1 ? "day" : "days"}`;
  return `Context not recorded · ${span} · ${n} ${n === 1 ? "day" : "days"}`;
}

function sleepTimes(row: PictureRow): string | null {
  return row.sleepWindow ? `${clockAfter(row.start, row.sleepWindow.start)}–${clockAfter(row.start, row.sleepWindow.end)}` : null;
}

const W = 320, LABEL = 34, ROW = 16, GAP = 5, AXIS = 16;
/**
 * ROTATION-002 phase 1b: an actogram — one row per lived day on the same 24-hour frame (16:30 to 16:30),
 * main sleep as a filled bar from Garmin's times and the scheduled shift as an outline. Rows without
 * known times stay empty rather than guessed.
 */
function Actogram({ run }: { run: RotationRun }) {
  const first = run.rows[0]!.start, plot = W - LABEL - 4;
  const x = (minutes: number) => LABEL + (Math.max(0, Math.min(DAY_MINUTES, minutes)) / DAY_MINUTES) * plot;
  const height = run.rows.length * (ROW + GAP) + AXIS;
  // Clock ticks at 18:00, 00:00, 06:00 and 12:00 inside this run's lived-day frame.
  const startHour = new Date(first), ticks = [18, 0, 6, 12].map((hour) => {
    const tick = new Date(startHour); tick.setHours(hour, 0, 0, 0);
    if (tick.getTime() <= startHour.getTime()) tick.setDate(tick.getDate() + 1);
    return { hour, minutes: (tick.getTime() - startHour.getTime()) / 60000 };
  }).filter((tick) => tick.minutes < DAY_MINUTES);
  const timed = run.rows.filter((row) => row.sleepWindow).length;
  return <svg className="actogram" viewBox={`0 0 ${W} ${height}`} role="img"
    aria-label={`Sleep and scheduled shift times for ${run.rows.length} ${run.rows.length === 1 ? "day" : "days"}, ${timed} with Garmin sleep times, from 16:30 to 16:30.`}>
    {ticks.map((tick) => <g key={tick.hour}>
      <line className="actogram-grid" x1={x(tick.minutes)} x2={x(tick.minutes)} y1={0} y2={height - AXIS} />
      <text className="actogram-axis" x={x(tick.minutes)} y={height - 4} textAnchor="middle">{String(tick.hour).padStart(2, "0")}</text>
    </g>)}
    {run.rows.map((row, index) => {
      const y = index * (ROW + GAP);
      return <g key={row.start}>
        <text className="actogram-axis" x={LABEL - 6} y={y + ROW - 4} textAnchor="end">{run.context === "WORK" ? `#${index + 1}` : short(row.start)}</text>
        <line className="actogram-base" x1={LABEL} x2={W - 4} y1={y + ROW / 2} y2={y + ROW / 2} />
        {row.shiftWindow && <rect className="actogram-shift" x={x(row.shiftWindow.start)} y={y + 1} width={Math.max(1, x(row.shiftWindow.end) - x(row.shiftWindow.start))} height={ROW - 2} />}
        {row.sleepWindow && <rect className="actogram-sleep" x={x(row.sleepWindow.start)} y={y + 4} width={Math.max(2, x(row.sleepWindow.end) - x(row.sleepWindow.start))} height={ROW - 8} rx={2} />}
      </g>;
    })}
  </svg>;
}

function NextWindow({ rows, weekAhead, positions, readAt }: { rows: readonly PictureRow[]; weekAhead: readonly WeekAheadDay[]; positions: readonly RunPosition[]; readAt: string }) {
  const off = nextDaysOff(weekAhead), next = nextForecastRun(weekAhead), last = lastWorkout(rows, readAt), favourite = mostTrainedDayOff(positions);
  if (!off && !next && !last) return null;
  const offLine = off ? off.now ? `You're in days off now, forecast through ${shortDate(`${weekAhead[off.days - 1]?.date ?? off.from}T12:00:00`)}.`
    : `Days off are forecast from ${shortDate(`${off.from}T12:00:00`)} · ${off.days} ${off.days === 1 ? "day" : "days"}.` : null;
  return <div className="rotation-window" data-rotation-window>
    <p className="eyebrow">Next window · forecast from your schedule</p>
    {offLine && <h3>{offLine}</h3>}
    {!offLine && next && <h3 data-rotation-next>Next predicted: work run from {day(next.from + "T12:00:00")} · {next.days} {next.days === 1 ? "shift" : "shifts"}.</h3>}
    <p>{last ? `Last counted workout: ${shortDate(last.start)}, ${last.daysAgo} ${last.daysAgo === 1 ? "day" : "days"} ago.` : `No counted workout in the last ${rows.length} days.`}
      {favourite && ` Across your recent days off, you trained most often on ${positionName(favourite).toLowerCase()} (${favourite.trained.days} of ${favourite.trained.of}).`}</p>
    <p className="muted small">A forecast and your own records. BEYOND suggests a window; it doesn't schedule one.</p>
  </div>;
}

function Patterns({ positions, onInspect, reference }: { positions: readonly RunPosition[]; onInspect: (row: PictureRow) => void; reference: string | undefined }) {
  const work = positions.filter((place) => place.context === "WORK"), off = positions.filter((place) => place.context === "OFF");
  const runs = work[0]?.rows.length ?? 0;
  return <section className="rotation-patterns" aria-labelledby="rotation-patterns-heading">
    <p className="eyebrow">Across your runs</p>
    <h3 id="rotation-patterns-heading">{runs >= RUN_MEAN_FLOOR ? `Shift by shift, over ${runs} work runs.` : `Patterns need ${RUN_MEAN_FLOOR} complete work runs (${runs} so far).`}</h3>
    {patternsGoal(runs) && <p className="rotation-goal" data-unlock-goal>{patternsGoal(runs)}</p>}
    <p className="muted small">Each place in a run (shift 1, shift 2, day off 1…) averaged across the runs that reached it. A mean needs {RUN_MEAN_FLOOR} days. Patterns, not causes.</p>
    {[["Work runs", work], ["Days off", off]].map(([label, places]) => (places as RunPosition[]).length > 0 && <div key={label as string} className="rotation-places">
      <h4>{label as string}</h4>
      {(places as RunPosition[]).map((place) => <details key={`${place.context}${place.position}`} data-position={`${place.context}:${place.position}`}>
        <summary><strong>{positionName(place)}</strong> <span>{place.rows.length} {place.rows.length === 1 ? "run" : "runs"}</span>
          <small>{describePosition(place)}{reference && describeTiming(place, reference) ? ` · ${describeTiming(place, reference)}` : ""}</small></summary>
        <ul>{place.rows.map((row) => <li key={row.start}><button type="button" className="textbutton" onClick={() => onInspect(row)}
          aria-label={`${positionName(place)}, ${day(row.start)}: main sleep ${row.ambiguousSleep ? "ambiguous" : row.sleepHours === undefined ? "not recorded" : hours(row.sleepHours)}, energy ${row.energy ?? "not recorded"}. Open records.`}>
          {shortDate(row.start)} · {row.ambiguousSleep ? "?" : hours(row.sleepHours)} · E {row.energy ?? "—"}{row.sessions ? " · ◆" : ""}</button></li>)}</ul>
      </details>)}
    </div>)}
  </section>;
}

/**
 * ROTATION-001/002: your recent lived days as runs, newest first, each day a cell with main sleep, check-in
 * energy and training, an actogram of sleep against the scheduled shift, patterns across runs and the next
 * window. Tapping a day opens Whole Picture's own day inspector. Recorded values only; missing stays
 * missing; no score and no Engine input.
 */
export function RotationMap({ rows, weekAhead, readAt, onInspect }: { rows: readonly PictureRow[]; weekAhead: readonly WeekAheadDay[]; readAt: string; onInspect: (row: PictureRow) => void }) {
  const [limit, setLimit] = useState(RUN_PAGE);
  const runs = groupRuns(rows).reverse();
  const workRuns = runs.filter((run) => run.context === "WORK").length;
  const positions = runPositions(rows);
  return <section className="rotation" aria-label="Your rotation">
    <div className="section-head"><div><p className="eyebrow">Rotation / runs, not calendar weeks</p><h2>The way you actually live.</h2></div><span className="section-number">{workRuns} WORK {workRuns === 1 ? "RUN" : "RUNS"} · LAST {rows.length} DAYS</span></div>
    <p className="muted small">Each run is a stretch of recorded work days or days off. Each day shows main sleep, check-in energy and training, and when you slept against the scheduled shift. Tap a day for its records. Days without a recorded work context sit in their own run.</p>
    <NextWindow rows={rows} weekAhead={weekAhead} positions={positions} readAt={readAt} />
    <Patterns positions={positions} onInspect={onInspect} reference={rows[0]?.start} />
    <ol className="rotation-runs">{runs.slice(0, limit).map((run) => <li key={run.rows[0]!.start} className={`rotation-run rotation-run--${run.context.toLowerCase()}`}>
      <h3>{runTitle(run)}</h3>
      <Actogram run={run} />
      <ol className="rotation-days">{run.rows.map((row, index) => <li key={row.start}><button type="button" onClick={() => onInspect(row)}
        aria-label={`${day(row.start)}${run.context === "WORK" ? `, shift ${index + 1} of ${run.rows.length}` : ""}: main sleep ${row.ambiguousSleep ? "ambiguous" : row.sleepHours === undefined ? "not recorded" : hours(row.sleepHours)}${sleepTimes(row) ? `, asleep ${sleepTimes(row)}` : ""}, energy ${row.energy ?? "not recorded"}, ${row.sessions ? `${row.sessions} workout${row.sessions === 1 ? "" : "s"}` : "no workout"}. Open records.`}>
        <span className="mono">{run.context === "WORK" ? `#${index + 1}` : short(row.start)}</span>
        <strong>{row.ambiguousSleep ? "?" : hours(row.sleepHours)}</strong>
        <small>E {row.energy ?? "—"}{row.sessions ? " · ◆" : ""}</small>
        {sleepTimes(row) && <small className="mono">{sleepTimes(row)}</small>}
      </button></li>)}</ol>
    </li>)}</ol>
    {runs.length > limit && <button type="button" className="textbutton" onClick={() => setLimit((n) => n + RUN_PAGE)}>SHOW MORE RUNS ({runs.length - limit} remaining)</button>}
    <details className="coverage"><summary>How runs and times are formed</summary><p>Runs use each lived day's recorded work context, not today's schedule applied to the past. Sleep is the day's main sleep (Garmin or yours); "?" means more than one main sleep was recorded. E is the latest check-in's energy (1–5); ◆ marks a counted workout. Missing values stay missing.</p>
      <p>Each actogram row runs from 16:30 to 16:30. The filled bar is main sleep from Garmin's start and end times; a sleep you entered or corrected yourself has a length but no times, so its row stays empty. The outline is the shift your schedule sets for a recorded work day — scheduled hours, not clocked hours.</p>
      <p>Patterns leave out the oldest run when the {rows.length}-day window starts inside it, because its first recorded day may not be its first day.</p></details>
  </section>;
}
