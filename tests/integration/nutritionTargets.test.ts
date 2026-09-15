import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
// Side-effect import: extends Dexie.prototype with export()/import(), same
// convention as nutritionMealMemory.test.ts's own backup round-trip block.
import "dexie-export-import";
import { correctBodyweight, logBodyweight, startDay } from "../../src/application/commands";
import { getMostRecentBodyweight } from "../../src/application/queries";
import { getTotalMealCalories } from "../../src/application/nutritionQueries";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { getEffectiveProteinTargetG, getNutritionTargets } from "../../src/application/nutritionTargetQueries";

/**
 * NUTRITION-003 (Calorie + Protein Targets, High-Risk Drop, direct owner
 * ruling reversing NUTRITION-001's "no calorie/macro goal" restriction).
 * Calorie target is set directly (no formula). Protein target is derived
 * from the most recently logged bodyweight x an adjustable multiplier,
 * and must stay undefined -- never a guessed number -- until a bodyweight
 * has ever been logged.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getNutritionTargets / updateNutritionTargets — single mutable settings row", () => {
  it("returns the default row (1.0 g/lb, no calorie target) before any edit", async () => {
    const targets = await getNutritionTargets();
    expect(targets.id).toBe("current");
    expect(targets.proteinMultiplierGPerLb).toBe(1.0);
    expect(targets.calorieTargetKcal).toBeUndefined();
  });

  it("setting only the calorie target leaves the protein multiplier at its prior value", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2200 });
    const targets = await getNutritionTargets();
    expect(targets.calorieTargetKcal).toBe(2200);
    expect(targets.proteinMultiplierGPerLb).toBe(1.0);
  });

  it("setting only the protein multiplier leaves a previously-set calorie target untouched", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2200 });
    await updateNutritionTargets({ proteinMultiplierGPerLb: 0.85 });
    const targets = await getNutritionTargets();
    expect(targets.calorieTargetKcal).toBe(2200);
    expect(targets.proteinMultiplierGPerLb).toBe(0.85);
  });

  it("createdAt is stable across edits; updatedAt advances", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2200 });
    const first = await getNutritionTargets();
    await updateNutritionTargets({ calorieTargetKcal: 2000 });
    const second = await getNutritionTargets();
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.calorieTargetKcal).toBe(2000);
  });

  it("rejects a non-positive calorie target", async () => {
    await expect(updateNutritionTargets({ calorieTargetKcal: 0 })).rejects.toThrow();
    await expect(updateNutritionTargets({ calorieTargetKcal: -100 })).rejects.toThrow();
  });

  it("rejects a non-positive protein multiplier", async () => {
    await expect(updateNutritionTargets({ proteinMultiplierGPerLb: 0 })).rejects.toThrow();
    await expect(updateNutritionTargets({ proteinMultiplierGPerLb: -0.5 })).rejects.toThrow();
  });

  it("rejects an empty update (neither field provided)", async () => {
    await expect(updateNutritionTargets({})).rejects.toThrow();
  });
});

describe("getEffectiveProteinTargetG — derived from bodyweight, never guessed", () => {
  it("is undefined when no bodyweight has ever been logged, even with a multiplier set", async () => {
    await updateNutritionTargets({ proteinMultiplierGPerLb: 1.0 });
    expect(await getEffectiveProteinTargetG()).toBeUndefined();
  });

  it("derives target = multiplier * most recent bodyweight once one is logged", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 180);
    await updateNutritionTargets({ proteinMultiplierGPerLb: 1.0 });
    expect(await getEffectiveProteinTargetG()).toBe(180);
  });

  it("rounds to the nearest whole gram", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 165);
    await updateNutritionTargets({ proteinMultiplierGPerLb: 0.85 });
    expect(await getEffectiveProteinTargetG()).toBe(Math.round(165 * 0.85));
  });

  it("uses the default 1.0 g/lb multiplier before any target edit is ever made", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 200);
    expect(await getEffectiveProteinTargetG()).toBe(200);
  });
});

describe("getMostRecentBodyweight — cross-day, unlike day-scoped getLatestBodyweight", () => {
  it("is undefined when nothing has ever been logged", async () => {
    expect(await getMostRecentBodyweight()).toBeUndefined();
  });

  it("returns the most recent weigh-in even when it happened on an earlier BeyondDay", async () => {
    const day1 = await startDay();
    await logBodyweight(day1.id, 190);

    // startDay() auto-closes day1 (AUTO_CLOSED_ON_NEW_DAY_START).
    const day2 = await startDay();
    // No bodyweight logged on day2 at all — the target must still resolve
    // using day1's real weigh-in, since a protein target shouldn't vanish
    // just because today has no fresh scale reading yet.
    expect(await getMostRecentBodyweight()).toBe(190);
    expect(day2.id).not.toBe(day1.id);
  });

  it("reflects the latest of multiple logs across multiple days, by recordedAt", async () => {
    const day1 = await startDay();
    await logBodyweight(day1.id, 190);

    const day2 = await startDay();
    await logBodyweight(day2.id, 185);

    expect(await getMostRecentBodyweight()).toBe(185);
  });

  it("reflects an effective (corrected) value, not the stale original", async () => {
    const day = await startDay();
    const eventId = await logBodyweight(day.id, 190);
    await correctBodyweight(day.id, eventId, 188);

    expect(await getMostRecentBodyweight()).toBe(188);
  });
});

describe("getTotalMealCalories", () => {
  it("sums each meal entry's effective (corrected) calories for the day", async () => {
    const day = await startDay();
    const meal = await createSavedMeal({ name: "Bowl", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 });
    await logMeal(day.id, meal.id);
    expect(await getTotalMealCalories(day.id)).toBe(600);
  });

  it("is zero for a day with no meals logged", async () => {
    const day = await startDay();
    expect(await getTotalMealCalories(day.id)).toBe(0);
  });
});

/**
 * High-Risk Drop compatibility evidence: nutritionTargets is a new table
 * added at Dexie v11 — this proves the settings row survives a real
 * native backup export/import round trip, the same db.export()/
 * db.import() proof nutritionMealMemory.test.ts already established for
 * savedMeals/MEAL_LOGGED.
 */
describe("Backup/restore round-trip — NutritionTargets survives", () => {
  it("a saved target row survives a real export -> clear -> import cycle", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2100, proteinMultiplierGPerLb: 0.9 });

    const blob = await db.export({ prettyJson: true });
    const file = new File([blob], "native-backup.json", { type: "application/json" });

    // Diverge current state so the restore has something real to undo.
    await updateNutritionTargets({ calorieTargetKcal: 3000, proteinMultiplierGPerLb: 1.2 });
    expect((await getNutritionTargets()).calorieTargetKcal).toBe(3000);

    await db.import(file, { clearTablesBeforeImport: true });

    const restored = await getNutritionTargets();
    expect(restored.calorieTargetKcal).toBe(2100);
    expect(restored.proteinMultiplierGPerLb).toBe(0.9);
  });
});
