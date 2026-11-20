import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logSleep, logWater, performDueDayRollover, placeInDay, startDay, startDayFromTap, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { getEarlyDayStart, livedReadAt } from "../../src/application/earlyDayStart";
import { getActiveDay, getLatestRecommendation } from "../../src/application/queries";
import { getTodayPicture } from "../../src/application/todayPicture";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * EARLY-DAY-START-001 (Gavin, 2026-11-20; amends DAY-ROLLOVER-001). He leaves the day running after a shift and
 * wakes around 15:00. Week A, Sat Nov 14 2026 is night 2 of 3 (Fri 13 / Sat 14 / Sun 15 worked).
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const iso = (d: Date) => d.toISOString();

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(13, 16, 31));
  await updateSchedulePattern(ROTATION);
  // Friday's day rolled in at 16:30, he worked it and slept after; he never ended it.
  await startDay(iso(at(13, 16, 30)));
  vi.setSystemTime(at(14, 14, 50));
  await logSleep((await getActiveDay())!.id, 400, "PRIMARY");
});
afterEach(() => { vi.useRealTimers(); db.close(); });

describe("a START DAY tap in the afternoon", () => {
  it("opens the 16:30 day that owns tonight's shift and closes the running day", async () => {
    const friday = (await getActiveDay())!;
    vi.setSystemTime(at(14, 15, 5));
    expect(await getEarlyDayStart(at(14, 15, 5))).toEqual({ boundary: at(14, 16, 30), shift: { start: at(14, 18), end: at(15, 6) } });

    const day = await startDayFromTap(at(14, 15, 5));
    expect(day.startedAt).toBe(iso(at(14, 16, 30)));
    expect(day.createdAt).toBe(iso(at(14, 15, 5)));
    expect(day.workContext).toBe("WORK");
    const closed = (await db.beyondDays.get(friday.id))!;
    expect(closed.status).not.toBe("ACTIVE");
    const ended = await db.events.where("beyondDayId").equals(friday.id).filter((e) => e.type === "DAY_ENDED").toArray();
    expect(ended.map((e) => (e.payload as { reason?: string }).reason)).toEqual(["AUTO_CLOSED_ON_NEW_DAY_START"]);
    // Last night's sleep stays with last night's day.
    const sleeps = await db.events.filter((e) => e.type === "SLEEP_LOGGED").toArray();
    expect(sleeps.map((e) => e.beyondDayId)).toEqual([friday.id]);
    // Nothing more to open early.
    expect(await getEarlyDayStart(at(14, 15, 6))).toBeNull();
  });

  it("keeps its check-in and recommendation through the 16:30 roll, then rolls normally the next day", async () => {
    vi.setSystemTime(at(14, 15, 5));
    const day = await startDayFromTap(at(14, 15, 5));
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const rec = await getLatestRecommendation(day.id);
    expect(rec).toBeDefined();

    vi.setSystemTime(at(14, 16, 45));
    expect(await performDueDayRollover(at(14, 16, 45))).toBeUndefined();
    expect((await getActiveDay())!.id).toBe(day.id);
    expect((await getLatestRecommendation(day.id))!.id).toBe(rec!.id);

    vi.setSystemTime(at(15, 16, 31));
    const next = await performDueDayRollover(at(15, 16, 31));
    expect(next!.startedAt).toBe(iso(at(15, 16, 30)));
  });

  it("reads TODAY as tonight: work run, shift 2 of 3", async () => {
    vi.setSystemTime(at(14, 15, 5));
    await startDayFromTap(at(14, 15, 5));
    const picture = (await getTodayPicture(at(14, 15, 6)))!;
    expect(picture.now!.label).toBe("WORK RUN");
    expect(picture.now!.line).toMatch(/^Shift 2 of 3\./);
  });

  it("owns the time from the tap, so a drink at 15:10 can be logged and placed; before the tap it can't", async () => {
    vi.setSystemTime(at(14, 15, 5));
    const day = await startDayFromTap(at(14, 15, 5));
    vi.setSystemTime(at(14, 15, 10));
    await logWater(day.id, 16);
    expect(await placeInDay(day.id, iso(at(14, 15, 10)))).toBe(iso(at(14, 15, 10)));
    await expect(placeInDay(day.id, iso(at(14, 15, 0)))).rejects.toThrow(/LOG_TIME_OUTSIDE_DAY/);
    expect(await placeInDay(day.id, iso(at(15, 16, 29)))).toBe(iso(at(15, 16, 29)));
  });

  it("outside the window leaves a running day alone, and starts one as before when none is running", async () => {
    const friday = (await getActiveDay())!;
    vi.setSystemTime(at(14, 11, 0));
    expect(await getEarlyDayStart(at(14, 11, 0))).toBeNull();
    expect((await startDayFromTap(at(14, 11, 0))).id).toBe(friday.id);
    expect((await getActiveDay())!.id).toBe(friday.id);

    vi.setSystemTime(at(14, 17, 0));
    const after = await startDayFromTap(at(14, 17, 0));
    expect(after.id).toBe(friday.id); // the 16:30 roll owns this; the tap doesn't restart it
  });

  it("with no day running (he ended it before sleeping), the tap still opens tonight's day", async () => {
    await db.beyondDays.toCollection().modify({ status: "ENDED" });
    vi.setSystemTime(at(14, 15, 5));
    const day = await startDayFromTap(at(14, 15, 5));
    expect(day.startedAt).toBe(iso(at(14, 16, 30)));
    expect(day.workContext).toBe("WORK");
  });
});

describe("livedReadAt", () => {
  it("is now, except for a day opened early, which reads from its own start", () => {
    expect(livedReadAt(null, at(14, 15, 5))).toEqual(at(14, 15, 5));
    expect(livedReadAt({ startedAt: iso(at(13, 16, 30)) }, at(14, 15, 5))).toEqual(at(14, 15, 5));
    expect(livedReadAt({ startedAt: iso(at(14, 16, 30)) }, at(14, 15, 5))).toEqual(at(14, 16, 30));
  });
});
