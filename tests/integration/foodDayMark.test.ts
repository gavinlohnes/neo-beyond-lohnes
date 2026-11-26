import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { applyRestore, exportNativeBackup } from "../../src/persistence/backup";
import { endDay, logBodyweight, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { answerShortDays, getAnsweredDayIds, getPartialDayIds, isDayPartial, setFoodDayPartial } from "../../src/application/foodDayMark";
import { getWeeklySummary } from "../../src/application/weeklyQueries";

/** GRAYSON-MISSION-REVIEW-001 slice A through the application layer. Run under TZ=UTC and TZ=America/Chicago. */
beforeEach(async () => { await db.open(); localStorage.clear(); vi.useFakeTimers({ toFake: ["Date"] }); });
afterEach(() => { vi.useRealTimers(); db.close(); });

/** 20 finished days (Oct 11–30), 2,000 kcal each except the last two at 600 and 500, and a weigh-in every other day. */
async function month(): Promise<string[]> {
  const ids: string[] = [];
  vi.setSystemTime(new Date(2026, 9, 1, 12));
  const big = await createSavedMeal({ name: "Day's food", calories: 2000, proteinG: 150, carbsG: 200, fatG: 60 });
  const small = await createSavedMeal({ name: "Breakfast", calories: 100, proteinG: 10, carbsG: 10, fatG: 3 });
  for (let i = 0; i < 20; i++) {
    const d = 11 + i;
    vi.setSystemTime(new Date(2026, 9, d, 17));
    const day = await startDay(new Date(2026, 9, d, 16, 30).toISOString());
    if (i < 18) await logMeal(day.id, big.id, 1); else await logMeal(day.id, small.id, i === 18 ? 6 : 5);
    if (i % 2 === 0) await logBodyweight(day.id, 200 - i * 0.07);
    vi.setSystemTime(new Date(2026, 9, d + 1, 16, 25));
    await endDay(day.id);
    ids.push(day.id);
  }
  vi.setSystemTime(new Date(2026, 9, 31, 12));
  return ids;
}

describe("Not fully logged", () => {
  it("the newest mark for a day wins; unmarking is the same event with false; events are day-scoped and strict", async () => {
    vi.setSystemTime(new Date(2026, 9, 1, 17));
    const day = await startDay();
    expect(await isDayPartial(day.id)).toBe(false);
    await setFoodDayPartial(day.id, true);
    expect(await isDayPartial(day.id)).toBe(true);
    await setFoodDayPartial(day.id, false);
    expect(await isDayPartial(day.id)).toBe(false);
    expect(await getAnsweredDayIds()).toEqual(new Set([day.id]));
    const events = await db.events.where("type").equals("FOOD_DAY_PARTIAL_SET").toArray();
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.beyondDayId === day.id && e.source === "USER")).toBe(true);
    await expect(setFoodDayPartial("no-such-day", true)).rejects.toThrow(/FOOD_DAY_NOT_FOUND/);
  });

  it("the weekly burn estimate leaves marked days out and says so; unmarking restores it exactly", async () => {
    const ids = await month();
    const before = (await getWeeklySummary()).expenditure;
    expect(before).toMatchObject({ intakeDays: 20 });
    expect("leftOut" in before).toBe(false);
    await setFoodDayPartial(ids[18]!, true);
    await setFoodDayPartial(ids[19]!, true);
    const after = (await getWeeklySummary()).expenditure;
    expect(after).toMatchObject({ kind: "ESTIMATE", intakeDays: 18, leftOut: 2, avgIntakeKcal: 2000 });
    await setFoodDayPartial(ids[18]!, false);
    await setFoodDayPartial(ids[19]!, false);
    expect((await getWeeklySummary()).expenditure).toStrictEqual(before);
  });

  it("DONE on the suggestion records his answer for each shown day, marked or not", async () => {
    const ids = await month();
    await answerShortDays([{ beyondDayId: ids[18]!, partial: true }, { beyondDayId: ids[19]!, partial: false }]);
    expect(await getPartialDayIds()).toEqual(new Set([ids[18]]));
    expect(await getAnsweredDayIds()).toEqual(new Set([ids[18], ids[19]]));
  });

  it("marks travel in a native backup and read the same after restore", async () => {
    const ids = await month();
    await setFoodDayPartial(ids[19]!, true);
    const before = (await getWeeklySummary()).expenditure;
    const blob = await exportNativeBackup(false);
    await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
    expect(await getPartialDayIds()).toEqual(new Set());
    await applyRestore(new File([blob], "beyond.json"));
    expect(await getPartialDayIds()).toEqual(new Set([ids[19]]));
    expect((await getWeeklySummary()).expenditure).toStrictEqual(before);
  });
});
