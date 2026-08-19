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

/**
 * incrementLbs: "NEXT AVAILABLE INCREMENT" (Decision Register TRAIN +
 * 2026-08-19 reconciliation) implies a per-exercise/equipment increment,
 * not one universal number — the reconciliation explicitly rejected a
 * flat +2.5lb rule as a domain-wide constant, valid "only where it
 * actually represents the configured/available next increment for the
 * relevant exercise/equipment." No real per-machine increment values are
 * documented anywhere, so every exercise below uses the same 5lb default
 * for now — an explicit implementation placeholder (structured so it's
 * easy to configure per exercise once real equipment data exists), not a
 * claimed-locked value.
 */
export interface ExercisePrescription {
  exerciseId: string;
  name: string;
  sets: number;
  repRangeLow: number;
  repRangeHigh: number;
  incrementLbs: number;
}

export interface WorkoutTemplateDefinition {
  id: WorkoutTemplateId;
  exercises: ExercisePrescription[];
}

const DEFAULT_INCREMENT_LBS = 5;

export const WORKOUT_TEMPLATES: Record<WorkoutTemplateId, WorkoutTemplateDefinition> = {
  A: {
    id: "A",
    exercises: [
      { exerciseId: "machine-chest-press", name: "Machine Chest Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: DEFAULT_INCREMENT_LBS },
      { exerciseId: "pec-deck", name: "Pec Deck", sets: 3, repRangeLow: 10, repRangeHigh: 15, incrementLbs: DEFAULT_INCREMENT_LBS },
      { exerciseId: "leg-press", name: "Leg Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: DEFAULT_INCREMENT_LBS },
      { exerciseId: "triceps-pressdown", name: "Triceps Pressdown", sets: 2, repRangeLow: 10, repRangeHigh: 15, incrementLbs: DEFAULT_INCREMENT_LBS },
    ],
  },
  B: {
    id: "B",
    exercises: [
      { exerciseId: "lat-pulldown", name: "Lat Pulldown", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: DEFAULT_INCREMENT_LBS },
      { exerciseId: "seated-cable-row", name: "Seated Cable Row", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: DEFAULT_INCREMENT_LBS },
      { exerciseId: "leg-curl", name: "Leg Curl", sets: 3, repRangeLow: 10, repRangeHigh: 15, incrementLbs: DEFAULT_INCREMENT_LBS },
      { exerciseId: "preacher-curl", name: "Preacher Curl", sets: 2, repRangeLow: 10, repRangeHigh: 15, incrementLbs: DEFAULT_INCREMENT_LBS },
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
        incrementLbs: DEFAULT_INCREMENT_LBS,
      },
      { exerciseId: "preacher-curl", name: "Preacher Curl", sets: 3, repRangeLow: 10, repRangeHigh: 15, incrementLbs: DEFAULT_INCREMENT_LBS },
      { exerciseId: "triceps-pressdown", name: "Triceps Pressdown", sets: 3, repRangeLow: 10, repRangeHigh: 15, incrementLbs: DEFAULT_INCREMENT_LBS },
      { exerciseId: "reverse-pec-deck", name: "Reverse Pec Deck", sets: 3, repRangeLow: 12, repRangeHigh: 15, incrementLbs: DEFAULT_INCREMENT_LBS },
    ],
  },
};

/** Finds the prescribed shape for one exercise slot within a STANDARD or REDUCED context. Returns undefined for RECOVERY (no exercises) or an unknown exerciseId. */
export function getPrescription(
  templateId: WorkoutTemplateId,
  sessionType: "STANDARD" | "REDUCED",
  exerciseId: string,
): ExercisePrescription | undefined {
  const exercises =
    sessionType === "REDUCED" ? getReducedExercises(templateId) : WORKOUT_TEMPLATES[templateId].exercises;
  return exercises.find((ex) => ex.exerciseId === exerciseId);
}

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
