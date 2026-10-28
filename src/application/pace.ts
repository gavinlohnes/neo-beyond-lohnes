import { quantile } from "../engine/livedDaySeries";
import { BAND_HIGH_QUANTILE, BAND_LOW_QUANTILE, MIN_BASELINE_DAYS } from "../engine/personalBaselines";
import type { CaveUsual } from "./caveVitals";
import { getMealEntries } from "./nutritionQueries";
import type { BeyondDay } from "../domain/common/types";
import { getHydrationEntries, getProteinEntries } from "./queries";
import { getWholePicture } from "./wholePictureQueries";
import type { PictureRow } from "./wholePictureProjection";

/**
 * SUIT-ALIVE S5 — pace (owner approval 2026-10-28, "go S5"; brief docs/agent/SUIT-ALIVE.md). Today's
 * protein and water are running totals, so they are judged against what you had logged by the same
 * point of your past lived days of the same kind, not against a full day. Same personal-baselines rule
 * as everywhere else: the middle half, at least MIN_BASELINE_DAYS days. A day with no logs at all is
 * missing, not zero. Each log counts at the time it was recorded, at its corrected amount. Read only.
 */
export type PaceMetric = "protein" | "water";
export const PACE_DAYS = 28;

export interface PaceHistory {
  dayKind: "WORK" | "OFF" | "ALL";
  /** Per past day: minutes after its lived-day start, and the amount logged then. */
  days: { minute: number; amount: number }[][];
}

export interface PaceReading {
  metric: PaceMetric;
  value: number;
  usual: CaveUsual;
  verdict: "BELOW" | "INSIDE" | "ABOVE" | undefined;
}

/** Pure: your usual total by `minute` into the lived day. */
export function paceUsual(history: PaceHistory, minute: number): CaveUsual {
  const pool = history.days.map((d) => d.reduce((sum, i) => i.minute <= minute ? sum + i.amount : sum, 0)).sort((a, b) => a - b);
  if (pool.length < MIN_BASELINE_DAYS) return { kind: "LEARNING", dayKind: history.dayKind, days: pool.length, need: MIN_BASELINE_DAYS };
  return { kind: "RANGE", dayKind: history.dayKind, low: quantile(pool, BAND_LOW_QUANTILE), high: quantile(pool, BAND_HIGH_QUANTILE), median: quantile(pool, 0.5), days: pool.length };
}

/** Pure: today's running total against your usual by now. */
export function paceReading(metric: PaceMetric, value: number, history: PaceHistory, minute: number): PaceReading {
  const usual = paceUsual(history, minute);
  const verdict = usual.kind === "RANGE" ? value < usual.low ? "BELOW" : value > usual.high ? "ABOVE" : "INSIDE" : undefined;
  return { metric, value, usual, verdict };
}

const unit = (m: PaceMetric) => m === "protein" ? "g" : "oz";
const round = (v: number) => Math.round(v);

/** "Usually 40–60 oz by now." / "Still learning your pace: 6 of 10 days." */
export function describePace(r: PaceReading): string {
  if (r.usual.kind === "LEARNING") return `Still learning your pace: ${r.usual.days} of ${r.usual.need} days so far.`;
  const range = round(r.usual.low) === round(r.usual.high) ? `${round(r.usual.low)} ${unit(r.metric)}` : `${round(r.usual.low)}–${round(r.usual.high)} ${unit(r.metric)}`;
  const lead = r.verdict === "BELOW" ? "Behind your usual pace" : r.verdict === "ABOVE" ? "Ahead of your usual pace" : "On your usual pace";
  return `${lead}: usually ${range} by now.`;
}

export interface PaceHistories { dayStart: string; protein: PaceHistory; water: PaceHistory }

/** Minutes into the lived day that started at `dayStart`. */
export const minuteOfDay = (dayStart: string, now: Date) => Math.max(0, Math.round((now.getTime() - Date.parse(dayStart)) / 60000));

/** The caller passes the day it shows, so TODAY's refresh stays the only reader of the active day. */
export async function getPaceHistories(day: Pick<BeyondDay, "startedAt" | "workContext">, now: Date = new Date()): Promise<PaceHistories> {
  const picture = await getWholePicture(now);
  const kind = day.workContext === "WORK" || day.workContext === "OFF" ? day.workContext : "ALL";
  const pick = (metric: PaceMetric) => picture.rows.filter((r) => (kind === "ALL" || r.context === kind) && r[metric] !== undefined).slice(-PACE_DAYS);
  const items = async (row: PictureRow, metric: PaceMetric) => {
    const at = (iso: string) => Math.round((Date.parse(iso) - Date.parse(row.start)) / 60000);
    const lists = await Promise.all(row.dayIds.map(async (id) => metric === "water"
      ? (await getHydrationEntries(id)).map((e) => ({ minute: at(e.at), amount: e.effectiveAmountOz }))
      : [...(await getProteinEntries(id)).map((e) => ({ minute: at(e.at), amount: e.effectiveGrams })),
        ...(await getMealEntries(id)).map((e) => ({ minute: at(e.at), amount: e.effectiveProteinG }))]));
    return lists.flat();
  };
  const [protein, water] = await Promise.all((["protein", "water"] as const).map(async (metric) =>
    ({ dayKind: kind, days: await Promise.all(pick(metric).map((row) => items(row, metric))) } as PaceHistory)));
  const start = new Date(day.startedAt); const dayStart = new Date(start); dayStart.setHours(16, 30, 0, 0);
  if (dayStart > start) dayStart.setDate(dayStart.getDate() - 1);
  return { dayStart: dayStart.toISOString(), protein: protein!, water: water! };
}
