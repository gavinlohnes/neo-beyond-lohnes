import { describe, expect, it, vi, afterEach } from "vitest";
import {
  DEFAULT_LOG_NUDGE, atLivedMinute, deriveLogNudge, getLearnedMealTimes, learnUsualMealTimes, livedMinute, usualTimesFor,
  type LogNudgeInput, type NudgeDay,
} from "../src/application/logNudge";
import { setWorkContext, startDay } from "../src/application/commands";
import { logManualMeal, voidMealLog } from "../src/application/nutritionCommands";

/**
 * GRAYSON-LOG-NUDGE-001: usual meal times learned per day kind, and the one quiet line at those times. Run in
 * TZ=UTC and TZ=America/Chicago; every time below is wall clock in the run's zone. Invented data.
 */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const lived = (d: number) => at(d, 16, 30);
const min = (h: number, m = 0) => livedMinute(new Date(2026, 0, 5, h, m));
const offDays = (meals: number[][]): NudgeDay[] => meals.map((m) => ({ kind: "OFF", meals: m }));
const base = (over: Partial<LogNudgeInput> = {}): LogNudgeInput => ({
  settings: DEFAULT_LOG_NUDGE, usual: [min(14, 10)], livedStart: lived(23), meals: [], onClock: false, operationsOnly: false, dismissed: new Set(), ...over,
});

describe("learnUsualMealTimes", () => {
  it("groups each day's meals 90 minutes apart and keeps a time seen on 4 days, at its median", () => {
    const learned = learnUsualMealTimes(offDays([
      [min(13), min(13, 30), min(19)], [min(13, 20), min(19, 10)], [min(14)], [min(13, 40), min(20)], [min(19, 30)],
    ]));
    // 13:00 and 13:30 on one day are one meal; lunch on 4 days (median 13:30), dinner on 4 (median 19:20). The lived
    // day runs from 16:30, so dinner comes first in it.
    expect(learned.OFF).toEqual([{ minute: min(19, 20), days: 4 }, { minute: min(13, 30), days: 4 }]);
    expect(learned.WORK).toEqual([]);
  });
  it("needs 4 days of that kind: 3 days, or the same times on other kinds, learn nothing", () => {
    const three = offDays([[min(13)], [min(13)], [min(13)]]);
    expect(learnUsualMealTimes(three).OFF).toEqual([]);
    const mixed: NudgeDay[] = [...three, { kind: "WORK", meals: [min(13)] }, { kind: "RECOVERY", meals: [min(13)] }];
    expect(learnUsualMealTimes(mixed)).toEqual({ WORK: [], RECOVERY: [], OFF: [] });
  });
  it("keeps at most 4 usual times, the best-attested", () => {
    const day = [min(8), min(11), min(14), min(17), min(20)];
    const days = offDays([day, day, day, day, [min(11), min(14), min(17), min(20)]]);
    expect(learnUsualMealTimes(days).OFF.map((t) => t.minute)).toEqual([min(17), min(20), min(11), min(14)]);
  });
  it("a usual time just before the 16:30 boundary stays at the end of its own lived day", () => {
    const learned = learnUsualMealTimes(offDays([[min(16, 10)], [min(16, 20)], [min(16, 10)], [min(16, 5)]]));
    expect(learned.OFF).toEqual([{ minute: min(16, 10), days: 4 }]);
    // On the lived day that starts Nov 23 at 16:30, that is Nov 24 at 16:10, not Nov 23.
    expect(atLivedMinute(lived(23), learned.OFF[0]!.minute).getTime()).toBe(at(24, 16, 10).getTime());
  });
  it("an edited list wins over the learned one; without it (RESET) the learned times come back", () => {
    const learned = learnUsualMealTimes(offDays([[min(13)], [min(13)], [min(13)], [min(13)]]));
    expect(usualTimesFor("OFF", learned, { ...DEFAULT_LOG_NUDGE, edited: { OFF: [min(12, 30)] } })).toEqual([min(12, 30)]);
    expect(usualTimesFor("OFF", learned, { ...DEFAULT_LOG_NUDGE, edited: {} })).toEqual([min(13)]);
    expect(usualTimesFor("WORK", learned, { ...DEFAULT_LOG_NUDGE, edited: { OFF: [min(12, 30)] } })).toEqual([]);
  });
});

