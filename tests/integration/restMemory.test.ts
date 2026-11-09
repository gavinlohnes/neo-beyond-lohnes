import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_REST_SECONDS, MAX_REST_SECONDS, MIN_REST_SECONDS, hasRememberedRest, rememberRestAdjustment, restSecondsFor } from "../../src/application/restMemory";

/** REST-MEMORY-001: rest per exercise, learned from ± taps. */
beforeEach(() => localStorage.clear());

describe("rest memory", () => {
  it("starts at the default, learns from ± per exercise, and keeps exercises separate", () => {
    expect(restSecondsFor("squat")).toBe(DEFAULT_REST_SECONDS);
    expect(hasRememberedRest("squat")).toBe(false);
    rememberRestAdjustment("squat", 30);
    rememberRestAdjustment("squat", 30);
    expect(restSecondsFor("squat")).toBe(150);
    expect(hasRememberedRest("squat")).toBe(true);
    rememberRestAdjustment("curl", -30);
    expect(restSecondsFor("curl")).toBe(60);
    expect(restSecondsFor("squat")).toBe(150);
    expect(restSecondsFor(null)).toBe(DEFAULT_REST_SECONDS);
  });

  it("stays within sensible bounds and survives bad stored data", () => {
    for (let i = 0; i < 40; i++) rememberRestAdjustment("deadlift", 30);
    expect(restSecondsFor("deadlift")).toBe(MAX_REST_SECONDS);
    for (let i = 0; i < 40; i++) rememberRestAdjustment("deadlift", -30);
    expect(restSecondsFor("deadlift")).toBe(MIN_REST_SECONDS);
    localStorage.setItem("beyond:restSecondsByExercise", "not json");
    expect(restSecondsFor("deadlift")).toBe(DEFAULT_REST_SECONDS);
    localStorage.setItem("beyond:restSecondsByExercise", JSON.stringify({ bench: "120" }));
    expect(restSecondsFor("bench")).toBe(DEFAULT_REST_SECONDS);
  });
});
