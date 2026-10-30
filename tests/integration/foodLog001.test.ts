import { afterEach, describe, expect, it, vi } from "vitest";
import { logBodyweight, logProtein, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal, voidMealLog } from "../../src/application/nutritionCommands";
import { getFoodDiary } from "../../src/application/foodDiaryQueries";
import { lookupBarcode, toBarcodeResult } from "../../src/application/barcodeLookup";
import { db } from "../../src/persistence/db";

/** FOOD-001: MyFitnessPal's diary (protein first, by time), any servings, and barcode lookup. */
afterEach(() => { vi.useRealTimers(); });

describe("food diary", () => {
  it("lists meals and protein-only logs by time, protein first, deletions left out", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 30, 18, 0));
    const day = await startDay();
    await logBodyweight(day.id, 160);
    const meal = await createSavedMeal({ name: "Chicken & rice", calories: 650, proteinG: 45, carbsG: 70, fatG: 12 });
    await logMeal(day.id, meal.id);
    vi.setSystemTime(new Date(2026, 9, 30, 21, 0));
    await logProtein(day.id, 30);
    const gone = await logMeal(day.id, meal.id);
    await voidMealLog(day.id, gone.eventId);
    const diary = await getFoodDiary(day.id);
    expect(diary.entries.map((e) => [e.name, e.proteinG, e.calories])).toEqual([["Chicken & rice", 45, 650], ["Protein", 30, null]]);
    expect(diary).toMatchObject({ proteinG: 75, calories: 650, proteinTargetG: 160 });
  });
});

describe("any number of servings", () => {
  it("logs 1.3 servings or grams of a per-100 g food, to one decimal; refuses 0 and over 20", async () => {
    const day = await startDay();
    const food = await createSavedMeal({ name: "Chicken breast · 100 g", calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 });
    const logged = await logMeal(day.id, food.id, 1.3);
    expect(logged).toMatchObject({ calories: 214.5, proteinG: 40.3, fatG: 4.7 });
    await expect(logMeal(day.id, food.id, 0)).rejects.toThrow("supported serving amount");
    await expect(logMeal(day.id, food.id, 21)).rejects.toThrow("supported serving amount");
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
  });
});

describe("barcode lookup (Open Food Facts)", () => {
  const product = {
    product_name: "Greek Yogurt", brands: "Fage, Total", serving_size: "170 g",
    nutriments: { "energy-kcal_serving": 150, proteins_serving: 17, carbohydrates_serving: 6, fat_serving: 6.5, "energy-kcal_100g": 88, proteins_100g: 10, carbohydrates_100g: 3.5, fat_100g: 3.8 },
  };
  it("reads per serving when the product gives one, else per 100 g; incomplete or nameless is null", () => {
    expect(toBarcodeResult("5200435000027", product)).toMatchObject({ description: "Greek Yogurt", brandOwner: "Fage", calories: 150, proteinG: 17, servingDescription: "170 g" });
    const { serving_size: _s, ...noServing } = product;
    expect(toBarcodeResult("5200435000027", noServing)).toMatchObject({ calories: 88, proteinG: 10, servingDescription: "100 g" });
    expect(toBarcodeResult("1", { product_name: "Mystery", nutriments: { proteins_100g: 3 } })).toBeNull();
    expect(toBarcodeResult("1", { nutriments: product.nutriments })).toBeNull();
  });
  it("asks Open Food Facts for the digits only; unknown, malformed or offline is null, never a throw", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request) => new Response(JSON.stringify({ status: 1, product })));
    expect(await lookupBarcode("5 200435 000027", { fetchImpl })).toMatchObject({ description: "Greek Yogurt" });
    expect(String(fetchImpl.mock.calls[0]![0])).toMatch(/^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/5200435000027\.json\?fields=/);
    expect(await lookupBarcode("123", { fetchImpl })).toBeNull();
    expect(await lookupBarcode("5200435000027", { fetchImpl: async () => new Response(JSON.stringify({ status: 0 })) })).toBeNull();
    expect(await lookupBarcode("5200435000027", { fetchImpl: async () => { throw new Error("offline"); } })).toBeNull();
  });
});
