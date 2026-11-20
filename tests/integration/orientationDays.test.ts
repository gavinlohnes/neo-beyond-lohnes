import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { logSleep, startDay, startDayFromTap, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { getOrientation } from "../../src/application/orientation";
import { getActiveDay } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON C1.2 against real records. Week A's run is Fri 13 / Sat 14 / Sun 15 Nov 2026; Mon 16 starts Week B, whose
 * first shift is Wed 18 at 18:00. He checks in each night of the run, mood falling 4 → 3 → 2, sleeps after Sunday's
 * shift, and taps START DAY at 14:10 Monday (C1.0 opens Monday's 16:30 day early).
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const checkIn = (mood: 1 | 2 | 3 | 4 | 5) => ({ energy: 3 as const, stress: 2 as const, mood, soreness: 1 as const, alcoholUrge: 0 as const });

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(13, 16, 31));
  await updateSchedulePattern(ROTATION);
  for (const [d, mood] of [[13, 4], [14, 3], [15, 2]] as const) {
    vi.setSystemTime(at(d, 16, 31));
    const day = await startDay(at(d, 16, 30).toISOString());
    vi.setSystemTime(at(d, 16, 40));
    await submitCheckIn(day.id, checkIn(mood));
  }
  vi.setSystemTime(at(16, 13, 50));
  await logSleep((await getActiveDay())!.id, 350, "PRIMARY");
  vi.setSystemTime(at(16, 14, 10));
  await startDayFromTap(at(16, 14, 10));
});
afterEach(() => { vi.useRealTimers(); db.close(); });

it("the first day after the run reads as recovery, says when he's back, names the mood drop, and writes nothing", async () => {
  const events = await db.events.count();
  const o = (await getOrientation(at(16, 14, 10)))!;
  expect(await db.events.count()).toBe(events);
  expect(o.mode).toBe("OFF");
  expect(o.purpose).toBe("RECOVERY");
  expect(o.situation).toMatchObject({ kind: "OFF", headline: "Back on Wed", sub: "18:00 · saved schedule" });
  expect(o.sleep).toMatchObject({ state: "KNOWN", minutes: 350 });
  expect(o.trend).toBe("Mood has dropped across your last three check-ins (4 → 3 → 2).");
  expect(o.hard).toBe(false);
  expect(o.actions).toEqual([]);
  expect(o.delta).toMatch(/^The first day off after the run; sleep usually comes first\./);
  expect(o.unread).toEqual([]);
});
