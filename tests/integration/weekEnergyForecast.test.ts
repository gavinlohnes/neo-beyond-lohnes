import { describe, expect, it } from "vitest";
import { deriveWeekEnergyForecast } from "../../src/application/weekEnergyForecast";
import type { PictureRow } from "../../src/application/wholePictureProjection";
import type { SchedulePattern } from "../../src/domain/common/types";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/** BIG-IDEAS-001 item 2. Invented history only. */
const row = (context: "WORK" | "OFF", energy?: number, sleepHours?: number) => ({ context, energy, sleepHours, start: "x", dayIds: ["d"], sessions: 0 }) as unknown as PictureRow;
// One rotation block: 2 shifts, 2 days off, 3 shifts, 2 days off. In 2-shift runs shift 1 → 3, shift 2 → 2;
// in 3-shift runs shift 1 → 4, shift 2 → 3, shift 3 → 1. Day off 1 → 4, day off 2 → 5.
const block = () => [row("WORK", 3, 6), row("WORK", 2, 5), row("OFF", 4, 9), row("OFF", 5, 8), row("WORK", 4, 6), row("WORK", 3, 5), row("WORK", 1, 4), row("OFF", 4, 9), row("OFF", 5, 8)];
// Gavin's rotation from Mon Oct 26 (Week A): Mon, Tue work; Wed, Thu off; Fri–Sun work.
const pattern: SchedulePattern = { id: "current", anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6, createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z" };
const now = new Date(2026, 9, 26, 9);
const owed = { owedMinutes: 150, days: 7 };

describe("WEEK ENERGY FORECAST", () => {
  it("places each day in its scheduled run and gives that place's recorded energy and sleep in past runs of the same length", () => {
    const f = deriveWeekEnergyForecast({ now, pattern, rows: [row("OFF", 4, 8), ...block(), ...block(), ...block()], sleepOwed: owed });
    expect(f.scheduled).toBe(true);
    expect(f.days.map((d) => [d.date, d.work, d.position, d.length])).toEqual([
      ["2026-10-26", "WORK", 1, 2], ["2026-10-27", "WORK", 2, 2], ["2026-10-28", "OFF", 1, 2], ["2026-10-29", "OFF", 2, 2],
      ["2026-10-30", "WORK", 1, 3], ["2026-10-31", "WORK", 2, 3], ["2026-11-01", "WORK", 3, 3],
    ]);
    // The newest run (days off) may still be going, so it is not a same-length run.
    expect(f.days.map((d) => d.energy)).toEqual([
      { mean: 3, days: 3 }, { mean: 2, days: 3 }, { mean: 4, days: 5 }, { mean: 5, days: 5 }, { mean: 4, days: 3 }, { mean: 3, days: 3 }, { mean: 1, days: 3 },
    ]);
    expect(f.days.every((d) => d.basis === "SAME_LENGTH")).toBe(true);
    expect(f.days[6]!.sleep).toEqual({ mean: 4, days: 3 });
    expect(f.lowest?.date).toBe("2026-11-01");
    expect(f.best?.date).toBe("2026-10-29");
    expect(f.sleepOwed).toEqual(owed);
  });

  it("follows the saved schedule: a different rotation gives different places and numbers", () => {
    const rows = [row("OFF", 4, 8), ...block(), ...block(), ...block()];
    const shifted: SchedulePattern = { ...pattern, weeks: [{ workdays: [2, 3, 4] }, { workdays: [2, 3, 4] }] };
    const f = deriveWeekEnergyForecast({ now, pattern: shifted, rows, sleepOwed: owed });
    expect(f.days.map((d) => [d.work, d.position])).toEqual([["OFF", 4], ["WORK", 1], ["WORK", 2], ["WORK", 3], ["OFF", 1], ["OFF", 2], ["OFF", 3]]);
    // No recorded run reached day off 3 or 4, so those days say nothing.
    expect(f.days[0]!.energy).toEqual({ mean: undefined, days: 0 });
    // Past 3-shift runs exist, so shift 1 of 3 uses them; no past 3-day-off run does, so day off 1 of 3 uses any length.
    expect(f.days[1]).toMatchObject({ energy: { mean: 4, days: 3 }, basis: "SAME_LENGTH" });
    expect(f.days[4]).toMatchObject({ energy: { mean: 4, days: 6 }, basis: "ANY_LENGTH" });
  });

  it("never takes a run's length from one an unrecorded day cuts short", () => {
    // Review of #475: only 3-shift runs were worked; each has its third day unrecorded (UNKNOWN).
    const cut = () => [row("WORK", 3, 6), row("WORK", 1, 5), { ...row("OFF"), context: "UNKNOWN" } as unknown as PictureRow, row("OFF", 4, 9), row("OFF", 5, 8)];
    const f = deriveWeekEnergyForecast({ now, pattern, rows: [row("OFF", 4, 8), ...cut(), ...cut(), ...cut()], sleepOwed: owed });
    // Tue is shift 2 of 2. No recorded run is known to be 2 shifts long, so it is any length, and labelled so.
    expect(f.days[1]).toMatchObject({ position: 2, length: 2, basis: "ANY_LENGTH", energy: { mean: 1, days: 3 } });
    // A day-off run after an unknown day still counts by position, as in ROTATION-002, but not as "2 days off".
    expect(f.days[2]).toMatchObject({ position: 1, length: 2, basis: "ANY_LENGTH", energy: { mean: 4, days: 3 } });
  });

  it("says nothing it can't support: under 3 days at a place, no spread, or no saved schedule", () => {
    const thin = deriveWeekEnergyForecast({ now, pattern, rows: [row("OFF"), ...block(), ...block()], sleepOwed: owed });
    // Two 3-shift runs: too few for the same length, and only those reached shift 3, so nothing to say.
    expect(thin.days[6]).toMatchObject({ energy: { mean: undefined, days: 2 }, basis: "ANY_LENGTH" });
    // Two 2-shift runs are too few on their own, so shift 1 of 2 falls back to every run that had a shift 1.
    expect(thin.days[0]).toMatchObject({ energy: { mean: 3.5, days: 4 }, basis: "ANY_LENGTH" });
    expect(deriveWeekEnergyForecast({ now, pattern, rows: [], sleepOwed: owed })).toMatchObject({ lowest: null, best: null });
    expect(deriveWeekEnergyForecast({ now, pattern: DEFAULT_SCHEDULE_PATTERN, rows: [], sleepOwed: owed })).toMatchObject({ scheduled: false, days: [] });
  });
});
