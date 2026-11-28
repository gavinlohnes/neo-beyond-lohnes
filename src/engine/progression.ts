import { countsTowardBest, isTimed, targetSecOf, TIMED_STEP_SEC } from "../domain/workout/types";
import type { ExercisePrescription, PerformedSet } from "../domain/workout/types";
import type { DeloadStall } from "./stall";

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
export type ProgressionRecommendation = "INCREASE" | "HOLD" | "REDUCE" | "NO_HISTORY" | "RE_ENTRY" | "DELOAD";

export interface ProgressionSuggestion {
  recommendation: ProgressionRecommendation;
  reason: string;
  lastWeight?: number;
  suggestedNextWeight?: number;
  /** RE_ENTRY only: whole days since the exercise was last performed. */
  daysSinceLastPerformed?: number;
  /** DELOAD only: the stalled run's top-set weights, oldest first. */
  stallTopWeights?: number[];
  /** GRAYSON-SET-TYPES-001, timed exercises only: the target held last time and the one suggested next. */
  lastTargetSec?: number;
  suggestedTargetSec?: number;
}

/**
 * RE-ENTRY (owner-approved amendment to the locked progression rule,
 * 2026-10-03). After a layoff the rule above would still say INCREASE, or
 * HOLD at the old weight — lifting the old load cold. When an exercise was
 * last performed RE_ENTRY_DAYS or more ago (in any template or variant —
 * a layoff is about the lift, not the slot it sits in), an INCREASE or
 * HOLD becomes RE_ENTRY: about RE_ENTRY_FRACTION of the last load, rounded
 * DOWN to the exercise's own increment so it's a weight the equipment
 * actually has. REDUCE stays as it is (already lighter), and NO_HISTORY
 * has nothing to ease back into. Advisory only, like every suggestion
 * here: never applied, never pre-filled; the WHY is the reason text.
 */
export const RE_ENTRY_DAYS = 14;
export const RE_ENTRY_FRACTION = 0.9;
/** DELOAD: about this share of the last load, for one session. */
export const DELOAD_FRACTION = 0.9;

export interface ProgressionContext {
  /** Whole days since the exercise was last performed anywhere; undefined when unknown. */
  daysSinceLastPerformed?: number | undefined;
  /** The exercise's steady stall, when it has one (engine/stall.ts deloadStall). */
  stall?: DeloadStall | undefined;
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
  context: ProgressionContext = {},
): ProgressionSuggestion {
  if (isTimed(prescription)) return evaluateTimed(prescription, lastSessionSets);
  // GRAYSON-SET-TYPES-001: drop sets aren't a fair test of the prescription (warm-ups never were).
  const base = evaluateLastSession(prescription, lastSessionSets.filter((s) => s.setKind !== "WARMUP" && s.setKind !== "DROP"));
  const days = context.daysSinceLastPerformed;
  // The load to ease back from: the clean last weight when there is one,
  // otherwise (mixed/incomplete evidence) the heaviest set actually done.
  const performedWeights = lastSessionSets.filter((s) => countsTowardBest(s)).map((s) => s.weight);
  const fromWeight = base.lastWeight ?? (performedWeights.length > 0 ? Math.max(...performedWeights) : undefined);
  const step = prescription.incrementLbs > 0 ? prescription.incrementLbs : 1;
  const lighter = (fraction: number) => (fromWeight === undefined || fromWeight <= 0 ? undefined : Math.floor((fromWeight * fraction) / step) * step);

  if (days === undefined || days < RE_ENTRY_DAYS) {
    // DELOAD spans templates/variants. Its load must come from that same
    // canonical, unsubstituted history, not an older matching slot or a substitute.
    const stalledLoad = context.stall?.topWeights.at(-1);
    const next = stalledLoad === undefined || stalledLoad <= 0 ? undefined : Math.floor((stalledLoad * DELOAD_FRACTION) / step) * step;
    return deload(prescription, base, context.stall, stalledLoad, next);
  }
  if (base.recommendation !== "INCREASE" && base.recommendation !== "HOLD") return base;
  const next = lighter(RE_ENTRY_FRACTION);
  if (fromWeight === undefined || next === undefined || next <= 0 || next >= fromWeight) return base;
  return {
    recommendation: "RE_ENTRY",
    reason: `${days} days since your last ${prescription.name} — suggests ${next}lb (about 90% of ${fromWeight}lb) to start back.`,
    lastWeight: fromWeight,
    suggestedNextWeight: next,
    daysSinceLastPerformed: days,
  };
}

