import type { SchedulePattern } from "../domain/common/types";
import { isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { getSchedulePattern } from "./queries";
import { livedDayStartOf } from "./reflect";
import type { PictureRow } from "./wholePictureProjection";
import { getWholePicture } from "./wholePictureQueries";

/**
 * LIFE-STATE-003 (Life-State Engine, slice 3; Gavin, 2026-11-13): a short report on the work run that just ended, shown
 * when slice 2 names RUN OVER. From recorded lived days only: how many shifts, main sleep, check-in energy and workouts,
 * each with how many days it rests on. Thin data says so; nothing is estimated, compared or scored. Read only.
 *
 * Review of #496: the run's length and dates come from the saved schedule (the scheduled work days counting back from
 * yesterday), so a shift that wasn't recorded doesn't split the run; the report says how many were recorded. With no
 * saved schedule it counts the recorded work days back from the newest finished day, and says "recorded work days".
 */
export interface PostRunReport {
  /** Local dates of the run's first and last recorded work day. */
  from: string; to: string;
  shifts: number;
  /** How many of those shifts have a recorded work day. */
  recorded: number;
  sleep: { days: number; meanHours: number | undefined };
  energy: { days: number; mean: number | undefined };
  workouts: number;
  /** The report, line by line, in plain words. */
  lines: string[];
}

const local = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const short = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined);
const of = (days: number, total: number) => `${days} of ${total} ${total === 1 ? "shift" : "shifts"}`;

/**
 * The run that ended with the newest finished lived day. `scheduledRun` (lived-day start dates, oldest first) is the
 * saved schedule's run ending yesterday; without it, the recorded work days counting back from the newest row.
 */
export function derivePostRunReport(rows: readonly PictureRow[], scheduledRun: readonly string[] | null = null): PostRunReport | null {
  let run: PictureRow[] = [], total: number, from: string, to: string;
  if (scheduledRun && scheduledRun.length) {
    const byDate = new Map(rows.map((r) => [local(r.start), r]));
    run = scheduledRun.flatMap((date) => { const r = byDate.get(date); return r && r.context === "WORK" ? [r] : []; });
    total = scheduledRun.length; from = scheduledRun[0]!; to = scheduledRun.at(-1)!;
  } else {
    for (let i = rows.length - 1; i >= 0 && rows[i]!.context === "WORK"; i--) run.unshift(rows[i]!);
    if (!run.length) return null;
    total = run.length; from = local(run[0]!.start); to = local(run.at(-1)!.start);
  }
  const sleeps = run.flatMap((r) => (r.sleepHours === undefined ? [] : [r.sleepHours]));
  const energies = run.flatMap((r) => (r.energy === undefined ? [] : [r.energy]));
  const workouts = run.reduce((n, r) => n + (r.dayIds.length ? r.sessions : 0), 0);
  const n = total, dates = from === to ? short(from) : `${short(from)} – ${short(to)}`;
  const sleepMean = mean(sleeps), energyMean = mean(energies);
  const lines = [
    scheduledRun ? `${n} ${n === 1 ? "shift" : "shifts"}, ${dates}${run.length < n ? ` (${run.length} recorded)` : ""}.`
      : `${n} recorded work ${n === 1 ? "day" : "days"}, ${dates}.`,
    sleepMean === undefined ? "No main sleep was logged in this run."
      : `Main sleep averaged ${sleepMean.toFixed(1)} h (logged on ${of(sleeps.length, n)}).`,
    energyMean === undefined ? "No check-ins in this run."
      : `Check-in energy averaged ${energyMean.toFixed(1)} of 5 (${of(energies.length, n)}).`,
    workouts ? `${workouts} ${workouts === 1 ? "workout" : "workouts"}.` : "No workouts recorded.",
  ];
  if (!sleeps.length && !energies.length) lines.push("Little was recorded in this run, so there isn't much to show. That's fine.");
  return { from, to, shifts: n, recorded: run.length, sleep: { days: sleeps.length, meanHours: sleepMean }, energy: { days: energies.length, mean: energyMean }, workouts, lines };
}

/** The saved schedule's run of work days ending with yesterday's lived day, oldest first; null with no saved schedule. */
export function scheduledRunEndingYesterday(now: Date, pattern: SchedulePattern, horizon = 21): string[] | null {
  if (!isOperatorSavedSchedule(pattern)) return null;
  const start = livedDayStartOf(now), dates: string[] = [];
  for (let k = 1; k <= horizon; k++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() - k, 16, 30, 0, 0);
    if (scheduledWorkContextForLivedDay(day, pattern) !== "WORK") break;
    dates.unshift(local(day.toISOString()));
  }
  return dates;
}

export async function getPostRunReport(now: Date = new Date()): Promise<PostRunReport | null> {
  const [picture, pattern] = await Promise.all([getWholePicture(now), getSchedulePattern()]);
  const scheduled = scheduledRunEndingYesterday(now, pattern);
  // A schedule that says yesterday was off (a picked-up shift, say) falls back to what was recorded.
  return derivePostRunReport(picture.rows, scheduled && scheduled.length ? scheduled : null);
}
