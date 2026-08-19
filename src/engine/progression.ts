import type { ExercisePrescription, PerformedSet } from "../domain/workout/types";

/**
 * TRAIN progression (Decision Register, TRAIN — locked, reconfirmed by
 * the 2026-08-19 authority reconciliation): "Progression is advisory
 * only: all required sets at top of range -> INCREASE NEXT AVAILABLE
 * INCREMENT; within range without qualifying -> HOLD; every completed
 * required set below minimum -> REDUCE NEXT AVAILABLE INCREMENT; mixed/
 * incomplete evidence -> HOLD. Never silently change load; WHY remains
 * visible." The reconciliation explicitly rejected a flat universal
 * +2.5lb rule — the increment is per-exercise (ExercisePrescription.
 * incrementLbs).
 *
 * NO_HISTORY is not itself a rule from the locked doctrine — it's this
 * implementation's honest label for "nothing to advise on yet," distinct
 * from HOLD (which implies real evidence was weighed and didn't qualify
 * for a change).
 */
export type ProgressionRecommendation = "INCREASE" | "HOLD" | "REDUCE" | "NO_HISTORY";

export interface ProgressionSuggestion {
  recommendation: ProgressionRecommendation;
  reason: string;
  lastWeight?: number;
  suggestedNextWeight?: number;
}

/**
 * Pure: takes the prescribed shape and every performed set (including
 * skipped ones) from the single most recent matching session, and
 * derives an advisory suggestion. Never touches persistence and never
 * changes anything — the caller decides whether/how to surface this.
 */
export function evaluateProgression(
  prescription: ExercisePrescription,
  lastSessionSets: PerformedSet[],
): ProgressionSuggestion {
  if (lastSessionSets.length === 0) {
    return {
      recommendation: "NO_HISTORY",
      reason: "No prior performance recorded for this exercise in this context yet.",
    };
  }

  // Skipped sets are excluded entirely from the evaluation, never counted
  // as a 0 (Decision Register + tonight's decision #3) — but a session
  // with any skip is automatically "incomplete evidence" for INCREASE/
  // REDUCE purposes, since fewer than the prescribed count were actually
  // performed.
  const performed = lastSessionSets.filter((s) => !s.skipped);
  if (performed.length < prescription.sets) {
    return {
      recommendation: "HOLD",
      reason: "Incomplete evidence last time (fewer sets performed than prescribed, or one was skipped).",
    };
  }

  const weights = new Set(performed.map((s) => s.weight));
  if (weights.size > 1) {
    return {
      recommendation: "HOLD",
      reason: "Mixed weights across sets last time — not clean evidence either way.",
    };
  }
  const lastWeight = performed[0]!.weight;

  const allAtTop = performed.every((s) => s.reps >= prescription.repRangeHigh);
  const allBelowMin = performed.every((s) => s.reps < prescription.repRangeLow);

  if (allAtTop) {
    return {
      recommendation: "INCREASE",
      reason: `All ${prescription.sets} sets reached the top of the ${prescription.repRangeLow}-${prescription.repRangeHigh} rep range at ${lastWeight}lb.`,
      lastWeight,
      suggestedNextWeight: lastWeight + prescription.incrementLbs,
    };
  }
  if (allBelowMin) {
    return {
      recommendation: "REDUCE",
      reason: `Every completed set was below the ${prescription.repRangeLow}-rep minimum at ${lastWeight}lb.`,
      lastWeight,
      suggestedNextWeight: Math.max(0, lastWeight - prescription.incrementLbs),
    };
  }
  return {
    recommendation: "HOLD",
    reason: `${lastWeight}lb was within range without qualifying for a change last time.`,
    lastWeight,
  };
}
