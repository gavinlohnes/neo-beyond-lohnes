// Domain layer must not import React, Dexie, or UI code.
import type { ExercisePrescription } from "./types";

/**
 * TRAIN-CREATE-002 (Custom Workout Templates): a small, directly-mutable
 * reusable workout template — same treatment as SavedMeal/CustomExercise:
 * create/edit/archive change the record itself; no event trail for "what
 * templates exist." Selecting one to actually train is a manual choice
 * (see TrainScreen's picker) — it never participates in the Engine's
 * locked A -> B -> C -> A rotation suggestion (engine/trainSuggestion.ts
 * is untouched by this Drop).
 *
 * `exercises` reuses ExercisePrescription verbatim — the same shape
 * WORKOUT_TEMPLATES' built-in templates use — so every downstream
 * consumer (set logging, progression advisory, REDUCED slicing) treats a
 * custom template's exercises identically to a built-in one once
 * resolved. See application/customTemplateQueries.ts's
 * resolveTemplateDefinition for where that resolution happens.
 */
export interface CustomWorkoutTemplate {
  id: string;
  name: string;
  exercises: ExercisePrescription[];
  createdAt: string;
  archivedAt?: string;
}
