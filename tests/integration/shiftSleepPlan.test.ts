import { describe, expect, it } from "vitest";
import { deriveShiftSleepPlan, SOURCES } from "../../src/application/shiftSleepPlan";
import type { SleepRhythm } from "../../src/engine/sleepRhythm";
import type { SchedulePattern } from "../../src/domain/common/types";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/** BIG-IDEAS-001 item 3: the next shift's nap, caffeine and light cards. Invented rhythms only. */
const nights: SchedulePattern = { id: "current", anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6, createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z" };
const rhythm = (start: number, end: number, count = 5): SleepRhythm => ({ nights: [], groups: [{ kind: "WORK", nights: count, start, end, midpoint: 0, spread: 0 }], offMinusWork: null, axisStart: 0 });
const at = (iso: string) => new Date(iso).getTime();
const local = (...p: [number, number, number, number, number?]) => new Date(p[0], p[1], p[2], p[3], p[4] ?? 0).getTime();

describe("SHIFT SLEEP PLAN", () => {
  it("times a night shift's nap, caffeine and light from the shift and your usual work-day sleep, with sources", () => {
    const plan = deriveShiftSleepPlan({ now: new Date(2026, 9, 26, 9), pattern: nights, rhythm: rhythm(7 * 60 + 30, 14 * 60 + 15) })!;
    expect(plan.shift).toMatchObject({ date: "2026-10-26", overnight: true });
    expect(at(plan.shift.start)).toBe(local(2026, 9, 26, 18));
    expect(plan.cards.map((c) => c.kind)).toEqual(["NAP", "CAFFEINE", "LIGHT"]);
    const [nap, caffeine, light] = plan.cards;
    expect(nap!.detail).toBe("A 1½–3 h nap between 14:00 and 17:00, before your 18:00 shift.");
    expect(nap!.reminder).toEqual({ title: "Pre-shift nap, 14:00–17:00", plannedAt: "2026-10-26" });
    expect(caffeine!.detail).toBe("Last caffeine by Tue 01:30.");
    expect(caffeine!.basis).toBe("6 h before your usual post-shift sleep at 07:30 (Garmin, 5 work days).");
    expect(caffeine!.reminder).toEqual({ title: "Last caffeine by 01:30", plannedAt: "2026-10-27" });
    expect(light!.detail).toBe("Bright light in the first part of the shift. Dark sunglasses on the way home after 06:00 and a dark bedroom for your usual 07:30–14:15 sleep.");
    expect(light!.reminder.plannedAt).toBe("2026-10-27");
    expect(plan.cards.map((c) => c.source)).toEqual([SOURCES.NAP, SOURCES.CAFFEINE, SOURCES.LIGHT]);
  });

  it("without enough measured nights, counts the caffeine cutoff from the shift's end and says so", () => {
    const plan = deriveShiftSleepPlan({ now: new Date(2026, 9, 26, 9), pattern: nights, rhythm: null })!;
    const caffeine = plan.cards.find((c) => c.kind === "CAFFEINE")!;
    expect(caffeine.detail).toBe("Last caffeine by Tue 00:00.");
    expect(caffeine.basis).toMatch(/^6 h before the shift ends at 06:00, the earliest you'd sleep\. BEYOND needs 3 Garmin-timed/);
    expect(plan.cards.find((c) => c.kind === "LIGHT")!.detail).toMatch(/a dark bedroom for the sleep after\.$/);
    // A usual sleep that starts more than 12 h after the shift isn't this shift's sleep.
    const far = deriveShiftSleepPlan({ now: new Date(2026, 9, 26, 9), pattern: nights, rhythm: rhythm(20 * 60, 4 * 60) })!;
    expect(far.cards.find((c) => c.kind === "CAFFEINE")!.detail).toBe("Last caffeine by Tue 00:00.");
  });

  it("plans the next shift that hasn't started, follows the saved schedule, and gives a day shift only the caffeine card", () => {
    const during = deriveShiftSleepPlan({ now: new Date(2026, 9, 26, 20), pattern: nights, rhythm: null })!;
    expect(at(during.shift.start)).toBe(local(2026, 9, 27, 18));
    const days: SchedulePattern = { ...nights, anchorMonday: "2026-10-26", weeks: [{ workdays: [1, 2, 3, 4, 5] }], shiftStartHour: 7, shiftEndHour: 19 };
    const day = deriveShiftSleepPlan({ now: new Date(2026, 9, 26, 5), pattern: days, rhythm: rhythm(22 * 60 + 30, 6 * 60) })!;
    expect(day.shift.overnight).toBe(false);
    expect(day.cards.map((c) => [c.kind, c.detail])).toEqual([["CAFFEINE", "Last caffeine by Mon 16:30."]]);
  });

  it("says nothing without a saved schedule or a shift this week", () => {
    expect(deriveShiftSleepPlan({ now: new Date(2026, 9, 26, 9), pattern: DEFAULT_SCHEDULE_PATTERN, rhythm: null })).toBeNull();
    expect(deriveShiftSleepPlan({ now: new Date(2026, 9, 26, 9), pattern: { ...nights, weeks: [{ workdays: [] }] }, rhythm: null })).toBeNull();
  });
});
