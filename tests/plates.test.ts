import { expect, it } from "vitest";
import { describePlates, platesPerSide, usesBarbellPlates } from "../src/ui/screens/train/plates";

it("PLATES-001: loads the largest plates first, per side, on a 45 lb bar", () => {
  expect(platesPerSide(225)).toEqual({ plates: [45, 45], leftover: 0 });
  expect(platesPerSide(185)).toEqual({ plates: [45, 25], leftover: 0 });
  expect(platesPerSide(140)).toEqual({ plates: [45, 2.5], leftover: 0 });
  expect(platesPerSide(45)).toEqual({ plates: [], leftover: 0 });
  expect(platesPerSide(40)).toBeNull();
  expect(platesPerSide(Number.NaN)).toBeNull();
  expect(describePlates(226)).toBe("Per side: 45 + 45 (1 lb more than plates allow) · 45 lb bar");
  expect(describePlates(45)).toBe("Per side: empty bar · 45 lb bar");
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
