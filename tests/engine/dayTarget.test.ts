import { describe, expect, it } from "vitest";
import { averageDayTargets, balancedOffAdjustment, deriveDayCalorieTarget } from "../../src/engine/dayTarget";
import type { NutritionTargets } from "../../src/domain/common/types";

const targets = (adjust = { WORK: 100, RECOVERY: 0, OFF: -100, LIFT: 150 }): NutritionTargets => ({
  id: "current", calorieTargetKcal: 1950, proteinMultiplierGPerLb: 1, calorieFloorKcal: 1500,
  dayTargets: { on: true, adjustKcal: adjust }, createdAt: "x", updatedAt: "x",
});

describe("day calorie targets", () => {
  it("preserves the plain target when off or the day kind is unknown", () => {
    expect(deriveDayCalorieTarget({ ...targets(), dayTargets: { ...targets().dayTargets!, on: false } }, "WORK", true).kcal).toBe(1950);
    expect(deriveDayCalorieTarget(targets(), null, true).kcal).toBe(1950);
  });
  it("layers lift over the rota kind and explains both parts", () => {
    expect(deriveDayCalorieTarget(targets(), "WORK", true)).toMatchObject({ kcal: 2200, kind: "WORK", lift: true, parts: [{ label: "Work night", kcal: 100 }, { label: "Lift day", kcal: 150 }] });
  });
  it("holds the operator floor and reports it", () => {
    expect(deriveDayCalorieTarget(targets({ WORK: 0, RECOVERY: 0, OFF: -600, LIFT: 0 }), "OFF", false)).toMatchObject({ kcal: 1500, floorHeld: true });
  });
  it("balances the OFF adjustment over a projected fortnight", () => {
    const days = [{ kind: "WORK" as const, lift: false }, { kind: "OFF" as const, lift: false }];
    const off = balancedOffAdjustment(targets({ WORK: 100, RECOVERY: 0, OFF: 0, LIFT: 0 }), days);
    const balanced = targets({ WORK: 100, RECOVERY: 0, OFF: off!, LIFT: 0 });
    expect(off).toBe(-100);
    expect(averageDayTargets(balanced, days)).toBe(1950);
  });
});
