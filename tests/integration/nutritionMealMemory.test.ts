import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
// Side-effect import: extends Dexie.prototype with export()/import(), same
// as persistence/backup.ts's own top-level import — needed directly here
// since this file calls db.export()/db.import() without going through
// backup.ts's own wrapper functions.
import "dexie-export-import";
import { logProtein, startDay } from "../../src/application/commands";
import { getMinimumDayStatus } from "../../src/application/queries";
import {
  archiveSavedMeal,
  correctMealLog,
  createSavedMeal,
  logMeal,
  updateSavedMeal,
} from "../../src/application/nutritionCommands";
import { getMealEntries, getSavedMeals, getTotalMealProteinGrams } from "../../src/application/nutritionQueries";

/**
 * NUTRITION-001 (Meal Memory, High-Risk Drop): same "gained the same
 * correction-chain doctrine already proven on hydration, verified
 * independently here" convention as bodyCorrection.test.ts — meal
 * history is DomainEvent truth with a hydration-style correction chain;
 * SavedMeal is a directly-mutable preset that never rewrites a past log.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

async function makeMeal(overrides: Partial<{ name: string; calories: number; proteinG: number; carbsG: number; fatG: number }> = {}) {
  return createSavedMeal({
    name: "Chicken & Rice Bowl",
    calories: 600,
    proteinG: 45,
    carbsG: 60,
    fatG: 15,
    ...overrides,
  });
}

describe("SavedMeal CRUD — directly mutable, no event trail of its own", () => {
  it("creates a saved meal and it appears in the active list", async () => {
    const meal = await makeMeal();
    const list = await getSavedMeals();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(meal.id);
    expect(list[0]!.name).toBe("Chicken & Rice Bowl");
  });

  it("updates change the preset's current fields in place", async () => {
    const meal = await makeMeal();
    await updateSavedMeal(meal.id, { calories: 650, proteinG: 50 });
    const [updated] = await getSavedMeals();
    expect(updated!.calories).toBe(650);
    expect(updated!.proteinG).toBe(50);
    expect(updated!.carbsG).toBe(60); // untouched field preserved
  });

  it("archiving removes a meal from the active list without deleting it", async () => {
    const meal = await makeMeal();
    await archiveSavedMeal(meal.id);
    expect(await getSavedMeals()).toHaveLength(0);
    const all = await getSavedMeals({ includeArchived: true });
    expect(all).toHaveLength(1);
    expect(all[0]!.archivedAt).toBeDefined();
  });

  it("archiving is idempotent, matching archiveMission's precedent", async () => {
    const meal = await makeMeal();
    await archiveSavedMeal(meal.id);
    await expect(archiveSavedMeal(meal.id)).resolves.toBeUndefined();
  });

  it("rejects operating on a nonexistent SavedMeal", async () => {
    await expect(updateSavedMeal("does-not-exist", { calories: 100 })).rejects.toThrow(/SAVED_MEAL_NOT_FOUND/);
    await expect(archiveSavedMeal("does-not-exist")).rejects.toThrow(/SAVED_MEAL_NOT_FOUND/);
  });
});

describe("logMeal — snapshots current macros into immutable history", () => {
  it("a fresh log has no correction and effective == original snapshot", async () => {
    const day = await startDay();
    const meal = await makeMeal();
    await logMeal(day.id, {
      savedMealId: meal.id,
      name: meal.name,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    });

    const entries = await getMealEntries(day.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.name).toBe("Chicken & Rice Bowl");
    expect(entries[0]!.originalCalories).toBe(600);
    expect(entries[0]!.effectiveCalories).toBe(600);
    expect(entries[0]!.effectiveProteinG).toBe(45);
    expect(entries[0]!.correctionCount).toBe(0);
    expect(entries[0]!.savedMealId).toBe(meal.id);
  });

  /**
   * The core guarantee this Drop exists to prove: "SavedMeal edits/
   * archives never rewrite past logs." Editing (or archiving) the
   * preset AFTER logging must leave the already-recorded snapshot
   * completely unaffected.
   */
  it("editing the SavedMeal after logging does not change the already-logged entry", async () => {
    const day = await startDay();
    const meal = await makeMeal();
    await logMeal(day.id, {
      savedMealId: meal.id,
      name: meal.name,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    });

    await updateSavedMeal(meal.id, { calories: 900, proteinG: 5, carbsG: 5, fatG: 5, name: "Renamed Meal" });

    const entries = await getMealEntries(day.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.name).toBe("Chicken & Rice Bowl"); // the name at log time, not after rename
    expect(entries[0]!.effectiveCalories).toBe(600);
    expect(entries[0]!.effectiveProteinG).toBe(45);
  });

  it("archiving the SavedMeal after logging does not remove or alter its past entry", async () => {
    const day = await startDay();
    const meal = await makeMeal();
    await logMeal(day.id, {
      savedMealId: meal.id,
      name: meal.name,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    });
    await archiveSavedMeal(meal.id);

    const entries = await getMealEntries(day.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.effectiveCalories).toBe(600);
  });

  it("logging the same SavedMeal twice, after an edit, snapshots each log's own values independently", async () => {
    const day = await startDay();
    const meal = await makeMeal();
    await logMeal(day.id, {
      savedMealId: meal.id,
      name: meal.name,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    });
    const updated = await updateSavedMeal(meal.id, { calories: 700, proteinG: 50 });
    await logMeal(day.id, {
      savedMealId: updated.id,
      name: updated.name,
      calories: updated.calories,
      proteinG: updated.proteinG,
      carbsG: updated.carbsG,
      fatG: updated.fatG,
    });

    const entries = await getMealEntries(day.id);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.effectiveCalories).sort()).toEqual([600, 700]);
  });
});

