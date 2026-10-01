import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { logBodyweight, logProtein, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { logCleanDay, saveQuitHabit } from "../../src/application/quitCommands";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { getWeeklySummary } from "../../src/application/weeklyQueries";
import { parseShortcut } from "../../src/ui/shortcuts";

/** Drop 7: the weekly check-in summary (real Dexie, fake-indexeddb) and the shortcut parser. */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
  vi.useRealTimers();
});

const at = (iso: string) => vi.setSystemTime(new Date(iso));

describe("getWeeklySummary", () => {
  it("says there is nothing yet when nothing is logged", async () => {
    const s = await getWeeklySummary(new Date("2026-10-01T12:00:00Z"));
    expect(s.weight.avgLbs).toBeUndefined();
    expect(s.training).toEqual({ workouts: 0, records: [] });
    expect(s.quit).toBeUndefined();
    expect(s.protein.avgGrams).toBeUndefined();
  });

  it("summarizes the last 7 days against the 7 before", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await saveQuitHabit({ name: "Drinking", dailyCostUsd: 10 });
    await updateNutritionTargets({ goalWeightLbs: 180 });

    // Week before: two weigh-ins averaging 196, and a first chest-press session.
    at("2026-09-20T12:00:00Z");
    let day = await startDay();
    await logBodyweight(day.id, 197);
    const first = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, first.id, "machine-chest-press", 1, 130, 10);
    await completeWorkout(day.id, first.id, "STANDARD", "COMPLETED");
    at("2026-09-22T12:00:00Z");
    day = await startDay();
    await logBodyweight(day.id, 195);

    // This week: weigh-ins averaging 194, a heavier set (a PR), clean days, protein.
    at("2026-09-26T12:00:00Z");
    day = await startDay();
    await logBodyweight(day.id, 194.5);
    await logCleanDay(day.id);
    await logProtein(day.id, 150);
    const second = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, second.id, "machine-chest-press", 1, 140, 8);
    await logSet(day.id, second.id, "machine-chest-press", 2, 145, 6); // a second, bigger PR the same week
    await completeWorkout(day.id, second.id, "STANDARD", "COMPLETED");
    at("2026-09-29T12:00:00Z");
    day = await startDay();
    await logBodyweight(day.id, 193.5);
    await logCleanDay(day.id);
    await logProtein(day.id, 130);

    const s = await getWeeklySummary(new Date("2026-10-01T12:00:00Z"));
    expect(s.weight.avgLbs).toBeCloseTo(194);
    expect(s.weight.changeLbs).toBeCloseTo(-2);
    expect(s.weight.weighIns).toBe(2);
    expect(s.weight.goalWeightLbs).toBe(180);
    expect(s.training.workouts).toBe(1);
    expect(s.training.records).toEqual([
      { exerciseName: "Machine Chest Press", record: { kind: "HEAVIEST", weight: 145, reps: 6 } }, // one line per exercise: the best
    ]);
    expect(s.quit).toEqual({ habitName: "Drinking", cleanDays: 2, savedUsd: 20 });
    expect(s.protein.avgGrams).toBe(140);
    expect(s.protein.daysLogged).toBe(2);
  });
});

describe("parseShortcut", () => {
  it("accepts only the four known targets", () => {
    expect(parseShortcut("?go=water")).toBe("water");
    expect(parseShortcut("?go=urge&x=1")).toBe("urge");
    expect(parseShortcut("?go=sleep")).toBeNull();
    expect(parseShortcut("")).toBeNull();
  });
});
