import { beforeEach, expect, it, vi } from "vitest";
import { db } from "../src/persistence/db";
import { logProtein, logWater, startDay } from "../src/application/commands";
import { logManualMeal } from "../src/application/nutritionCommands";
import { getFoodDiary } from "../src/application/foodDiaryQueries";
import { correctLogEntry, getDayLogEntries, getDayLogEntry, moveLogEntry, removeLogEntry } from "../src/application/logEntries";

/** TIMELINE-EDIT-001: one entry's fixes go through the existing append-only facts; nothing is overwritten. */
beforeEach(async () => { await db.delete(); await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); });

it("moves, corrects (twice, following the chain) and removes a meal, keeping every original fact", async () => {
  try {
    vi.setSystemTime(new Date(2026, 10, 14, 18, 0));
    const day = await startDay();
    vi.setSystemTime(new Date(2026, 10, 14, 19, 15));
    await logManualMeal(day.id, { name: "Butter Chicken and Rice", calories: 560, proteinG: 46, carbsG: 60, fatG: 18 });
    await logWater(day.id, 16);
    await logProtein(day.id, 25);
    const entries = await getDayLogEntries(day.id);
    expect(entries.map((e) => [e.kind, e.name])).toEqual([["MEAL", "Butter Chicken and Rice"], ["WATER", "Water"], ["PROTEIN", "Protein"]]);
    const meal = entries[0]!;

    // Gavin's case: move it to 23:00.
    expect(await moveLogEntry(meal, new Date(2026, 10, 14, 23, 0).toISOString())).toBe(true);
    const moved = (await getDayLogEntry(day.id, meal.rootEventId))!;
    expect(new Date(moved.at).getHours()).toBe(23);
    expect((await getFoodDiary(day.id)).entries.find((e) => e.rootEventId === meal.rootEventId)!.at).toBe(moved.at);

    // Two corrections in a row: the second names the new head, so no stale-chain error.
    await correctLogEntry(moved, { calories: 600 });
    await correctLogEntry(moved, { proteinG: 50 });
    expect(await getDayLogEntry(day.id, meal.rootEventId)).toMatchObject({ calories: 600, proteinG: 50, carbsG: 60, fatG: 18 });

    expect(await removeLogEntry(moved)).toBe(true);
    expect(await getDayLogEntry(day.id, meal.rootEventId)).toBeNull();
    // Append-only: the original log, the move, both corrections and the removal are all still there.
    const types = (await db.events.where("beyondDayId").equals(day.id).toArray()).map((e) => e.type);
    for (const t of ["MEAL_LOGGED", "LOG_RETIMED", "MEAL_LOG_CORRECTED", "MEAL_LOG_VOIDED"]) expect(types).toContain(t);
    expect(types.filter((t) => t === "MEAL_LOG_CORRECTED")).toHaveLength(2);
  } finally { vi.useRealTimers(); }
});

it("corrects and removes water and protein through their own chains", async () => {
  try {
    vi.setSystemTime(new Date(2026, 10, 14, 18, 0));
    const day = await startDay();
    await logWater(day.id, 16);
    await logProtein(day.id, 25);
    const [water, protein] = await getDayLogEntries(day.id);
    await correctLogEntry(water!, { oz: 24 });
    await correctLogEntry(protein!, { grams: 30 });
    expect((await getDayLogEntry(day.id, water!.rootEventId))!.oz).toBe(24);
    expect((await getDayLogEntry(day.id, protein!.rootEventId))!.grams).toBe(30);
    expect(await removeLogEntry(water!)).toBe(true);
    expect(await removeLogEntry(water!)).toBe(false);
    expect(await getDayLogEntries(day.id)).toHaveLength(1);
  } finally { vi.useRealTimers(); }
});
