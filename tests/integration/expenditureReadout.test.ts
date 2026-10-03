import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, logBodyweight, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { getWeeklySummary } from "../../src/application/weeklyQueries";

/** Drop 6: the expenditure readout end to end, from logged meals and weigh-ins. */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
  vi.useRealTimers();
});

describe("expenditure readout in the weekly summary", () => {
  it("waits with nothing logged", async () => {
    expect((await getWeeklySummary()).expenditure).toMatchObject({ kind: "WAITING", intakeDays: { have: 0 }, weighIns: { have: 0 } });
  });

  it("estimates a range from 16 finished days of 2,100 kcal and a steady 1 lb/week loss", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const meal = await createSavedMeal({ name: "Day's food", calories: 2100, proteinG: 180, carbsG: 200, fatG: 60 });
    for (let i = 0; i < 16; i++) {
      vi.setSystemTime(new Date(2026, 9, 1 + i, 16, 30));
      const day = await startDay();
      vi.setSystemTime(new Date(2026, 9, 1 + i, 19, 0));
      await logMeal(day.id, meal.id);
      vi.setSystemTime(new Date(2026, 9, 2 + i, 8, 0));
      if (i % 2 === 0) await logBodyweight(day.id, 200 - (1 / 7) * i);
      vi.setSystemTime(new Date(2026, 9, 2 + i, 16, 0));
      await endDay(day.id);
    }
    const readout = (await getWeeklySummary(new Date(2026, 9, 18, 12, 0))).expenditure;
    expect(readout).toMatchObject({ kind: "ESTIMATE", intakeDays: 16, avgIntakeKcal: 2100, weeklyChangeLbs: -1, weighIns: 8 });
    // 2,100 eaten + 500 a day burned off the scale (1 lb/week × 3,500 / 7) → about 2,600.
    if (readout.kind === "ESTIMATE") {
      expect(readout.lowKcal).toBeLessThanOrEqual(2600);
      expect(readout.highKcal).toBeGreaterThanOrEqual(2600);
      expect(readout.highKcal - readout.lowKcal).toBeLessThanOrEqual(300);
    }
  });
});
