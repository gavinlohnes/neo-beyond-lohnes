import { db } from "../persistence/db";
import { cumulativeEaten, recentPeriods, type PeriodValue } from "../domain/health/measuredSeries";
import type { UnusualReading } from "../domain/health/unusual";
import { BASELINE_MIN_SAMPLES } from "../domain/health/baselines";
import { getDaySummaries } from "./dayLedgerQueries";
import { getHydrationEntries } from "./queries";
import { getMeasuredSnapshot, MEASURED_PERIODS } from "./measuredQueries";
import { waterByHour } from "./bodyDashboard";
import { getBodyweightHistoryWithSources, type WeighIn } from "./bodyTrendQueries";
import { getEffectiveProteinTargetG, getNutritionTargets } from "./nutritionTargetQueries";
import { getMealEntries } from "./nutritionQueries";
import { getProteinEntries } from "./queries";
import { isFinishedWorkout } from "./bodyInsightsQueries";
import { getCustomTemplates } from "./customTemplateQueries";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";
import { dailySeries, trainedSplit, usualOf, weeklyUsual, workOffSplit, type DetailMetric, type DetailUsual, type SplitSide, type TrainedSide } from "./metricDetail";

/**
 * METRIC-PAGE-001 (pilot): everything one metric-detail page shows, read from BEYOND's existing queries. Read only:
 * no writes, no Engine input, no recommendation change.
 * - Water is what you logged (the day ledger's effective totals, corrections applied). Garmin hydration is not imported.
 * - Steps are Garmin's watch measurements (GARMIN-004's snapshot, owner entries winning where they overlap upstream).
 * - Resting heart rate is Garmin's lowest resting reading per lived day, published once a day (GARMIN-004).
 * - Calories (slice 4) are two series side by side, never combined: burned is Garmin's total estimate (resting plus
 *   active), eaten is your logged meals (the day ledger's effective totals). No net, remaining, deficit or surplus.
 * - Weight (METRIC-PAGE-002) is what you weighed in at: each lived day's last weigh-in, corrections applied and undone
 *   weigh-ins left out (the same history BODY's weight trend draws). Garmin weight is not imported. A day without a
 *   weigh-in is a gap, never zero and never the day before carried forward.
 * - Protein (METRIC-PAGE-002 slice 2) is what you logged: the day ledger's effective total of meal protein and quick
 *   protein logs. TODAY is its running total, stepping up at each log. The target is BEYOND's existing protein target
 *   (your multiplier times your latest weigh-in), shown as a target only: never a deficit or a "remaining".
 * - Finished workouts (METRIC-PAGE-002 slice 3) are TRAIN's sessions that ended completed or partial, counted on the
 *   lived day they belong to, as BODY's progress and DATA's explorer count them. Abandoned and active sessions don't
 *   count. A lived day BEYOND has a record of with no finished workout is 0; a period with no BEYOND day is missing.
 */