describe("correctMealLog — hydration-style correction chain, multi-value", () => {
  it("corrects all four macro fields without touching the original fact", async () => {
    const day = await startDay();
    const meal = await makeMeal();
    await logMeal(day.id, {
      savedMealId: meal.id,
      name: meal.name,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    });
    const [logged] = await getMealEntries(day.id);
    await correctMealLog(day.id, logged!.headEventId, { calories: 620, proteinG: 48, carbsG: 58, fatG: 16 });

    const entries = await getMealEntries(day.id);
    expect(entries[0]!.originalCalories).toBe(600);
    expect(entries[0]!.originalProteinG).toBe(45);
    expect(entries[0]!.effectiveCalories).toBe(620);
    expect(entries[0]!.effectiveProteinG).toBe(48);
    expect(entries[0]!.effectiveCarbsG).toBe(58);
    expect(entries[0]!.effectiveFatG).toBe(16);
    expect(entries[0]!.correctionCount).toBe(1);
  });

  it("rejects correcting an already-superseded (stale) entry", async () => {
    const day = await startDay();
    const meal = await makeMeal();
    await logMeal(day.id, {
      savedMealId: meal.id,
      name: meal.name,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    });
    const [logged] = await getMealEntries(day.id);
    await correctMealLog(day.id, logged!.headEventId, { calories: 620, proteinG: 48, carbsG: 58, fatG: 16 });

    await expect(
      correctMealLog(day.id, logged!.headEventId, { calories: 700, proteinG: 50, carbsG: 60, fatG: 20 }),
    ).rejects.toThrow(/STALE_CORRECTION_TARGET/);
  });

  it("rejects a no-op correction (all four values identical)", async () => {
    const day = await startDay();
    const meal = await makeMeal();
    await logMeal(day.id, {
      savedMealId: meal.id,
      name: meal.name,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    });
    const [logged] = await getMealEntries(day.id);
    await expect(
      correctMealLog(day.id, logged!.headEventId, { calories: 600, proteinG: 45, carbsG: 60, fatG: 15 }),
    ).rejects.toThrow(/NO_OP_CORRECTION/);
  });

  it("rejects correcting a nonexistent event id", async () => {
    const day = await startDay();
    await expect(
      correctMealLog(day.id, "does-not-exist", { calories: 100, proteinG: 10, carbsG: 10, fatG: 10 }),
    ).rejects.toThrow(/CORRECTION_TARGET_NOT_FOUND/);
  });
});

