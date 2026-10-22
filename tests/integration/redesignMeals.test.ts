import { expect, it, vi } from "vitest";
import { previewAnyRestore, applyAnyRestore } from "../../src/persistence/restore";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { createSavedMeal, logManualMeal, logMeal, correctMealLog, voidMealLog } from "../../src/application/nutritionCommands";
import { getMealEntries, getLikelySavedMeals } from "../../src/application/nutritionQueries";
import { getDuplicateMealCheck } from "../../src/application/sameFoodQueries";
const macros = { name: "Dinner", calories: 600, proteinG: 40, carbsG: 50, fatG: 20 };
it("logs manual meals without a preset and retains canonical correction/void and export", async () => {
  const day = await startDay();
  const result = await logManualMeal(day.id, macros);
  expect(await db.savedMeals.count()).toBe(0);
  expect((await db.events.get(result.eventId))?.payload).toMatchObject({ savedMealId: null, ...macros });
  await correctMealLog(day.id, result.eventId, { calories: 700, proteinG: 45, carbsG: 50, fatG: 25 });
  expect((await getMealEntries(day.id))[0]).toMatchObject({ savedMealId: null, originalCalories: 600, effectiveCalories: 700 });
  await voidMealLog(day.id, result.eventId); await voidMealLog(day.id, result.eventId);
  expect(await getMealEntries(day.id)).toEqual([]);
  expect(await db.events.where("type").equals("MEAL_LOG_VOIDED").count()).toBe(1);
});
it("saves only on explicit choice and rolls both writes back on log failure", async () => {
  const day = await startDay();
  const fail = vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("Disk full"));
  await expect(logManualMeal(day.id, macros, true)).rejects.toThrow("Disk full");
  fail.mockRestore();
  expect(await db.savedMeals.count()).toBe(0);
  await logManualMeal(day.id, macros, true);
  const [preset] = await db.savedMeals.toArray();
  expect((await getMealEntries(day.id))[0]?.savedMealId).toBe(preset!.id);
});
it("portions snapshot canonical current macros without editing the preset", async () => {
  const day = await startDay(); const meal = await createSavedMeal(macros);
  const half = await logMeal(day.id, meal.id, .5);
  expect(half).toMatchObject({ calories: 300, proteinG: 20, carbsG: 25, fatG: 10 });
  expect((await getMealEntries(day.id))[0]?.effectiveCalories).toBe(300);
  expect(await db.savedMeals.get(meal.id)).toEqual(meal);
  await expect(logMeal(day.id, meal.id, NaN)).rejects.toThrow();
  expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
});
it("retains duplicate detection for one-offs without inventing saved provenance", async () => {
  const day = await startDay(); await logManualMeal(day.id, macros);
  const second = await logManualMeal(day.id, macros);
  expect(await getDuplicateMealCheck(day.id, second.eventId)).toBeDefined();
  expect((await getMealEntries(day.id)).every((entry) => entry.savedMealId === null)).toBe(true);
});
it("ranks personal meals by circular time-of-day, excludes voided evidence, and stays read-only", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    const day = await startDay();const night = await createSavedMeal({...macros, name: "Night"});const noon = await createSavedMeal({...macros, name: "Noon"});
    vi.setSystemTime(new Date(2026, 9, 10, 23, 30)); const a = await logMeal(day.id, night.id);
    vi.setSystemTime(new Date(2026, 9, 11, 12)); await logMeal(day.id, noon.id);
    const before = await db.events.toArray();
    expect((await getLikelySavedMeals(new Date(2026, 9, 12, 0, 30)))[0]?.id).toBe(night.id);
    expect(await db.events.toArray()).toEqual(before);
    await voidMealLog(day.id, a.eventId);
    expect((await getLikelySavedMeals(new Date(2026, 9, 12, 0, 30)))[0]?.id).toBe(noon.id);
  } finally { vi.useRealTimers(); }
});

it("round-trips manual provenance and portions through the existing native backup format", async () => {
  await import("dexie-export-import");
  const day = await startDay(); await logManualMeal(day.id, macros);
  const meal = await createSavedMeal(macros); await logMeal(day.id, meal.id, 1.5);
  const before = await getMealEntries(day.id);
  const blob = await db.export({ prettyJson: true });
  const file = new File([blob], "redesign-synthetic.json", { type: "application/json" });
  await db.events.clear(); await db.savedMeals.clear();
  expect((await previewAnyRestore(file)).format).toBe("NATIVE");
  await applyAnyRestore(file);
  expect(await getMealEntries(day.id)).toEqual(before);
  expect(await db.savedMeals.count()).toBe(1);
});
