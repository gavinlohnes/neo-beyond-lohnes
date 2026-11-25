import { describe, expect, it } from "vitest";
import { deriveFlipPlan, DEFAULT_FLIP, type FlipSettings } from "../src/application/flipPlan";
import { SOURCES } from "../src/application/shiftSleepPlan";
import type { SleepRhythm } from "../src/engine/sleepRhythm";
import type { SchedulePattern } from "../src/domain/common/types";
import { DEFAULT_SCHEDULE_PATTERN } from "../src/engine/scheduledContext";

/**
 * GRAYSON-FLIP-PLAN-001. Gavin's rotation (as shiftSleepPlan.test): Week A from Mon Oct 26 works Mon, Tue, Fri, Sat,
 * Sun; Week B works Wed, Thu. Breaks: Wed–Thu (2 days), Mon–Tue (2 days), Fri–Sun (3 days). 18:00–06:00 nights.
 * Runs under TZ=UTC and TZ=America/Chicago (Nov 1, 2026 is the DST change there).
 */
const nights: SchedulePattern = { id: "current", anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6, createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z" };
const group = (kind: "WORK" | "OFF", start: number, end: number) => ({ kind, nights: 9, start, end, midpoint: 0, spread: 0 });
const rhythm: SleepRhythm = { nights: [], groups: [group("WORK", 7 * 60 + 30, 14 * 60 + 15), group("OFF", 22 * 60 + 45, 7 * 60)], offMinusWork: null, axisStart: 0 };
const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m, d, h, min);
const plan = (now: Date, extra: { settings?: FlipSettings; rhythm?: SleepRhythm | null; confirmed?: Map<string, "WORK" | "OFF"> } = {}) =>
  deriveFlipPlan({ now, pattern: nights, rhythm: extra.rhythm === undefined ? rhythm : extra.rhythm, settings: extra.settings, confirmed: extra.confirmed });

describe("after the last night of a run", () => {
  it("Week B's Thu night, 3 days off: FLIP BACK, up by 13:00, daylight, bed at his days-off median; through the day, gone after bed", () => {
    const p = plan(at(10, 6, 5))!;
    expect(p).toMatchObject({ kind: "FLIP_BACK", breakDays: 3, date: "2026-11-05" });
    expect(p.line).toBe("Sleep soon after this shift and get up by 13:00. Get outside in daylight this afternoon (14:00–16:00). Bed around 22:45, your usual on days off.");
    expect(p.card.title).toBe("Flip back");
    expect(p.short).toBe("Flip back: up by 13:00, daylight 14:00–16:00, bed 22:45.");
    expect(p.card.source).toEqual(SOURCES.LIGHT_TIMING);
    expect(p.windows.map((w) => [w.kind, new Date(w.start).getHours(), new Date(w.end).getHours()])).toEqual([["SLEEP", 6, 13], ["DAYLIGHT", 14, 16]]);
    expect(plan(at(10, 6, 15))?.kind).toBe("FLIP_BACK");
    expect(plan(at(10, 6, 22, 44))?.kind).toBe("FLIP_BACK");
    expect(plan(at(10, 6, 22, 46))).toBeNull();
    expect(plan(at(10, 5, 17, 59))).toBeNull(); // before the last shift starts
  });
  it("Week A's Tue night, 2 days off: STAY LATE, bed 03:00, up 12:00; gone 12 h after the shift ends", () => {
    const p = plan(at(9, 28, 7))!;
    expect(p).toMatchObject({ kind: "STAY_LATE", breakDays: 2 });
    expect(p.line).toBe("Two days off. Sleep after this shift, then stay up late on your days off (bed about 03:00, up about 12:00), so your next night shift isn't a second flip.");
    expect(p.card.source).toEqual(SOURCES.NIOSH_FLIP);
    expect(SOURCES.NIOSH_FLIP.quote).toContain("3-4 a.m.");
    expect(plan(at(9, 28, 17, 59))?.kind).toBe("STAY_LATE");
    expect(plan(at(9, 28, 18, 1))).toBeNull();
  });
  it("across the Nov 1 DST change: Sun Nov 1's night, 2 days off, STAY LATE until Mon 18:00", () => {
    expect(plan(at(10, 2, 7))?.kind).toBe("STAY_LATE");
    expect(plan(at(10, 2, 17, 59))?.kind).toBe("STAY_LATE");
    expect(plan(at(10, 2, 18, 1))).toBeNull();
  });
  it("too few Garmin nights: bed at your usual night-time", () => {
    expect(plan(at(10, 6, 9), { rhythm: null })!.line).toContain("Bed at your usual night-time.");
  });
});