describe("getTotalMealProteinGrams", () => {
  it("sums each entry's effective (corrected) protein, not the original", async () => {
    const day = await startDay();
    const meal = await makeMeal({ proteinG: 30 });
    await logMeal(day.id, { savedMealId: meal.id, name: meal.name, calories: meal.calories, proteinG: 30, carbsG: meal.carbsG, fatG: meal.fatG });
    const [logged] = await getMealEntries(day.id);
    await correctMealLog(day.id, logged!.headEventId, { calories: 600, proteinG: 40, carbsG: 60, fatG: 15 });

    expect(await getTotalMealProteinGrams(day.id)).toBe(40);
  });
});

/**
 * High-Risk Drop compatibility evidence: savedMeals is a new table and
 * MEAL_LOGGED/MEAL_LOG_CORRECTED are new event types — this proves both
 * survive a real native backup export/import round trip (the same
 * db.export()/db.import() persistence/backup.ts's exportBackup/
 * applyRestore call), exactly the "backup-restore round-trip, explicit
 * results" evidence a High-Risk report requires. No dexie-export-import
 * code change was made for this Drop; this test is the proof that none
 * was needed — the library serializes whatever tables the live schema
 * declares.
 */
describe("Backup/restore round-trip — SavedMeal + meal history survive", () => {
  it("a SavedMeal and its logged/corrected history survive a real export -> clear -> import cycle", async () => {
    const day = await startDay();
    const meal = await makeMeal();
    await logMeal(day.id, {
      savedMealId: meal.id,
      name: meal.name,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    });
    const [logged] = await getMealEntries(day.id);
    await correctMealLog(day.id, logged!.headEventId, { calories: 620, proteinG: 48, carbsG: 58, fatG: 16 });

    const blob = await db.export({ prettyJson: true });
    const file = new File([blob], "native-backup.json", { type: "application/json" });

    // Diverge current state so the restore has something real to undo.
    await createSavedMeal({ name: "Divergent Meal", calories: 1, proteinG: 1, carbsG: 1, fatG: 1 });
    expect(await getSavedMeals()).toHaveLength(2);

    await db.import(file, { clearTablesBeforeImport: true });

    const restoredMeals = await getSavedMeals();
    expect(restoredMeals).toHaveLength(1);
    expect(restoredMeals[0]!.name).toBe("Chicken & Rice Bowl");

    const restoredEntries = await getMealEntries(day.id);
    expect(restoredEntries).toHaveLength(1);
    expect(restoredEntries[0]!.effectiveCalories).toBe(620);
    expect(restoredEntries[0]!.correctionCount).toBe(1);
  });
});

describe("Minimum Day protein — meal protein counts alongside protein-only logs", () => {
  it("neither protein-only nor meal-only alone satisfies 25g, but their sum does", async () => {
    const day = await startDay();
    await logProtein(day.id, 15);
    let status = await getMinimumDayStatus(day.id);
    expect(status.protein).toBe(false);

    const meal = await makeMeal({ proteinG: 15 });
    await logMeal(day.id, { savedMealId: meal.id, name: meal.name, calories: meal.calories, proteinG: 15, carbsG: meal.carbsG, fatG: meal.fatG });
    status = await getMinimumDayStatus(day.id);
    expect(status.protein).toBe(true);
  });

  it("meal protein alone can satisfy the requirement with zero protein-only logs", async () => {
    const day = await startDay();
    const meal = await makeMeal({ proteinG: 30 });
    await logMeal(day.id, { savedMealId: meal.id, name: meal.name, calories: meal.calories, proteinG: 30, carbsG: meal.carbsG, fatG: meal.fatG });

    const status = await getMinimumDayStatus(day.id);
    expect(status.protein).toBe(true);
  });
});
