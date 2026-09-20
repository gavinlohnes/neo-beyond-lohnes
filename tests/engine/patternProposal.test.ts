import { describe, expect, it } from "vitest";
import { detectRepeatedRatingPattern, type RatedOutcomeSample } from "../../src/engine/patternProposal";

/**
 * FOUNDATION-1B — Scenario F ("learning without takeover"). Pure unit
 * tests; no Dexie, no fake-indexeddb.
 */

function sample(overrides: Partial<RatedOutcomeSample> = {}): RatedOutcomeSample {
  return { kind: "EXECUTE_PLANNED_WORK", rating: "BAD", ...overrides };
}

describe("detectRepeatedRatingPattern", () => {
  it("fewer than the minimum count -> no proposal", () => {
    expect(detectRepeatedRatingPattern([sample(), sample()])).toBeNull();
  });

  it("exactly the minimum count, same kind and rating -> a proposal naming the real count", () => {
    const samples = [sample(), sample(), sample()];
    expect(detectRepeatedRatingPattern(samples)).toEqual({
      kind: "EXECUTE_PLANNED_WORK",
      rating: "BAD",
      count: 3,
    });
  });

  it("more than the minimum, most-recent three agree -> still proposal-worthy from the most recent slice", () => {
    const samples = [sample(), sample(), sample(), sample({ rating: "GOOD" })];
    expect(detectRepeatedRatingPattern(samples)).toEqual({
      kind: "EXECUTE_PLANNED_WORK",
      rating: "BAD",
      count: 3,
    });
  });

  it("mixed ratings within the most recent window -> no proposal", () => {
    expect(detectRepeatedRatingPattern([sample(), sample({ rating: "GOOD" }), sample()])).toBeNull();
  });

  it("mixed kinds within the most recent window -> no proposal", () => {
    expect(
      detectRepeatedRatingPattern([sample(), sample({ kind: "RECOVER" }), sample()]),
    ).toBeNull();
  });

  it("NEUTRAL is never proposal-worthy, even if all three agree", () => {
    expect(
      detectRepeatedRatingPattern([sample({ rating: "NEUTRAL" }), sample({ rating: "NEUTRAL" }), sample({ rating: "NEUTRAL" })]),
    ).toBeNull();
  });

  it("GOOD is proposal-worthy too, not just BAD", () => {
    const samples = [sample({ rating: "GOOD" }), sample({ rating: "GOOD" }), sample({ rating: "GOOD" })];
    expect(detectRepeatedRatingPattern(samples)).toEqual({
      kind: "EXECUTE_PLANNED_WORK",
      rating: "GOOD",
      count: 3,
    });
  });

  it("deterministic: same input -> same output", () => {
    const samples = [sample(), sample(), sample()];
    expect(detectRepeatedRatingPattern(samples)).toEqual(detectRepeatedRatingPattern(samples));
  });
});
