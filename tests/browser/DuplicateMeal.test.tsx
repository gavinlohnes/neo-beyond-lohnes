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

describe("DUP-MEAL-001 duplicate-meal prompt", () => {
  it("asks under the saved meal and REMOVE THIS ONE voids only the new log", async () => {
    const { day } = await seedDinner();
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: "LOG", exact: true }).click();

    const prompt = body.getByRole("group", { name: "Same meal?" });
    await expect.element(prompt.getByText("Same meal? Dinner already logged at 20:00.", { exact: true })).toBeVisible();
    expect(body.getByRole("group", { name: "Same food?" }).elements()).toHaveLength(0);
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(2);

    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const button of prompt.getByRole("button").elements()) {
        expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      }
    }

    await prompt.getByRole("button", { name: "REMOVE THIS ONE" }).click();
    await expect.element(body.getByText("Removed the second Dinner. Protein today: 50 g.", { exact: true })).toBeVisible();
    expect(body.getByRole("group", { name: "Same meal?" }).elements()).toHaveLength(0);
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(2);
    expect(await db.events.where("type").equals("MEAL_LOG_VOIDED").count()).toBe(1);
    expect((await db.events.where("beyondDayId").equals(day.id).toArray()).filter((event) => event.type === "MEAL_LOG_VOIDED")).toHaveLength(1);
  });

  it("KEEP BOTH closes the prompt without writing, and another meal log also closes it", async () => {
    await seedDinner();
    const snack = await createSavedMeal({ name: "Snack", calories: 200, proteinG: 10, carbsG: 20, fatG: 5 });
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: "LOG", exact: true }).first().click();
    let prompt = body.getByRole("group", { name: "Same meal?" });
    await expect.element(prompt).toBeVisible();
    await prompt.getByRole("button", { name: "KEEP BOTH" }).click();
    expect(body.getByRole("group", { name: "Same meal?" }).elements()).toHaveLength(0);
    expect(await db.events.where("type").equals("MEAL_LOG_VOIDED").count()).toBe(0);

    await body.getByRole("button", { name: "LOG", exact: true }).first().click();
    prompt = body.getByRole("group", { name: "Same meal?" });
    await expect.element(prompt).toBeVisible();
    const snackCard = body.getByText(snack.name, { exact: true }).element().parentElement!;
    await snackCard.querySelector<HTMLButtonElement>("button")!.click();
    expect(body.getByRole("group", { name: "Same meal?" }).elements()).toHaveLength(0);
  });

  it("Same meal? takes precedence when the existing Same food? rule would also match", async () => {
    const { day } = await seedDinner();
    await logProtein(day.id, 49);
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: "LOG", exact: true }).click();

    await expect.element(body.getByRole("group", { name: "Same meal?" })).toBeVisible();
    expect(body.getByRole("group", { name: "Same food?" }).elements()).toHaveLength(0);
  });
});

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

  it("asks about the repeated Dinner only; REMOVE THIS ONE voids that repeat and keeps the Snack", async () => {
    const { today } = await seedYesterdayAndTodayDinner();
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: /SAME AS YESTERDAY \(2 meals\)/ }).click();

    const prompt = body.getByRole("group", { name: "Same meal?" });
    await expect.element(prompt.getByText("Same meal? Dinner already logged at 20:00.", { exact: true })).toBeVisible();
    await prompt.getByRole("button", { name: "REMOVE THIS ONE" }).click();
    await expect.element(body.getByText("Removed the second Dinner. Protein today: 60 g.", { exact: true })).toBeVisible();

    const voided = (await db.events.where("beyondDayId").equals(today.id).toArray()).filter((e) => e.type === "MEAL_LOG_VOIDED");
    expect(voided).toHaveLength(1);
  });

  it("KEEP BOTH writes nothing", async () => {
    await seedYesterdayAndTodayDinner();
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: /SAME AS YESTERDAY \(2 meals\)/ }).click();
    const prompt = body.getByRole("group", { name: "Same meal?" });
    await prompt.getByRole("button", { name: "KEEP BOTH" }).click();
    expect(body.getByRole("group", { name: "Same meal?" }).elements()).toHaveLength(0);
    expect(await db.events.where("type").equals("MEAL_LOG_VOIDED").count()).toBe(0);
  });

  it("repeating yesterday's two shakes with nothing logged today asks nothing", async () => {
    const shake = await createSavedMeal({ name: "Shake", calories: 250, proteinG: 40, carbsG: 10, fatG: 3 });
    vi.setSystemTime(new Date(2026, 9, 3, 20, 0, 0));
    const yesterday = await startDay();
    await logMeal(yesterday.id, shake.id);
    await logMeal(yesterday.id, shake.id);
    vi.setSystemTime(NOW);
    await startDay();
    const body = await render(<BodyScreen />);
    await body.getByRole("button", { name: /SAME AS YESTERDAY \(2 meals\)/ }).click();
    await expect.element(body.getByText(/2 meals from .* logged/)).toBeVisible();
    expect(body.getByRole("group", { name: /Same meals?\?/ }).elements()).toHaveLength(0);
  });
});
