import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { logWater, performDueDayRollover, startDay, updateSchedulePattern } from "../../src/application/commands";
import { logManualMeal } from "../../src/application/nutritionCommands";
import { getHydrationEntries } from "../../src/application/queries";
import { getMealEntries } from "../../src/application/nutritionQueries";
import { resolveWhen, shiftPointAt } from "../../src/application/logTimes";
import { deriveLoggableDays, getLoggableDays } from "../../src/application/loggableDays";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import type { BeyondDay } from "../../src/domain/common/types";

/** GRAYSON WHEN upgrade: a log can land on an earlier lived day, and a shift-shaped time is one tap. */
beforeEach(async () => {
  await db.open(); vi.useFakeTimers({ toFake: ["Date"] });
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { vi.useRealTimers(); await db.delete(); });
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).toISOString();
const shift = { start: new Date(2026, 9, 27, 18), end: new Date(2026, 9, 28, 6) };

describe("shift-shaped times", () => {
  it("names start, middle, end and an hour after, from that day's own shift", () => {
    expect(shiftPointAt("START", shift).toISOString()).toBe(at(27, 18));
    expect(shiftPointAt("MID", shift).toISOString()).toBe(at(28, 0));
    expect(shiftPointAt("END", shift).toISOString()).toBe(at(28, 6));
    expect(shiftPointAt("AFTER", shift).toISOString()).toBe(at(28, 7));
    expect(resolveWhen({ kind: "SHIFT", point: "END" }, at(27, 16, 35), new Date(2026, 9, 28, 9), undefined, shift)).toBe(at(28, 6));
  });
  it("refuses a shift time on a day with no shift rather than logging it now", () => {
    expect(() => resolveWhen({ kind: "SHIFT", point: "MID" }, at(27, 16, 35), new Date(), undefined, null)).toThrow(/LOG_TIME_NO_SHIFT/);
  });
});

describe("day picker", () => {
  const day = (id: string, d: number, status: BeyondDay["status"] = "ENDED", workContext: BeyondDay["workContext"] = "WORK") =>
    ({ id, startedAt: at(d, 16, 30), createdAt: at(d, 16, 30), status, workContext } as BeyondDay);
  it("offers today first, then one entry per earlier lived day within a week, labelled plainly", () => {
    const days = [day("a", 20), day("b", 21), day("c", 25, "ENDED", "OFF"), day("d", 27), day("e", 28, "ACTIVE")];
    const out = deriveLoggableDays(days, "e", new Date(2026, 9, 29, 9), () => shift);
    expect(out.map((d) => [d.id, d.label])).toEqual([["e", "Today"], ["d", "Yesterday"], ["c", "Sun, Oct 25"], ["b", "Wed, Oct 21"]]);
    expect(out.find((d) => d.id === "c")!.shift).toBeNull();
    expect(out.find((d) => d.id === "d")!.shift).toBe(shift);
  });

  it("with no active day, an ended day in the current lived day is today, never \"Yesterday\"", () => {
    // After END DAY on the 28th's morning, before a new day opens: "y" (started the 27th) is still today's lived day.
    const out = deriveLoggableDays([day("y2", 26), day("y", 27)], null, new Date(2026, 9, 28, 10, 5), () => null);
    expect(out.map((d) => [d.id, d.label, d.isToday])).toEqual([["y2", "Yesterday", false]]);
  });

  it("puts water and a meal on yesterday at its shift end, leaving today untouched", async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 16, 35)); const yesterday = await startDay();
    vi.setSystemTime(new Date(2026, 9, 28, 16, 40)); const today = (await performDueDayRollover())!;
    expect(today.id).not.toBe(yesterday.id);
    const days = await getLoggableDays(new Date(2026, 9, 28, 17));
    expect(days.map((d) => d.label)).toEqual(["Today", "Yesterday"]);
    const prior = days[1]!;
    expect(prior.shift).toEqual(shift);
    const end = resolveWhen({ kind: "SHIFT", point: "END" }, prior.startedAt, new Date(), prior.createdAt, prior.shift)!;
    await logWater(prior.id, 16, end);
    await logManualMeal(prior.id, { name: "Chili", calories: 600, proteinG: 40, carbsG: 50, fatG: 20 }, false,
      resolveWhen({ kind: "AT", hhmm: "02:00" }, prior.startedAt, new Date(), prior.createdAt)!);
    expect((await getHydrationEntries(yesterday.id))[0]).toMatchObject({ at: at(28, 6) });
    expect((await getMealEntries(yesterday.id))[0]!.at).toBe(at(28, 2));
    expect(await getHydrationEntries(today.id)).toEqual([]);
    // Still only inside that day's own 16:30 to 16:30.
    await expect(logWater(prior.id, 8, at(28, 17))).rejects.toThrow(/LOG_TIME_OUTSIDE_DAY/);
  });
});
