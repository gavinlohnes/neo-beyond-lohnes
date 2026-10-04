import { describe, expect, it } from "vitest";
import { findDuplicateMeal, findSameFood, isSimilarProtein, findBatchDuplicateMeals } from "../../src/engine/sameFood";

/** "Same food?" (Drop 1.5): the Oct 3 case, and the cases that must stay quiet. */
const at = (h: number, m: number, s = 0) => new Date(2026, 9, 3, h, m, s).toISOString();

describe("isSimilarProtein", () => {
  it("allows 5 g or 10% of the larger amount, whichever is wider", () => {
    expect(isSimilarProtein(49, 50)).toBe(true);
    expect(isSimilarProtein(25, 30)).toBe(true);
    expect(isSimilarProtein(25, 31)).toBe(false);
    expect(isSimilarProtein(90, 99)).toBe(true);
    expect(isSimilarProtein(90, 101)).toBe(false);
    expect(isSimilarProtein(0, 0)).toBe(false);
  });
});

describe("findSameFood", () => {
  const protein = { id: "p", grams: 49, at: at(20, 43, 11) };
  const meal = { id: "m", savedMealId: "dinner", name: "Dinner", calories: 650, proteinG: 50, at: at(20, 43, 26) };

  it("finds the Oct 3 pair from either side", () => {
    expect(findSameFood([protein], [meal], { kind: "MEAL", id: "m" })).toEqual({ protein, meal });
    expect(findSameFood([protein], [meal], { kind: "PROTEIN", id: "p" })).toEqual({ protein, meal });
  });

  it("stays quiet past 2 minutes, for different protein, and for same-kind logs", () => {
    expect(findSameFood([{ ...protein, at: at(20, 41, 0) }], [meal], { kind: "MEAL", id: "m" })).toBeUndefined();
    expect(findSameFood([{ ...protein, grams: 30 }], [meal], { kind: "MEAL", id: "m" })).toBeUndefined();
    expect(findSameFood([protein, { id: "p2", grams: 49, at: at(20, 43, 20) }], [], { kind: "PROTEIN", id: "p2" })).toBeUndefined();
  });

  it("picks the closest in time when more than one matches", () => {
    const near = { id: "near", grams: 50, at: at(20, 43, 20) };
    expect(findSameFood([protein, near], [meal], { kind: "MEAL", id: "m" })?.protein.id).toBe("near");
  });
});

describe("findDuplicateMeal", () => {
  const dinner = (id: string, time: string, patch = {}) => ({
    id,
    savedMealId: "dinner",
    name: "Dinner",
    calories: 650,
    proteinG: 50,
    at: time,
    ...patch,
  });

  it("matches the same saved meal and returns the most recent earlier entry", () => {
    const first = dinner("first", at(20, 42, 0));
    const recent = dinner("recent", at(20, 43, 0));
    const latest = dinner("latest", at(20, 43, 30));
    expect(findDuplicateMeal([first, recent, latest], latest.id)).toEqual({ earlier: recent, justLogged: latest });
  });

  it("matches normalized name plus exact effective calories and protein across saved meals", () => {
    const earlier = dinner("first", at(20, 43, 0), { savedMealId: "old", name: "  DINNER " });
    const latest = dinner("latest", at(20, 43, 30), { savedMealId: "new", name: "dinner" });
    expect(findDuplicateMeal([earlier, latest], latest.id)).toEqual({ earlier, justLogged: latest });
  });

  it("stays quiet for different meals, different macros, and gaps over two minutes", () => {
    const latest = dinner("latest", at(20, 45, 1), { savedMealId: "new" });
    expect(findDuplicateMeal([
      dinner("different", at(20, 44, 30), { savedMealId: "other", name: "Snack" }),
      latest,
    ], latest.id)).toBeUndefined();
    expect(findDuplicateMeal([
      dinner("macros", at(20, 44, 30), { savedMealId: "other", calories: 649 }),
      latest,
    ], latest.id)).toBeUndefined();
    expect(findDuplicateMeal([
      dinner("old", at(20, 43, 0)),
      latest,
    ], latest.id)).toBeUndefined();
  });
});

describe("findBatchDuplicateMeals (DUP-MEAL-002, SAME AS YESTERDAY)", () => {
  const meal = (id: string, name: string, at: string, savedMealId = name, calories = 600, proteinG = 45) => ({ id, savedMealId, name, calories, proteinG, at });
  it("flags a batch meal that repeats one logged moments before the tap", () => {
    const meals = [meal("d0", "Dinner", "2026-10-04T02:14:00Z"), meal("b1", "Dinner", "2026-10-04T02:15:00Z"), meal("b2", "Snack", "2026-10-04T02:15:00Z")];
    const pairs = findBatchDuplicateMeals(meals, ["b1", "b2"]);
    expect(pairs.map((p) => [p.justLogged.id, p.earlier.id])).toEqual([["b1", "d0"]]);
  });
  it("never flags meals inside the batch against each other (yesterday's two shakes)", () => {
    const meals = [meal("b1", "Shake", "2026-10-04T02:15:00Z"), meal("b2", "Shake", "2026-10-04T02:15:00Z")];
    expect(findBatchDuplicateMeals(meals, ["b1", "b2"])).toEqual([]);
  });
  it("matches each earlier meal at most once, and ignores ones over two minutes old", () => {
    const meals = [
      meal("old", "Shake", "2026-10-04T02:10:00Z"),
      meal("s0", "Shake", "2026-10-04T02:14:30Z"),
      meal("b1", "Shake", "2026-10-04T02:15:00Z"),
      meal("b2", "Shake", "2026-10-04T02:15:00Z"),
    ];
    expect(findBatchDuplicateMeals(meals, ["b1", "b2"]).map((p) => [p.justLogged.id, p.earlier.id])).toEqual([["b1", "s0"]]);
  });
});
