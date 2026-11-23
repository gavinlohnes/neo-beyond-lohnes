import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { getNutritionTargets } from "../../src/application/nutritionTargetQueries";
import { parseNutritionTargets } from "../../src/persistence/nutritionTargetValidation";
import { waterTargetLine } from "../../src/application/waterTarget";

/** GRAYSON C4.6: his own daily water target; optional, additive, cleared by blank; no default. */
beforeEach(async () => { await db.open(); });
afterEach(async () => { await db.delete(); });

it("is unset by default, saves, keeps other targets, and clears with null", async () => {
  expect((await getNutritionTargets()).waterTargetOz).toBeUndefined();
  await updateNutritionTargets({ calorieTargetKcal: 2200 });
  await updateNutritionTargets({ waterTargetOz: 100 });
  expect(await getNutritionTargets()).toMatchObject({ calorieTargetKcal: 2200, waterTargetOz: 100 });
  await updateNutritionTargets({ waterTargetOz: null });
  const after = await getNutritionTargets();
  expect(after.waterTargetOz).toBeUndefined();
  expect(after.calorieTargetKcal).toBe(2200);
});

it("refuses an implausible target and reads older rows without it", async () => {
  await expect(updateNutritionTargets({ waterTargetOz: 5 })).rejects.toThrow();
  await expect(updateNutritionTargets({ waterTargetOz: 1000 })).rejects.toThrow();
  const old = { id: "current", proteinMultiplierGPerLb: 1, createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" };
  expect(parseNutritionTargets(old)).toMatchObject({ proteinMultiplierGPerLb: 1 });
  expect(parseNutritionTargets(old)!.waterTargetOz).toBeUndefined();
});

it("states the total against the target plainly, and says nothing without one", () => {
  expect(waterTargetLine(48, 100)).toBe("48 of 100 oz today · 52 to go.");
  expect(waterTargetLine(104, 100)).toBe("Target met: 104 of 100 oz today.");
  expect(waterTargetLine(48, undefined)).toBeNull();
});
