import type { CustomExercise } from "../domain/workout/customExercise";
import { EXERCISE_LIBRARY, type LibraryExercise, type MuscleGroup } from "../domain/workout/exerciseLibrary";
import { howToFor, TEMPLATE_TO_LIBRARY_ID } from "../domain/workout/exerciseHowTo";

/**
 * GRAYSON-TRAIN-BODYMAP-001 (Gavin, 2026-11-24): the bundled library and his own exercises grouped by the library's own
 * eight muscle groups, his first, for the body map. Pure and read only: navigation, never a score or a "grown" map.
 */

export const MAP_GROUPS: readonly MuscleGroup[] = ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs", "Glutes", "Full Body"];

/** The equipment chips; none on means every exercise. */
export const EQUIPMENT_FILTERS = ["Machine", "Cable", "Dumbbell", "Barbell", "Bodyweight"] as const;
export type EquipmentFilter = (typeof EQUIPMENT_FILTERS)[number];

export interface MuscleEntry {
  id: string;
  name: string;
  equipment: string;
  muscleGroup: MuscleGroup;
  /** One of his own exercises (its group is his to change). */
  own: boolean;
  /** The id whose HOW TO opens, or null when there's no guide. */
  howToId: string | null;
}

export function exercisesByMuscle(input: {
  library?: readonly LibraryExercise[];
  customs: readonly CustomExercise[];
  equipment?: readonly string[];
}): Record<MuscleGroup, MuscleEntry[]> {
  const library = input.library ?? EXERCISE_LIBRARY;
  const filter = input.equipment && input.equipment.length ? new Set(input.equipment) : null;
  const groups = Object.fromEntries(MAP_GROUPS.map((g) => [g, [] as MuscleEntry[]])) as Record<MuscleGroup, MuscleEntry[]>;
  const keep = (equipment: string) => !filter || filter.has(equipment);
  for (const c of input.customs) {
    if (c.archivedAt || !keep(c.equipment) || !groups[c.muscleGroup]) continue;
    const guide = c.libraryExerciseId && howToFor(c.libraryExerciseId) ? c.libraryExerciseId : null;
    groups[c.muscleGroup].push({ id: c.id, name: c.name, equipment: c.equipment, muscleGroup: c.muscleGroup, own: true, howToId: guide });
  }
  for (const l of library) {
    if (!keep(l.equipment) || !groups[l.muscleGroup]) continue;
    groups[l.muscleGroup].push({ id: l.id, name: l.name, equipment: l.equipment, muscleGroup: l.muscleGroup, own: false, howToId: howToFor(l.id) ? l.id : null });
  }
  return groups;
}

/**
 * The group of the exercise he's on: a built-in through HOWTO-001's map to its library entry, a library or his own
 * exercise by its own group, otherwise null (nothing is selected).
 */
export function groupForExercise(exerciseId: string, customs: readonly CustomExercise[], library: readonly LibraryExercise[] = EXERCISE_LIBRARY): MuscleGroup | null {
  const own = customs.find((c) => c.id === exerciseId);
  if (own) return own.muscleGroup;
  const libId = TEMPLATE_TO_LIBRARY_ID[exerciseId] ?? exerciseId;
  return library.find((l) => l.id === libId)?.muscleGroup ?? null;
}
