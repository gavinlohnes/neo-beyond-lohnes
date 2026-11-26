import { describe, expect, it } from "vitest";
import { fitsNow, leavesLine, type FitsNowInput } from "../../src/engine/fitsNow";

/** GRAYSON-FITS-NOW-001: the pure picks. */
const meal = (id: string, calories: number, proteinG: number) => ({ id, name: id, calories, proteinG });
const base = (over: Partial<FitsNowInput> = {}): FitsNowInput => ({
  targetKcal: 2000, eatenKcal: 1400, proteinTargetG: 180, proteinG: 140, usesOnThisKind: new Map(), window: null,
  meals: [meal("Chicken bowl", 520, 45), meal("Oats", 350, 15), meal("Steak", 640, 60), meal("Shake", 200, 30), meal("Pizza", 900, 35)],
  ...over,
});

describe("Fits now", () => {
  it("what's left is the target minus what's logged; one serving at or under it fits, best for protein toward what's left first", () => {
    const f = fitsNow(base())!;
    expect(f.kind).toBe("LIST");
    if (f.kind !== "LIST") return;
    expect(f.leftKcal).toBe(600);
    // 40 g protein left: Chicken bowl and Steak (over by 40, so "about fits") both count 40 toward it; then Shake (30).
    expect(f.rows.map((r) => r.meal.id)).toEqual(["Chicken bowl", "Steak", "Shake"]);
    expect(f.rows.find((r) => r.meal.id === "Steak")!.aboutFits).toBe(true);
    expect(f.rows.length).toBeLessThanOrEqual(3);
  });

  it("a meal over by 50 kcal or less 'about fits'; 51 over doesn't", () => {
    const f = fitsNow(base({ meals: [meal("A", 650, 20), meal("B", 651, 20)] }))!;
    expect(f.kind === "LIST" && f.rows.map((r) => [r.meal.id, r.aboutFits])).toEqual([["A", true]]);
  });

  it("a protein tie goes to the meal logged most on this kind of day", () => {
    const meals = [meal("A", 300, 30), meal("B", 300, 30)];
    const f = fitsNow(base({ meals, usesOnThisKind: new Map([["B", 4], ["A", 1]]) }))!;
    expect(f.kind === "LIST" && f.rows.map((r) => r.meal.id)).toEqual(["B", "A"]);
  });

  it("each row says what it leaves", () => {
    expect(leavesLine(meal("A", 520, 45), 600, 40)).toBe("Leaves 80 kcal, protein target met");
    expect(leavesLine(meal("A", 350, 15), 600, 40)).toBe("Leaves 250 kcal, 25 g protein to go");
    expect(leavesLine(meal("A", 640, 60), 600, 40)).toBe("About fits: 40 kcal over, protein target met");
    expect(leavesLine(meal("A", 350, 15), 600, undefined)).toBe("Leaves 250 kcal");
  });

  it("no calorie target, under 150 kcal left, or a closed window hides it", () => {
    expect(fitsNow(base({ targetKcal: undefined }))).toBeNull();
    expect(fitsNow(base({ eatenKcal: 1851 }))).toBeNull();
    expect(fitsNow(base({ eatenKcal: 1850 }))).not.toBeNull();
    expect(fitsNow(base({ window: { state: "CLOSED" } }))).toBeNull();
  });

  it("under 60 minutes of window left says so", () => {
    expect(fitsNow(base({ window: { state: "OPEN", leftMinutes: 40 } }))!.windowLine).toBe("Window closes in 40 min");
    expect(fitsNow(base({ window: { state: "OPEN", leftMinutes: 90 } }))!.windowLine).toBeNull();
  });

  it("nothing fits: one plain line and no list", () => {
    const f = fitsNow(base({ eatenKcal: 1820, meals: [meal("Steak", 640, 60)] }))!;
    expect(f).toMatchObject({ kind: "NONE", line: "None of your saved meals fit the 180 kcal left" });
  });
});
