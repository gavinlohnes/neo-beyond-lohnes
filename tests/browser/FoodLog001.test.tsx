import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { logBodyweight, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { db } from "../../src/persistence/db";

/** FOOD-001: MEAL works like MyFitnessPal — protein left on top, search all foods, any amount, barcode. */
const USDA = { foods: [{ fdcId: 171477, description: "Chicken breast, roasted", servingSize: undefined, foodNutrients: [
  { nutrientId: 1008, unitName: "KCAL", value: 165 }, { nutrientId: 1003, unitName: "G", value: 31 }, { nutrientId: 1005, unitName: "G", value: 0 }, { nutrientId: 1004, unitName: "G", value: 3.6 }] }] };
const OFF = { status: 1, product: { product_name: "Greek Yogurt", brands: "Fage", serving_size: "170 g",
  nutriments: { "energy-kcal_serving": 150, proteins_serving: 17, carbohydrates_serving: 6, fat_serving: 6.5 } } };

let fetchSpy: ReturnType<typeof vi.spyOn>;
beforeEach(async () => {
  await page.viewport(390, 844);
  fetchSpy = vi.spyOn(window, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith("https://api.nal.usda.gov/")) return new Response(JSON.stringify(USDA));
    if (url.startsWith("https://world.openfoodfacts.org/")) return new Response(JSON.stringify(OFF));
    throw new Error(`unexpected fetch ${url}`);
  });
});
afterEach(() => { cleanup(); fetchSpy.mockRestore(); });

async function openMeal() {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Open LOG" }).click();
  await screen.getByRole("dialog").getByRole("button", { name: "MEAL", exact: true }).click();
  return screen;
}

describe("FOOD-001", () => {
  it("leads with protein left and the day's food by time", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 160);
    const meal = await createSavedMeal({ name: "Chicken & rice", calories: 650, proteinG: 45, carbsG: 70, fatG: 12 });
    await logMeal(day.id, meal.id);
    const screen = await openMeal();
    const diary = screen.getByRole("region", { name: "Today's food" });
    await expect.element(diary.getByText("115 g protein left", { exact: true })).toBeVisible();
    await expect.element(diary.getByText("45 of 160 g protein · 650 kcal eaten", { exact: true })).toBeVisible();
    await diary.getByText("TODAY'S FOOD (1)").click();
    await expect.element(diary.getByText(/Chicken & rice · 45 g · 650 kcal/)).toBeVisible();
    expect((await axe.run(document.querySelector(".food-diary")!)).violations).toEqual([]);
  });

  it("typing stays on the phone; SEARCH ALL FOODS finds it, grams are the amount, and it's one tap next time", async () => {
    const day = await startDay();
    const screen = await openMeal();
    await screen.getByRole("searchbox", { name: "Search your meals and foods" }).fill("chicken breast");
    await expect.element(screen.getByText("No matching meals.")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    await screen.getByRole("button", { name: "SEARCH ALL FOODS FOR ‘chicken breast’" }).click();
    await screen.getByRole("button", { name: "Amount for Chicken breast, roasted" }).click();
    await expect.element(screen.getByText("Food data: USDA FoodData Central.")).toBeVisible();
    await screen.getByRole("spinbutton", { name: "Amount in grams" }).fill("150");
    await expect.element(screen.getByText("248 kcal · 46.5 g protein", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.poll(async () => (await db.events.where("beyondDayId").equals(day.id).toArray()).find((e) => e.type === "MEAL_LOGGED")?.payload)
      .toMatchObject({ servings: 1.5, calories: 247.5, proteinG: 46.5 });
    expect((await db.savedMeals.toArray()).map((m) => m.name)).toEqual(["Chicken breast, roasted · 100 g"]);
  });

  it("SCAN BARCODE: a typed barcode looks up Open Food Facts, credited, and logs by grams", async () => {
    const day = await startDay();
    const screen = await openMeal();
    await screen.getByRole("button", { name: "SCAN BARCODE" }).click();
    await expect.element(screen.getByText("Product data © Open Food Facts contributors (ODbL).")).toBeVisible();
    await screen.getByRole("textbox", { name: "Barcode number" }).fill("5200435000027");
    await screen.getByRole("button", { name: "LOOK UP" }).click();
    await expect.element(screen.getByRole("heading", { name: "Greek Yogurt" })).toBeVisible();
    // Its serving is 170 g, so the amount is in grams, starting at one serving.
    await expect.element(screen.getByRole("spinbutton", { name: "Amount in grams" })).toHaveValue(170);
    await screen.getByRole("spinbutton", { name: "Amount in grams" }).fill("340");
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.poll(async () => (await db.events.where("beyondDayId").equals(day.id).toArray()).find((e) => e.type === "MEAL_LOGGED")?.payload)
      .toMatchObject({ servings: 2, proteinG: 34 });
    expect(String(fetchSpy.mock.calls[0]![0])).toContain("openfoodfacts.org/api/v2/product/5200435000027.json");
  });

  it("a saved meal takes any number of servings", async () => {
    const day = await startDay();
    await createSavedMeal({ name: "Protein shake", calories: 160, proteinG: 30, carbsG: 5, fatG: 2 });
    const screen = await openMeal();
    await screen.getByRole("button", { name: "Servings for Protein shake" }).click();
    await screen.getByRole("spinbutton", { name: "Number of servings" }).fill("3");
    await expect.element(screen.getByText("480 kcal · 90 g protein", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.poll(async () => (await db.events.where("beyondDayId").equals(day.id).toArray()).find((e) => e.type === "MEAL_LOGGED")?.payload)
      .toMatchObject({ servings: 3, proteinG: 90 });
  });
});
