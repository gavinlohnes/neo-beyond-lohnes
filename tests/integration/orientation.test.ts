import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { logSleep, startDay, startDayFromTap, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { getOrientation } from "../../src/application/orientation";
import { getActiveDay } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON C1.1 against real records: Sat Nov 14 2026 (Week A, night 2 of 3). Friday's day rolled in at 16:30 and is
 * still running; he logs last night's sleep, then taps START DAY at 15:05 (C1.0 opens tonight's day early).
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const count = async () => ({ events: await db.events.count(), days: await db.beyondDays.count(), checkIns: await db.checkIns.count(), recs: await db.recommendations.count() });

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(13, 16, 31));
  await updateSchedulePattern(ROTATION);
  await startDay(at(13, 16, 30).toISOString());
  vi.setSystemTime(at(14, 14, 50));
  await logSleep((await getActiveDay())!.id, 400, "PRIMARY");
  vi.setSystemTime(at(14, 15, 5));
  await startDayFromTap(at(14, 15, 5));
});
afterEach(() => { vi.useRealTimers(); db.close(); });

it("composes tonight from real records and writes nothing", async () => {
  const before = await count();
  const o = (await getOrientation(at(14, 15, 5)))!;
  expect(await count()).toEqual(before);
  expect(o.mode).toBe("WORK");
  expect(o.stateLabel).toBe("WORK RUN");
  expect(o.situation).toMatchObject({ kind: "SHIFT", time: "18:00", sub: "on shift · in 2 h 55 min", source: "SAVED SCHEDULE" });
  expect((o.situation as { line: string }).line).toMatch(/^Shift 2 of 3\./);
  // Last night's sleep, from the day that owned it; no usual range yet on a fresh install.
  expect(o.sleep).toEqual({ state: "KNOWN", minutes: 400, source: "LOGGED", band: null, under: false });
  expect(o.checkIn).toEqual({ state: "NONE" });
  expect(o.recommendation).toBeNull();
  expect(o.actions).toEqual([{ kind: "PREP", line: "Food and bottle", detail: "Not confirmed for tonight." }]);
  expect(o.runway.map((r) => r.kind)).toEqual(["NOW", "SHIFT", "CAFFEINE"]);
  expect(o.runway.find((r) => r.kind === "CAFFEINE")!.detail).toBe("6 h before you'd sleep · BEYOND's default");
  expect(o.unread).toEqual([]);
});

it("after check-in shows the Engine's one recommendation", async () => {
  const day = (await getActiveDay())!;
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const o = (await getOrientation(at(14, 15, 9)))!;
  expect(o.checkIn).toEqual({ state: "DONE", energy: 4, stress: 2, mood: 4 });
  expect(o.recommendation).toMatchObject({ source: "ENGINE", kind: "NO_ACTION_REQUIRED", title: "No action required" });
  expect(o.delta).toBe("Nothing in your records asks for more than the basics before the shift.");
});

it("is null with no lived day", async () => {
  await db.beyondDays.toCollection().modify({ status: "ENDED" });
  expect(await getOrientation(at(14, 15, 5))).toBeNull();
});
