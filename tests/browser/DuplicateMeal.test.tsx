import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { logProtein, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { db } from "../../src/persistence/db";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";

const NOW = new Date(2026, 9, 4, 20, 0, 0);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  await page.viewport(360, 800);
});

afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

async function seedDinner() {
  const day = await startDay();
  const dinner = await createSavedMeal({ name: "Dinner", calories: 650, proteinG: 50, carbsG: 60, fatG: 15 });
  await logMeal(day.id, dinner.id);
  return { day, dinner };
}

describe("DUP-MEAL-002 SAME AS YESTERDAY repeats", () => {
  async function seedYesterdayAndTodayDinner() {
    const dinner = await createSavedMeal({ name: "Dinner", calories: 650, proteinG: 50, carbsG: 60, fatG: 15 });
    const snack = await createSavedMeal({ name: "Snack", calories: 200, proteinG: 10, carbsG: 20, fatG: 5 });
    vi.setSystemTime(new Date(2026, 9, 3, 20, 0, 0));
    const yesterday = await startDay();
    await logMeal(yesterday.id, dinner.id);
    await logMeal(yesterday.id, snack.id);
    vi.setSystemTime(NOW);
    const today = await startDay();
    await logMeal(today.id, dinner.id);
    return { today };
  }



  it("repeating yesterday's two shakes with nothing logged today asks nothing", async () => {
    const shake = await createSavedMeal({ name: "Shake", calories: 250, proteinG: 40, carbsG: 10, fatG: 3 });
    vi.setSystemTime(new Date(2026, 9, 3, 20, 0, 0));
    const yesterday = await startDay();
    await logMeal(yesterday.id, shake.id);
    await logMeal(yesterday.id, shake.id);
    vi.setSystemTime(NOW);
    await startDay();
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: "OPEN MEALS" }).click();
    await body.getByRole("button", { name: /SAME AS YESTERDAY \(2 meals\)/ }).click();
    await expect.element(body.getByText(/2 meals from .* logged/)).toBeVisible();
    expect(body.getByRole("group", { name: /Same meals?\?/ }).elements()).toHaveLength(0);
  });
});
