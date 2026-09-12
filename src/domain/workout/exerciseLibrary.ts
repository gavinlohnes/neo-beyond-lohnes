// Domain layer must not import React, Dexie, or UI code.

/**
 * TRAIN-CREATE-001 (Personal Exercise Library): a small, hand-curated
 * reference list of common exercises — name, primary muscle group,
 * typical equipment, usual rep range. Informed by the shape of open,
 * permissively-licensed exercise datasets (free-exercise-db, Unlicense/
 * public domain; wger's own separately CC-licensed exercise data) but not
 * bulk-imported from either — every entry below is a hand-authored,
 * generic exercise fact (a movement name, which muscles it targets, what
 * equipment it needs), the same kind of information found in any
 * strength-training reference. This is browse/search-assist data only:
 * inert, never mutated at runtime, never itself a source of workout
 * history. See docs/agent/CAPABILITY_MAP.md's "WORKOUT CREATION /
 * EXERCISE LIBRARY" entry for the Reuse Gate finding this reflects.
 *
 * Deliberately independent of the fixed A/B/C WORKOUT_TEMPLATES system —
 * this list exists to seed CustomExercise (customExercise.ts), not to
 * expand or replace the machine-oriented templates in workout/types.ts.
 */
export type MuscleGroup = "Chest" | "Back" | "Shoulders" | "Legs" | "Glutes" | "Arms" | "Core" | "Full Body";

