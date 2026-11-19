import { db } from "../persistence/db";
import { recentPeriods, type PeriodValue } from "../domain/health/measuredSeries";
import type { UnusualReading } from "../domain/health/unusual";
import { BASELINE_MIN_SAMPLES } from "../domain/health/baselines";
import { getDaySummaries } from "./dayLedgerQueries";
import { getHydrationEntries } from "./queries";
import { getMeasuredSnapshot, MEASURED_PERIODS } from "./measuredQueries";
import { waterByHour } from "./bodyDashboard";
import { getBodyweightHistoryWithSources, type WeighIn } from "./bodyTrendQueries";
import { getEffectiveProteinTargetG, getNutritionTargets } from "./nutritionTargetQueries";
import { getFoodDiary } from "./foodDiaryQueries";
import { dailySeries, usualOf, workOffSplit, type DetailMetric, type DetailUsual, type SplitSide } from "./metricDetail";

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
 * - Protein (METRIC-PAGE-002 slice 2) is what you logged: each lived day's total of meals and protein-only logs, the
 *   day ledger's effective total (corrections applied, deletions left out), the same total TODAY and BODY show. A day
 *   with nothing logged is missing, never zero. Your protein target, where one is set, is carried as a target only.
 */
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
    /** Protein: the running logged total through the lived day, stepping up at each log, and the target if one is set. */
    | { kind: "intake"; from: number; points: { t: number; total: number }[]; entries: number; targetG: number | undefined };
  usual: DetailUsual & { dayKind?: "WORK" | "OFF" | null };
  split: { work: SplitSide; off: SplitSide };
  /** Garmin only: when the newest measurement was read on the phone. */
  asOf: number | null;
  /** Garmin only: a run of finished days outside your own range (ROTATION-002), or null. */
  unusual: UnusualReading | null;
  readAt: number;
  /** Calories only: the eaten series (your logs) beside `series`, which is burned (Garmin). */
  eaten?: { series: PeriodValue[]; usual: DetailUsual; split: { work: SplitSide; off: SplitSide } };
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
    // The current lived day's logs (meals and protein-only logs, as they stand) and the effective target in one read.
    const series = dailySeries(periods, now, (dayId) => byDay.get(dayId)?.proteinG);
    const diary = current.dayId ? await getFoodDiary(current.dayId) : null;
    const targetG = diary ? diary.proteinTargetG : await getEffectiveProteinTargetG();
    // Every log of the lived day counts toward its total; one timed outside the window is drawn at its edge.
    let total = 0;
    const inside = diary?.entries ?? [];
    const at = (iso: string) => Math.min(now, Math.max(current.from, Date.parse(iso)));
    return {
      metric, source: "LOGGED", series,
      today: { kind: "intake", from: current.from, points: [{ t: current.from, total: 0 }, ...inside.map((e) => ({ t: at(e.at), total: (total += e.proteinG) }))], entries: inside.length, targetG },
      usual: usualOf(series), split: workOffSplit(series, contextOf), asOf: null, unusual: null, readAt: now,
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
