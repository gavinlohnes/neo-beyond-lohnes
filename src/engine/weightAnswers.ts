import type { ReviewRow } from "./reviewOverview";

/**
 * REVIEW-001 Phase 1a "Derive" calculations for "Is my weight going down, and
 * at what rate?" (catalog #1, #2, #4 and weigh-in timing). Pure, read only,
 * never used by `evaluate`. Facts about recorded weigh-ins — no target, no
 * grade, and nothing about fat or muscle.
 */
export const SWING_FLOOR_PAIRS = 5;

/** The two 7-day means are a week apart, so their difference is a weekly rate. */
export function weeklyRate(weight: { change?: number | undefined; previousMean?: number | undefined }) {
  if (weight.change === undefined || !weight.previousMean) return undefined;
  return { lbPerWeek: weight.change, percentPerWeek: (weight.change / weight.previousMean) * 100 };
}

/**
 * Usual day-to-day swing: the median absolute difference between the daily
 * means of consecutive lived days that both have a weigh-in. A median, so one
 * odd day does not set it. Needs SWING_FLOOR_PAIRS pairs.
 */
export function dailySwing(rows: readonly ReviewRow[]) {
  const diffs: number[] = [];
  for (let index = 1; index < rows.length; index++) {
    const before = rows[index - 1]!.weight, after = rows[index]!.weight;
    if (before !== undefined && after !== undefined) diffs.push(Math.abs(after - before));
  }
  if (diffs.length < SWING_FLOOR_PAIRS) return { pairs: diffs.length, median: undefined };
  const sorted = diffs.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return { pairs: diffs.length, median };
}

/**
 * Weigh-in timing for shift work, where a weigh-in means "after your main
 * sleep, before eating". Counts weigh-ins logged after that lived day's
 * main-sleep log. A count of what the records show; it cannot verify eating.
 */
export function weighInTiming(days: readonly { weighIns: readonly string[]; mainSleepLoggedAt?: string | undefined }[]) {
  let total = 0, afterSleep = 0;
  for (const day of days) {
    for (const at of day.weighIns) {
      total++;
      if (day.mainSleepLoggedAt !== undefined && Date.parse(at) >= Date.parse(day.mainSleepLoggedAt)) afterSleep++;
    }
  }
  return { weighIns: total, afterSleep };
}