describe("deriveLogNudge", () => {
  it("shows 45 minutes after the usual time with nothing logged, and says why", () => {
    expect(deriveLogNudge(base(), at(24, 14, 54))).toBeNull();
    expect(deriveLogNudge(base(), at(24, 14, 55))?.text).toBe("Usually you eat around 14:10. Nothing logged yet today.");
    const earlier = deriveLogNudge(base({ meals: [at(24, 9).toISOString()] }), at(24, 15));
    expect(earlier?.text).toBe("Usually you eat around 14:10. Nothing logged since 12:40.");
  });
  it("a meal logged since 90 minutes before the usual time answers it", () => {
    expect(deriveLogNudge(base({ meals: [at(24, 12, 40).toISOString()] }), at(24, 15))).toBeNull();
    expect(deriveLogNudge(base({ meals: [at(24, 12, 39).toISOString()] }), at(24, 15))).not.toBeNull();
  });
  it("follows his delay", () => {
    const settings = { ...DEFAULT_LOG_NUDGE, delayMinutes: 90 };
    expect(deriveLogNudge(base({ settings }), at(24, 15, 39))).toBeNull();
    expect(deriveLogNudge(base({ settings }), at(24, 15, 40))).not.toBeNull();
  });
  it("is silent on the clock, in operations-only mode, when switched off, and with no usual times", () => {
    const due = at(24, 15);
    expect(deriveLogNudge(base({ onClock: true }), due)).toBeNull();
    expect(deriveLogNudge(base({ operationsOnly: true }), due)).toBeNull();
    expect(deriveLogNudge(base({ settings: { ...DEFAULT_LOG_NUDGE, enabled: false } }), due)).toBeNull();
    const learned = learnUsualMealTimes(offDays([[min(14, 10)], [min(14, 10)], [min(14, 10)]]));
    expect(deriveLogNudge(base({ usual: usualTimesFor("OFF", learned, DEFAULT_LOG_NUDGE) }), due)).toBeNull();
  });
  it("NOT NOW hides only that usual time; the next usual time can bring it back", () => {
    // The lived day from Nov 23 16:30: dinner 19:00 (Nov 23) comes before lunch 14:10 (Nov 24).
    const usual = [min(19), min(14, 10)];
    const dismissed = new Set([min(19)]);
    expect(deriveLogNudge(base({ usual }), at(23, 19, 45))?.text).toBe("Usually you eat around 19:00. Nothing logged yet today.");
    expect(deriveLogNudge(base({ usual, dismissed }), at(23, 19, 45))).toBeNull();
    expect(deriveLogNudge(base({ usual, dismissed }), at(24, 9))).toBeNull();
    expect(deriveLogNudge(base({ usual, dismissed }), at(24, 15))?.usualMinute).toBe(min(14, 10));
    // Answered at 19:10: dinner is done, lunch still comes.
    const meals = [at(23, 19, 10).toISOString()];
    expect(deriveLogNudge(base({ usual, meals }), at(23, 20))).toBeNull();
    expect(deriveLogNudge(base({ usual, meals }), at(24, 15))?.text).toBe("Usually you eat around 14:10. Nothing logged since 12:40.");
  });
  it("a usual time near the boundary belongs to its own lived day", () => {
    // 16:12 on the lived day from Nov 23 16:30 is Nov 24 16:12; it is not due at Nov 23 17:00.
    const usual = [min(16, 12)];
    expect(deriveLogNudge(base({ usual }), at(23, 17))).toBeNull();
    expect(deriveLogNudge(base({ usual, settings: { ...DEFAULT_LOG_NUDGE, delayMinutes: 15 } }), at(24, 16, 29))?.usualAt).toBe(at(24, 16, 12).toISOString());
  });
  it("across the November DST change the usual time stays on the wall clock", () => {
    // Lived day from Oct 31 16:30 spans the Nov 1 change in Chicago; 14:10 is still 14:10.
    const n = deriveLogNudge(base({ livedStart: new Date(2026, 9, 31, 16, 30) }), new Date(2026, 10, 1, 14, 55));
    expect(n?.usualAt).toBe(new Date(2026, 10, 1, 14, 10).toISOString());
  });
});

describe("getLearnedMealTimes (reads his logs)", () => {
  afterEach(() => { vi.useRealTimers(); });
  async function offDay(d: number, meals: [number, number][], voidFirst = false, context: "WORK" | "OFF" = "OFF") {
    vi.setSystemTime(at(d, 16, 31));
    const day = await startDay(lived(d).toISOString());
    await setWorkContext(day.id, context, "MANUAL");
    const ids: string[] = [];
    for (const [h, m] of meals) {
      const when = h < 16 || (h === 16 && m < 30) ? at(d + 1, h, m) : at(d, h, m);
      vi.setSystemTime(new Date(when.getTime() + 60_000));
      ids.push((await logManualMeal(day.id, { name: "Lunch", calories: 500, proteinG: 30, carbsG: 50, fatG: 15 }, false, when.toISOString())).eventId);
    }
    if (voidFirst) await voidMealLog(day.id, ids[0]!);
    return day;
  }
  it("learns from live meals only: a voided meal does not count toward the 4 days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    for (const d of [3, 4, 5]) await offDay(d, [[13, 0]]);
    await offDay(6, [[13, 15]], true);
    vi.setSystemTime(at(8, 17));
    expect((await getLearnedMealTimes(at(8, 17))).OFF).toEqual([]);
    await offDay(7, [[12, 50]]);
    vi.setSystemTime(at(8, 17));
    const learned = await getLearnedMealTimes(at(8, 17));
    expect(learned.OFF.map((t) => t.days)).toEqual([4]);
    expect(learned.OFF[0]!.minute).toBe(min(13));
  });
  it("leaves out meals inside the shift on work days (the catch-up owns those)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // Four work days, each with a 22:00 meal on shift and a 13:00 meal after it.
    for (const d of [10, 11, 12, 13]) await offDay(d, [[22, 0], [13, 0]], false, "WORK");
    vi.setSystemTime(at(15, 17));
    const learned = await getLearnedMealTimes(at(15, 17));
    expect(learned.WORK.map((t) => t.minute)).toEqual([min(13)]);
  });
});