export interface LibraryExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  repRangeLow: number;
  repRangeHigh: number;
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // Chest
  { id: "lib-barbell-bench-press", name: "Barbell Bench Press", muscleGroup: "Chest", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 },
  { id: "lib-dumbbell-bench-press", name: "Dumbbell Bench Press", muscleGroup: "Chest", equipment: "Dumbbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-incline-dumbbell-press", name: "Incline Dumbbell Press", muscleGroup: "Chest", equipment: "Dumbbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-machine-chest-press", name: "Machine Chest Press", muscleGroup: "Chest", equipment: "Machine", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-pec-deck", name: "Pec Deck", muscleGroup: "Chest", equipment: "Machine", repRangeLow: 10, repRangeHigh: 15 },
  { id: "lib-cable-crossover", name: "Cable Crossover", muscleGroup: "Chest", equipment: "Cable", repRangeLow: 10, repRangeHigh: 15 },
  { id: "lib-pushup", name: "Push-Up", muscleGroup: "Chest", equipment: "Bodyweight", repRangeLow: 10, repRangeHigh: 20 },
  { id: "lib-dip", name: "Chest Dip", muscleGroup: "Chest", equipment: "Bodyweight", repRangeLow: 8, repRangeHigh: 12 },

  // Back
  { id: "lib-deadlift", name: "Deadlift", muscleGroup: "Back", equipment: "Barbell", repRangeLow: 5, repRangeHigh: 8 },
  { id: "lib-barbell-row", name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 },
  { id: "lib-lat-pulldown", name: "Lat Pulldown", muscleGroup: "Back", equipment: "Cable", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-seated-cable-row", name: "Seated Cable Row", muscleGroup: "Back", equipment: "Cable", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-pullup", name: "Pull-Up", muscleGroup: "Back", equipment: "Bodyweight", repRangeLow: 5, repRangeHigh: 10 },
  { id: "lib-chinup", name: "Chin-Up", muscleGroup: "Back", equipment: "Bodyweight", repRangeLow: 5, repRangeHigh: 10 },
  { id: "lib-dumbbell-row", name: "One-Arm Dumbbell Row", muscleGroup: "Back", equipment: "Dumbbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-tbar-row", name: "T-Bar Row", muscleGroup: "Back", equipment: "Barbell", repRangeLow: 8, repRangeHigh: 12 },

  // Shoulders
  { id: "lib-overhead-press", name: "Overhead Press", muscleGroup: "Shoulders", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 },
  { id: "lib-machine-shoulder-press", name: "Machine Shoulder Press", muscleGroup: "Shoulders", equipment: "Machine", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-dumbbell-shoulder-press", name: "Dumbbell Shoulder Press", muscleGroup: "Shoulders", equipment: "Dumbbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-lateral-raise", name: "Lateral Raise", muscleGroup: "Shoulders", equipment: "Dumbbell", repRangeLow: 12, repRangeHigh: 15 },
  { id: "lib-front-raise", name: "Front Raise", muscleGroup: "Shoulders", equipment: "Dumbbell", repRangeLow: 12, repRangeHigh: 15 },
  { id: "lib-reverse-pec-deck", name: "Reverse Pec Deck", muscleGroup: "Shoulders", equipment: "Machine", repRangeLow: 12, repRangeHigh: 15 },
  { id: "lib-face-pull", name: "Face Pull", muscleGroup: "Shoulders", equipment: "Cable", repRangeLow: 12, repRangeHigh: 15 },
  { id: "lib-upright-row", name: "Upright Row", muscleGroup: "Shoulders", equipment: "Barbell", repRangeLow: 10, repRangeHigh: 15 },

  // Legs
  { id: "lib-back-squat", name: "Back Squat", muscleGroup: "Legs", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 },
  { id: "lib-front-squat", name: "Front Squat", muscleGroup: "Legs", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 },
  { id: "lib-leg-press", name: "Leg Press", muscleGroup: "Legs", equipment: "Machine", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-leg-extension", name: "Leg Extension", muscleGroup: "Legs", equipment: "Machine", repRangeLow: 10, repRangeHigh: 15 },
  { id: "lib-leg-curl", name: "Leg Curl", muscleGroup: "Legs", equipment: "Machine", repRangeLow: 10, repRangeHigh: 15 },
  { id: "lib-walking-lunge", name: "Walking Lunge", muscleGroup: "Legs", equipment: "Dumbbell", repRangeLow: 10, repRangeHigh: 12 },
  { id: "lib-bulgarian-split-squat", name: "Bulgarian Split Squat", muscleGroup: "Legs", equipment: "Dumbbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-calf-raise", name: "Standing Calf Raise", muscleGroup: "Legs", equipment: "Machine", repRangeLow: 12, repRangeHigh: 20 },

  // Glutes
  { id: "lib-hip-thrust", name: "Barbell Hip Thrust", muscleGroup: "Glutes", equipment: "Barbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-romanian-deadlift", name: "Romanian Deadlift", muscleGroup: "Glutes", equipment: "Barbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-glute-bridge", name: "Glute Bridge", muscleGroup: "Glutes", equipment: "Bodyweight", repRangeLow: 12, repRangeHigh: 20 },
  { id: "lib-cable-kickback", name: "Cable Glute Kickback", muscleGroup: "Glutes", equipment: "Cable", repRangeLow: 12, repRangeHigh: 15 },
  { id: "lib-hip-abduction", name: "Hip Abduction Machine", muscleGroup: "Glutes", equipment: "Machine", repRangeLow: 12, repRangeHigh: 15 },

  // Arms
  { id: "lib-barbell-curl", name: "Barbell Curl", muscleGroup: "Arms", equipment: "Barbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-dumbbell-curl", name: "Dumbbell Curl", muscleGroup: "Arms", equipment: "Dumbbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-preacher-curl", name: "Preacher Curl", muscleGroup: "Arms", equipment: "Machine", repRangeLow: 10, repRangeHigh: 15 },
  { id: "lib-hammer-curl", name: "Hammer Curl", muscleGroup: "Arms", equipment: "Dumbbell", repRangeLow: 10, repRangeHigh: 15 },
  { id: "lib-triceps-pressdown", name: "Triceps Pressdown", muscleGroup: "Arms", equipment: "Cable", repRangeLow: 10, repRangeHigh: 15 },
  { id: "lib-skullcrusher", name: "Skull Crusher", muscleGroup: "Arms", equipment: "Barbell", repRangeLow: 8, repRangeHigh: 12 },
  { id: "lib-overhead-triceps-extension", name: "Overhead Triceps Extension", muscleGroup: "Arms", equipment: "Dumbbell", repRangeLow: 10, repRangeHigh: 15 },
  { id: "lib-dip-triceps", name: "Triceps Dip", muscleGroup: "Arms", equipment: "Bodyweight", repRangeLow: 8, repRangeHigh: 15 },

  // Core
  { id: "lib-plank", name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", repRangeLow: 1, repRangeHigh: 3 },
  { id: "lib-hanging-leg-raise", name: "Hanging Leg Raise", muscleGroup: "Core", equipment: "Bodyweight", repRangeLow: 8, repRangeHigh: 15 },
  { id: "lib-cable-crunch", name: "Cable Crunch", muscleGroup: "Core", equipment: "Cable", repRangeLow: 12, repRangeHigh: 15 },
  { id: "lib-russian-twist", name: "Russian Twist", muscleGroup: "Core", equipment: "Bodyweight", repRangeLow: 15, repRangeHigh: 20 },
  { id: "lib-ab-wheel-rollout", name: "Ab Wheel Rollout", muscleGroup: "Core", equipment: "Ab Wheel", repRangeLow: 8, repRangeHigh: 12 },

  // Full Body
  { id: "lib-kettlebell-swing", name: "Kettlebell Swing", muscleGroup: "Full Body", equipment: "Kettlebell", repRangeLow: 12, repRangeHigh: 20 },
  { id: "lib-clean-and-press", name: "Clean and Press", muscleGroup: "Full Body", equipment: "Barbell", repRangeLow: 5, repRangeHigh: 8 },
  { id: "lib-burpee", name: "Burpee", muscleGroup: "Full Body", equipment: "Bodyweight", repRangeLow: 10, repRangeHigh: 20 },
  { id: "lib-farmers-carry", name: "Farmer's Carry", muscleGroup: "Full Body", equipment: "Dumbbell", repRangeLow: 1, repRangeHigh: 3 },
];

/** Case-insensitive match against name, muscle group, or equipment. Empty/whitespace query returns the full list. */
export function searchLibraryExercises(query: string): LibraryExercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_LIBRARY;
  return EXERCISE_LIBRARY.filter(
    (ex) => ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q) || ex.equipment.toLowerCase().includes(q),
  );
}
