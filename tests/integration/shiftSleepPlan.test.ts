import { describe, expect, it } from "vitest";
import { deriveShiftSleepPlan, saveShiftPlanCard, SOURCES, CAFFEINE_CUTOFF_HOURS, WAKE_MARGIN_MINUTES } from "../../src/application/shiftSleepPlan";
import { getCurrentlyEligibleUnresolvedObligations } from "../../src/application/intentQueries";
import { classifyObligation, hasObligationRequiringArbitration } from "../../src/engine/obligationRelevance";
import type { SleepRhythm } from "../../src/engine/sleepRhythm";
import type { PictureRow } from "../../src/application/wholePictureProjection";
import type { SchedulePattern } from "../../src/domain/common/types";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/** CIRCADIAN-SPIKE-001's first slice. Invented rhythms and runs only. */
// Gavin's rotation from Mon Oct 26 (Week A): Mon, Tue work; Wed, Thu off; Fri–Sun work. Sun Oct 25 is off.
const nights: SchedulePattern = { id: "current", anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6, createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z" };
const group = (kind: "WORK" | "OFF", start: number, end: number) => ({ kind, nights: 5, start, end, midpoint: 0, spread: 0 });
const rhythm: SleepRhythm = { nights: [], groups: [group("WORK", 7 * 60 + 30, 14 * 60 + 15), group("OFF", 23 * 60, 8 * 60)], offMinusWork: null, axisStart: 0 };
const row = (context: "WORK" | "OFF", sleepWindow?: { start: number; end: number }) => ({ context, sleepWindow, start: "x", dayIds: ["d"], sessions: 0 }) as unknown as PictureRow;
// Three past runs whose last shift was followed by a 07:30–14:15 main sleep (minutes after the 16:30 lived-day start).
const run = () => [row("WORK"), row("WORK", { start: 900, end: 1305 }), row("OFF"), row("OFF")];
const rows = [row("OFF"), ...run(), ...run(), ...run()];
const plan = (now: Date, extra: Partial<Parameters<typeof deriveShiftSleepPlan>[0]> = {}) => deriveShiftSleepPlan({ now, pattern: nights, rhythm, rows, ...extra });

describe("CIRCADIAN PLAN: the next shift transition's cards", () => {
  it("first night of a run: caffeine, a nap in the gap after your day-off wake, light; each with its rule and source", () => {
    const p = plan(new Date(2026, 9, 26, 9))!;
    expect(p.shift).toMatchObject({ date: "2026-10-26", overnight: true, firstOfRun: true, lastOfRun: false });
    expect(p.cards.map((c) => c.kind)).toEqual(["CAFFEINE", "NAP", "LIGHT"]);
    const [caffeine, nap, light] = p.cards;
    expect(caffeine!.detail).toBe("No substantial caffeine after Tue 01:30.");
    expect(caffeine!.basis).toBe("6 h before your usual post-shift sleep at 07:30 (Garmin, 5 work days).");
    expect(caffeine!.plan).toEqual({ title: "No caffeine after 01:30", plannedAt: "2026-10-27" });
    expect(nap!.title).toBe("Pre-shift nap · first night of the run");
    expect(nap!.detail).toBe("A planned nap between 08:00 and 17:00, before your 18:00 shift.");
    expect(nap!.basis).toMatch(/^From your usual wake time on days off \(Garmin, 5 days\) to 60 minutes before the shift, because grogginess/);
    expect(light!.detail).toBe("After the shift ends at 06:00, if you're going straight to sleep, keep light low on the way home (dark sunglasses).");
    expect(p.cards.map((c) => c.source)).toEqual([SOURCES.CAFFEINE, SOURCES.NAP, SOURCES.LIGHT]);
    // Cited constants, each with its quoted source sentence.
    expect([CAFFEINE_CUTOFF_HOURS, WAKE_MARGIN_MINUTES]).toEqual([6, 60]);
    expect(SOURCES.CAFFEINE.quote).toContain("for a minimum of 6 hours prior to bedtime");
    expect(SOURCES.WAKE_MARGIN.quote).toContain("at least an hour after awakening");
  });

  it("last shift of a run adds your own first sleep from past runs, and the nap follows your work-day wake", () => {
    const p = plan(new Date(2026, 9, 27, 9))!;
    expect(p.shift).toMatchObject({ firstOfRun: false, lastOfRun: true });
    expect(p.cards.map((c) => c.kind)).toEqual(["CAFFEINE", "NAP", "FIRST_SLEEP", "LIGHT"]);
    expect(p.cards[1]!.detail).toBe("A planned nap between 14:15 and 17:00, before your 18:00 shift.");
    const first = p.cards[2]!;
    expect(first.detail).toBe("Sleep soon after this shift. After your last shift in past runs, your main sleep usually ran 07:30–14:15.");
    expect(first.basis).toMatch(/^Your shift's end, and your records: 3 past runs/);
    // Gavin, 2026-11-11: cite Kalkanis 2023 as search-confirmed, and say so on the card.
    expect(first.source).toEqual(SOURCES.FIRST_SLEEP);
    expect(SOURCES.FIRST_SLEEP.quote).toContain("as early as possible after the shift");
    expect(SOURCES.FIRST_SLEEP.checked).toMatch(/search results/);
    // Too few runs on file: it says so, and still prescribes nothing.
    expect(plan(new Date(2026, 9, 27, 9), { rows: [row("OFF"), ...run()] })!.cards[2]!.detail).toMatch(/once 3 runs have Garmin-timed sleep \(1 runs on file\)/);
  });

  it("with too little sleep history, counts from the shift's end and says so; a shift under way gets no nap", () => {
    const thin = plan(new Date(2026, 9, 26, 9), { rhythm: null })!;
    expect(thin.cards[0]!.detail).toBe("No substantial caffeine after Tue 00:00.");
    expect(thin.cards[0]!.basis).toMatch(/^6 h before the shift ends at 06:00, the earliest you'd sleep\. Your own sleep time is used after 3/);
    expect(thin.cards[1]!.detail).toBe("A planned nap that ends by 17:00, before your 18:00 shift.");
    const during = plan(new Date(2026, 9, 26, 23))!;
    expect(during.shift.date).toBe("2026-10-26");
    expect(during.cards.map((c) => c.kind)).toEqual(["CAFFEINE", "LIGHT"]);
  });

  it("covers only the next 24 h, follows the saved schedule, and gives a day shift only the caffeine card", () => {
    expect(plan(new Date(2026, 9, 28, 9))).toBeNull(); // Wed off; the next shift is Fri 18:00, over 24 h away
    expect(plan(new Date(2026, 9, 29, 19))!.shift.date).toBe("2026-10-30");
    const days: SchedulePattern = { ...nights, anchorMonday: "2026-10-26", weeks: [{ workdays: [1, 2, 3, 4, 5] }], shiftStartHour: 7, shiftEndHour: 19 };
    const d = deriveShiftSleepPlan({ now: new Date(2026, 9, 25, 8), pattern: days, rhythm: null, rows: [] })!;
    expect(d.shift.overnight).toBe(false);
    expect(d.cards.map((c) => c.kind)).toEqual(["CAFFEINE"]);
    expect(deriveShiftSleepPlan({ now: new Date(2026, 9, 26, 9), pattern: DEFAULT_SCHEDULE_PATTERN, rhythm, rows })).toBeNull();
  });

  it("SAVE adds a plan item with plannedAt only, so it is PLANNED_TODAY at most and never reaches the Engine's arbitration", async () => {
    for (const card of plan(new Date(2026, 9, 27, 9))!.cards) {
      const saved = await saveShiftPlanCard(card);
      expect(saved.dueAt).toBeUndefined();
      expect(saved.plannedAt).toBe(card.plan.plannedAt);
      expect(classifyObligation(saved, card.plan.plannedAt)).toBe("PLANNED_TODAY");
      expect(hasObligationRequiringArbitration(await getCurrentlyEligibleUnresolvedObligations(), card.plan.plannedAt)).toBe(false);
    }
  });
});
