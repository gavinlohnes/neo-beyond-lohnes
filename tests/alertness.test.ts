import { describe, expect, it } from "vitest";
import { bodyClockLow, energyCurve, habitualWake, MIN_NIGHTS } from "../src/application/alertness";

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

/**
 * GRAYSON-C4.1-ENERGY-CURVE-001 (Gavin, 2026-11-24: "Option R"): on a run of day sleeps the body clock lags. The low
 * moves at most 30 min later per main sleep and comes straight back with a night-time sleep.
 */
describe("C4.1 body clock on night runs", () => {
  type Span = { start: number; end: number };
  const on = (base: Date, day: number, h: number, m = 0) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + day, h, m).getTime();
  const hm = (h: number, m = 0) => h * 60 + m;
  const inWindow = (m: number, start: number, end: number) => ((m - start + 1440) % 1440) < ((end - start + 1440) % 1440);
  /** Four night sleeps 23:00–07:00, then `run` night shifts each followed by its day sleep. Lived day k is shift k's. */
  function nightRun(base: Date, shift: [number, number, number, number], sleep: [number, number, number, number], run: number) {
    const sleeps: Span[] = [0, 1, 2, 3].map((d) => ({ start: on(base, d, 23), end: on(base, d + 1, 7) }));
    const days = Array.from({ length: run }, (_, k) => 4 + k);
    for (const d of days) sleeps.push({ start: on(base, d + 1, sleep[0], sleep[1]), end: on(base, d + 1, sleep[2], sleep[3]) });
    return days.map((d, k) => {
      const from = on(base, d, 16, 30), to = on(base, d + 1, 16, 30);
      const known = sleeps.filter((s) => s.end <= from);
      const curve = energyCurve({ from, to, sleeps: known, planned: [sleeps[4 + k]!], nights: known.filter((s) => s.start >= from - 7 * 86_400_000), history: known, shiftEnd: on(base, d + 1, shift[2], shift[3]) })!;
      return { curve, shiftStart: hm(shift[0], shift[1]), sleepStart: hm(sleep[0], sleep[1]), shiftEnd: on(base, d + 1, shift[2], shift[3]) };
    });
  }
  const runs: [string, [number, number, number, number], [number, number, number, number]][] = [
    ["18:00–06:00", [18, 0, 6, 0], [7, 0, 14, 0]],
    ["19:00–07:00", [19, 0, 7, 0], [8, 0, 15, 0]],
    ["22:00–06:30", [22, 0, 6, 30], [7, 30, 14, 30]],
  ];
  const bases = [new Date(2026, 10, 10), new Date(2026, 2, 4), new Date(2026, 9, 28)]; // plain, and runs across both DST dates

  it.each(runs)("%s: nights 1–3 keep the low in the waking night, at most 30 min later each day sleep", (_n, shift, sleep) => {
    for (const base of bases) {
      const nights = nightRun(base, shift, sleep, 3);
      let previous = hm(5, 30); // 1.5 h before the night-time sleeps' 07:00 wake
      for (const { curve, shiftStart, sleepStart } of nights) {
        const low = curve.basis.lowMinutes;
        expect(inWindow(low, shiftStart, sleepStart), `${base.toDateString()} low ${low}`).toBe(true);
        expect((low - previous + 1440) % 1440).toBeLessThanOrEqual(30);
        previous = low;
      }
      expect(nights.map((n) => n.curve.basis.lowMinutes)).toEqual([hm(5, 30), hm(6), hm(6, 30)]);
    }
  });

  it.each(runs)("%s: the drive line still sits at the end of the shift", (_n, shift, sleep) => {
    for (const { curve, shiftEnd } of nightRun(new Date(2026, 10, 10), shift, sleep, 3)) expect(curve.drive).toEqual({ start: shiftEnd, end: shiftEnd + 3_600_000 });
  });

  it("a day worker's regular sleep gives the same curve as before: the low 1.5 h before the wake", () => {
    const base = new Date(2026, 10, 1);
    const sleeps = Array.from({ length: 10 }, (_, d) => ({ start: on(base, d, 23), end: on(base, d + 1, 7) }));
    const from = on(base, 10, 16, 30), to = on(base, 11, 16, 30), nights = sleeps.slice(-7);
    const withHistory = energyCurve({ from, to, sleeps, planned: [{ start: on(base, 10, 23), end: on(base, 11, 7) }], nights, history: sleeps })!;
    const without = energyCurve({ from, to, sleeps, planned: [{ start: on(base, 10, 23), end: on(base, 11, 7) }], nights })!;
    expect(withHistory.basis.lowMinutes).toBe(hm(5, 30));
    expect(withHistory.points).toEqual(without.points);
    expect(withHistory.low).toEqual(without.low);
  });

  it("a late weekend moves a day worker's low at most an hour, and Monday is back on the weekday wake", () => {
    const base = new Date(2026, 10, 2); // a Monday
    const wakeAt = (d: number) => ([0, 6].includes(new Date(on(base, d, 12)).getDay()) ? [9, 0] : [6, 30]) as [number, number];
    const sleeps = Array.from({ length: 14 }, (_, d) => ({ start: on(base, d - 1, 23), end: on(base, d, ...wakeAt(d)) }));
    const lowAfter = (d: number) => bodyClockLow(sleeps.filter((s) => s.end <= on(base, d, 12)))!;
    expect(lowAfter(13)).toBe(hm(6)); // Sunday the 15th: two late wakes, +30 min each
    expect(bodyClockLow([...sleeps, { start: on(base, 13, 23), end: on(base, 14, 6, 30) }])).toBe(hm(5)); // Monday
  });

  it("one night-time sleep brings the low straight back", () => {
    const base = new Date(2026, 10, 10);
    const run = [0, 1, 2, 3, 4].map((d) => ({ start: on(base, d, 7), end: on(base, d, 14) }));
    const off = [{ start: on(base, -2, 23), end: on(base, -1, 7) }];
    expect(bodyClockLow([...off, ...run])).toBe(hm(8));
    expect(bodyClockLow([...off, ...run, { start: on(base, 4, 23), end: on(base, 5, 7) }])).toBe(hm(5, 30));
  });

  it("a long run of nights adapts fully to wake − 1.5 h and then stays there", () => {
    const base = new Date(2026, 10, 1);
    const off = [0, 1].map((d) => ({ start: on(base, d, 23), end: on(base, d + 1, 7) }));
    const lows = Array.from({ length: 20 }, (_, k) => bodyClockLow([...off, ...Array.from({ length: k + 1 }, (_, j) => ({ start: on(base, 3 + j, 7, 30), end: on(base, 3 + j, 14, 30) }))])!);
    expect(lows[7]).toBe(hm(9, 30));
    expect(lows.slice(-5)).toEqual([hm(13), hm(13), hm(13), hm(13), hm(13)]);
  });

  it("with no night-time sleep on record it doesn't invent a starting clock: the low is 1.5 h before the day-sleep wake", () => {
    const curve = energyCurve({ from: at(18, 16, 30), to: at(19, 16, 30), sleeps: nights, planned: [{ start: at(19, 7), end: at(19, 14) }], nights, history: nights, shiftEnd: at(19, 6) })!;
    expect(curve.basis.lowMinutes).toBe(hm(12, 30));
  });

  it("an even mix of night and day sleeps doesn't average into a 09:00 low that matches neither", () => {
    const base = new Date(2026, 10, 10);
    const mixed = [0, 1, 2].map((d) => ({ start: on(base, d, 23), end: on(base, d + 1, 7) }))
      .concat([4, 5, 6].map((d) => ({ start: on(base, d, 7), end: on(base, d, 14) })));
    const curve = energyCurve({ from: on(base, 6, 16, 30), to: on(base, 7, 16, 30), sleeps: mixed, nights: mixed, history: mixed })!;
    expect(curve.basis.lowMinutes).not.toBe(hm(9));
    expect(curve.basis.lowMinutes).toBe(hm(7));
  });
});