export interface FinishedWorkout { label: string; sessionType: string; status: "COMPLETED" | "PARTIAL"; startedAt: string; durationMinutes?: number | undefined }
export interface MetricDetail {
  metric: DetailMetric;
  source: "LOGGED" | "GARMIN";
  /** One value per lived day for about a year, oldest first; the last is the current lived day ("so far"). */
  series: PeriodValue[];
  /** TODAY's picture: water by hour from the lived day's 16:30 start, or steps' running total. */
  today:
    | { kind: "hours"; from: number; slots: number[]; nowSlot: number; entries: number }
    | { kind: "running"; from: number; points: { t: number; total: number }[] }
    /** Resting heart rate: the newest reading, from this lived day or the one before (Garmin publishes it once a day). */
    | { kind: "latest"; value: number | null; from: number | null }
    /** Calories: the two running totals through the lived day, eaten stepping up at each meal. */
    | { kind: "pair"; from: number; eaten: { t: number; total: number }[]; burned: { t: number; total: number }[] }
    /** Weight: the newest weigh-in and the whole history BODY's weight trend uses, with the goal weight if one is set. */
    | { kind: "weighin"; latest: WeighIn | null; history: WeighIn[]; goalWeightLbs: number | undefined }
    /** Protein: your running total through the lived day, stepping up at each meal or quick log. */
    | { kind: "logged"; from: number; points: { t: number; total: number }[] }
    /** Workouts: this lived day's finished sessions, oldest first. */
    | { kind: "sessions"; from: number; sessions: FinishedWorkout[] };
  usual: DetailUsual & { dayKind?: "WORK" | "OFF" | null };
  split: { work: SplitSide; off: SplitSide };
  /** Garmin only: when the newest measurement was read on the phone. */
  asOf: number | null;
  /** Garmin only: a run of finished days outside your own range (ROTATION-002), or null. */
  unusual: UnusualReading | null;
  readAt: number;
  /** Calories only: the eaten series (your logs) beside `series`, which is burned (Garmin). */
  eaten?: { series: PeriodValue[]; usual: DetailUsual; split: { work: SplitSide; off: SplitSide } };
  /** Protein only: BEYOND's existing protein target in grams, when one can be worked out (it needs a weigh-in). */
  target?: number | undefined;
  /** Workouts only: of the recent work days and days off, how many had a finished workout. */
  trained?: { work: TrainedSide; off: TrainedSide };
}

