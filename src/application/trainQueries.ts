import { db } from "../persistence/db";
import { doesSessionAdvanceRotation, suggestNextTemplate } from "../engine/trainSuggestion";
import { evaluateProgression, type ProgressionSuggestion } from "../engine/progression";
import { getPrescription } from "../domain/workout/types";
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

/**
 * Advisory-only progression suggestion (Decision Register TRAIN, locked)
 * for one exercise within a specific (templateId, sessionType) context —
 * scoped this way because the same exercise can have a different
 * prescribed set count depending on which template it appears in (e.g.
 * Triceps Pressdown is 2 sets in A but 3 sets in C), so history from one
 * context should never be compared against another's requirements.
 * RECOVERY is excluded at the type level — it never generates strength
 * progression, per the Canonical Spec.
 */
export async function getProgressionSuggestion(
  templateId: WorkoutTemplateId,
  sessionType: "STANDARD" | "REDUCED",
  exerciseId: string,
): Promise<ProgressionSuggestion> {
  const prescription = getPrescription(templateId, sessionType, exerciseId);
  if (!prescription) {
    return { recommendation: "NO_HISTORY", reason: "Unknown exercise for this template/variant." };
  }

  const sessions = (await db.workoutSessions.toArray())
    .filter((s) => s.templateId === templateId && s.sessionType === sessionType && s.status !== "ACTIVE")
    .sort((a, b) => (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt));

  for (let i = sessions.length - 1; i >= 0; i--) {
    const sets = (await getPerformedSets(sessions[i]!.id)).filter((s) => s.exerciseId === exerciseId);
    if (sets.length > 0) {
      return evaluateProgression(prescription, sets);
    }
  }
  return { recommendation: "NO_HISTORY", reason: "No prior performance recorded for this exercise in this context yet." };
}
