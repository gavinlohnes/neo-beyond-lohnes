import type { PictureRow } from "./wholePictureProjection";
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
