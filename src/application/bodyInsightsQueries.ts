import { getDaySummaries } from "./dayLedgerQueries";
import { getMealEntries } from "./nutritionQueries";
import type { DaySummary } from "../engine/dayLedger";
import { getBodyweightHistoryWithSources, type SourceWeighIn, type WeighIn } from "./bodyTrendQueries";

export const INSIGHT_DAY_MS = 24 * 60 * 60 * 1000;
export type InsightMetric = "weight" | "calories" | "protein" | "sleep" | "water" | "workouts";
export interface InsightDay {
  id: string;
  at: string;
  calories?: number;
  protein?: number;
  water?: number;
  sleep?: number;
  mainSleepEntries: number;
  workouts: number;
  carbs?: number;
  fat?: number;
  active: boolean;
}
export interface InsightPoint { id: string; at: string; value: number; source?: { beyondDayId: string; rootEventId?: string } }
export interface BodyInsights { days: InsightDay[]; readAt: string; weightSources?: SourceWeighIn[] }

/** Presentation-only, existing effective ledger values; no score, inference or write. */
export function insightDay(day: DaySummary, macros?: { carbs: number; fat: number }): InsightDay {
  const mainLogs = day.sleep.primaryLogs ?? [];
  return {
    id: day.beyondDayId, at: day.startedAt, active: day.endedAt === undefined,
    ...(day.kcal !== undefined ? { calories: day.kcal } : {}),
    ...(day.proteinG !== undefined ? { protein: day.proteinG } : {}),
    ...(day.waterOz !== undefined ? { water: day.waterOz } : {}),
    // A sum of two main-sleep entries is not one reliable sleep observation.
    ...(mainLogs.length === 1 ? { sleep: mainLogs[0]!.minutes / 60 } : {}),
    mainSleepEntries: mainLogs.length,
    workouts: day.workouts.filter((workout) => workout.status === "COMPLETED" || workout.status === "PARTIAL").length,
    ...(macros ? macros : {}),
  };
}

/** Two 90-day windows at most; canonical queries resolve corrections and voids. */
export async function getBodyInsights(now: Date = new Date()): Promise<BodyInsights> {
  const end = now.getTime();
  const start = end - 180 * INSIGHT_DAY_MS;
  const [summaries, weightSources] = await Promise.all([getDaySummaries(), getBodyweightHistoryWithSources()]);
  const ledger = summaries.filter((day) => {
    const t = Date.parse(day.startedAt);
    return t > start && t <= end;
  });
  const days = await Promise.all(ledger.map(async (day) => {
    // Only meal-bearing days need the secondary macro read. No stored rollup.
    const meals = day.kcal !== undefined ? await getMealEntries(day.beyondDayId) : [];
    const macros = meals.length ? {
      carbs: meals.reduce((sum, meal) => sum + meal.effectiveCarbsG, 0),
      fat: meals.reduce((sum, meal) => sum + meal.effectiveFatG, 0),
    } : undefined;
    return insightDay(day, macros);
  }));
  return { days: days.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)), readAt: now.toISOString(), weightSources };
}

export function insightPoints(data: BodyInsights, weights: readonly WeighIn[], metric: InsightMetric): InsightPoint[] {
  const source: InsightPoint[] = metric === "weight"
    ? data.weightSources
      ? data.weightSources.map((weight) => ({ id: weight.rootEventId, at: weight.recordedAt, value: weight.weightLbs, ...(weight.beyondDayId ? { source: { beyondDayId: weight.beyondDayId, rootEventId: weight.rootEventId } } : {}) }))
      : weights.map((weight, index) => ({ id: `weight-${index}`, at: weight.recordedAt, value: weight.weightLbs }))
    : data.days.flatMap((day) => {
      const value = day[metric];
      return value === undefined ? [] : [{ id: day.id, at: day.at, value, source: { beyondDayId: day.id } }];
    });
  return source.filter((point) => Number.isFinite(Date.parse(point.at)) && Number.isFinite(point.value) && point.value >= 0)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function insightWindow(points: readonly InsightPoint[], readAt: string, days: number) {
  const end = Date.parse(readAt);
  const start = end - days * INSIGHT_DAY_MS;
  const previousStart = start - days * INSIGHT_DAY_MS;
  const current = points.filter((point) => Date.parse(point.at) > start && Date.parse(point.at) <= end);
  const previous = points.filter((point) => Date.parse(point.at) > previousStart && Date.parse(point.at) <= start);
  const mean = (items: readonly InsightPoint[]) => items.length ? items.reduce((sum, point) => sum + point.value, 0) / items.length : undefined;
  const average = mean(current);
  const previousAverage = mean(previous);
  return { current, previous, average, previousAverage,
    change: average !== undefined && previousAverage !== undefined ? average - previousAverage : undefined };
}
