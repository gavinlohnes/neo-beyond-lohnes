import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { archiveSavedMeal, createSavedMeal, logMeal, logMealsAgain } from "../../src/application/nutritionCommands";
import { getMealEntries, getPreviousDayMeals } from "../../src/application/nutritionQueries";

/** Drop 5: one-tap "same as yesterday" meals, against real Dexie (fake-indexeddb). */

const meal = (name: string) => createSavedMeal({ name, calories: 400, proteinG: 30, carbsG: 40, fatG: 10 });

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
  vi.useRealTimers();
});

async function dayAt(iso: string) {
  vi.setSystemTime(new Date(iso));
  return startDay();
}

describe("getPreviousDayMeals", () => {
  it("returns the most recent earlier day's meals, in order, repeats included", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const oats = await meal("Oats");
    const bowl = await meal("Bowl");
    const older = await dayAt("2026-09-27T12:00:00Z");
    await logMeal(older.id, bowl.id);
    const yesterday = await dayAt("2026-09-28T12:00:00Z");
    await logMeal(yesterday.id, oats.id);
    await logMeal(yesterday.id, bowl.id);
    await logMeal(yesterday.id, oats.id);
    const today = await dayAt("2026-09-29T12:00:00Z");

    const repeat = await getPreviousDayMeals(today.id);
    expect(repeat?.dayStartedAt).toBe(yesterday.startedAt);
    expect(repeat?.meals.map((m) => m.name)).toEqual(["Oats", "Bowl", "Oats"]);
  });

  it("skips days with no meals and drops archived presets", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const oats = await meal("Oats");
    const soup = await meal("Soup");
    const withMeals = await dayAt("2026-09-27T12:00:00Z");
    await logMeal(withMeals.id, oats.id);
    await logMeal(withMeals.id, soup.id);
    await dayAt("2026-09-28T12:00:00Z"); // no meals that day
    const today = await dayAt("2026-09-29T12:00:00Z");
    await archiveSavedMeal(soup.id);

    const repeat = await getPreviousDayMeals(today.id);
    expect(repeat?.meals.map((m) => m.name)).toEqual(["Oats"]);
  });

  it("is undefined when nothing earlier can be repeated", async () => {
    const today = await startDay();
    expect(await getPreviousDayMeals(today.id)).toBeUndefined();
  });
});

describe("logMealsAgain", () => {
  it("logs each meal as its own ordinary MEAL_LOGGED entry", async () => {
    const oats = await meal("Oats");
    const bowl = await meal("Bowl");
    const today = await startDay();
    const results = await logMealsAgain(today.id, [oats.id, bowl.id, oats.id]);
    expect(results.map((r) => r.name)).toEqual(["Oats", "Bowl", "Oats"]);
    expect((await getMealEntries(today.id)).map((e) => e.name)).toEqual(["Oats", "Bowl", "Oats"]);
  });
});
