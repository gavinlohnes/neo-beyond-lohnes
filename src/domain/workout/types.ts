// Domain layer must not import React, Dexie, or UI code.

/**
 * Fixed machine-oriented templates (Decision Register, TRAIN — locked
 * word for word). No broad exercise database; exercise IDs are shared
 * across templates where the same movement recurs (Preacher Curl in B/C,
 * Triceps Pressdown in A/C) so future per-exercise progression history is
 * continuous regardless of which day it was trained on.
 */
export type WorkoutTemplateId = "A" | "B" | "C";

export type SessionType = "STANDARD" | "REDUCED" | "RECOVERY";

/**
 * PARTIAL is a meaningful, distinct completion state (2026-08-19 authority
 * reconciliation: "PARTIAL remains/shall be represented as a meaningful
 * workout-session completion state where rotation/progression rules
 * depend on it"), not merely "not ABANDONED."
 */
export type WorkoutSessionStatus = "ACTIVE" | "COMPLETED" | "PARTIAL" | "ABANDONED";

export interface ExercisePrescription {
  exerciseId: string;
  name: string;
  sets: number;
  repRangeLow: number;
  repRangeHigh: number;
}

export interface WorkoutTemplateDefinition {
  id: WorkoutTemplateId;
  exercises: ExercisePrescription[];
}

export const WORKOUT_TEMPLATES: Record<WorkoutTemplateId, WorkoutTemplateDefinition> = {
  A: {
    id: "A",
    exercises: [
      { exerciseId: "machine-chest-press", name: "Machine Chest Press", sets: 3, repRangeLow: 8, repRangeHigh: 12 },
      { exerciseId: "pec-deck", name: "Pec Deck", sets: 3, repRangeLow: 10, repRangeHigh: 15 },
      { exerciseId: "leg-press", name: "Leg Press", sets: 3, repRangeLow: 8, repRangeHigh: 12 },
      { exerciseId: "triceps-pressdown", name: "Triceps Pressdown", sets: 2, repRangeLow: 10, repRangeHigh: 15 },
    ],
  },
  B: {
    id: "B",
    exercises: [
      { exerciseId: "lat-pulldown", name: "Lat Pulldown", sets: 3, repRangeLow: 8, repRangeHigh: 12 },
      { exerciseId: "seated-cable-row", name: "Seated Cable Row", sets: 3, repRangeLow: 8, repRangeHigh: 12 },
      { exerciseId: "leg-curl", name: "Leg Curl", sets: 3, repRangeLow: 10, repRangeHigh: 15 },
      { exerciseId: "preacher-curl", name: "Preacher Curl", sets: 2, repRangeLow: 10, repRangeHigh: 15 },
    ],
  },
  C: {
    id: "C",
    exercises: [
      {
        exerciseId: "machine-shoulder-press",
        name: "Machine Shoulder Press",
        sets: 3,
        repRangeLow: 8,
        repRangeHigh: 12,
      },
      { exerciseId: "preacher-curl", name: "Preacher Curl", sets: 3, repRangeLow: 10, repRangeHigh: 15 },
      { exerciseId: "triceps-pressdown", name: "Triceps Pressdown", sets: 3, repRangeLow: 10, repRangeHigh: 15 },
      { exerciseId: "reverse-pec-deck", name: "Reverse Pec Deck", sets: 3, repRangeLow: 12, repRangeHigh: 15 },
    ],
  },
};

export const WORKOUT_TEMPLATE_ORDER: WorkoutTemplateId[] = ["A", "B", "C"];

/**
 * REDUCED = first two exercises of the active template, two working sets
 * each, same rep ranges — identical rule for A, B, and C (Decision
 * Register + tonight's decision #5 confirming it explicitly across all
 * three, not just A).
 */
export function getReducedExercises(templateId: WorkoutTemplateId): ExercisePrescription[] {
  return WORKOUT_TEMPLATES[templateId].exercises.slice(0, 2).map((ex) => ({ ...ex, sets: 2 }));
}

/**
 * A single logged or skipped set. Skipped sets ARE recorded (as history —
 * "BEYOND stores what happened") but excluded entirely from progression
 * evaluation, never counted as a 0 (Decision Register + tonight's decision
 * #3). weight/reps are not meaningful when skipped is true.
 *
 * substitutedName captures free-text exercise substitution ("if a
 * machine's unavailable" — tonight's decision #9): exerciseId always
 * identifies the originally prescribed slot for history/progression
 * continuity; substitutedName, when present, is what was actually done.
 */
export interface PerformedSet {
  id: string;
  beyondDayId: string;
  sessionId: string;
  exerciseId: string;
  substitutedName?: string;
  setNumber: number;
  weight: number;
  reps: number;
  skipped: boolean;
  recordedAt: string;
}
