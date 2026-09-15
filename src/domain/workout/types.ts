// Domain layer must not import React, Dexie, or UI code.

/**
 * TRAIN-CREATE-002: widened from the original fixed `"A" | "B" | "C"`
 * union to a plain string so it can also address a user-created custom
 * template (`CustomWorkoutTemplate`, customTemplate.ts). This does NOT
 * touch WORKOUT_TEMPLATES's exercise composition itself, which remains
 * exactly the locked, fixed machine-oriented set below (Decision
 * Register, TRAIN — exercise names/sets/rep ranges locked word for word,
 * unchanged). No broad exercise database for the built-in three;
 * exercise IDs are shared across templates where the same movement
 * recurs (Preacher Curl in B/C, Triceps Pressdown in A/C) so future
 * per-exercise progression history is continuous regardless of which day
 * it was trained on. Resolving a `WorkoutTemplateId` that isn't one of
 * these three built-ins is the application layer's job (see
 * application/customTemplateQueries.ts's resolveTemplateDefinition) —
 * this domain file's own getPrescription/getReducedExercises below
 * remain scoped to the fixed dictionary only, exactly as before.
 *
 * TRAIN-PROGRESSION-001 (2026-09-15): each exercise's `incrementLbs`
 * value below is NOT part of that lock — see `deriveIncrementLbs`'s own
 * doc comment for why, and what changed.
 */
export type WorkoutTemplateId = string;

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
 * relevant exercise/equipment." Values below are supplied by
 * `deriveIncrementLbs` (TRAIN-PROGRESSION-001), not hand-typed per entry
 * — see that function's own doc comment for the convention it encodes.
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

/** Fallback only — an unrecognized/blank equipment string, or a movement (Bodyweight) this convention has no real increment convention for. Not itself a claim of precision. */
export const DEFAULT_INCREMENT_LBS = 5;

/**
 * TRAIN-PROGRESSION-001 (2026-09-15): replaces the prior flat
 * `DEFAULT_INCREMENT_LBS`-for-everything placeholder with a real,
 * equipment-derived convention, since "no real per-machine increment
 * values are documented anywhere" no longer has to mean "use one number
 * for every exercise" — `CustomExercise`/`LibraryExercise` (see
 * `exerciseLibrary.ts`) already carry a real `equipment` field (and, for
 * Barbell, `muscleGroup` further distinguishes upper- vs. lower-body
 * lifts) that was going unused for this purpose.
 *
 * The specific numbers are a commonly-cited general strength-training
 * convention (the same kind of externally-sourced heuristic
 * NUTRITION_TARGETS' protein multiplier already uses), not a
 * BEYOND-invented number and not verified against any specific real
 * gym's actual equipment:
 *   - Barbell, Legs/Glutes  -> 10lb (lower-body compound lifts —
 *     squat/deadlift/hip-thrust-style — conventionally take bigger jumps
 *     than upper-body barbell work; e.g. StrongLifts 5x5/Starting
 *     Strength-style novice progression).
 *   - Barbell, other        -> 5lb (upper-body barbell press/row work).
 *   - Machine                -> 10lb (many pin-loaded stack machines
 *     step in 10lb increments).
 *   - Cable                  -> 5lb (cable stacks commonly step in
 *     smaller increments than pin-loaded machines).
 *   - Dumbbell               -> 5lb (typical commercial dumbbell rack
 *     per-hand spacing).
 *   - Bodyweight/unrecognized -> `DEFAULT_INCREMENT_LBS`. Bodyweight
 *     movements don't have a meaningful weight-based increment at all
 *     (progression there is via reps or added resistance, a different
 *     axis this Drop does not redesign) — this is an honest limitation,
 *     not a real answer, for that one equipment type.
 */
export function deriveIncrementLbs(equipment: string, muscleGroup?: string): number {
  const isLowerBody = muscleGroup === "Legs" || muscleGroup === "Glutes";
  switch (equipment) {
    case "Barbell":
      return isLowerBody ? 10 : 5;
    case "Machine":
      return 10;
    case "Cable":
      return 5;
    case "Dumbbell":
      return 5;
    default:
      return DEFAULT_INCREMENT_LBS;
  }
}

export const WORKOUT_TEMPLATES: Record<WorkoutTemplateId, WorkoutTemplateDefinition> = {
  A: {
    id: "A",
    exercises: [
      { exerciseId: "machine-chest-press", name: "Machine Chest Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: deriveIncrementLbs("Machine") },
      { exerciseId: "pec-deck", name: "Pec Deck", sets: 3, repRangeLow: 10, repRangeHigh: 15, incrementLbs: deriveIncrementLbs("Machine") },
      { exerciseId: "leg-press", name: "Leg Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: deriveIncrementLbs("Machine") },
      { exerciseId: "triceps-pressdown", name: "Triceps Pressdown", sets: 2, repRangeLow: 10, repRangeHigh: 15, incrementLbs: deriveIncrementLbs("Cable") },
    ],
  },
  B: {
    id: "B",
    exercises: [
      { exerciseId: "lat-pulldown", name: "Lat Pulldown", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: deriveIncrementLbs("Cable") },
      { exerciseId: "seated-cable-row", name: "Seated Cable Row", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: deriveIncrementLbs("Cable") },
      { exerciseId: "leg-curl", name: "Leg Curl", sets: 3, repRangeLow: 10, repRangeHigh: 15, incrementLbs: deriveIncrementLbs("Machine") },
      { exerciseId: "preacher-curl", name: "Preacher Curl", sets: 2, repRangeLow: 10, repRangeHigh: 15, incrementLbs: deriveIncrementLbs("Machine") },
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
        incrementLbs: deriveIncrementLbs("Machine"),
      },
      { exerciseId: "preacher-curl", name: "Preacher Curl", sets: 3, repRangeLow: 10, repRangeHigh: 15, incrementLbs: deriveIncrementLbs("Machine") },
      { exerciseId: "triceps-pressdown", name: "Triceps Pressdown", sets: 3, repRangeLow: 10, repRangeHigh: 15, incrementLbs: deriveIncrementLbs("Cable") },
      { exerciseId: "reverse-pec-deck", name: "Reverse Pec Deck", sets: 3, repRangeLow: 12, repRangeHigh: 15, incrementLbs: deriveIncrementLbs("Machine") },
    ],
  },
};

/**
 * Finds the prescribed shape for one exercise slot within a STANDARD or
 * REDUCED context. Returns undefined for RECOVERY (no exercises) or an
 * unknown exerciseId. Scoped to the fixed built-in A/B/C dictionary only
 * — throws for any other templateId (TRAIN-CREATE-002: a custom
 * template resolves via application/customTemplateQueries.ts's
 * resolvePrescription instead, which checks membership here first and
 * never reaches this function for an id that isn't one of these three).
 */
export function getPrescription(
  templateId: WorkoutTemplateId,
  sessionType: "STANDARD" | "REDUCED",
  exerciseId: string,
): ExercisePrescription | undefined {
  const definition = WORKOUT_TEMPLATES[templateId];
  if (!definition) {
    throw new Error(`UNKNOWN_BUILT_IN_TEMPLATE: "${templateId}" is not one of the fixed A/B/C templates.`);
  }
  const exercises = sessionType === "REDUCED" ? getReducedExercises(templateId) : definition.exercises;
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
  const definition = WORKOUT_TEMPLATES[templateId];
  if (!definition) {
    throw new Error(`UNKNOWN_BUILT_IN_TEMPLATE: "${templateId}" is not one of the fixed A/B/C templates.`);
  }
  return definition.exercises.slice(0, 2).map((ex) => ({ ...ex, sets: 2 }));
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
