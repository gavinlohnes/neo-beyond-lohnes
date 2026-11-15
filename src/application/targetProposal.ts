import { KCAL_PER_LB, type ExpenditureReadout } from "../engine/expenditure";

/**
 * TARGET-PROPOSAL-001 (Gavin, 2026-11-14: "Approved"): a weekly calorie target BEYOND offers and the operator saves
 * or keeps. Pure arithmetic over the existing weight-trend estimate (Drop 6) and the operator's own goal weight and
 * weekly rate. It proposes; it never writes, never reaches the Engine, and never uses Garmin's burned estimate.
 *
 *   aim = middle of the expenditure range ± (rate % × current weight × 3,500 / 7)
 *
 * capped at 1,000 kcal a day below maintenance and 500 above, never below the operator's floor (1,500 unless set),
 * moved at most 150 kcal a week from the current target, rounded to 50. Within 1 lb of the goal it proposes holding.
 *
 * TARGET-PROPOSAL-002 (Gavin, 2026-11-15): the floor is the operator's own setting; with a current target under it,
 * the weekly step starts from the floor; the current weight must be from the last 14 days and says where it came from; when a
 * cap applies, the weekly weight change shown is the capped one.
 */
export const HOLD_BAND_LBS = 1;
export const MAX_BELOW_KCAL = 1000;
export const MAX_ABOVE_KCAL = 500;
/** The default floor when the operator hasn't set one. */
export const MIN_PROPOSAL_KCAL = 1500;
/** A weigh-in older than this is not a current weight. */
export const WEIGHT_MAX_AGE_DAYS = 14;
export const MAX_WEEKLY_STEP_KCAL = 150;
export const FITS_WITHIN_KCAL = 50;
const ROUND_TO = 50;

export type ProposalDirection = "LOSE" | "GAIN" | "HOLD";
export type CalorieProposal =
  | {
      kind: "PROPOSAL";
      /** What to save. */
      kcal: number;
      /** The unsmoothed aim, rounded. Equal to kcal unless the weekly step held it back. */
      aimKcal: number;
      currentKcal?: number;
      maintenance: { lowKcal: number; highKcal: number };
      direction: ProposalDirection;
      ratePercent?: number;
      /** The aim's weekly weight change, lb (0 when holding), after any cap. */
      weeklyLbs: number;
      /** Your rate's weekly change before a cap, lb; equal to weeklyLbs when no cap applies. */
      rateLbs: number;
      floorKcal: number;
      weight: CurrentWeight;
      goalWeightLbs: number;
      /** What shaped the number beyond the plain arithmetic. */
      limits: ("STEP" | "FLOOR" | "BELOW_CAP" | "ABOVE_CAP" | "UNDER_FLOOR")[];
    }
  | { kind: "FITS"; currentKcal: number; aimKcal: number; direction: ProposalDirection; goalWeightLbs: number; weight: CurrentWeight }
  | { kind: "WAITING"; reason: "ESTIMATE" | "NO_GOAL" | "NO_WEIGHT" | "NO_RATE" };

const round = (kcal: number) => Math.round(kcal / ROUND_TO) * ROUND_TO;
/** Where the current weight came from: this week's average weigh-in, or one recent weigh-in. */
export interface CurrentWeight { lbs: number; basis: "WEEK_AVERAGE" | "LATEST"; at?: string }

export function proposeCalorieTarget(
  expenditure: ExpenditureReadout,
  targets: { calorieTargetKcal?: number; goalWeightLbs?: number; weightChangeTargetPercentPerWeek?: number; calorieFloorKcal?: number },
  weight: CurrentWeight | undefined,
): CalorieProposal {
  if (expenditure.kind !== "ESTIMATE") return { kind: "WAITING", reason: "ESTIMATE" };
  const goal = targets.goalWeightLbs;
  if (goal === undefined) return { kind: "WAITING", reason: "NO_GOAL" };
  if (weight === undefined) return { kind: "WAITING", reason: "NO_WEIGHT" };
  const currentWeightLbs = weight.lbs, floor = targets.calorieFloorKcal ?? MIN_PROPOSAL_KCAL;
  const gap = goal - currentWeightLbs;
  const direction: ProposalDirection = Math.abs(gap) < HOLD_BAND_LBS ? "HOLD" : gap < 0 ? "LOSE" : "GAIN";
  const rate = targets.weightChangeTargetPercentPerWeek;
  if (direction !== "HOLD" && rate === undefined) return { kind: "WAITING", reason: "NO_RATE" };

  const limits: ("STEP" | "FLOOR" | "BELOW_CAP" | "ABOVE_CAP" | "UNDER_FLOOR")[] = [];
  const rateLbs = direction === "HOLD" ? 0 : (rate! / 100) * currentWeightLbs * (direction === "LOSE" ? -1 : 1);
  let daily = (rateLbs * KCAL_PER_LB) / 7;
  if (daily < -MAX_BELOW_KCAL) { daily = -MAX_BELOW_KCAL; limits.push("BELOW_CAP"); }
  if (daily > MAX_ABOVE_KCAL) { daily = MAX_ABOVE_KCAL; limits.push("ABOVE_CAP"); }
  const maintenance = (expenditure.lowKcal + expenditure.highKcal) / 2;
  let aim = round(maintenance + daily);
  if (aim < floor) { aim = floor; limits.push("FLOOR"); }
  // Review of #532: when the floor lifts the aim, the weekly change is the floor's, not the rate's.
  const weeklyLbs = limits.includes("FLOOR") ? ((aim - maintenance) * 7) / KCAL_PER_LB : (daily * 7) / KCAL_PER_LB;

  const current = targets.calorieTargetKcal;
  // A current target under the floor never "fits": the weekly step starts from the floor instead (review of #531).
  const underFloor = current !== undefined && current < floor;
  if (current !== undefined && !underFloor && Math.abs(aim - current) < FITS_WITHIN_KCAL) {
    return { kind: "FITS", currentKcal: current, aimKcal: aim, direction, goalWeightLbs: goal, weight };
  }
  if (underFloor) limits.push("UNDER_FLOOR");
  const base = underFloor ? floor : current;
  let kcal = aim;
  if (base !== undefined && Math.abs(aim - base) > MAX_WEEKLY_STEP_KCAL) {
    kcal = round(base + Math.sign(aim - base) * MAX_WEEKLY_STEP_KCAL);
    // Rounding a base that isn't a multiple of 50 must never step past the limit.
    if (Math.abs(kcal - base) > MAX_WEEKLY_STEP_KCAL) kcal -= Math.sign(aim - base) * ROUND_TO;
    limits.push("STEP");
  }
  if (kcal < floor) kcal = floor;
  return {
    kind: "PROPOSAL", kcal, aimKcal: aim,
    ...(current !== undefined ? { currentKcal: current } : {}),
    maintenance: { lowKcal: expenditure.lowKcal, highKcal: expenditure.highKcal },
    direction, ...(rate !== undefined && direction !== "HOLD" ? { ratePercent: rate } : {}),
    weeklyLbs: Math.round(weeklyLbs * 10) / 10, rateLbs: Math.round(rateLbs * 10) / 10, floorKcal: floor, weight,
    goalWeightLbs: goal, limits,
  };
}
