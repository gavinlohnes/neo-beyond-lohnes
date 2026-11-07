import { expect, it } from "vitest";
import { describePlates, usesBarbellPlates } from "../src/ui/screens/train/plates";

it("PLATES-001: TRAIN reuses Gym Mode's plate math and warm-up ramp", async () => {
  const { describeWarmUpFor } = await import("../src/ui/screens/train/plates");
  expect(describePlates(185)).toBe("185 lb = bar + 45 + 25 per side");
  expect(describePlates(45)).toBe("45 lb = the bar");
  expect(describePlates(226)).toBe("226 lb: not loadable with standard plates");
  expect(describePlates(40)).toBeNull();
  expect(describeWarmUpFor(185)).toMatch(/^Warm-up: 45 ×10/);
  expect(describeWarmUpFor(45)).toBeNull();
});

it("PLATES-001: only for free-weight barbell lifts", () => {
  expect(usesBarbellPlates("Barbell Bench Press")).toBe(true);
  expect(usesBarbellPlates("Deadlift")).toBe(true);
  expect(usesBarbellPlates("Back Squat")).toBe(true);
  expect(usesBarbellPlates("Dumbbell Bench Press")).toBe(false);
  expect(usesBarbellPlates("Machine Chest Press")).toBe(false);
  expect(usesBarbellPlates("Leg Press")).toBe(false);
  expect(usesBarbellPlates("Goblet Squat")).toBe(false);
});

it("E1RM-001: estimates a one-rep max from 1–12 rep sets only", async () => {
  const { estimatedOneRepMax, bestEstimate } = await import("../src/ui/screens/train/plates");
  expect(estimatedOneRepMax(225, 1)).toBe(225);
  expect(estimatedOneRepMax(200, 5)).toBe(233);
  expect(estimatedOneRepMax(100, 15)).toBeNull();
  expect(estimatedOneRepMax(0, 5)).toBeNull();
  expect(bestEstimate([{ startedAt: "2026-11-01", sets: [{ weight: 185, reps: 8 }, { weight: 205, reps: 3 }] }])).toEqual({ value: 234, weight: 185, reps: 8, at: "2026-11-01" });
  expect(bestEstimate([])).toBeNull();
});
