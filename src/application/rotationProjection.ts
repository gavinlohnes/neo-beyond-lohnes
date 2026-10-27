import { PICTURE_MEAN_FLOOR, pictureMean, pictureValues, type PictureRow } from "./wholePictureProjection";
import type { WeekAheadDay } from "./weekAheadQueries";

/**
 * ROTATION-001 phase 1: lived days grouped into the runs a shift worker actually lives — a stretch of
 * recorded work days, a stretch of days off, or days whose context is unknown. Pure and display-only:
 * recorded context only (never today's schedule applied to the past), no Engine input.
 */
export interface RotationRun {
  context: "WORK" | "OFF" | "UNKNOWN";
  rows: PictureRow[];
}

/** Consecutive lived days with the same recorded context form one run, oldest first. */
export function groupRuns(rows: readonly PictureRow[]): RotationRun[] {
  const runs: RotationRun[] = [];
  for (const row of rows) {
    const last = runs.at(-1);
    if (last && last.context === row.context) last.rows.push(row);
    else runs.push({ context: row.context, rows: [row] });
  }
  return runs;
}

/** The next predicted run in the Week Ahead forecast: its kind, first date and length. A prediction, not a calendar. */
export function nextForecastRun(days: readonly WeekAheadDay[]): { work: "WORK" | "OFF"; from: string; days: number } | null {
  const first = days[0];
  if (!first) return null;
  // Today's run is already being lived; the next run is the first change of kind after it.
  const change = days.findIndex((day) => day.work !== first.work);
  if (change === -1) return null;
  const kind = days[change]!.work;
  const end = days.findIndex((day, index) => index > change && day.work !== kind);
  return { work: kind, from: days[change]!.date, days: (end === -1 ? days.length : end) - change };
}

/** ROTATION-002: a mean across runs needs this many runs, the same floor Whole Picture uses. */
export const RUN_MEAN_FLOOR = PICTURE_MEAN_FLOOR;

/** One place in a run (shift 2, day off 1) across every run that reached it. Counts, never causes. */
export interface RunPosition {
  context: "WORK" | "OFF";
  /** 1-based place in the run. */
  position: number;
  /** The lived days at this place, oldest first; one per run. */
  rows: PictureRow[];
  sleep: { mean: number | undefined; days: number };
  energy: { mean: number | undefined; days: number };
  /** Days at this place with a counted workout, of the days with a BEYOND record. */
  trained: { days: number; of: number };
  /** Median main-sleep start and end, minutes after the lived day's start; Garmin-timed days only. */
  timing: { start: number; end: number; days: number } | undefined;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * ROTATION-002 phase 2: shift 1, 2, … and day off 1, 2, … across recorded runs. The oldest run is left
 * out when the window starts inside it, because its first recorded day is not its first day. Means
 * need RUN_MEAN_FLOOR days; below that the count is shown and the mean is undefined.
 */
export function runPositions(rows: readonly PictureRow[]): RunPosition[] {
  // A run that begins on the window's first day may have begun before it; a run after an unknown stretch is whole.
  const runs = groupRuns(rows).filter((run, index) => index > 0 || run.context === "UNKNOWN");
  const byPlace = new Map<string, RunPosition>();
  for (const run of runs) {
    if (run.context === "UNKNOWN") continue;
    run.rows.forEach((row, index) => {
      const key = `${run.context}:${index + 1}`;
      const place = byPlace.get(key) ?? { context: run.context as "WORK" | "OFF", position: index + 1, rows: [], sleep: { mean: undefined, days: 0 }, energy: { mean: undefined, days: 0 }, trained: { days: 0, of: 0 }, timing: undefined };
      place.rows.push(row); byPlace.set(key, place);
    });
  }
  return [...byPlace.values()].map((place) => {
    const sleep = pictureValues(place.rows, "sleepHours"), energy = pictureValues(place.rows, "energy");
    const recorded = place.rows.filter((row) => row.dayIds.length > 0);
    const timed = place.rows.flatMap((row) => row.sleepWindow ? [row.sleepWindow] : []);
    return { ...place,
      sleep: { mean: pictureMean(sleep), days: sleep.length },
      energy: { mean: pictureMean(energy), days: energy.length },
      trained: { days: recorded.filter((row) => row.sessions > 0).length, of: recorded.length },
      timing: timed.length >= RUN_MEAN_FLOOR ? { start: median(timed.map((w) => w.start)), end: median(timed.map((w) => w.end)), days: timed.length } : undefined,
    };
  }).sort((a, b) => (a.context === b.context ? 0 : a.context === "WORK" ? -1 : 1) || a.position - b.position);
}

/** The next predicted stretch of days off, including one already being lived today. A forecast. */
export function nextDaysOff(days: readonly WeekAheadDay[]): { from: string; days: number; now: boolean } | null {
  const start = days.findIndex((day) => day.work === "OFF");
  if (start === -1) return null;
  const end = days.findIndex((day, index) => index > start && day.work !== "OFF");
  return { from: days[start]!.date, days: (end === -1 ? days.length : end) - start, now: start === 0 };
}
