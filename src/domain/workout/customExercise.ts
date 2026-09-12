// Domain layer must not import React, Dexie, or UI code.
import type { MuscleGroup } from "./exerciseLibrary";

/**
 * TRAIN-CREATE-001 (Personal Exercise Library): a small, directly-mutable
 * reusable exercise definition — same treatment as SavedMeal
 * (domain/common/types.ts): create/edit/archive change the record itself;
 * there is no event trail for "what exercises exist," only for facts
 * logged against them elsewhere (a future Drop's concern, not this one's).
 *
 * Deliberately independent of the fixed A/B/C WORKOUT_TEMPLATES system
 * (workout/types.ts) and Engine progression (engine/progression.ts) —
 * this Drop's authorized scope is the personal library only. Assembling
 * saved exercises into a selectable custom program template is a
 * distinct future Drop this one is designed to feed, not something this
 * type participates in yet.
 */
export interface CustomExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  repRangeLow: number;
  repRangeHigh: number;
  notes?: string;
  /** Present when this entry was seeded from EXERCISE_LIBRARY; absent for a fully hand-typed entry. Provenance only — editing afterward never re-reads the library entry. */
  libraryExerciseId?: string;
  createdAt: string;
  archivedAt?: string;
}
