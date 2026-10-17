import type { DaySummary } from "./dayLedger";
import { finishedLivedDays, groupLivedDays, inLivedDayWindow, livedDayBoundary } from "./livedDaySeries";

export interface ReviewWeight { dayId: string; lbs: number; at: string; rootId: string }
export interface ReviewRow {
  start: string; dayIds: string[]; context: "WORK" | "OFF" | "UNKNOWN";
  weight?: number | undefined; weights: ReviewWeight[]; protein?: number | undefined; calories?: number | undefined;
  sleepHours?: number | undefined; ambiguousSleep: boolean; sessions: number;
}
export interface ReviewOverview {
  from: string; to: string; rows: ReviewRow[];
  weight: { recentDays: number; previousDays: number; recentMean?: number | undefined; previousMean?: number | undefined; change?: number | undefined };
  protein: { days: number; mean?: number | undefined }; calories: { days: number; mean?: number | undefined };
  sleep: { days: number; mean?: number | undefined }; sessions: number; trainingDays: number; recordedDays: number;
}
const numeric = (n: number | undefined): n is number => n !== undefined && Number.isFinite(n) && n >= 0;
export function reviewMean(values: readonly number[]): number | undefined {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
}
function sum(values: readonly (number | undefined)[]): number | undefined {
  const known = values.filter(numeric);
  return known.length ? known.reduce((a, b) => a + b, 0) : undefined;
}

/** Read-only analysis. Completed local-calendar windows, never a recommendation or persisted rollup. */
export function projectReviewOverview(summaries: readonly DaySummary[], weights: readonly ReviewWeight[], now: Date): ReviewOverview {
  const window = finishedLivedDays(now, 0, 28);
  const grouped = groupLivedDays(summaries);
  const byDay = new Map<string, ReviewWeight[]>();
  for (const weight of weights) {
    if (!numeric(weight.lbs) || weight.lbs === 0 || !Number.isFinite(Date.parse(weight.at))) continue;
    const list = byDay.get(weight.dayId) ?? []; list.push(weight); byDay.set(weight.dayId, list);
  }
  const rows: ReviewRow[] = [];
  for (let index = 0; index < 28; index++) {
    const start = livedDayBoundary(window.from, -index).toISOString();
    const group = grouped.get(start);
    // An old ACTIVE day can span rollover while training defers closure. Never call it complete.
    const records = group && group.records.every((day) => day.endedAt !== undefined) ? group.records : [];
    const observations = records.flatMap((day) => byDay.get(day.beyondDayId) ?? []);
    const sleeps = records.flatMap((day) => day.sleep.primaryLogs ?? []);
    const contexts = new Set(records.map((day) => day.work.declared));
    const context = contexts.size === 1 ? records[0]?.work.declared ?? "UNKNOWN" : "UNKNOWN";
    rows.push({ start, dayIds: records.map((day) => day.beyondDayId), context,
      weights: observations, weight: reviewMean(observations.map((weight) => weight.lbs)),
      protein: sum(records.map((day) => day.proteinG)), calories: sum(records.map((day) => day.kcal)),
      sleepHours: sleeps.length === 1 && numeric(sleeps[0]!.minutes) ? sleeps[0]!.minutes / 60 : undefined,
      ambiguousSleep: sleeps.length > 1,
      sessions: new Set(records.flatMap((day) => day.workouts.filter((workout) =>
        (workout.status === "COMPLETED" || workout.status === "PARTIAL") &&
        (workout.sessionType === "STANDARD" || workout.sessionType === "REDUCED")
      ).map((workout) => workout.sessionId))).size,
    });
  }
  const recent = rows.slice(-7).filter((row) => row.weight !== undefined);
  const previous = rows.slice(-14, -7).filter((row) => row.weight !== undefined);
  const recentMean = reviewMean(recent.map((row) => row.weight!));
  const previousMean = reviewMean(previous.map((row) => row.weight!));
  // Explicit floor: 7 distinct lived days in 14 and 3 in each week. No fabricated sparse trend.
  const enough = recent.length >= 3 && previous.length >= 3 && recent.length + previous.length >= 7;
  const values = (key: "protein" | "calories" | "sleepHours") => rows.flatMap((row) => row[key] === undefined ? [] : [row[key]!]);
  const protein = values("protein"), calories = values("calories"), sleep = values("sleepHours");
  return { from: window.from.toISOString(), to: window.to.toISOString(), rows,
    weight: { recentDays: recent.length, previousDays: previous.length,
      ...(enough ? { recentMean, previousMean, change: recentMean! - previousMean! } : {}),
    },
    protein: { days: protein.length, mean: reviewMean(protein) }, calories: { days: calories.length, mean: reviewMean(calories) },
    sleep: { days: sleep.length, mean: reviewMean(sleep) },
    sessions: rows.reduce((n, row) => n + row.sessions, 0), trainingDays: rows.filter((row) => row.sessions > 0).length,
    recordedDays: rows.filter((row) => row.dayIds.length > 0).length,
  };
}

export function reviewEligibleDays(summaries: readonly DaySummary[], now: Date): DaySummary[] {
  const window = finishedLivedDays(now, 0, 28);
  return summaries.filter((day) => day.endedAt !== undefined && inLivedDayWindow(day.livedDayStart, window));
}
