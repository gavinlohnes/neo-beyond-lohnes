import { KCAL_PER_LB, type ExpenditureReadout } from "../engine/expenditure";

/**
 * TARGET-PROPOSAL-001 (Gavin, 2026-11-14: "Approved"): a weekly calorie target BEYOND offers and the operator saves
 * or keeps. Pure arithmetic over the existing weight-trend estimate (Drop 6) and the operator's own goal weight and
 * weekly rate. It proposes; it never writes, never reaches the Engine, and never uses Garmin's burned estimate.
 *
 *   aim = middle of the expenditure range ± (rate % × current weight × 3,500 / 7)
 *
 * capped at 1,000 kcal a day below maintenance and 500 above, never below 1,500, moved at most 150 kcal a week from
 * the current target, rounded to 50. Within 1 lb of the goal it proposes holding.
 */
export const HOLD_BAND_LBS = 1;
export const MAX_BELOW_KCAL = 1000;
export const MAX_ABOVE_KCAL = 500;
export const MIN_PROPOSAL_KCAL = 1500;
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
      /** The aim's weekly weight change, lb (0 when holding). */
      weeklyLbs: number;
      goalWeightLbs: number;
      /** What shaped the number beyond the plain arithmetic. */
      limits: ("STEP" | "FLOOR" | "BELOW_CAP" | "ABOVE_CAP")[];
    }
  | { kind: "FITS"; currentKcal: number; aimKcal: number; direction: ProposalDirection; goalWeightLbs: number }
  | { kind: "WAITING"; reason: "ESTIMATE" | "NO_GOAL" | "NO_WEIGHT" | "NO_RATE" };

const round = (kcal: number) => Math.round(kcal / ROUND_TO) * ROUND_TO;

export function proposeCalorieTarget(
  expenditure: ExpenditureReadout,
  targets: { calorieTargetKcal?: number; goalWeightLbs?: number; weightChangeTargetPercentPerWeek?: number },
  currentWeightLbs: number | undefined,
): CalorieProposal {
  if (expenditure.kind !== "ESTIMATE") return { kind: "WAITING", reason: "ESTIMATE" };
  const goal = targets.goalWeightLbs;
  if (goal === undefined) return { kind: "WAITING", reason: "NO_GOAL" };
  if (currentWeightLbs === undefined) return { kind: "WAITING", reason: "NO_WEIGHT" };
  const gap = goal - currentWeightLbs;
  const direction: ProposalDirection = Math.abs(gap) < HOLD_BAND_LBS ? "HOLD" : gap < 0 ? "LOSE" : "GAIN";
  const rate = targets.weightChangeTargetPercentPerWeek;
  if (direction !== "HOLD" && rate === undefined) return { kind: "WAITING", reason: "NO_RATE" };

  const limits: ("STEP" | "FLOOR" | "BELOW_CAP" | "ABOVE_CAP")[] = [];
  const weeklyLbs = direction === "HOLD" ? 0 : (rate! / 100) * currentWeightLbs * (direction === "LOSE" ? -1 : 1);
  let daily = (weeklyLbs * KCAL_PER_LB) / 7;
  if (daily < -MAX_BELOW_KCAL) { daily = -MAX_BELOW_KCAL; limits.push("BELOW_CAP"); }
  if (daily > MAX_ABOVE_KCAL) { daily = MAX_ABOVE_KCAL; limits.push("ABOVE_CAP"); }
  const maintenance = (expenditure.lowKcal + expenditure.highKcal) / 2;
  let aim = round(maintenance + daily);
  if (aim < MIN_PROPOSAL_KCAL) { aim = MIN_PROPOSAL_KCAL; limits.push("FLOOR"); }

  const current = targets.calorieTargetKcal;
  if (current !== undefined && Math.abs(aim - current) < FITS_WITHIN_KCAL) {
    return { kind: "FITS", currentKcal: current, aimKcal: aim, direction, goalWeightLbs: goal };
  }
  let kcal = aim;
  if (current !== undefined && Math.abs(aim - current) > MAX_WEEKLY_STEP_KCAL) {
    kcal = round(current + Math.sign(aim - current) * MAX_WEEKLY_STEP_KCAL);
    // Rounding a current target that isn't a multiple of 50 must never step past the limit.
    if (Math.abs(kcal - current) > MAX_WEEKLY_STEP_KCAL) kcal -= Math.sign(aim - current) * ROUND_TO;
    limits.push("STEP");
  }
  return {
    kind: "PROPOSAL", kcal, aimKcal: aim,
    ...(current !== undefined ? { currentKcal: current } : {}),
    maintenance: { lowKcal: expenditure.lowKcal, highKcal: expenditure.highKcal },
    direction, ...(rate !== undefined && direction !== "HOLD" ? { ratePercent: rate } : {}),
    weeklyLbs: Math.round(weeklyLbs * 10) / 10, goalWeightLbs: goal, limits,
  };
}
