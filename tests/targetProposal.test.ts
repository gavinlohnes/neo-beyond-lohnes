import { describe, expect, it } from "vitest";
import type { ExpenditureReadout } from "../src/engine/expenditure";
import { proposeCalorieTarget } from "../src/application/targetProposal";

/** TARGET-PROPOSAL-001: every branch of the weekly calorie proposal. Pure; nothing is written. */
const estimate = (lowKcal: number, highKcal: number): ExpenditureReadout => ({
  kind: "ESTIMATE", lowKcal, highKcal, windowDays: 28, intakeDays: 24, avgIntakeKcal: 2300, weeklyChangeLbs: -0.4, weighIns: 12,
});
const waiting: ExpenditureReadout = { kind: "WAITING", windowDays: 28, intakeDays: { have: 3, need: 14 }, weighIns: { have: 2, need: 8 }, spanOk: false, tooNoisy: false };

describe("TARGET-PROPOSAL-001 proposeCalorieTarget", () => {
  it("loses at the chosen rate: maintenance minus rate × weight × 3,500 / 7, rounded to 50", () => {
    // 200 lb × 0.5% = 1 lb a week = 500 kcal a day under the 2,450 middle.
    expect(proposeCalorieTarget(estimate(2350, 2550), { goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5 }, 200)).toEqual({
      kind: "PROPOSAL", kcal: 1950, aimKcal: 1950, maintenance: { lowKcal: 2350, highKcal: 2550 }, direction: "LOSE", ratePercent: 0.5,
      weeklyLbs: -1, goalWeightLbs: 180, limits: [],
    });
  });

  it("gains toward a higher goal", () => {
    const p = proposeCalorieTarget(estimate(2350, 2550), { goalWeightLbs: 170, weightChangeTargetPercentPerWeek: 0.25 }, 160);
    // 160 × 0.25% = 0.4 lb a week = 200 kcal a day.
    expect(p).toMatchObject({ kind: "PROPOSAL", kcal: 2650, direction: "GAIN", weeklyLbs: 0.4 });
  });

  it("holds within a pound of the goal, without needing a rate", () => {
    expect(proposeCalorieTarget(estimate(2300, 2500), { goalWeightLbs: 180 }, 180.6)).toMatchObject({ kind: "PROPOSAL", kcal: 2400, direction: "HOLD", weeklyLbs: 0 });
  });

  it("moves at most 150 kcal a week from the current target, and says where the aim is", () => {
    const p = proposeCalorieTarget(estimate(2350, 2550), { calorieTargetKcal: 2200, goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5 }, 200);
    expect(p).toMatchObject({ kind: "PROPOSAL", kcal: 2050, aimKcal: 1950, currentKcal: 2200, limits: ["STEP"] });
    // A current target off the 50 grid never steps past the limit.
    const odd = proposeCalorieTarget(estimate(2350, 2550), { calorieTargetKcal: 2210, goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5 }, 200);
    expect(odd.kind === "PROPOSAL" && Math.abs(odd.kcal - 2210)).toBeLessThanOrEqual(150);
    expect(odd.kind === "PROPOSAL" && odd.kcal % 50).toBe(0);
  });

  it("says the target already fits when it is within 50 kcal of the aim", () => {
    expect(proposeCalorieTarget(estimate(2350, 2550), { calorieTargetKcal: 1975, goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5 }, 200))
      .toEqual({ kind: "FITS", currentKcal: 1975, aimKcal: 1950, direction: "LOSE", goalWeightLbs: 180 });
  });

  it("caps the rate at 1,000 under and 500 over maintenance, and never goes below 1,500", () => {
    // 300 lb × 1% = 3 lb a week = 1,500 kcal a day: capped to 1,000.
    expect(proposeCalorieTarget(estimate(2900, 3100), { goalWeightLbs: 220, weightChangeTargetPercentPerWeek: 1 }, 300)).toMatchObject({ kcal: 2000, limits: ["BELOW_CAP"] });
    expect(proposeCalorieTarget(estimate(2400, 2600), { goalWeightLbs: 220, weightChangeTargetPercentPerWeek: 1 }, 150)).toMatchObject({ kcal: 3000, limits: ["ABOVE_CAP"] });
    expect(proposeCalorieTarget(estimate(1700, 1900), { goalWeightLbs: 120, weightChangeTargetPercentPerWeek: 0.5 }, 140)).toMatchObject({ kcal: 1500, aimKcal: 1500, limits: ["FLOOR"] });
  });

  it("abstains, naming what's missing", () => {
    const targets = { goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5 };
    expect(proposeCalorieTarget(waiting, targets, 200)).toEqual({ kind: "WAITING", reason: "ESTIMATE" });
    expect(proposeCalorieTarget(estimate(2350, 2550), { weightChangeTargetPercentPerWeek: 0.5 }, 200)).toEqual({ kind: "WAITING", reason: "NO_GOAL" });
    expect(proposeCalorieTarget(estimate(2350, 2550), targets, undefined)).toEqual({ kind: "WAITING", reason: "NO_WEIGHT" });
    expect(proposeCalorieTarget(estimate(2350, 2550), { goalWeightLbs: 180 }, 200)).toEqual({ kind: "WAITING", reason: "NO_RATE" });
  });
});
