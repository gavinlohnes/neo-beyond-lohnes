import { db } from "../persistence/db";
import { doesSessionAdvanceRotation, suggestNextTemplate } from "../engine/trainSuggestion";
import type { PerformedSet, SessionType, WorkoutSessionStatus, WorkoutTemplateId } from "../domain/workout/types";
import type { WorkoutSession } from "../domain/common/types";

/**
 * For resuming an in-progress session across refresh/reopen. Only one
 * session should ever be ACTIVE at a time in normal use, but sorted by
 * startedAt rather than relying on Dexie's .last() (which orders by
 * primary key, not time) for defense in depth if that invariant is ever
 * violated.
 */
export async function getActiveWorkoutSession(beyondDayId: string): Promise<WorkoutSession | undefined> {
  const sessions = await db.workoutSessions.where("beyondDayId").equals(beyondDayId).toArray();
  return sessions
    .filter((s) => s.status === "ACTIVE")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .at(-1);
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
