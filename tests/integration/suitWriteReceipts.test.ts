import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { logProtein, logSleep, logWater, startDay, submitCheckIn, voidProteinLog, voidSleepLog, voidWaterLog } from "../../src/application/commands";
import { createSavedMeal, logMeal, voidMealLog, archiveSavedMeal } from "../../src/application/nutritionCommands";
import { saveNutritionTargets, updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { startWorkout, undoLastSet } from "../../src/application/trainCommands";
import { recordMemory } from "../../src/application/memory";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 27, 17)); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it("void receipts distinguish a real appended record from an idempotent replay", async () => {
  const day = await startDay();
  const water = await logWater(day.id, 8), sleep = await logSleep(day.id, 400), protein = await logProtein(day.id, 20);
  const meal = await createSavedMeal({ name: "Frozen backup", calories: 400, proteinG: 20, carbsG: 40, fatG: 15 });
  const logged = await logMeal(day.id, meal.id);
  for (const [id, command] of [[water, voidWaterLog], [sleep, voidSleepLog], [protein, voidProteinLog], [logged.eventId, voidMealLog]] as const) {
    expect(await command(day.id, id)).toBe(true);
    const before = await db.events.toArray();
    expect(await command(day.id, id)).toBe(false);
    expect(await db.events.toArray()).toEqual(before);
  }
  expect(await archiveSavedMeal(meal.id)).toBe(true);
  expect(await archiveSavedMeal(meal.id)).toBe(false);
});

it("undo ownership and empty workout undo stay false without erasing newer choices", async () => {
  const first = await saveNutritionTargets({ calorieTargetKcal: 2000 });
  vi.setSystemTime(new Date(2026, 9, 27, 17, 1));
  await updateNutritionTargets({ calorieTargetKcal: 2400 });
  expect(await first.undo()).toBe(false);
  expect((await db.nutritionTargets.get("current"))!.calorieTargetKcal).toBe(2400);
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const receipt = { changed: false };
  const workout = await startWorkout(day.id, "A", "STANDARD", { receipt });
  expect(receipt.changed).toBe(true);
  const resume = { changed: false };
  expect((await startWorkout(day.id, "A", "STANDARD", { receipt: resume })).id).toBe(workout.id);
  expect(resume.changed).toBe(false);
  const before = await db.events.toArray();
  expect(await undoLastSet(day.id, workout.id)).toBe(false);
  expect(await db.events.toArray()).toEqual(before);
});

it("memory receipts acknowledge new revisions, not a retried create, and keep rollback honest", async () => {
  const day = await startDay();
  const input = { dayId: day.id, factId: "suit-food", action: "CREATED" as const, kind: "PREP_FOOD" as const, statement: "Frozen meals work.", expectedPreviousId: null };
  const created = { changed: false }; await recordMemory(input, created); expect(created.changed).toBe(true);
  const replay = { changed: false }; await recordMemory(input, replay); expect(replay.changed).toBe(false);
  const failed = { changed: false }; const before = await db.events.toArray();
  vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("Disk full"));
  await expect(recordMemory({ ...input, factId: "not-saved" }, failed)).rejects.toThrow();
  expect(failed.changed).toBe(false); expect(await db.events.toArray()).toEqual(before);
});
