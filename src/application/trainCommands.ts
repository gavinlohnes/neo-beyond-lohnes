import type { WriteReceipt } from "./writeReceipt";
import { db } from "../persistence/db";
import { emitAutomationEvent } from "./iftttAutomations";
import { deriveCapacity } from "../engine/capacity";
import { assertRedOverrideConfirmed } from "../engine/redOverride";
import { deriveRecoverySessionStatus } from "../engine/trainSuggestion";
import { logEvent } from "./commands";
import { WORKOUT_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { getLatestCheckIn } from "./queries";
import { compareSetOrder, SET_KINDS, type SetKind } from "../domain/workout/types";
import { getPerformedSets } from "./trainQueries";
import type { Capacity, ExerciseCueSetPayload, PerformedSetRaw } from "../domain/common/types";
import { EXERCISE_CUE_MAX_LENGTH } from "../domain/common/types";
import type {
  PerformedSet,
  SessionType,
  WorkoutSessionStatus,
  WorkoutTemplateId,
} from "../domain/workout/types";
import type { WorkoutSession } from "../domain/common/types";
import { assertLinkedFormStart } from "./trainingProgramme";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * WORKOUT-ATOMICITY-001 (owner approval 2026-10-13, issue #221): each
 * workout command's row (session or performed set) and its DomainEvent
 * commit together or roll back together — e.g. a session marked COMPLETED
 * (rotation advances, it reads rows) can no longer exist without its
 * WORKOUT_COMPLETED (Minimum Day and the event trail read events). The
 * shared mechanism and its table rules live in atomicWrite.ts.
 */
function writeWorkoutAtomically<T>(write: () => Promise<T>): Promise<T> {
  return writeAtomically(WORKOUT_WRITE_TABLES, write);
}

/**
 * Single source of truth for "what is current capacity" — never trust a
 * caller-supplied value. Reuses application/queries.ts's getLatestCheckIn
 * (recordedAt + seq ordering) rather than Dexie's .last() on a non-unique
 * beyondDayId index, which orders by primary key (a random UUID) among
 * same-day rows, not recorded chronology — see getLatestCheckIn's own doc
 * comment. Using a different ordering here than TRAIN's displayed capacity
 * (which already reads getLatestCheckIn) let command-layer RED-override
 * enforcement disagree with what the operator was shown.
 */
async function currentCapacity(beyondDayId: string): Promise<Capacity | null> {
  const checkIn = await getLatestCheckIn(beyondDayId);
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
 *
 * Stability Gate (Product Experience Sprint, Phase 0.2): previously had
 * no guard against an existing ACTIVE session for the same day, so two
 * rapid/racing calls could create two simultaneously-ACTIVE
 * WorkoutSession rows (the first orphaned forever). Now idempotent per
 * beyondDayId — if a session is already ACTIVE, that same session is
 * returned rather than creating (or silently discarding) another one.
 * The existing-session check happens before the RED-override gate,
 * since resuming an already-active session isn't "starting a new
 * STANDARD session" and shouldn't require re-confirming an override
 * that already applied when it was first started. A shared in-flight
 * promise (keyed by day, same pattern as ensureActiveDay) closes the
 * remaining read-then-write race for calls landing in the same tick.
 */
let startWorkoutInFlight: Promise<WorkoutSession> | null = null;

export async function startWorkout(
  beyondDayId: string,
  templateId: WorkoutTemplateId | null,
  sessionType: SessionType,
  options: { overrideConfirmed?: boolean; receipt?: WriteReceipt; programmeContext?: WorkoutSession["programmeContext"] } = {},
): Promise<WorkoutSession> {
  if (startWorkoutInFlight) return startWorkoutInFlight;

  const attempt = (async () => {
    const existingActive = await db.workoutSessions
      .filter((s) => s.status === "ACTIVE")
      .first();
    if (existingActive) return existingActive;

    if (sessionType === "STANDARD") {
      const capacity = await currentCapacity(beyondDayId);
      assertRedOverrideConfirmed(capacity, options.overrideConfirmed ?? false);
    }
    if (options.programmeContext) {
      if (sessionType !== "STANDARD") throw new Error(`${options.programmeContext.form}_FORM_INVALID: linked ${options.programmeContext.form} workouts use STANDARD execution with ${options.programmeContext.form} provenance.`);
      await assertLinkedFormStart(templateId ?? "", options.programmeContext);
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
      ...(options.programmeContext ? { programmeContext: structuredClone(options.programmeContext) } : {}),
    };
    await writeWorkoutAtomically(async () => {
      await db.workoutSessions.add(session);

      const correlationId = newId();
      await logEvent(
        beyondDayId,
        "WORKOUT_STARTED",
        { commandId: correlationId, sessionId: id, templateId: session.templateId, sessionType, ...(session.programmeContext ? { programmeContext: session.programmeContext } : {}) },
        "USER",
        correlationId,
      );
    });
    if (options.receipt) options.receipt.changed = true;
    return session;
  })();

  startWorkoutInFlight = attempt;
  try {
    return await attempt;
  } finally {
    startWorkoutInFlight = null;
  }
}

/**
 * GRAYSON-TRAIN-LOCKSCREEN-001 (Gavin, 2026-11-24: "Extend options"): a set or skip from the lock-screen notification
 * is written later, when BEYOND next runs, through these same commands. `at` is when he tapped, and `from` marks it so
 * he can tell. Every other caller passes neither and nothing changes for them.
 */
export interface SetSourceOptions { at?: string; from?: "LOCK_SCREEN" }

/** A tap time must be real, inside the workout (not before it started), and not in the future. */
function checkSetTime(at: string, sessionStartedAt: string): string {
  const t = Date.parse(at);
  if (!Number.isFinite(t)) throw new Error("SET_TIME_INVALID: that set has no real time.");
  if (t < Date.parse(sessionStartedAt) || t > Date.now() + 60_000) throw new Error("SET_TIME_OUTSIDE_WORKOUT: that set's time isn't inside this workout.");
  return new Date(t).toISOString();
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
  options: { setKind?: SetKind; repsInReserve?: number; dropOf?: string; durationSec?: number } & SetSourceOptions = {},
): Promise<void> {
  const { at, from, ...metadata } = options;
  // Drop 1.6a (field soak): an empty LOG tap used to save "0 lb x 0". A logged set has at least one rep
  // (a set not done is SKIP); weight may be 0 for bodyweight work.
  // GRAYSON-SET-TYPES-001: a timed set logs the time held; its reps may be 0.
  const timed = options.durationSec !== undefined;
  if (timed && (!Number.isInteger(options.durationSec) || options.durationSec! < 1 || options.durationSec! > 3600)) throw new Error("SET_TIME_INVALID: enter the time held, 1 second to 60 minutes.");
  if (!Number.isInteger(reps) || reps < (timed ? 0 : 1)) throw new Error("SET_REPS_REQUIRED: enter at least 1 rep, or SKIP the set.");
  if (!Number.isFinite(weight) || weight < 0) throw new Error("SET_WEIGHT_INVALID: weight must be 0 or more.");
  if (!Number.isInteger(setNumber) || setNumber < 1) throw new Error("SET_NUMBER_INVALID");
  if (metadata.setKind !== undefined && !SET_KINDS.includes(metadata.setKind)) throw new Error("SET_KIND_INVALID");
  if ((metadata.setKind === "DROP") !== (metadata.dropOf !== undefined)) throw new Error("SET_DROP_INVALID: a drop set follows the set above it.");
  // A failure set is a working set with nothing left: reps in reserve 0.
  if (metadata.setKind === "FAILURE") metadata.repsInReserve = 0;
  if (metadata.repsInReserve !== undefined && (!Number.isInteger(metadata.repsInReserve) || metadata.repsInReserve < 0 || metadata.repsInReserve > 10)) throw new Error("SET_EFFORT_INVALID: enter whole reps left from 0 to 10, or leave blank.");
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
    ...metadata,
    ...(from ? { from } : {}),
  };
  await writeWorkoutAtomically(async () => {
    const session = await db.workoutSessions.get(sessionId);
    if (!session || session.status !== "ACTIVE" || session.beyondDayId !== beyondDayId) throw new Error("WORKOUT_NOT_ACTIVE");
    if (at !== undefined) set.recordedAt = checkSetTime(at, session.startedAt);
    if (metadata.setKind === "DROP") {
      const live = await getPerformedSets(sessionId);
      const parent = live.find((s) => s.id === metadata.dropOf);
      if (!parent || parent.exerciseId !== exerciseId || parent.skipped || parent.setKind === "WARMUP") throw new Error("SET_DROP_INVALID: a drop set follows a logged set of the same exercise.");
    } else if (metadata.setKind !== "WARMUP") {
      const live = await getPerformedSets(sessionId);
      if (live.some((s) => s.exerciseId === exerciseId && s.setNumber === setNumber && s.setKind !== "WARMUP" && s.setKind !== "DROP")) throw new Error("SET_ALREADY_RECORDED");
    }
    const correlationId = newId();
    const eventId = await logEvent(beyondDayId, "SET_LOGGED", {
      commandId: correlationId, performedSetId: set.id, sessionId, exerciseId, setNumber, weight, reps,
      ...(substitutedName ? { substitutedName } : {}), ...metadata, ...(from ? { from } : {}),
    }, "USER", correlationId, undefined, at !== undefined ? set.recordedAt : undefined);
    const event = await db.events.get(eventId);
    await db.performedSets.add({ ...set, seq: event!.seq } as unknown as PerformedSetRaw);
  });
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
  options: SetSourceOptions = {},
): Promise<void> {
  const { at, from } = options;
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
    ...(from ? { from } : {}),
  };
  await writeWorkoutAtomically(async () => {
    const session = await db.workoutSessions.get(sessionId);
    if (!session || session.status !== "ACTIVE" || session.beyondDayId !== beyondDayId) throw new Error("WORKOUT_NOT_ACTIVE");
    if (at !== undefined) set.recordedAt = checkSetTime(at, session.startedAt);
    const live = await getPerformedSets(sessionId);
    if (live.some((s) => s.exerciseId === exerciseId && s.setNumber === setNumber && s.setKind !== "WARMUP" && s.setKind !== "DROP")) throw new Error("SET_ALREADY_RECORDED");
    const correlationId = newId();
    const eventId = await logEvent(beyondDayId, "SET_SKIPPED", { commandId: correlationId, performedSetId: set.id, sessionId, exerciseId, setNumber, ...(from ? { from } : {}) },
      "USER", correlationId, undefined, at !== undefined ? set.recordedAt : undefined);
    const event = await db.events.get(eventId);
    await db.performedSets.add({ ...set, seq: event!.seq } as unknown as PerformedSetRaw);
  });
}

/**
 * TRAIN-WAVE-A (Set Commit Choreography, 2026-09-02): undoes only the
 * single most-recently-logged-or-skipped action in this session (LIFO,
 * not arbitrary history editing — "easy commit requires easy recovery,"
 * TRAIN Experience Law #3, without turning this into a full edit-history
 * UI). Never mutates or deletes the raw performedSets row — see
 * SetUndonePayload's doc comment for why. A no-op (not an error) when
 * there is nothing left to undo, since this is offered as a UI
 * affordance only when something exists to undo, never called
 * defensively "just in case."
 */
export async function undoLastSet(beyondDayId: string, sessionId: string, /** ALFRED-ACT-001: only if the last set is still this one. */ expectedSetId?: string): Promise<boolean> {
  return writeWorkoutAtomically(async () => {
    const visible = await getPerformedSets(sessionId);
    const last = [...visible].sort(compareSetOrder).at(-1);
    if (!last || (expectedSetId !== undefined && last.id !== expectedSetId)) return false;

    const correlationId = newId();
    await logEvent(
      beyondDayId,
      "SET_UNDONE",
      { commandId: correlationId, sessionId, exerciseId: last.exerciseId, setNumber: last.setNumber, performedSetId: last.id },
      "USER",
      correlationId,
    );
    return true;
  });
}

/**
 * TRAIN-WAVE-A (Persistent Rest, 2026-09-02): starts (or restarts) rest
 * as an absolute end time, persisted on the session so it survives a
 * reload/backgrounding — see WorkoutSession.activeRestEndsAt's doc
 * comment. No DomainEvent: rest timing is ephemeral session-support
 * state, not a fact worth its own audit trail (same treatment
 * focusedExerciseId/UI-only state already gets — DONOR-001 explicitly
 * rejects "timer clutter" as its own capability, not the underlying
 * timing itself becoming history).
 */
export async function startRest(sessionId: string, durationSeconds: number, /** LOCKSCREEN-001: rest from a lock-screen tap. */ from?: string): Promise<void> {
  const start = from !== undefined && Number.isFinite(Date.parse(from)) ? Date.parse(from) : Date.now();
  const activeRestEndsAt = new Date(start + durationSeconds * 1000).toISOString();
  await db.workoutSessions.update(sessionId, { activeRestEndsAt });
}

/**
 * ± adjustment: extends or shortens the remaining rest by deltaSeconds
 * (negative to shorten). Clamped so the new end time never falls before
 * "now" — a negative remaining time is meaningless and would just read as
 * a confusing already-elapsed countdown. A no-op if there is no active
 * rest to adjust.
 */
export async function adjustRest(sessionId: string, deltaSeconds: number): Promise<void> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session?.activeRestEndsAt) return;
  const adjustedMs = new Date(session.activeRestEndsAt).getTime() + deltaSeconds * 1000;
  const activeRestEndsAt = new Date(Math.max(Date.now(), adjustedMs)).toISOString();
  await db.workoutSessions.update(sessionId, { activeRestEndsAt });
}

