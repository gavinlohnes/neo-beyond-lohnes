import type { ReviewWeek, WeeklyFocus } from "../domain/review/types";
import type { ReviewRow } from "./reviewOverview";
import { reviewMean } from "./reviewOverview";
import { mostRecentBoundaryAtOrBefore } from "./dayRollover";
import { livedDayBoundary } from "./livedDaySeries";

/** Latest fully closed Monday–Sunday lived-day week; never a rolling 7-day window. */
export function latestReviewWeek(now: Date): ReviewWeek {
  const boundary = mostRecentBoundaryAtOrBefore(now);
  const monday = livedDayBoundary(boundary, (boundary.getDay() + 6) % 7);
  return { start: livedDayBoundary(monday, 7).toISOString(), end: monday.toISOString() };
}
export function rowsForReviewWeek(rows: readonly ReviewRow[], week: ReviewWeek): ReviewRow[] {
  const start = Date.parse(week.start), end = Date.parse(week.end);
  return rows.filter((row) => Date.parse(row.start) >= start && Date.parse(row.start) < end);
}
export function summarizeReviewWeek(rows: readonly ReviewRow[]) {
  const known = (key: "weight" | "protein" | "calories" | "sleepHours") => rows.flatMap((row) => row[key] === undefined ? [] : [row[key]!]);
  const weights = known("weight"), protein = known("protein"), calories = known("calories"), sleep = known("sleepHours");
  return { recordedDays: rows.filter((row) => row.dayIds.length > 0).length,
    weightDays: weights.length, weightMean: reviewMean(weights), proteinDays: protein.length, proteinMean: reviewMean(protein),
    mealDays: calories.length, calorieMean: reviewMean(calories), sleepDays: sleep.length, sleepMean: reviewMean(sleep),
    sessions: rows.reduce((n, row) => n + row.sessions, 0),
  };
}
/** Options restate this week's counts only. No automatic plan change or escalating target. */
export function weeklyFocusOptions(rows: readonly ReviewRow[]): WeeklyFocus[] {
  const summary = summarizeReviewWeek(rows);
  const result: WeeklyFocus[] = [];
  if (summary.weightDays > 0) result.push({ kind: "WEIGHT_DAYS", target: summary.weightDays, text: `Log weight on ${summary.weightDays} ${summary.weightDays === 1 ? "day" : "days"}` });
  if (summary.proteinDays > 0) result.push({ kind: "PROTEIN_DAYS", target: summary.proteinDays, text: `Record protein on ${summary.proteinDays} ${summary.proteinDays === 1 ? "day" : "days"}` });
  if (summary.sessions > 0 && summary.sessions <= 14) result.push({ kind: "TRAINING_SESSIONS", target: summary.sessions, text: `Train ${summary.sessions} ${summary.sessions === 1 ? "time" : "times"}` });
  return result;
}
/** A count, never success/failure, compliance scoring or an inferred outcome for a written focus. */
export function countWeeklyFocus(focus: WeeklyFocus, rows: readonly ReviewRow[]): number | undefined {
  const summary = summarizeReviewWeek(rows);
  switch (focus.kind) {
    case "WEIGHT_DAYS": return summary.weightDays;
    case "PROTEIN_DAYS": return summary.proteinDays;
    case "TRAINING_SESSIONS": return summary.sessions;
    case "CUSTOM": return undefined;
  }
}
