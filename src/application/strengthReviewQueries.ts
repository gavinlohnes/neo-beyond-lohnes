import { db } from "../persistence/db";
import { EXERCISE_LIBRARY, type MuscleGroup } from "../domain/workout/exerciseLibrary";
import type { PerformedSet } from "../domain/workout/types";
import { projectStrengthReview } from "../engine/strengthReview";
import { getCustomExercises, getExerciseNames } from "./exerciseLibraryQueries";
import { getUndoneSetIds } from "./trainQueries";

/** Canonical read: finished strength sessions and effective sets only; no persisted rollup. */
export async function getStrengthReview(now = new Date()) {
  return db.transaction("r", db.tables, async () => {
    const [sessions, rawSets, undone, custom, names] = await Promise.all([
      db.workoutSessions.toArray(), db.performedSets.toArray(), getUndoneSetIds(),
      getCustomExercises({ includeArchived: true }), getExerciseNames(),
    ]);
    const finished = new Map(sessions.filter((session) =>
      (session.status === "COMPLETED" || session.status === "PARTIAL") &&
      (session.sessionType === "STANDARD" || session.sessionType === "REDUCED"),
    ).map((session) => [session.id, session]));
    const libraryMuscles = new Map(EXERCISE_LIBRARY.map((exercise) => [exercise.id.replace(/^lib-/, ""), exercise.muscleGroup]));
    const customMuscles = new Map(custom.map((exercise) => [exercise.id, exercise.muscleGroup]));
    const muscle = (exerciseId: string): MuscleGroup | undefined => customMuscles.get(exerciseId) ?? libraryMuscles.get(exerciseId);
    const observations = (rawSets as unknown as PerformedSet[]).flatMap((set) => {
      const session = finished.get(set.sessionId);
      if (!session || undone.has(set.id) || set.skipped || set.substitutedName || set.reps <= 0 || set.weight <= 0) return [];
      const muscleGroup = muscle(set.exerciseId);
      return [{ sessionId: session.id, exerciseId: set.exerciseId, at: session.endedAt ?? session.startedAt, weight: set.weight, reps: set.reps, ...(muscleGroup ? { muscleGroup } : {}) }];
    });
    return { ...projectStrengthReview(observations, now), names };
  });
}

export type StrengthReviewData = Awaited<ReturnType<typeof getStrengthReview>>;
