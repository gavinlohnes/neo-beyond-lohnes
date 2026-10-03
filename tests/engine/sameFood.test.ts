import { describe, expect, it } from "vitest";
import { findSameFood, isSimilarProtein } from "../../src/engine/sameFood";

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
  const meal = { id: "m", name: "Dinner", proteinG: 50, at: at(20, 43, 26) };

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
