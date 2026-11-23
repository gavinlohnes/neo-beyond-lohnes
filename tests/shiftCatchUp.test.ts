import { describe, expect, it } from "vitest";
import { deriveCatchUp, type ShiftSample } from "../src/application/shiftCatchUp";

/** GRAYSON LOG-CATCHUP-001: what he usually has on shift, minus tonight's, each at its usual point. */
const d = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m);
const shiftOf = (day: number) => ({ start: d(day, 18), end: d(day + 1, 6) });
const sample = (day: number, meals: [string, number, number?][] = [], water: [number, number][] = []): ShiftSample => ({
  shift: shiftOf(day),
  meals: meals.map(([id, hoursIn, servings]) => ({ savedMealId: id, name: id === "bowl" ? "Chicken bowl" : id === "shake" ? "Protein shake" : id, servings: servings ?? 1, at: new Date(d(day, 18).getTime() + hoursIn * 3_600_000).toISOString() })),
  water: water.map(([oz, hoursIn]) => ({ amountOz: oz, at: new Date(d(day, 18).getTime() + hoursIn * 3_600_000).toISOString() })),
});
const live = new Set(["bowl", "shake", "once", "gone"]);

describe("deriveCatchUp", () => {
  it("offers meals seen on two or more shifts, at their median point, and the usual water spread across the shift", () => {
    const past = [
      sample(5, [["bowl", 4], ["shake", 9, 2], ["once", 2]], [[16, 1], [16, 5], [16, 9]]),
      sample(6, [["bowl", 6], ["shake", 10, 2]], [[16, 2], [24, 7], [16, 10]]),
      sample(7, [["bowl", 5], ["gone", 3]], [[16, 3], [16, 8]]),
      sample(8, [["gone", 3]]),
    ];
    const items = deriveCatchUp(past, sample(14), d(15, 6, 45), new Set(["bowl", "shake", "once"]));
    expect(items.map((i) => [i.label, i.times.map((t) => String(new Date(t).getHours()).padStart(2, "0") + ":" + String(new Date(t).getMinutes()).padStart(2, "0"))])).toEqual([
      ["Chicken bowl", ["23:00"]],
      ["Protein shake × 2", ["03:30"]],
      ["Water · 3 × 16 oz", ["20:00", "00:00", "04:00"]],
    ]);
  });

  it("leaves out what is already logged tonight, and counts tonight's water", () => {
    const past = [sample(5, [["bowl", 4]], [[16, 1], [16, 5]]), sample(6, [["bowl", 6]], [[16, 2], [16, 7]])];
    const tonight = sample(14, [["bowl", 5]], [[16, 1]]);
    const items = deriveCatchUp(past, tonight, d(15, 6, 45), live);
    expect(items.map((i) => i.label)).toEqual(["Water · 16 oz"]);
    expect(items[0]!.times).toEqual([d(15, 3).toISOString()]);
  });

  it("never places anything after now or outside the shift, and offers nothing before the shift starts", () => {
    const past = [sample(5, [["bowl", 11.5]]), sample(6, [["bowl", 11.5]])];
    expect(deriveCatchUp(past, sample(14), d(15, 2), live)[0]!.times).toEqual([d(15, 2).toISOString()]);
    expect(deriveCatchUp(past, sample(14), d(14, 17), live)).toEqual([]);
  });

  it("keeps placement inside tonight's lived day when the shift starts before it", () => {
    const past = [sample(5, [["bowl", 0.5]]), sample(6, [["bowl", 0.5]])];
    const lived = { start: d(14, 19), end: d(15, 16, 30) }; // a lived day that opens after the shift began
    expect(deriveCatchUp(past, sample(14), d(15, 6, 45), live, lived)[0]!.times).toEqual([d(14, 19).toISOString()]);
  });

  it("needs a pattern: one shift is not usual, and logs outside the shift don't count", () => {
    expect(deriveCatchUp([sample(5, [["bowl", 4]], [[16, 1]])], sample(14), d(15, 6, 45), live)).toEqual([]);
    expect(deriveCatchUp([sample(5, [["bowl", -3]]), sample(6, [["bowl", 13]])], sample(14), d(15, 6, 45), live)).toEqual([]);
  });
});
