import { getStrengthReview } from "./strengthReviewQueries";
import { getMeasuredSnapshot, type MeasuredSnapshot } from "./measuredQueries";
import type { StrengthObservation } from "../engine/strengthReview";
import type { PeriodValue } from "../domain/health/measuredSeries";

export interface RecoveryWeek {
  from: number; to: number; sessions: number; sets: number; volume: number | null;
  sleep: { mean: number | null; days: number };
  resting: { mean: number | null; days: number };
}
export interface RecoveryComparison {
  weeks: [RecoveryWeek, RecoveryWeek] | null;
  unusual: MeasuredSnapshot["unusual"];
}
const mean = (series: readonly PeriodValue[], from: number, to: number) => {
  const values = series.filter((p) => !p.partial && p.from >= from && p.to <= to && p.value !== null).map((p) => p.value!);
  return { mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, days: values.length };
};

/** Facts only, not a readiness score or an Engine input. Use the same actual lived-period boundaries as Garmin views. */
export function projectRecoveryComparison(records: readonly StrengthObservation[], measured: Pick<MeasuredSnapshot, "current" | "resting" | "sleep" | "unusual">): RecoveryComparison {
  const periods = measured.resting.filter((p) => !p.partial && p.to <= measured.current.from).slice(-14);
  if (periods.length < 14) return { weeks: null, unusual: measured.unusual };
  const week = (offset: number): RecoveryWeek => {
    const from = periods[offset]!.from, to = periods[offset + 6]!.to;
    const sets = records.filter((s) => Number.isFinite(s.weight) && s.weight > 0 && Number.isFinite(s.reps) && s.reps > 0 && Date.parse(s.at) >= from && Date.parse(s.at) < to);
    return { from, to, sessions: new Set(sets.map((s) => s.sessionId)).size, sets: sets.length,
      volume: sets.length ? sets.reduce((sum, s) => sum + s.weight * s.reps, 0) : null,
      sleep: mean(measured.sleep, from, to), resting: mean(measured.resting, from, to) };
  };
  return { weeks: [week(0), week(7)], unusual: measured.unusual };
}

/** Reuses finished strength sessions/effective working sets and existing measured-only personal ranges. No writes. */
export async function getRecoveryComparison(now = new Date()): Promise<RecoveryComparison> {
  const [strength, measured] = await Promise.all([getStrengthReview(now), getMeasuredSnapshot(now.getTime())]);
  return projectRecoveryComparison(strength.records, measured);
}
