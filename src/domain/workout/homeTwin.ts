// Domain layer must not import React, Dexie, or UI code.
import { rankSwapSuggestions, type SwapCandidate } from "./workoutChanges";
import type { ExercisePrescription } from "./types";

/**
 * GRAYSON-HOME-STRETCH-001 slice C (Gavin, 2026-11-26: "every gym routine gets a home twin"): a bodyweight twin of a
 * gym routine, lift by lift. Each lift gets the best home move for the same muscle group, ranked by T2's swap ranker
 * (so a home swap and a mid-workout swap agree). Sets carry over; rep ranges come from the home move. A muscle with no
 * home move is reported as a gap, never guessed. Pure: the caller supplies the candidates and his history.
 */
export interface TwinRow {
  from: { exerciseId: string; name: string; sets: number };
  /** The home move picked, or null for a gap. */
  to: ExercisePrescription | null;
  muscleGroup: string | null;
}

export interface HomeTwinInput {
  exercises: readonly ExercisePrescription[];
  /** Muscle group of each gym lift (null when unknown). */
  groupOf: (exerciseId: string) => string | null;
  /** The home moves he could use: home-* ids only, since a HOME form holds only bodyweight-specific moves. */
  homeMoves: readonly SwapCandidate[];
  recentEquipment?: ReadonlySet<string>;
  lastByExercise?: ReadonlyMap<string, { weight: number; reps: number; at: string }>;
}

const prescription = (c: SwapCandidate, sets: number): ExercisePrescription =>
  ({ exerciseId: c.exerciseId, name: c.name, sets, repRangeLow: c.repRangeLow, repRangeHigh: c.repRangeHigh, incrementLbs: 0 });

/**
 * One row per gym lift. Each picks the best home move for its muscle group not yet used in the twin; when every home
 * move for that group is already in the twin, it reuses the best one (the review shows that, and he can change it).
 */
export function buildHomeTwin(input: HomeTwinInput): TwinRow[] {
  const used = new Set<string>();
  return input.exercises.map((ex) => {
    const from = { exerciseId: ex.exerciseId, name: ex.name, sets: ex.sets };
    const muscleGroup = input.groupOf(ex.exerciseId);
    if (!muscleGroup) return { from, to: null, muscleGroup: null };
    const rank = (exclude: ReadonlySet<string>) => rankSwapSuggestions({
      muscleGroup, candidates: input.homeMoves, exclude, recentEquipment: input.recentEquipment ?? new Set(),
      lastByExercise: input.lastByExercise ?? new Map(), limit: 1,
    })[0];
    const pick = rank(used) ?? rank(new Set());
    if (!pick) return { from, to: null, muscleGroup };
    used.add(pick.exerciseId);
    return { from, to: prescription(pick, ex.sets), muscleGroup };
  });
}

/**
 * The twin as a routine: the picked moves in order. A move picked for more than one lift appears once, with the sets
 * added together. Gaps and dropped rows are left out.
 */
export function twinExercises(rows: readonly TwinRow[]): ExercisePrescription[] {
  const out: ExercisePrescription[] = [];
  for (const row of rows) {
    if (!row.to) continue;
    const same = out.find((e) => e.exerciseId === row.to!.exerciseId);
    if (same) same.sets = Math.min(10, same.sets + row.to.sets);
    else out.push({ ...row.to });
  }
  return out;
}

/** "No home move for forearms yet", or for an unknown lift, "No home move for Cable Woodchop yet". */
export function gapLine(row: TwinRow): string {
  return `No home move for ${row.muscleGroup ? row.muscleGroup.toLowerCase() : row.from.name} yet`;
}
