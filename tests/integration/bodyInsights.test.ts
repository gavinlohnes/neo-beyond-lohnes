import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { correctBodyweight, correctSleep, endDay, logBodyweight, logProtein, logSleep, startDay, voidBodyweightLog, voidSleepLog } from "../../src/application/commands";
import { correctMealLog, createSavedMeal, logMeal, voidMealLog } from "../../src/application/nutritionCommands";
import { getBodyweightHistory } from "../../src/application/bodyTrendQueries";
import { getBodyInsights, INSIGHT_DAY_MS, insightDay, insightPoints, insightWindow, type BodyInsights } from "../../src/application/bodyInsightsQueries";
import type { DaySummary } from "../../src/engine/dayLedger";

beforeEach(async () => { await db.open(); });
afterEach(() => { vi.useRealTimers(); db.close(); });
const now = new Date("2026-10-13T12:00:00Z");
const at = (days: number) => new Date(now.getTime() - days * INSIGHT_DAY_MS).toISOString();
const data = (days: BodyInsights["days"] = []): BodyInsights => ({ days, readAt: now.toISOString() });

describe("BODY insights — truthful read-only windows", () => {
  it("uses disjoint equal windows, excludes future/old data and retains explicit zero", () => {
    const points = [{ id: "old", at: at(14), value: 999 }, { id: "boundary", at: at(7), value: 100 }, { id: "zero", at: at(6), value: 0 }, { id: "new", at: at(0), value: 200 }, { id: "future", at: at(-1), value: 999 }];
    const result = insightWindow(points, now.toISOString(), 7);
    expect(result.current.map((point) => point.id)).toEqual(["zero", "new"]);
    expect(result.previous.map((point) => point.id)).toEqual(["boundary"]);
    expect(result).toMatchObject({ average: 100, previousAverage: 100, change: 0 });
  });
  it("does not create comparisons or zero averages from missing records", () => {
    expect(insightWindow([], now.toISOString(), 28)).toMatchObject({ average: undefined, change: undefined });
    expect(insightWindow([{ id: "one", at: at(1), value: 50 }], now.toISOString(), 28)).toMatchObject({ average: 50, previousAverage: undefined, change: undefined });
  });
  it("sorts actual timestamps, skips unusable numeric/date values without mutating source", () => {
    const weights = [{ recordedAt: at(1), weightLbs: 185 }, { recordedAt: at(2), weightLbs: 190 }, { recordedAt: "invalid", weightLbs: 10 }, { recordedAt: at(0), weightLbs: Number.NaN }];
    const before = [...weights];
    expect(insightPoints(data(), weights, "weight").map((point) => point.value)).toEqual([190, 185]);
    expect(weights).toEqual(before);
  });
  it("retains separate main-sleep evidence, excludes ambiguous days and counts only finished sessions", () => {
    const source = { beyondDayId: "day", startedAt: at(1), sleep: { primaryLogs: [{ at: at(1), minutes: 420 }], napMinutes: 120 }, workouts: [{ status: "COMPLETED" }, { status: "PARTIAL" }, { status: "ACTIVE" }, { status: "ABANDONED" }], proteinG: 0 } as unknown as DaySummary;
    expect(insightDay(source)).toMatchObject({ sleep: 7, mainSleepEntries: 1, workouts: 2, protein: 0 });
    expect(insightDay({ ...source, sleep: { primaryLogs: [{ at: at(1), minutes: 420 }, { at: at(1), minutes: 400 }] } }).sleep).toBeUndefined();
    expect(insightDay({ ...source, sleep: {} }).sleep).toBeUndefined();
  });
  it("missing nutrition/sleep is absent but a recorded day with no finished workout has known zero", () => {
    const days = [{ id: "missing", at: at(2), mainSleepEntries: 0, workouts: 0, active: false }, { id: "logged", at: at(1), calories: 0, protein: 0, mainSleepEntries: 0, workouts: 1, active: false }];
    expect(insightPoints(data(days), [], "calories")).toHaveLength(1);
    expect(insightPoints(data(days), [], "workouts").map((point) => point.value)).toEqual([0, 1]);
  });
});

describe("BODY insights — canonical corrections/history", () => {
  it("reads corrected/voided meals, protein, weight and reliable sleep without changing records", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(at(2)));
    const first = await startDay();
    const meal = await createSavedMeal({ name: "Synthetic lunch", calories: 500, proteinG: 30, carbsG: 50, fatG: 15 });
    const eaten = await logMeal(first.id, meal.id);
    await correctMealLog(first.id, eaten.eventId, { calories: 600, proteinG: 40, carbsG: 60, fatG: 20 });
    await logProtein(first.id, 10);
    const sleep = await logSleep(first.id, 400, "PRIMARY");
    await correctSleep(first.id, sleep, 420);
    await logSleep(first.id, 90, "SUPPLEMENTAL");
    const weight = await logBodyweight(first.id, 999);
    await correctBodyweight(first.id, weight, 185);
    await endDay(first.id);
    vi.setSystemTime(new Date(at(1)));
    const second = await startDay();
    const removed = await logMeal(second.id, meal.id);
    await voidMealLog(second.id, removed.eventId);
    const removedWeight = await logBodyweight(second.id, 999);
    await voidBodyweightLog(second.id, removedWeight);
    const removedSleep = await logSleep(second.id, 420, "PRIMARY");
    await voidSleepLog(second.id, removedSleep);
    vi.setSystemTime(now);
    const before = await db.events.toArray();
    const result = await getBodyInsights(now);
    expect(result.days.find((day) => day.id === first.id)).toMatchObject({ calories: 600, protein: 50, carbs: 60, fat: 20, sleep: 7 });
    const noData = result.days.find((day) => day.id === second.id)!;
    expect(noData.calories).toBeUndefined();
    expect(noData.sleep).toBeUndefined();
    expect(insightPoints(result, await getBodyweightHistory(), "weight").map((point) => point.value)).toEqual([185]);
    expect(await db.events.toArray()).toEqual(before);
  });
  it("keeps an overnight meal in its recorded lived day and excludes records outside the two 90-day windows", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(at(181)));
    const old = await startDay();
    await logProtein(old.id, 99);
    await endDay(old.id);
    vi.setSystemTime(new Date("2026-10-12T18:00:00Z"));
    const day = await startDay();
    vi.setSystemTime(new Date("2026-10-13T02:00:00Z"));
    const meal = await createSavedMeal({ name: "Night meal", calories: 400, proteinG: 20, carbsG: 40, fatG: 10 });
    await logMeal(day.id, meal.id);
    const result = await getBodyInsights(now);
    expect(result.days).toHaveLength(1);
    expect(result.days[0]).toMatchObject({ id: day.id, at: day.startedAt, calories: 400, protein: 20, active: true });
  });
});
