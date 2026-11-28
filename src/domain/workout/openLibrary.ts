// Domain layer must not import React, Dexie, or UI code.
import type { MuscleGroup } from "./exerciseLibrary";

/**
 * GRAYSON-OPEN-LIBRARY-001 (Gavin's brief, approved on merge; amends the no-bulk-import ruling for this one dataset):
 * the open exercise library. About 800 exercises from free-exercise-db (Unlicense), pinned to one commit and bundled
 * as src/data/openExercises.json (scripts/build-open-exercises.mjs). Loaded lazily (application/openLibrary.ts).
 *
 * Pure rules here: the one muscle table, which entries show, his names winning on duplicates, and search. His 55
 * (EXERCISE_LIBRARY) and his own exercises always come first; nothing he logs depends on this file.
 */

/** One entry as the generated file holds it. */
export interface OpenExerciseRaw {
  /** `fedb-` plus the dataset's own id. */
  id: string;
  name: string;
  /** The dataset's first primary muscle ("quadriceps", "lats", ...). */
  primary: string;
  /** The rest of its primary muscles, then its secondary ones; kept for sets per muscle later. */
  secondary: string[];
  equipment: string;
  level: string;
  category: string;
  steps: string[];
}

export interface OpenExerciseFile {
  source: string;
  commit: string;
  licence: string;
  exercises: OpenExerciseRaw[];
}

export interface OpenExercise extends OpenExerciseRaw {
  muscleGroup: MuscleGroup;
  /** Stretching and cardio: hidden until he shows stretches. */
  stretch: boolean;
}

export const OPEN_ID_PREFIX = "fedb-";
export const isOpenExerciseId = (id: string): boolean => id.startsWith(OPEN_ID_PREFIX);
/** Rep range an open exercise starts with; his to change once added. */
export const OPEN_REP_LOW = 8;
export const OPEN_REP_HIGH = 12;
export const OPEN_STEPS_LABEL = "From the open exercise set";

/**
 * The one table: every primary muscle in the file to one of his eight groups. Neck goes with Shoulders (the shrug
 * and neck work around the upper traps); traps go with Back; abductors with Glutes (they're mostly glute medius);
 * adductors with Legs.
 */
export const OPEN_MUSCLE_GROUP: Readonly<Record<string, MuscleGroup>> = {
  abdominals: "Core",
  abductors: "Glutes",
  adductors: "Legs",
  biceps: "Arms",
  calves: "Legs",
  chest: "Chest",
  forearms: "Arms",
  glutes: "Glutes",
  hamstrings: "Legs",
  lats: "Back",
  "lower back": "Back",
  "middle back": "Back",
  neck: "Shoulders",
  quadriceps: "Legs",
  shoulders: "Shoulders",
  traps: "Back",
  triceps: "Arms",
};

/** Categories shown by default; stretching and cardio sit behind "Show stretches". */
export const OPEN_SHOWN_CATEGORIES: ReadonlySet<string> = new Set(["strength", "powerlifting", "olympic weightlifting", "strongman", "plyometrics"]);

/** Names compare ignoring case, punctuation and spacing: "Push-Up" = "push up" = "Pushup". */
export const normalizeExerciseName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Maps the file; an entry whose muscle the table doesn't know is left out (a test holds the table complete). */
export function mapOpenExercises(file: OpenExerciseFile): OpenExercise[] {
  return file.exercises.flatMap((ex) => {
    const muscleGroup = OPEN_MUSCLE_GROUP[ex.primary];
    return muscleGroup ? [{ ...ex, muscleGroup, stretch: !OPEN_SHOWN_CATEGORIES.has(ex.category) }] : [];
  });
}

/**
 * What search can show: not hidden by him, not a stretch unless he shows stretches, and not a name he already has
 * (his 55 and his own exercises win).
 */
export function visibleOpenExercises(all: readonly OpenExercise[], options: { hidden: ReadonlySet<string>; showStretches: boolean; ownNames: Iterable<string> }): OpenExercise[] {
  const own = new Set([...options.ownNames].map(normalizeExerciseName));
  return all.filter((ex) => !options.hidden.has(ex.id) && (options.showStretches || !ex.stretch) && !own.has(normalizeExerciseName(ex.name)));
}

/** Case-insensitive match on name, muscle group, its muscles or equipment; an empty query lists everything. */
export function searchOpenExercises(list: readonly OpenExercise[], query: string): OpenExercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...list];
  return list.filter((ex) => ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q) || ex.equipment.toLowerCase().includes(q)
    || ex.primary.includes(q) || ex.secondary.some((m) => m.includes(q)));
}

/** "Quadriceps · Barbell · beginner". */
export function describeOpenExercise(ex: OpenExercise): string {
  const muscles = [ex.primary, ...ex.secondary.slice(0, 2)].map((m) => m[0]!.toUpperCase() + m.slice(1)).join(", ");
  return `${muscles} · ${ex.equipment}`;
}
