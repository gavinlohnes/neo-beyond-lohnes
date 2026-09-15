import { describe, expect, it } from "vitest";
import { deriveIncrementLbs, DEFAULT_INCREMENT_LBS, WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/**
 * TRAIN-PROGRESSION-001 (2026-09-15). Pure unit tests for the
 * equipment-derived increment convention that replaces the prior flat
 * `DEFAULT_INCREMENT_LBS`-for-every-exercise placeholder.
 */
describe("deriveIncrementLbs", () => {
  it("Machine equipment -> 10lb, regardless of muscle group", () => {
    expect(deriveIncrementLbs("Machine")).toBe(10);
    expect(deriveIncrementLbs("Machine", "Legs")).toBe(10);
    expect(deriveIncrementLbs("Machine", "Chest")).toBe(10);
  });

  it("Cable equipment -> 5lb", () => {
    expect(deriveIncrementLbs("Cable")).toBe(5);
  });

  it("Dumbbell equipment -> 5lb", () => {
    expect(deriveIncrementLbs("Dumbbell")).toBe(5);
  });

  it("Barbell, lower-body muscle group (Legs/Glutes) -> 10lb", () => {
    expect(deriveIncrementLbs("Barbell", "Legs")).toBe(10);
    expect(deriveIncrementLbs("Barbell", "Glutes")).toBe(10);
  });

  it("Barbell, upper-body/other muscle group -> 5lb", () => {
    expect(deriveIncrementLbs("Barbell", "Chest")).toBe(5);
    expect(deriveIncrementLbs("Barbell", "Back")).toBe(5);
    expect(deriveIncrementLbs("Barbell")).toBe(5);
  });

  it("Bodyweight and unrecognized equipment fall back to DEFAULT_INCREMENT_LBS", () => {
    expect(deriveIncrementLbs("Bodyweight")).toBe(DEFAULT_INCREMENT_LBS);
    expect(deriveIncrementLbs("")).toBe(DEFAULT_INCREMENT_LBS);
    expect(deriveIncrementLbs("SomethingHandTypedAndUnrecognized")).toBe(DEFAULT_INCREMENT_LBS);
  });

  it("deterministic: same input -> same output", () => {
    expect(deriveIncrementLbs("Barbell", "Legs")).toBe(deriveIncrementLbs("Barbell", "Legs"));
  });
});

describe("WORKOUT_TEMPLATES — real equipment-derived increments, not one flat placeholder", () => {
  it("Machine exercises carry the 10lb Machine increment", () => {
    const machineExerciseIds = ["machine-chest-press", "pec-deck", "leg-press", "leg-curl", "preacher-curl", "machine-shoulder-press", "reverse-pec-deck"];
    for (const templateId of ["A", "B", "C"] as const) {
      for (const exercise of WORKOUT_TEMPLATES[templateId]!.exercises) {
        if (machineExerciseIds.includes(exercise.exerciseId)) {
          expect(exercise.incrementLbs).toBe(10);
        }
      }
    }
  });

  it("Cable exercises carry the 5lb Cable increment", () => {
    const cableExerciseIds = ["triceps-pressdown", "lat-pulldown", "seated-cable-row"];
    for (const templateId of ["A", "B", "C"] as const) {
      for (const exercise of WORKOUT_TEMPLATES[templateId]!.exercises) {
        if (cableExerciseIds.includes(exercise.exerciseId)) {
          expect(exercise.incrementLbs).toBe(5);
        }
      }
    }
  });

  it("not every exercise carries the same increment (the flat placeholder is genuinely gone)", () => {
    const allIncrements = new Set(
      (["A", "B", "C"] as const).flatMap((id) => WORKOUT_TEMPLATES[id]!.exercises.map((ex) => ex.incrementLbs)),
    );
    expect(allIncrements.size).toBeGreaterThan(1);
  });
});