describe("FLIP DAY, before the first night of a run", () => {
  it("after the 3-day break: stay up later (days-off median + 2 h) and nap before 18:00; from 16:30 until the shift", () => {
    const p = plan(at(10, 8, 20))!;
    expect(p).toMatchObject({ kind: "BACK_ON", date: "2026-11-08", breakDays: 3 });
    expect(p.line).toBe("Tonight, stay up later than usual (about 00:45) and sleep in. Nap before your 18:00 shift.");
    expect(p.short).toBe("Tonight stay up until about 00:45; nap before your 18:00 shift.");
    expect(plan(at(10, 9, 17, 59))?.kind).toBe("BACK_ON");
    expect(plan(at(10, 9, 18, 1))).toBeNull();
    expect(plan(at(10, 8, 16, 29))?.kind).not.toBe("BACK_ON");
  });
  it("#723 review: once the late night is behind him, only the nap line (never 'tonight' on the shift day)", () => {
    expect(plan(at(10, 9, 0, 30))!.line).toMatch(/^Tonight, stay up later/); // before about 00:45
    expect(plan(at(10, 9, 13))!.line).toBe("Nap before your 18:00 shift.");
    expect(plan(at(10, 9, 13))!.card.plan.title).toBe("Nap before the 18:00 shift");
    expect(plan(at(10, 8, 23), { rhythm: null })!.line).toMatch(/^Tonight, stay up later/);
    expect(plan(at(10, 9, 9), { rhythm: null })!.line).toBe("Nap before your 18:00 shift."); // after midnight, no Garmin bedtime
  });
  it("after a 2-day stay-late break: only the nap line", () => {
    expect(plan(at(9, 29, 20))!.line).toBe("Nap before your 18:00 shift.");
  });
  it("too few Garmin nights: a couple of hours later than usual", () => {
    expect(plan(at(10, 8, 20), { rhythm: null })!.line).toContain("(a couple of hours later than usual)");
  });
});

describe("his settings", () => {
  it("each setting changes the right number, the break choices swap the plans, and off hides everything", () => {
    const s = (patch: Partial<FlipSettings>) => ({ ...DEFAULT_FLIP, ...patch });
    expect(plan(at(10, 6, 7), { settings: s({ getUpBy: 11 * 60 + 15 }) })!.line).toContain("get up by 11:15");
    expect(plan(at(10, 6, 7), { settings: s({ daylightStart: 10 * 60, daylightMinutes: 60 }) })!.line).toContain("daylight this morning (10:00–11:00)");
    expect(plan(at(9, 28, 7), { settings: s({ stayLateBed: 4 * 60, stayLateWake: 13 * 60 }) })!.line).toContain("bed about 04:00, up about 13:00");
    expect(plan(at(10, 8, 20), { settings: s({ laterHours: 1 }) })!.line).toContain("about 23:45");
    expect(plan(at(10, 8, 20), { settings: s({ laterHours: 0 }) })!.line).toBe("Nap before your 18:00 shift.");
    expect(plan(at(9, 28, 7), { settings: s({ shortBreak: "FLIP_BACK" }) })!.kind).toBe("FLIP_BACK");
    expect(plan(at(10, 6, 7), { settings: s({ longBreak: "STAY_LATE" }) })!.line).toMatch(/^Three days off\./);
    expect(plan(at(10, 6, 7), { settings: s({ show: false }) })).toBeNull();
  });
  it("no saved schedule: nothing", () => {
    expect(deriveFlipPlan({ now: at(10, 6, 7), pattern: DEFAULT_SCHEDULE_PATTERN, rhythm })).toBeNull();
  });
  it("#723 review: a day in the break he confirmed as WORK means no flip plan for that break", () => {
    expect(plan(at(10, 6, 9), { confirmed: new Map([["2026-11-06", "WORK"]]) })).toBeNull();
    expect(plan(at(10, 8, 20), { confirmed: new Map([["2026-11-07", "WORK"]]) })).toBeNull();
  });
  it("a confirmed schedule change wins: Thu Nov 5 confirmed off makes Wed the last night, with 4 days off", () => {
    const confirmed = new Map<string, "WORK" | "OFF">([["2026-11-05", "OFF"]]);
    expect(plan(at(10, 5, 7), { confirmed })).toMatchObject({ kind: "FLIP_BACK", breakDays: 4, date: "2026-11-04" });
  });
});