/** Ends rest immediately, whether by explicit skip or because it naturally completed. */
export async function skipRest(sessionId: string): Promise<void> {
  await db.workoutSessions
    .where(":id")
    .equals(sessionId)
    .modify((session) => {
      delete session.activeRestEndsAt;
    });
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
  durationMinutes?: number,
): Promise<void> {
  await writeWorkoutAtomically(async () => {
    const existing = await db.workoutSessions.get(sessionId);
    await db.workoutSessions
      .where(":id")
      .equals(sessionId)
      .modify((session) => {
        session.status = status;
        session.endedAt = new Date().toISOString();
        delete session.activeRestEndsAt;
      });
    const correlationId = newId();
    await logEvent(
      beyondDayId,
      "WORKOUT_COMPLETED",
      {
        commandId: correlationId,
        sessionId,
        status,
        sessionType,
        ...(existing?.programmeContext ? { programmeContext: existing.programmeContext } : {}),
        ...(durationMinutes !== undefined ? { durationMinutes } : {}),
      },
      "USER",
      correlationId,
    );
  });
  emitAutomationEvent("workout_finished", sessionType);
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
  durationMinutes?: number,
): Promise<void> {
  await writeWorkoutAtomically(async () => {
    await db.workoutSessions
      .where(":id")
      .equals(sessionId)
      .modify((session) => {
        session.status = "ABANDONED" as WorkoutSessionStatus;
        session.endedAt = new Date().toISOString();
        delete session.activeRestEndsAt;
      });
    const correlationId = newId();
    await logEvent(
      beyondDayId,
      "WORKOUT_ABANDONED",
      {
        commandId: correlationId,
        sessionId,
        status: "ABANDONED",
        sessionType,
        ...(durationMinutes !== undefined ? { durationMinutes } : {}),
      },
      "USER",
      correlationId,
    );
  });
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
    await abandonWorkout(beyondDayId, sessionId, "RECOVERY", durationMinutes);
    return;
  }
  await completeWorkout(beyondDayId, sessionId, "RECOVERY", status, durationMinutes);
}

/**
 * GYM-002 (owner sign-off 2026-10-04): saves Gavin's cue for one lift as an
 * EXERCISE_CUE_SET event under the given day. Trims it; an empty cue clears
 * the lift's cue. Rejects a cue over EXERCISE_CUE_MAX_LENGTH characters.
 */
export async function setExerciseCue(beyondDayId: string, exerciseId: string, cue: string): Promise<string> {
  const trimmed = cue.trim();
  if (!exerciseId) throw new Error("INVALID_EXERCISE: a cue needs an exercise.");
  if (trimmed.length > EXERCISE_CUE_MAX_LENGTH) {
    throw new Error(`CUE_TOO_LONG: Keep a cue to ${EXERCISE_CUE_MAX_LENGTH} characters.`);
  }
  const commandId = newId();
  const payload: ExerciseCueSetPayload = { commandId, exerciseId, cue: trimmed };
  return logEvent(beyondDayId, "EXERCISE_CUE_SET", payload, "USER", commandId);
}
