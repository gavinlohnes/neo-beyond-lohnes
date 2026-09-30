import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { logCleanDay, logUrge, saveQuitHabit, undoUrge } from "../../src/application/quitCommands";
import { getQuitHabit, getQuitSummary } from "../../src/application/quitQueries";

/** Drop 6 (quit tracker), against real Dexie (fake-indexeddb). */

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

describe("quit habit settings", () => {
  it("nothing is set up until the owner names a habit", async () => {
    const day = await startDay();
    expect(await getQuitHabit()).toBeUndefined();
    expect(await getQuitSummary(day.id)).toBeUndefined();
    await expect(logCleanDay(day.id)).rejects.toThrow(/QUIT_HABIT_NOT_SET/);
  });

  it("saves the whole form; clearing an optional field removes it", async () => {
    await saveQuitHabit({ name: "  Drinking ", dailyCostUsd: 7, postShiftPlan: "Shower, eat, bed" });
    expect(await getQuitHabit()).toMatchObject({ name: "Drinking", dailyCostUsd: 7, postShiftPlan: "Shower, eat, bed" });
    await saveQuitHabit({ name: "Drinking" });
    const habit = await getQuitHabit();
    expect(habit?.dailyCostUsd).toBeUndefined();
    expect(habit?.postShiftPlan).toBeUndefined();
  });

  it("rejects a blank name or a negative cost", async () => {
    await expect(saveQuitHabit({ name: "   " })).rejects.toThrow();
    await expect(saveQuitHabit({ name: "Drinking", dailyCostUsd: -1 })).rejects.toThrow();
  });
});

describe("clean days, money saved, urges", () => {
  it("counts clean days this calendar month and in total, once per day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await saveQuitHabit({ name: "Drinking", dailyCostUsd: 7 });
    const aug31 = await dayAt("2026-08-31T18:00:00");
    await logCleanDay(aug31.id);
    const sep2 = await dayAt("2026-09-02T18:00:00");
    await logCleanDay(sep2.id);
    await logCleanDay(sep2.id); // a second hold is a no-op
    await dayAt("2026-09-03T18:00:00"); // not marked: simply not counted
    const sep4 = await dayAt("2026-09-04T18:00:00");
    await logCleanDay(sep4.id);

    const summary = await getQuitSummary(sep4.id, new Date("2026-09-04T20:00:00"));
    expect(summary).toMatchObject({
      cleanToday: true,
      cleanThisMonth: 2,
      cleanTotal: 3,
      savedThisMonthUsd: 14,
      savedTotalUsd: 21,
    });
  });

  it("no money figures without a daily cost", async () => {
    await saveQuitHabit({ name: "Vaping" });
    const day = await startDay();
    await logCleanDay(day.id);
    const summary = await getQuitSummary(day.id);
    expect(summary?.cleanThisMonth).toBe(1);
    expect(summary?.savedThisMonthUsd).toBeUndefined();
  });

  it("logs urges with their trigger and undoes one without touching the original", async () => {
    await saveQuitHabit({ name: "Drinking" });
    const day = await startDay();
    await logUrge(day.id, "AFTER_SHIFT");
    const second = await logUrge(day.id, "STRESS");
    expect((await getQuitSummary(day.id))?.urgesToday.map((u) => u.trigger)).toEqual(["AFTER_SHIFT", "STRESS"]);

    await undoUrge(day.id, second);
    expect((await getQuitSummary(day.id))?.urgesToday.map((u) => u.trigger)).toEqual(["AFTER_SHIFT"]);
    expect(await db.events.get(second)).toBeDefined();
    await expect(undoUrge(day.id, "not-an-urge")).rejects.toThrow(/URGE_NOT_FOUND/);
  });
});
