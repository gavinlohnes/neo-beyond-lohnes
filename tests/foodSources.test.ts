import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/persistence/db";
import { endDay, logProtein, startDay } from "../src/application/commands";
import { correctMealLog, createSavedMeal, logManualMeal, logMeal, voidMealLog } from "../src/application/nutritionCommands";
import { getMealEntries } from "../src/application/nutritionQueries";
import { getFoodSources, groupSources, QUICK_PROTEIN, type SourceEntry } from "../src/application/foodSources";

/** FOOD-SOURCES-001: where calories and protein came from, from your own logs after corrections. Read only. */
const e = (key: string, name: string, at: string, beyondDayId: string, value: number): SourceEntry => ({ key, name, at, beyondDayId, dayAt: `start-${beyondDayId}`, value });

describe("groupSources", () => {
  it("groups by source, biggest first, the top named and the rest together, with shares of the total", () => {
    const entries = [
      e("a", "Rice bowl", "2026-10-01T12:00", "d1", 650), e("a", "Rice bowl", "2026-10-02T12:00", "d2", 650),
      e("b", "Shake", "2026-10-01T08:00", "d1", 300), e("c", "Apple", "2026-10-01T15:00", "d1", 100),
      e("d", "Toast", "2026-10-02T08:00", "d2", 200),
    ];
    const g = groupSources(entries, 2);
    expect(g.total).toBe(1900);
    expect(g.sources.map((s) => [s.name, s.total, s.count])).toEqual([["Rice bowl", 1300, 2], ["Shake", 300, 1]]);
    expect(g.sources[0]!.share).toBeCloseTo(1300 / 1900);
    expect(g.others).toEqual({ sources: 2, total: 300, share: 300 / 1900 });
    // Days newest first, two logs on one day summed.
    expect(g.sources[0]!.days.map((d) => d.beyondDayId)).toEqual(["d2", "d1"]);
    expect(groupSources([e("a", "x", "t1", "d1", 100), e("a", "x", "t2", "d1", 50)]).sources[0]!.days).toEqual([{ beyondDayId: "d1", at: "start-d1", value: 150, count: 2 }]);
  });

  it("names a source by its newest name, leaves out zero-value sources and returns nothing for no entries", () => {
    expect(groupSources([e("m", "Old name", "2026-10-01", "d1", 10), e("m", "New name", "2026-10-02", "d2", 10)]).sources[0]!.name).toBe("New name");
    expect(groupSources([e("w", "Water", "t", "d1", 0)]).sources).toEqual([]);
    expect(groupSources([])).toEqual({ total: 0, sources: [], others: { sources: 0, total: 0, share: 0 } });
  });
});

describe("getFoodSources", () => {
  beforeEach(async () => { await db.delete(); await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); });

  it("reads finished lived days only, uses corrected values, drops undone meals, and keeps a hand-typed meal by name", async () => {
    try {
      const H = 3_600_000, first = new Date(2026, 9, 1, 16, 30).getTime();
      const bowl = await createSavedMeal({ name: "Rice bowl", calories: 650, proteinG: 40, carbsG: 70, fatG: 15 });
      const ids: string[] = [];
      for (let i = 0; i < 4; i++) {
        vi.setSystemTime(first + i * 24 * H); const day = await startDay(); ids.push(day.id);
        vi.setSystemTime(first + i * 24 * H + 2 * H);
        if (i < 3) await logMeal(day.id, bowl.id);
        if (i === 1) await logManualMeal(day.id, { name: "  Toast ", calories: 200, proteinG: 8, carbsG: 30, fatG: 4 });
        if (i === 2) await logManualMeal(day.id, { name: "toast", calories: 220, proteinG: 8, carbsG: 30, fatG: 4 });
        if (i === 2) await logProtein(day.id, 25);
        if (i < 3) { vi.setSystemTime(first + i * 24 * H + 23 * H); await endDay(day.id); }
      }
      // Correct day 0's bowl to 700 and undo day 1's bowl.
      const [d0] = await getMealEntries(ids[0]!);
      await correctMealLog(ids[0]!, d0!.headEventId, { calories: 700, proteinG: 40, carbsG: 70, fatG: 15 });
      const d1 = (await getMealEntries(ids[1]!)).find((m) => m.name === "Rice bowl")!;
      await voidMealLog(ids[1]!, d1.rootEventId);
      // Day 3 is in progress: its bowl is not counted.
      vi.setSystemTime(first + 3 * 24 * H + 5 * H);
      const before = await db.events.count();
      const cal = await getFoodSources("calories", 7);
      expect(cal.finishedDays).toBe(3);
      expect(cal.loggedDays).toBe(3);
      expect(cal.sources.map((s) => [s.name, s.total, s.count])).toEqual([["Rice bowl", 1350, 2], ["toast", 420, 2]]);
      const protein = await getFoodSources("protein", 7);
      expect(protein.sources.map((s) => s.name)).toContain(QUICK_PROTEIN);
      expect(protein.sources.find((s) => s.name === QUICK_PROTEIN)!.total).toBe(25);
      expect(await db.events.count()).toBe(before);
    } finally { vi.useRealTimers(); }
  });
});
