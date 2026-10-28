import { describe, expect, it } from "vitest";
import { moveSleepWindow, sleepWindow, sleepWindowValues, withLoggedSleep } from "../src/ui/screens/today/sleepPeriods";
import type { PeriodValue } from "../src/domain/health/measuredSeries";
const at = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h).getTime();
const p = (from: number, value: number | null): PeriodValue => ({ from, to: from + 86400000, value, partial: false, dayId: null });
describe("sleep display periods, without reattributing lived days", () => {
  it("opens the Monday week and uses calendar boundaries across DST", () => {
    expect(sleepWindow(at(2026, 10, 23, 17), "W")).toEqual({ from: at(2026, 10, 19), to: at(2026, 10, 26) });
    expect(moveSleepWindow(at(2026, 11, 1, 17), "W", 1)).toBe(at(2026, 11, 2));
    expect(moveSleepWindow(at(2026, 3, 8, 17), "D", 1)).toBe(at(2026, 3, 9));
  });
  it("moves from month ends and leap years without skipping periods", () => {
    expect(moveSleepWindow(at(2024, 3, 31), "M", -1)).toBe(at(2024, 2, 1));
    expect(sleepWindow(at(2024, 2, 29), "M").to).toBe(at(2024, 3, 1));
    expect(moveSleepWindow(at(2026, 12, 31), "Y", 1)).toBe(at(2027, 1, 1));
  });
  it("keeps missing values null and every original lived-day bucket intact", () => {
    const series = [p(at(2026, 10, 18, 17), 400), p(at(2026, 10, 19, 17), null), p(at(2026, 10, 20, 17), 420)];
    const result = sleepWindowValues(series, at(2026, 10, 21), "W");
    expect(result.days).toEqual(series.slice(1)); expect(result.bars[0]?.value).toBeNull();
    expect(result.bars[1]).toBe(series[2]);
  });
  it("monthly year bars average measured nights, not missing days", () => {
    const series = [p(at(2026, 1, 5, 17), 300), p(at(2026, 1, 6, 17), null), p(at(2026, 1, 7, 17), 420), p(at(2026, 2, 1, 17), null)];
    const result = sleepWindowValues(series, at(2026, 10, 21), "Y");
    expect(result.bars.map((v) => v.value)).toEqual([360, null]); expect(result.days).toEqual(series);
  });
});

describe("withLoggedSleep", () => {
  it("fills only nights Garmin missed, with that day's logged main sleep, and names them", () => {
    const series = [
      { from: 1, to: 2, dayId: "a", value: 400, partial: false },
      { from: 2, to: 3, dayId: "b", value: null, partial: false },
      { from: 3, to: 4, dayId: "c", value: null, partial: false },
    ];
    const { series: filled, loggedFrom } = withLoggedSleep(series, new Map([["a", 300], ["b", 360]]));
    expect(filled.map((p) => p.value)).toEqual([400, 360, null]);
    expect([...loggedFrom]).toEqual([2]);
  });
});