/**
 * DELOAD (4.0-b slice 1; Gavin, 2026-11-15: "I approve the [deload] rule"; amends the locked progression rule the
 * way RE-ENTRY did). When the lift's last 4 sessions in the past 28 days set no new record, all at about the same
 * weight (engine/stall.ts deloadStall), a HOLD or REDUCE becomes DELOAD: about DELOAD_FRACTION of the last load,
 * rounded down to the exercise's own increment, for one session; the locked rule builds back from there. Never
 * replaces INCREASE (you're moving) or RE_ENTRY (a layoff wins). Advisory only: never applied, never pre-filled.
 */
function deload(
  prescription: ExercisePrescription,
  base: ProgressionSuggestion,
  stall: DeloadStall | undefined,
  fromWeight: number | undefined,
  next: number | undefined,
): ProgressionSuggestion {
  if (!stall || (base.recommendation !== "HOLD" && base.recommendation !== "REDUCE")) return base;
  if (fromWeight === undefined || next === undefined || next <= 0 || next >= fromWeight) return base;
  return {
    recommendation: "DELOAD",
    reason: `No new record for ${prescription.name} in your last ${stall.sessions} sessions — suggests one lighter session at ${next}lb (about 90% of ${fromWeight}lb), then building back.`,
    lastWeight: fromWeight,
    suggestedNextWeight: next,
    stallTopWeights: stall.topWeights,
  };
}

/** The locked rule itself, unchanged: judged only from the most recent matching session. */
function evaluateLastSession(prescription: ExercisePrescription, lastSessionSets: PerformedSet[]): ProgressionSuggestion {
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
  const performed = lastSessionSets.filter((s) => countsTowardBest(s));
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

/**
 * GRAYSON-SET-TYPES-001 (Gavin's brief, approved on merge): a timed exercise's progression, the same shape as the
 * rep rule. Every prescribed working set held for the target → suggest TIMED_STEP_SEC longer; fewer sets, a skip, or
 * any set short of the target → hold the target. Warm-up and drop sets never count. No re-entry or deload for holds:
 * there is no load to ease off. Advisory only, like everything here.
 */
function evaluateTimed(prescription: ExercisePrescription, lastSessionSets: PerformedSet[]): ProgressionSuggestion {
  const target = targetSecOf(prescription);
  const sets = lastSessionSets.filter((s) => s.setKind !== "WARMUP" && s.setKind !== "DROP");
  if (sets.length === 0) return { recommendation: "NO_HISTORY", reason: "No prior performance recorded for this exercise in this context yet." };
  const performed = sets.filter((s) => countsTowardBest(s) && s.durationSec !== undefined);
  if (performed.length < prescription.sets) {
    return { recommendation: "HOLD", reason: "Incomplete evidence last time (fewer sets performed than prescribed, or one was skipped).", lastTargetSec: target };
  }
  if (performed.every((s) => s.durationSec! >= target)) {
    return {
      recommendation: "INCREASE",
      reason: `All ${prescription.sets} sets held the ${target}s target.`,
      lastTargetSec: target,
      suggestedTargetSec: target + TIMED_STEP_SEC,
    };
  }
  return { recommendation: "HOLD", reason: `Not every set held the ${target}s target last time.`, lastTargetSec: target };
}