export async function getMetricDetail(metric: DetailMetric, now = Date.now()): Promise<MetricDetail> {
  const [days, summaries] = await Promise.all([db.beyondDays.toArray(), getDaySummaries()]);
  const byDay = new Map(summaries.map((s) => [s.beyondDayId, s]));
  const contextOf = (dayId: string) => byDay.get(dayId)?.work.declared;
  const periods = recentPeriods(days, now, MEASURED_PERIODS);
  const current = periods.at(-1)!;

  if (metric === "weight") {
    const [history, targets] = await Promise.all([getBodyweightHistoryWithSources(), getNutritionTargets()]);
    // Oldest first, so a lived day's last weigh-in is the one that stays.
    const lastOfDay = new Map<string, number>();
    for (const w of history) if (w.beyondDayId) lastOfDay.set(w.beyondDayId, w.weightLbs);
    const series = dailySeries(periods, now, (dayId) => lastOfDay.get(dayId));
    return {
      metric, source: "LOGGED", series,
      today: { kind: "weighin", latest: history.length ? { recordedAt: history.at(-1)!.recordedAt, weightLbs: history.at(-1)!.weightLbs } : null, history: history.map(({ recordedAt, weightLbs }) => ({ recordedAt, weightLbs })), goalWeightLbs: targets.goalWeightLbs },
      usual: usualOf(series), split: workOffSplit(series, contextOf), asOf: null, unusual: null, readAt: now,
    };
  }

  if (metric === "protein") {
    const series = dailySeries(periods, now, (dayId) => byDay.get(dayId)?.proteinG);
    const [meals, quick, target] = current.dayId
      ? await Promise.all([getMealEntries(current.dayId), getProteinEntries(current.dayId), getEffectiveProteinTargetG()])
      : [[], [], await getEffectiveProteinTargetG()];
    // The domain's stepped running total, fed with each meal's and quick log's protein at the time it was eaten.
    const logs = [...meals.map((m) => ({ recordedAt: m.at, calories: m.effectiveProteinG })), ...quick.map((p) => ({ recordedAt: p.at, calories: p.effectiveGrams }))];
    return {
      metric, source: "LOGGED", series,
      today: { kind: "logged", from: current.from, points: cumulativeEaten(current, logs, now) },
      usual: usualOf(series), split: workOffSplit(series, contextOf), asOf: null, unusual: null, readAt: now, target,
    };
  }

  if (metric === "workouts") {
    const finished = (dayId: string) => byDay.get(dayId)?.workouts.filter(isFinishedWorkout);
    const series = dailySeries(periods, now, (dayId) => finished(dayId)?.length);
    const todays = current.dayId ? finished(current.dayId) ?? [] : [];
    // Built-in templates by their letter, custom ones by their own name (TRAIN's and the ribbon's labels).
    const names = new Map<string, string>(Object.keys(WORKOUT_TEMPLATES).map((id) => [id, id]));
    if (todays.length) for (const t of await getCustomTemplates({ includeArchived: true })) names.set(t.id, t.name);
    const sessions = [...todays].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).map((w): FinishedWorkout => ({
      label: names.get(w.templateId) ?? w.templateId, sessionType: w.sessionType, status: w.status as FinishedWorkout["status"], startedAt: w.startedAt, durationMinutes: w.durationMinutes,
    }));
    return {
      metric, source: "LOGGED", series,
      today: { kind: "sessions", from: current.from, sessions },
      usual: weeklyUsual(series), split: workOffSplit(series, contextOf), trained: trainedSplit(series, contextOf),
      asOf: null, unusual: null, readAt: now,
    };
  }

  if (metric === "resting") {
    const snapshot = await getMeasuredSnapshot(now);
    const series = snapshot.resting;
    const latest = [...series].reverse().slice(0, 2).find((v) => v.value !== null) ?? null;
    return {
      metric, source: "GARMIN", series,
      today: { kind: "latest", value: latest?.value ?? null, from: latest?.from ?? null },
      usual: { value: snapshot.usual.resting.value, samples: snapshot.usual.resting.samples, need: BASELINE_MIN_SAMPLES },
      split: workOffSplit(series, contextOf),
      asOf: snapshot.garminAsOf, unusual: snapshot.unusual.resting, readAt: snapshot.readAt,
    };
  }

  if (metric === "calories") {
    const snapshot = await getMeasuredSnapshot(now);
    // Both series on the snapshot's own lived periods, so they keep GARMIN-005's semantics exactly.
    const series = snapshot.burned, eaten = snapshot.eaten;
    return {
      metric, source: "GARMIN", series,
      today: { kind: "pair", from: snapshot.current.from, eaten: snapshot.eatenToday, burned: snapshot.burnedToday },
      usual: { value: snapshot.usual.burned.value, samples: snapshot.usual.burned.samples, need: BASELINE_MIN_SAMPLES },
      split: workOffSplit(series, contextOf),
      asOf: snapshot.caloriesAsOf, unusual: null, readAt: snapshot.readAt,
      eaten: { series: eaten, usual: usualOf(eaten), split: workOffSplit(eaten, contextOf) },
    };
  }

  if (metric === "steps") {
    const snapshot = await getMeasuredSnapshot(now);
    // The snapshot's own lived periods, so steps keep exactly GARMIN-004's semantics.
    const series = snapshot.steps;
    return {
      metric, source: "GARMIN", series,
      today: { kind: "running", from: snapshot.current.from, points: snapshot.stepsToday },
      usual: { value: snapshot.usual.steps.value, samples: snapshot.usual.steps.samples, need: BASELINE_MIN_SAMPLES, dayKind: snapshot.usual.steps.dayKind },
      split: workOffSplit(series, contextOf),
      asOf: snapshot.garminAsOf, unusual: snapshot.unusual.steps, readAt: snapshot.readAt,
    };
  }

  const series = dailySeries(periods, now, (dayId) => byDay.get(dayId)?.waterOz);
  const entries = current.dayId ? (await getHydrationEntries(current.dayId)) : [];
  const from = current.from;
  return {
    metric, source: "LOGGED", series,
    today: { kind: "hours", from, slots: waterByHour(entries, new Date(from).toISOString()), nowSlot: Math.floor((now - from) / 3_600_000), entries: entries.length },
    usual: usualOf(series), split: workOffSplit(series, contextOf), asOf: null, unusual: null, readAt: now,
  };
}
