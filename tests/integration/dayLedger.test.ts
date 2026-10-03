import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { correctWater, endDay, logProtein, logWater, startDay, submitCheckIn } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { logUrge, saveQuitHabit } from "../../src/application/quitCommands";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { getWeeklySummary } from "../../src/application/weeklyQueries";

/**
 * Drop 1 — the Day Ledger and Burden Meter through the real commands and
 * fake-indexeddb: every past day is covered, not just the current one.
 */
const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min, 0, 0);

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

describe("getDaySummaries", () => {
  it("covers every past day, not just the current one, with missing data left missing", async () => {
    await saveQuitHabit({ name: "Beer" });
    const meal = await createSavedMeal({ name: "Bowl", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 });

    vi.setSystemTime(at(10, 2, 16, 30));
    const d1 = await startDay();
    vi.setSystemTime(at(10, 2, 17, 0));
    const waterId = await logWater(d1.id, 16);
    await correctWater(d1.id, waterId, 20);
    await logMeal(d1.id, meal.id);
    vi.setSystemTime(at(10, 3, 2, 0));
    await logProtein(d1.id, 30);
    await logUrge(d1.id, "STRESS");
    vi.setSystemTime(at(10, 3, 10, 0));
    await endDay(d1.id);

    vi.setSystemTime(at(10, 3, 16, 30));
    const d2 = await startDay();
    vi.setSystemTime(at(10, 3, 17, 0));
    await submitCheckIn(d2.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });

    const [first, second] = await getDaySummaries();
    expect(first).toMatchObject({ beyondDayId: d1.id, waterOz: 20, proteinG: 75, kcal: 600, endedAt: at(10, 3, 10, 0).toISOString() });
    expect(first!.urges).toHaveLength(1);
    expect(first!.burden).toMatchObject({ manualEntries: 4, corrections: 1 });

    expect(second).toMatchObject({ beyondDayId: d2.id, checkIn: { capacity: "GREEN", count: 1 } });
    expect(second!.waterOz).toBeUndefined();
    expect(second!.kcal).toBeUndefined();
    expect(second!.burden).toMatchObject({ manualEntries: 1, corrections: 0 });
  });
});

describe("getWeeklySummary — burden", () => {
  it("averages entries over the week's days and totals corrections", async () => {
    vi.setSystemTime(at(10, 2, 16, 30));
    const d1 = await startDay();
    const w = await logWater(d1.id, 8);
    await correctWater(d1.id, w, 10);
    await logWater(d1.id, 8);
    await logWater(d1.id, 8);
    await endDay(d1.id);
    vi.setSystemTime(at(10, 3, 16, 30));
    const d2 = await startDay();
    await logWater(d2.id, 8);

    const { burden } = await getWeeklySummary(at(10, 4, 12, 0));
    expect(burden).toEqual({ days: 2, entriesPerDay: 2, corrections: 1 });
  });

  it("is empty, not zero, with no days in the week", async () => {
    const { burden } = await getWeeklySummary(at(10, 4, 12, 0));
    expect(burden).toEqual({ days: 0, corrections: 0 });
  });
});
