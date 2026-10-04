import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDay } from "../../src/application/commands";
import { getDayProteinTotalG } from "../../src/application/queries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { createSavedMeal, logMeal, voidMealLog } from "../../src/application/nutritionCommands";
import { getMealEntries, getTotalMealCalories, getTotalMealProteinGrams } from "../../src/application/nutritionQueries";
import { getDuplicateMealCheck } from "../../src/application/sameFoodQueries";
import { getWeeklySummary } from "../../src/application/weeklyQueries";
import { db } from "../../src/persistence/db";

const at = (minute: number, second = 0) => new Date(2026, 9, 4, 20, minute, second);

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

describe("DUP-MEAL-001 application path", () => {
  it("finds the new duplicate, then voiding it removes it from every derived total", async () => {
    vi.setSystemTime(at(0));
    const day = await startDay();
    const dinner = await createSavedMeal({ name: "Dinner", calories: 650, proteinG: 50, carbsG: 60, fatG: 15 });
    await logMeal(day.id, dinner.id);
    vi.setSystemTime(at(1));
    const second = await logMeal(day.id, dinner.id);

    const duplicate = await getDuplicateMealCheck(day.id, second.eventId);
    expect(duplicate?.earlier.name).toBe("Dinner");
    expect(duplicate?.justLogged.id).toBe(second.eventId);

    await voidMealLog(day.id, second.eventId);

    expect(await getMealEntries(day.id)).toHaveLength(1);
    expect(await getTotalMealCalories(day.id)).toBe(650);
    expect(await getTotalMealProteinGrams(day.id)).toBe(50);
    expect(await getDayProteinTotalG(day.id)).toBe(50);
    const summary = (await getDaySummaries()).find((entry) => entry.beyondDayId === day.id);
    expect(summary).toMatchObject({ kcal: 650, proteinG: 50, entryCounts: { water: 0, food: 1 } });
    expect((await getWeeklySummary(at(2))).protein).toMatchObject({ avgGrams: 50, daysLogged: 1 });
    expect(await db.events.where("type").equals("MEAL_LOG_VOIDED").toArray()).toHaveLength(1);
  });

  it("matches identical effective food across presets but not a genuinely different meal", async () => {
    vi.setSystemTime(at(0));
    const day = await startDay();
    const first = await createSavedMeal({ name: " Dinner ", calories: 650, proteinG: 50, carbsG: 60, fatG: 15 });
    const same = await createSavedMeal({ name: "dinner", calories: 650, proteinG: 50, carbsG: 1, fatG: 1 });
    const different = await createSavedMeal({ name: "Dinner", calories: 651, proteinG: 50, carbsG: 60, fatG: 15 });
    await logMeal(day.id, first.id);
    vi.setSystemTime(at(1));
    const matching = await logMeal(day.id, same.id);
    expect(await getDuplicateMealCheck(day.id, matching.eventId)).toBeDefined();
    vi.setSystemTime(at(1, 30));
    const distinct = await logMeal(day.id, different.id);
    expect(await getDuplicateMealCheck(day.id, distinct.eventId)).toBeUndefined();
  });

  it("ignores a voided earlier meal and entries outside the two-minute window", async () => {
    vi.setSystemTime(at(0));
    const day = await startDay();
    const dinner = await createSavedMeal({ name: "Dinner", calories: 650, proteinG: 50, carbsG: 60, fatG: 15 });
    const first = await logMeal(day.id, dinner.id);
    await voidMealLog(day.id, first.eventId);
    vi.setSystemTime(at(1));
    const afterVoid = await logMeal(day.id, dinner.id);
    expect(await getDuplicateMealCheck(day.id, afterVoid.eventId)).toBeUndefined();
    vi.setSystemTime(at(4));
    const late = await logMeal(day.id, dinner.id);
    expect(await getDuplicateMealCheck(day.id, late.eventId)).toBeUndefined();
  });
});
