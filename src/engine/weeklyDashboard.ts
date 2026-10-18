import type { ReviewWeek } from "../domain/review/types";
import { reviewMean, type ReviewRow } from "./reviewOverview";
import { latestReviewWeek } from "./weeklyReview";
import { livedDayBoundary } from "./livedDaySeries";

/**
 * REVIEW-001 Weekly Review dashboard (owner-approved 2026-10-18; Claude Code).
 * Pure, read-only arithmetic over the same lived-day rows the question hub
 * uses. Counts and recorded averages only: no grade, score or cause, missing
 * stays missing, and a context average below the floor abstains. Nothing here
 * reaches the Engine's evaluation.
 */

/** Work/off averages need this many logged days per measure per context — the hub's own floor. */
export const CONTEXT_FLOOR_DAYS = 3;

/** The closed Monday–Sunday week `weeksBack` weeks before the latest one. */
export function reviewWeekBack(now: Date, weeksBack: number): ReviewWeek {
  const latest = latestReviewWeek(now);
  if (weeksBack <= 0) return latest;
  return {
    start: livedDayBoundary(new Date(latest.start), 7 * weeksBack).toISOString(),
    end: livedDayBoundary(new Date(latest.end), 7 * weeksBack).toISOString(),
  };
}

export interface Measured {
  /** Average of the days that have a value; undefined when none do (or below a floor). */
  mean?: number | undefined;
  days: number;
}

function measured(rows: readonly ReviewRow[], key: "sleepHours" | "protein" | "water", floor = 1): Measured {
  const values = rows.flatMap((row) => (row[key] === undefined ? [] : [row[key]!]));
  return { days: values.length, mean: values.length >= floor ? reviewMean(values) : undefined };
}

export interface WeightChange {
  firstLbs: number;
  lastLbs: number;
  firstDay: string;
  lastDay: string;
  /** lastLbs − firstLbs. An observation between two recorded days, not a trend. */
  change: number;
}

/** First to last recorded lived day in the week; needs two weighed days. */
export function weekWeightChange(rows: readonly ReviewRow[]): WeightChange | undefined {
  const weighed = rows.filter((row) => row.weight !== undefined);
  if (weighed.length < 2) return undefined;
  const first = weighed[0]!;
  const last = weighed[weighed.length - 1]!;
  return { firstLbs: first.weight!, lastLbs: last.weight!, firstDay: first.start, lastDay: last.start, change: last.weight! - first.weight! };
}

export interface WeekHeadline {
  recordedDays: number;
  sleep: Measured & { work: Measured; off: Measured };
  protein: Measured;
  water: Measured;
  sessions: number;
  trainingDays: number;
  weight?: WeightChange | undefined;
}

export function weekHeadline(rows: readonly ReviewRow[]): WeekHeadline {
  return {
    recordedDays: rows.filter((row) => row.dayIds.length > 0).length,
    sleep: {
      ...measured(rows, "sleepHours"),
      work: measured(rows.filter((row) => row.context === "WORK"), "sleepHours", CONTEXT_FLOOR_DAYS),
      off: measured(rows.filter((row) => row.context === "OFF"), "sleepHours", CONTEXT_FLOOR_DAYS),
    },
    protein: measured(rows, "protein"),
    water: measured(rows, "water"),
    sessions: rows.reduce((n, row) => n + row.sessions, 0),
    trainingDays: rows.filter((row) => row.sessions > 0).length,
    weight: weekWeightChange(rows),
  };
}

export type PatternMode = "ALL" | "WORK" | "OFF";

export interface WeekPattern {
  mode: PatternMode;
  /** Recorded lived days in this context. */
  days: number;
  sleep: Measured;
  protein: Measured;
}

/**
 * ALL averages every recorded day. WORK and OFF use the declared context of
 * each lived day (mixed or unknown declarations are left out) and abstain
 * below CONTEXT_FLOOR_DAYS, like the hub's work/off answer.
 */
export function weekPattern(rows: readonly ReviewRow[], mode: PatternMode): WeekPattern {
  const scoped = mode === "ALL" ? rows : rows.filter((row) => row.context === mode);
  const floor = mode === "ALL" ? 1 : CONTEXT_FLOOR_DAYS;
  return {
    mode,
    days: scoped.filter((row) => row.dayIds.length > 0).length,
    sleep: measured(scoped, "sleepHours", floor),
    protein: measured(scoped, "protein", floor),
  };
}
