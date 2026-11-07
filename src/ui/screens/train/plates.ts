/**
 * PLATES-001 (APPS-PICKS-002 pick 16): TRAIN's set entry reuses Gym Mode's plate math and warm-up ramp
 * (gymModeQueries) instead of a second copy. Display only; it never changes a prescription or a logged set.
 */
import { BAR_LBS, describePlates as describeGymPlates, describeWarmUp, warmUpRamp } from "../../../application/gymModeQueries";

export function describePlates(totalLbs: number): string | null {
  return Number.isFinite(totalLbs) && totalLbs >= BAR_LBS ? describeGymPlates(totalLbs) : null;
}

/** WARMUP-001 (APPS-PICKS-003 pick 19, after Strong): Gym Mode's warm-up ramp, shown on a lift's first set. */
export function describeWarmUpFor(workingLbs: number): string | null {
  return Number.isFinite(workingLbs) && workingLbs > BAR_LBS ? describeWarmUp(warmUpRamp(workingLbs)) : null;
}

/** Free-weight barbell lifts only; machines, cables, dumbbells and Smith bars have no plate math here. */
export const usesBarbellPlates = (name: string) =>
  /barbell|deadlift|back squat|front squat|bench press|overhead press|\bsquat\b/i.test(name) && !/dumbbell|machine|cable|smith|goblet|leg press|hack|trap bar/i.test(name);

/**
 * E1RM-001 (APPS-PICKS-003 pick 17, after Strong): an estimated one-rep max from a recorded set, using the
 * common Epley formula. Only sets of 1–12 reps are used; it is an estimate for orientation, never a target
 * or a prescription.
 */
export function estimatedOneRepMax(weight: number, reps: number): number | null {
  if (!(weight > 0) || !Number.isInteger(reps) || reps < 1 || reps > 12) return null;
  return reps === 1 ? weight : Math.round(weight * (1 + reps / 30));
}

export function bestEstimate(sessions: readonly { startedAt: string; sets: readonly { weight: number; reps: number }[] }[]) {
  let best: { value: number; weight: number; reps: number; at: string } | null = null;
  for (const session of sessions) for (const set of session.sets) {
    const value = estimatedOneRepMax(set.weight, set.reps);
    if (value !== null && (!best || value > best.value)) best = { value, weight: set.weight, reps: set.reps, at: session.startedAt };
  }
  return best;
}
