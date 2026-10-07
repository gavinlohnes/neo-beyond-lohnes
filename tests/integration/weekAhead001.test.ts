import { describe, expect, it } from "vitest";
import type { SchedulePattern } from "../../src/domain/common/types";
import { deriveWeekAhead, getWeekAhead } from "../../src/application/weekAheadQueries";
import { db } from "../../src/persistence/db";

const TWO_ON_FIVE_OFF: SchedulePattern = {
  id: "current",
  anchorMonday: "2026-10-05",
  weeks: [{ workdays: [1, 2] }],
  shiftStartHour: 18,
  shiftEndHour: 6,
  postWorkTailHours: 6,
  createdAt: "2026-10-05T00:00:00.000Z",
  updatedAt: "2026-10-05T00:00:00.000Z",
};

describe("WEEKAHEAD-001", () => {
  it("shows seven days, keeps work days free, caps suggestions at two in a row, and preserves A → B → C", () => {
    const result = deriveWeekAhead(new Date(2026, 9, 5, 9), TWO_ON_FIVE_OFF, "C");

    expect(result.days).toHaveLength(7);
    expect(result.days.map((day) => [day.work, day.suggestedTemplate])).toEqual([
      ["WORK", null],
      ["WORK", null],
      ["OFF", "C"],
      ["OFF", "A"],
      ["OFF", null],
      ["OFF", "B"],
      ["OFF", "C"],
    ]);
    expect(result.days.filter((day) => day.work === "WORK").every((day) => day.shiftStartHour === 18)).toBe(true);
  });

  it("is deterministic and read only", async () => {
    await db.schedulePatterns.put(TWO_ON_FIVE_OFF);
    const before = await db.events.count();
    const now = new Date(2026, 9, 5, 9);

    const first = await getWeekAhead(now);
    const second = await getWeekAhead(now);

    expect(second).toEqual(first);
    expect(await db.events.count()).toBe(before);
  });
});
