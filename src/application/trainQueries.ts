import { db } from "../persistence/db";
import { doesSessionAdvanceRotation, suggestNextTemplate } from "../engine/trainSuggestion";
import type { PerformedSet, SessionType, WorkoutSessionStatus, WorkoutTemplateId } from "../domain/workout/types";
import type { WorkoutSession } from "../domain/common/types";

/** For resuming an in-progress session across refresh/reopen. */
export async function getActiveWorkoutSession(beyondDayId: string): Promise<WorkoutSession | undefined> {
  return db.workoutSessions
    .where("beyondDayId")
    .equals(beyondDayId)
    .filter((s) => s.status === "ACTIVE")
    .last();
}

/**
 * Workout selection (A/B/C) is Engine-suggested from the last
 * rotation-advancing session, across all history (not scoped to today) —
 * rotation "does not reset by calendar week" and persists across
 * BeyondDays.
 */
export async function suggestTemplateForNextWorkout(): Promise<WorkoutTemplateId> {
  const sessions = await db.workoutSessions.toArray();
  const advancing = sessions
    .filter((s) => doesSessionAdvanceRotation(s.sessionType as SessionType, s.status as WorkoutSessionStatus))
    .sort((a, b) => (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt));
  const last = advancing.at(-1);
  return suggestNextTemplate(last ? (last.templateId as WorkoutTemplateId) : null);
}

export async function getPerformedSets(sessionId: string): Promise<PerformedSet[]> {
  const sets = await db.performedSets.where("sessionId").equals(sessionId).toArray();
  return sets as unknown as PerformedSet[];
}

export async function hasLoggedAnySet(sessionId: string): Promise<boolean> {
  const sets = await getPerformedSets(sessionId);
  return sets.length > 0;
}
