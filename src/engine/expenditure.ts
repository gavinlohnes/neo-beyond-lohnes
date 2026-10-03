import type { DaySummary } from "./dayLedger";

/**
 * EXPENDITURE READOUT (Drop 6, owner approval 2026-10-03 — read-only, in
 * Weekly). The NUTRITION TARGETS entry deferred a weight-trend expenditure
 * estimate; this is only a readout: the calorie target stays set by hand,
 * and nothing here feeds a target, the Engine, or any recommendation.
 *
 * The energy-balance arithmetic (Hacker's Diet style): over the last
 * EXPENDITURE_WINDOW_DAYS, what was eaten on average, minus what the weight
 * trend says was stored (KCAL_PER_LB per pound), is what was spent.
 *
 *   expenditure ≈ average logged intake − weight slope (lb/day) × 3500
 *
 * Shown as a RANGE, never one number (NO_FAKE_PRECISION): ± two standard
 * errors of the weight slope (at least ±MIN_HALF_WIDTH_KCAL, since logged
 * meals are themselves approximate), rounded outward to the nearest 50.
 * It abstains — "not enough data yet" — below its data floors, or when the
 * weight is too noisy for the range to mean anything.
 *
 * Only finished BeyondDays with at least one meal logged count as intake:
 * today is still being eaten, and a day with no meals logged is missing,
 * never zero. It assumes the logged days' meals were all logged, and says so.
 */
export const EXPENDITURE_WINDOW_DAYS = 28;
export const MIN_INTAKE_DAYS = 14;
export const MIN_WEIGH_INS = 8;
export const MIN_WEIGH_IN_SPAN_DAYS = 14;
export const KCAL_PER_LB = 3500;
export const MIN_HALF_WIDTH_KCAL = 100;
/** A range wider than this tells you nothing useful, so it isn't shown. */
export const MAX_RANGE_WIDTH_KCAL = 1000;
const ROUND_TO = 50;
const DAY_MS = 86_400_000;

export interface ExpenditureWeighIn {
  recordedAt: string;
  weightLbs: number;
}

export type ExpenditureReadout =
  | {
      kind: "ESTIMATE";
      lowKcal: number;
      highKcal: number;
      windowDays: number;
      intakeDays: number;
      avgIntakeKcal: number;
      /** Fitted weight change per week, lb (negative = losing). */
      weeklyChangeLbs: number;
      weighIns: number;
    }
  | {
      kind: "WAITING";
      windowDays: number;
      intakeDays: { have: number; need: number };
      weighIns: { have: number; need: number };
      /** The weigh-ins in the window span at least MIN_WEIGH_IN_SPAN_DAYS. */
      spanOk: boolean;
      /** Enough data, but the weight moves around too much for a useful range. */
      tooNoisy: boolean;
    };

export function projectExpenditure(
  summaries: readonly DaySummary[],
  weighIns: readonly ExpenditureWeighIn[],
  now: Date,
): ExpenditureReadout {
  const end = now.getTime();
  const start = end - EXPENDITURE_WINDOW_DAYS * DAY_MS;
  const inWindow = (iso: string) => {
    const t = new Date(iso).getTime();
    return t > start && t <= end;
  };

  const intake = summaries.filter((d) => d.endedAt !== undefined && d.kcal !== undefined && inWindow(d.startedAt)).map((d) => d.kcal!);
  const weights = weighIns.filter((w) => inWindow(w.recordedAt));
  const times = weights.map((w) => new Date(w.recordedAt).getTime());
  const spanOk = weights.length > 0 && (Math.max(...times) - Math.min(...times)) / DAY_MS >= MIN_WEIGH_IN_SPAN_DAYS;

  const waiting = (tooNoisy: boolean): ExpenditureReadout => ({
    kind: "WAITING",
    windowDays: EXPENDITURE_WINDOW_DAYS,
    intakeDays: { have: intake.length, need: MIN_INTAKE_DAYS },
    weighIns: { have: weights.length, need: MIN_WEIGH_INS },
    spanOk,
    tooNoisy,
  });
  if (intake.length < MIN_INTAKE_DAYS || weights.length < MIN_WEIGH_INS || !spanOk) return waiting(false);

  // Least-squares weight slope (lb/day) and its standard error.
  const xs = times.map((t) => (t - end) / DAY_MS);
  const ys = weights.map((w) => w.weightLbs);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i]! - meanX) ** 2;
    sxy += (xs[i]! - meanX) * (ys[i]! - meanY);
  }
  if (sxx === 0) return waiting(true);
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (ys[i]! - (intercept + slope * xs[i]!)) ** 2;
  const slopeSe = Math.sqrt(sse / (n - 2) / sxx);

  const avgIntake = intake.reduce((a, b) => a + b, 0) / intake.length;
  const mid = avgIntake - slope * KCAL_PER_LB;
  const half = Math.max(2 * slopeSe * KCAL_PER_LB, MIN_HALF_WIDTH_KCAL);
  // Whole kcal first, so floating-point dust (2350.0000001) never pushes a bound out a step.
  const lowKcal = Math.floor(Math.round(mid - half) / ROUND_TO) * ROUND_TO;
  const highKcal = Math.ceil(Math.round(mid + half) / ROUND_TO) * ROUND_TO;
  if (highKcal - lowKcal > MAX_RANGE_WIDTH_KCAL || lowKcal <= 0) return waiting(true);

  return {
    kind: "ESTIMATE",
    lowKcal,
    highKcal,
    windowDays: EXPENDITURE_WINDOW_DAYS,
    intakeDays: intake.length,
    avgIntakeKcal: Math.round(avgIntake),
    weeklyChangeLbs: Math.round(slope * 7 * 10) / 10,
    weighIns: weights.length,
  };
}
