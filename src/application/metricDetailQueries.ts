import { db } from "../persistence/db";
import { recentPeriods, type PeriodValue } from "../domain/health/measuredSeries";
import type { UnusualReading } from "../domain/health/unusual";
import { BASELINE_MIN_SAMPLES } from "../domain/health/baselines";
import { getDaySummaries } from "./dayLedgerQueries";
import { getHydrationEntries } from "./queries";
import { getMeasuredSnapshot, MEASURED_PERIODS } from "./measuredQueries";
import { waterByHour } from "./bodyDashboard";
import { dailySeries, usualOf, workOffSplit, type DetailMetric, type DetailUsual, type SplitSide } from "./metricDetail";

/**
 * METRIC-PAGE-001 (pilot): everything one metric-detail page shows, read from BEYOND's existing queries. Read only:
 * no writes, no Engine input, no recommendation change.
 * - Water is what you logged (the day ledger's effective totals, corrections applied). Garmin hydration is not imported.
 * - Steps are Garmin's watch measurements (GARMIN-004's snapshot, owner entries winning where they overlap upstream).
 * - Resting heart rate is Garmin's lowest resting reading per lived day, published once a day (GARMIN-004).
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
    | { kind: "latest"; value: number | null; from: number | null };
  usual: DetailUsual & { dayKind?: "WORK" | "OFF" | null };
  split: { work: SplitSide; off: SplitSide };
  /** Garmin only: when the newest measurement was read on the phone. */
  asOf: number | null;
  /** Garmin only: a run of finished days outside your own range (ROTATION-002), or null. */
  unusual: UnusualReading | null;
  readAt: number;
}

export async function getMetricDetail(metric: DetailMetric, now = Date.now()): Promise<MetricDetail> {
  const [days, summaries] = await Promise.all([db.beyondDays.toArray(), getDaySummaries()]);
  const byDay = new Map(summaries.map((s) => [s.beyondDayId, s]));
  const contextOf = (dayId: string) => byDay.get(dayId)?.work.declared;
  const periods = recentPeriods(days, now, MEASURED_PERIODS);
  const current = periods.at(-1)!;

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
