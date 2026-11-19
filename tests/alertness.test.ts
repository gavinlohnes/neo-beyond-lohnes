import { describe, expect, it } from "vitest";
import { energyCurve, habitualWake, MIN_NIGHTS } from "../src/application/alertness";

/** ENERGY-CURVE-001: the two-process estimate behaves like sleep science says it should, for a night-shift worker. */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
// Day sleeps 07:00–14:00 after 18:00–06:00 shifts, for five days.
const nights = [14, 15, 16, 17, 18].map((d) => ({ start: at(d, 7), end: at(d, 14) }));

describe("ENERGY-CURVE-001 alertness", () => {
  it("finds the habitual wake time, across midnight too, and needs at least 3 nights", () => {
    expect(habitualWake(nights)).toBe(14 * 60);
    expect(habitualWake([{ start: at(1, 22), end: at(2, 6, 30) }, { start: at(2, 23), end: at(3, 0, 30) }, { start: at(3, 22), end: at(4, 6) }])).toBe(6 * 60);
    expect(habitualWake(nights.slice(0, MIN_NIGHTS - 1))).toBeNull();
  });

  it("puts the lowest waking stretch at the end of the night shift, and flags the drive home", () => {
    const curve = energyCurve({ from: at(18, 16, 30), to: at(19, 16, 30), sleeps: nights, planned: [{ start: at(19, 7), end: at(19, 14) }], nights, shiftEnd: at(19, 6) })!;
    expect(curve.points).toHaveLength(96);
    const low = curve.low!;
    // The low falls late in the shift / around the drive home, not in the evening after waking.
    expect(new Date(low.start).getHours()).toBeGreaterThanOrEqual(2);
    expect(low.end).toBeLessThanOrEqual(at(19, 7));
    expect(curve.drive).toEqual({ start: at(19, 6), end: at(19, 7) });
    // Waking in the evening after a full sleep reads higher than the end of the shift.
    const v = (t: number) => curve.points.find((p) => p.t === t)!.v;
    expect(v(at(18, 19))).toBeGreaterThan(v(at(19, 5)));
    expect(curve.points.filter((p) => p.asleep).length).toBeGreaterThan(0);
  });

  it("says nothing about the drive when the shift ends outside the low, and draws nothing without enough nights", () => {
    const curve = energyCurve({ from: at(18, 16, 30), to: at(19, 16, 30), sleeps: nights, planned: [{ start: at(19, 7), end: at(19, 14) }], nights, shiftEnd: at(18, 20) })!;
    expect(curve.drive).toBeNull();
    expect(energyCurve({ from: at(18, 16, 30), to: at(19, 16, 30), sleeps: [], nights: nights.slice(0, 2) })).toBeNull();
  });
});

describe("ENERGY-CURVE-001 usual sleep", () => {
  it("finds your usual sleep from recent nights, and the next one after a time", async () => {
    const { usualSleep, nextUsualSleep } = await import("../src/application/alertness");
    const usual = usualSleep(nights)!;
    expect(usual).toEqual({ startMinutes: 7 * 60, minutes: 7 * 60 });
    expect(nextUsualSleep(usual, at(19, 6))).toEqual({ start: at(19, 7), end: at(19, 14) });
    expect(nextUsualSleep(usual, at(19, 8))).toEqual({ start: at(20, 7), end: at(20, 14) });
  });
});
