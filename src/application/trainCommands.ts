import { db } from "../persistence/db";
import { deriveCapacity } from "../engine/capacity";
import { assertRedOverrideConfirmed } from "../engine/redOverride";
import { deriveRecoverySessionStatus } from "../engine/trainSuggestion";
import { logEvent } from "./commands";
import type { Capacity, PerformedSetRaw } from "../domain/common/types";
import type {
  PerformedSet,
  SessionType,
  WorkoutSessionStatus,
  WorkoutTemplateId,
} from "../domain/workout/types";
import type { WorkoutSession } from "../domain/common/types";

function newId(): string {
  return crypto.randomUUID();
}

/** Single source of truth for "what is current capacity" — never trust a caller-supplied value. */
async function currentCapacity(beyondDayId: string): Promise<Capacity | null> {
  const checkIn = await db.checkIns.where("beyondDayId").equals(beyondDayId).last();
  return checkIn ? deriveCapacity(checkIn).capacity : null;
}

/**
 * Workout/variant selection is Engine-suggested, user-overridable (TRAIN
 * Design Decisions, 2026-08-19). Starting a STANDARD session while
 * capacity is RED is an override past RED-capacity guidance and requires
 * the shared confirm-every-time mechanism (CP5, engine/redOverride.ts) —
 * enforced here at the command layer, not just in the UI, so it can't be
 * silently bypassed by a UI bug. REDUCED and RECOVERY are always
 * RED-appropriate and never require this confirmation.
 */
export async function startWorkout(
  beyondDayId: string,
  templateId: WorkoutTemplateId | null,
  sessionType: SessionType,
  options: { overrideConfirmed?: boolean } = {},
): Promise<WorkoutSession> {
  if (sessionType === "STANDARD") {
    const capacity = await currentCapacity(beyondDayId);
    assertRedOverrideConfirmed(capacity, options.overrideConfirmed ?? false);
  }

  const id = newId();
  const session: WorkoutSession = {
    id,
    schemaVersion: 1,
    beyondDayId,
    templateId: templateId ?? "",
    sessionType,
    status: "ACTIVE",
    startedAt: new Date().toISOString(),
  };
  await db.workoutSessions.add(session);

  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "WORKOUT_STARTED",
    { commandId: correlationId, sessionId: id, templateId: session.templateId, sessionType },
    "USER",
    correlationId,
  );
  return session;
}

/**
 * Records a logged set as history (skipped:false). setNumber is 1-indexed
 * within the exercise. substitutedName is free-text exercise substitution
 * ("if a machine's unavailable") — exerciseId still identifies the
 * originally prescribed slot.
 */
export async function logSet(
  beyondDayId: string,
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
  substitutedName?: string,
): Promise<void> {
  const set: PerformedSet = {
    id: newId(),
    beyondDayId,
    sessionId,
    exerciseId,
    setNumber,
    weight,
    reps,
    skipped: false,
    recordedAt: new Date().toISOString(),
    ...(substitutedName ? { substitutedName } : {}),
  };
  await db.performedSets.add(set as unknown as PerformedSetRaw);

  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "SET_LOGGED",
    { commandId: correlationId, sessionId, exerciseId, setNumber, weight, reps, ...(substitutedName ? { substitutedName } : {}) },
    "USER",
    correlationId,
  );
}

/**
 * Records a skipped set. Skipped sets are stored as history but excluded
 * entirely from progression evaluation — never recorded as a 0 (Decision
 * Register + tonight's decision #3). weight/reps are not meaningful here.
 */
export async function skipSet(
  beyondDayId: string,
  sessionId: string,
  exerciseId: string,
  setNumber: number,
): Promise<void> {
  const set: PerformedSet = {
    id: newId(),
    beyondDayId,
    sessionId,
    exerciseId,
    setNumber,
    weight: 0,
    reps: 0,
    skipped: true,
    recordedAt: new Date().toISOString(),
  };
  await db.performedSets.add(set as unknown as PerformedSetRaw);

  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "SET_SKIPPED",
    { commandId: correlationId, sessionId, exerciseId, setNumber },
    "USER",
    correlationId,
  );
}

/**
 * Ends a STANDARD/REDUCED session as COMPLETED or PARTIAL. Only
 * WORKOUT_COMPLETED (status COMPLETED for STANDARD; COMPLETED or PARTIAL
 * for REDUCED) advances the A/B/C rotation — evaluated by
 * queries.suggestTemplateForNextWorkout, not here; this command only
 * records what happened.
 */
export async function completeWorkout(
  beyondDayId: string,
  sessionId: string,
  sessionType: SessionType,
  status: "COMPLETED" | "PARTIAL",
): Promise<void> {
  await db.workoutSessions.update(sessionId, { status, endedAt: new Date().toISOString() });
  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "WORKOUT_COMPLETED",
    { commandId: correlationId, sessionId, status, sessionType },
    "USER",
    correlationId,
  );
}

/**
 * An abandoned workout does not advance the A/B/C rotation regardless of
 * session type (tonight's decision #4; confirmed for REDUCED specifically
 * by the 2026-08-19 authority reconciliation).
 */
export async function abandonWorkout(
  beyondDayId: string,
  sessionId: string,
  sessionType: SessionType,
): Promise<void> {
  await db.workoutSessions.update(sessionId, {
    status: "ABANDONED" as WorkoutSessionStatus,
    endedAt: new Date().toISOString(),
  });
  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "WORKOUT_ABANDONED",
    { commandId: correlationId, sessionId, status: "ABANDONED", sessionType },
    "USER",
    correlationId,
  );
}

/**
 * RECOVERY sessions complete by duration only (Canonical Spec TRAIN):
 * >=10min COMPLETED, 1-9min PARTIAL, 0min is an explicit zero-movement
 * ABANDONED end. Never advances rotation, never generates strength
 * progression, regardless of outcome.
 */
export async function completeRecoverySession(
  beyondDayId: string,
  sessionId: string,
  durationMinutes: number,
): Promise<void> {
  const status = deriveRecoverySessionStatus(durationMinutes);
  if (status === "ABANDONED") {
    await abandonWorkout(beyondDayId, sessionId, "RECOVERY");
    return;
  }
  await completeWorkout(beyondDayId, sessionId, "RECOVERY", status);
}
