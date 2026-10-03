import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { saveNutritionTargets, updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { getNutritionTargets } from "../../src/application/nutritionTargetQueries";
import { DEFAULT_NUTRITION_TARGETS } from "../../src/engine/nutritionTargets";

/** HOTFIX (BODY logging trust, owner ruling 2026-10-03): Nutrition Targets SAVE gets a short UNDO. */
beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("saveNutritionTargets — UNDO restores exactly what was there", () => {
  it("undoing a later save puts the earlier targets back", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2200, proteinMultiplierGPerLb: 0.9 });
    const before = await db.nutritionTargets.get("current");
    const { saved, undo } = await saveNutritionTargets({ calorieTargetKcal: 2000, goalWeightLbs: 180 });
    expect(saved.calorieTargetKcal).toBe(2000);

    await undo();

    expect(await db.nutritionTargets.get("current")).toEqual(before);
  });

  it("undoing the very first save goes back to no targets at all", async () => {
    const { undo } = await saveNutritionTargets({ calorieTargetKcal: 2200 });
    await undo();
    expect(await db.nutritionTargets.get("current")).toBeUndefined();
    expect(await getNutritionTargets()).toEqual(DEFAULT_NUTRITION_TARGETS);
  });

  it("does nothing once a newer save has replaced it", async () => {
    const first = await saveNutritionTargets({ calorieTargetKcal: 2200 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await updateNutritionTargets({ calorieTargetKcal: 1900 });
    await first.undo();
    expect((await getNutritionTargets()).calorieTargetKcal).toBe(1900);
  });
});
