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

/**
 * ROTATION-003: a switch between a run of days off and a work run, read from recorded context only. An
 * unknown-context day between them means no flip is claimed. `before` is the last day of the old run;
 * `after` holds the new run's first days (shifts 1–2 into work, days off 1–3 out of work).
 */
export interface Flip { kind: "INTO_WORK" | "OUT_OF_WORK"; before: PictureRow; after: PictureRow[] }

export function flips(rows: readonly PictureRow[]): Flip[] {
  const runs = groupRuns(rows), result: Flip[] = [];
  for (let index = 1; index < runs.length; index++) {
    const from = runs[index - 1]!, to = runs[index]!;
    if (from.context === "OFF" && to.context === "WORK") result.push({ kind: "INTO_WORK", before: from.rows.at(-1)!, after: to.rows.slice(0, 2) });
    if (from.context === "WORK" && to.context === "OFF") result.push({ kind: "OUT_OF_WORK", before: from.rows.at(-1)!, after: to.rows.slice(0, 3) });
  }
  return result;
}

type Window = { start: number; end: number; days: number };
function medianWindow(rows: readonly (PictureRow | undefined)[]): Window | undefined {
  const timed = rows.flatMap((row) => row?.sleepWindow ? [row.sleepWindow] : []);
  return timed.length >= RUN_MEAN_FLOOR ? { start: median(timed.map((w) => w.start)), end: median(timed.map((w) => w.end)), days: timed.length } : undefined;
}
function sideOf(group: readonly Flip[]) {
  const days = group.flatMap((flip) => flip.after);
  const sleep = pictureValues(days, "sleepHours"), energy = pictureValues(days, "energy");
  return { flips: group.length, sleep: { mean: pictureMean(sleep), days: sleep.length }, energy: { mean: pictureMean(energy), days: energy.length } };
}

/** Per kind of flip: median sleep times before and after, naps on the day before, and a nap comparison only with enough flips each way. */
export function flipSummary(all: readonly Flip[], kind: Flip["kind"]) {
  const group = all.filter((flip) => flip.kind === kind);
  const before = medianWindow(group.map((flip) => flip.before));
  const first = medianWindow(group.map((flip) => flip.after[0]));
  const second = medianWindow(group.map((flip) => flip.after[1]));
  const known = group.filter((flip) => flip.before.dayIds.length > 0);
  const napped = known.filter((flip) => (flip.before.napMinutes ?? 0) > 0), none = known.filter((flip) => !((flip.before.napMinutes ?? 0) > 0));
  const comparison = kind === "INTO_WORK" && napped.length >= RUN_MEAN_FLOOR && none.length >= RUN_MEAN_FLOOR ? { napped: sideOf(napped), none: sideOf(none) } : undefined;
  return { kind, flips: group, before, first, second, naps: { napped: napped.length, none: none.length }, comparison };
}
