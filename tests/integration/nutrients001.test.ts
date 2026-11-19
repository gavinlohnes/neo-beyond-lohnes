import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal, logManualMeal } from "../../src/application/nutritionCommands";
import { getMealEntries, getSavedMeals } from "../../src/application/nutritionQueries";
import { getFoodDiary } from "../../src/application/foodDiaryQueries";
import { correctLogEntry, getDayLogEntries } from "../../src/application/logEntries";
import { searchFoods } from "../../src/application/foodLookupQueries";
import { toBarcodeResult } from "../../src/application/barcodeLookup";
import { getRecordsExport, toCsv } from "../../src/application/recordsExport";

/**
 * NUTRIENTS-001 (Gavin, 2026-11-19: "2. A"): fiber and sodium, kept from the free food databases when they give them.
 * Optional everywhere: an older meal, or a food without them, reads as not recorded, never 0.
 */
beforeEach(async () => { await db.delete(); await db.open(); });

describe("NUTRIENTS-001", () => {
  it("reads fiber (g) and sodium (mg) from USDA and Open Food Facts when they're there, and still accepts foods without them", async () => {
    const usda = { fdcId: 1, description: "Oats", servingSize: 100, servingSizeUnit: "g", foodNutrients: [
      { nutrientId: 1008, unitName: "KCAL", value: 379 }, { nutrientId: 1003, unitName: "G", value: 13 }, { nutrientId: 1005, unitName: "G", value: 68 },
      { nutrientId: 1004, unitName: "G", value: 6.5 }, { nutrientId: 1079, unitName: "G", value: 10.1 }, { nutrientId: 1093, unitName: "MG", value: 6 }] };
    const plain = { ...usda, fdcId: 2, description: "Plain", foodNutrients: usda.foodNutrients.slice(0, 4) };
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ foods: [usda, plain] }) })) as unknown as typeof fetch;
    const [oats, other] = await searchFoods("oats", { fetchImpl });
    expect(oats).toMatchObject({ fiberG: 10.1, sodiumMg: 6 });
    expect(other).not.toHaveProperty("fiberG");
    expect(other).not.toHaveProperty("sodiumMg");
    const bar = toBarcodeResult("123", { product_name: "Bar", serving_size: "40 g", nutriments: {
      "energy-kcal_serving": 180, proteins_serving: 10, carbohydrates_serving: 20, fat_serving: 7, fiber_serving: 3.2, sodium_serving: 0.15 } });
    expect(bar).toMatchObject({ fiberG: 3.2, sodiumMg: 150 });
  });

  it("stores them on saved and logged meals, scaled by servings; an older meal has none; the day totals say how many meals recorded them", async () => {
    const day = await startDay();
    const oats = await createSavedMeal({ name: "Oats", calories: 379, proteinG: 13, carbsG: 68, fatG: 6.5, fiberG: 10.1, sodiumMg: 6 });
    expect((await getSavedMeals()).find((m) => m.id === oats.id)).toMatchObject({ fiberG: 10.1, sodiumMg: 6 });
    await logMeal(day.id, oats.id, 1.5);
    await logManualMeal(day.id, { name: "Chicken and rice", calories: 640, proteinG: 48, carbsG: 70, fatG: 14 });
    const [first, second] = await getMealEntries(day.id);
    expect(first).toMatchObject({ fiberG: 15.2, sodiumMg: 9 });
    expect(second).not.toHaveProperty("fiberG");
    const diary = await getFoodDiary(day.id);
    expect(diary.fiberG).toEqual({ total: 15.2, meals: 1, ofMeals: 2 });
    expect(diary.sodiumMg).toEqual({ total: 9, meals: 1, ofMeals: 2 });
    // CSV keeps them, with an empty cell where a meal didn't record them.
    const meals = await getRecordsExport("meals");
    expect(meals.header).toContain("fiber_g");
    expect(toCsv(meals.header, meals.rows).split("\r\n")[1]).toMatch(/,15.2,9,you$/);
    expect(toCsv(meals.header, meals.rows).split("\r\n")[2]).toMatch(/,640,48,70,14,,,you$/);
    // Gavin, 2026-11-19 ("1A"): once corrected, the logged fiber and sodium no longer match, so they read as not recorded.
    const entry = (await getDayLogEntries(day.id)).find((e) => e.name === "Oats")!;
    await correctLogEntry(entry, { calories: 500 });
    const corrected = (await getMealEntries(day.id))[0]!;
    expect(corrected.effectiveCalories).toBe(500);
    expect(corrected).not.toHaveProperty("fiberG");
    expect(corrected).not.toHaveProperty("sodiumMg");
    expect((await getFoodDiary(day.id)).fiberG).toBeNull();
  });

  it("a day with no meal that recorded them has no totals, never 0; a negative value is refused", async () => {
    const day = await startDay();
    await logManualMeal(day.id, { name: "Toast", calories: 200, proteinG: 8, carbsG: 30, fatG: 4 });
    const diary = await getFoodDiary(day.id);
    expect(diary.fiberG).toBeNull();
    expect(diary.sodiumMg).toBeNull();
    await expect(createSavedMeal({ name: "Bad", calories: 1, proteinG: 1, carbsG: 1, fatG: 1, fiberG: -1 })).rejects.toThrow();
  });
});
