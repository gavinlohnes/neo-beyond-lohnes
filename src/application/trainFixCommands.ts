import { db } from "../persistence/db";
import { writeAtomically, WORKOUT_WRITE_TABLES } from "./atomicWrite";
import { logEvent } from "./commands";
import { getSetFixEvents } from "./trainQueries";
import type {
  PerformedSetRaw,
  SetAddedPayload,
  SetCorrectedPayload,
  SetFixUndonePayload,
  SetFixValues,
  SetRemovedPayload,
  WorkoutSession,
} from "../domain/common/types";
import type { PerformedSet } from "../domain/workout/types";
import { findSetFix, newestStandingFix, projectSetFixes } from "../domain/workout/setFixes";

/**
 * GRAYSON-TRAIN-EDIT-001 (Gavin, 2026-11-24): fix any logged set, in a live or a past workout. Append-only: a fix
 * writes an event (and, for a correction or an add, a new performedSets row); no stored row is edited or deleted.
 * Every fix lands on the workout's own lived day. A set fix never changes the session's status, length, the A/B/C
 * sequence or which workout comes next (those are E1b). Refusals are "CODE: plain sentence".
 */
const newId = () => crypto.randomUUID();
const write = <T>(fn: () => Promise<T>) => writeAtomically(WORKOUT_WRITE_TABLES, fn);
const HISTORY_STATUSES = new Set(["COMPLETED", "PARTIAL"]);

export interface SetFixInput {
  weight: number;
  reps: number;
  setKind?: "WORKING" | "WARMUP";
  /** Blank (undefined) clears it. */
  repsInReserve?: number;
}

/** logSet's value rules (trainCommands.ts), with plain messages. */
function validate(input: SetFixInput): void {
  if (!Number.isFinite(input.weight) || input.weight < 0) throw new Error("SET_WEIGHT_INVALID: Weight must be 0 or more.");
  if (!Number.isInteger(input.reps) || input.reps < 1) throw new Error("SET_REPS_REQUIRED: Enter at least 1 rep, or remove the set.");
  if (input.setKind !== undefined && input.setKind !== "WORKING" && input.setKind !== "WARMUP") throw new Error("SET_KIND_INVALID: Choose warm-up or working.");
  if (input.repsInReserve !== undefined && (!Number.isInteger(input.repsInReserve) || input.repsInReserve < 0 || input.repsInReserve > 10)) {
    throw new Error("SET_EFFORT_INVALID: Enter whole reps left from 0 to 10, or leave it blank.");
  }
}

const valuesOf = (set: PerformedSet): SetFixValues => ({
  weight: set.weight, reps: set.reps, skipped: set.skipped,
  ...(set.setKind ? { setKind: set.setKind } : {}),
  ...(set.repsInReserve !== undefined ? { repsInReserve: set.repsInReserve } : {}),
});
const sameValues = (a: SetFixValues, b: SetFixValues) =>
  a.weight === b.weight && a.reps === b.reps && a.skipped === b.skipped && (a.setKind ?? "WORKING") === (b.setKind ?? "WORKING") && a.repsInReserve === b.repsInReserve;

interface Context { session: WorkoutSession; set: PerformedSet; effective: PerformedSet[] }

async function load(performedSetId: string): Promise<Context> {
  const set = (await db.performedSets.get(performedSetId)) as unknown as PerformedSet | undefined;
  if (!set) throw new Error("SET_NOT_FOUND: That set isn't in your workout any more.");
  const session = await db.workoutSessions.get(set.sessionId);
  if (!session) throw new Error("SET_NOT_FOUND: That set's workout isn't saved any more.");
  const projection = projectSetFixes(await getSetFixEvents());
  if (projection.retractedSetIds.has(set.id)) {
    if (projection.removed.has(set.id)) throw new Error("SET_REMOVED: That set was removed. Put it back first to fix it.");
    throw new Error("SET_STALE: That set was already changed. Reopen it to fix the latest.");
  }
  if (session.status === "ABANDONED") throw new Error("SET_SESSION_CLOSED: Sets in a stopped workout can't be fixed here.");
  const rows = (await db.performedSets.where("sessionId").equals(session.id).toArray()) as unknown as PerformedSet[];
  return { session, set, effective: rows.filter((r) => !projection.retractedSetIds.has(r.id)) };
}

function assertUniqueWorking(effective: readonly PerformedSet[], exerciseId: string, setNumber: number, setKind: "WORKING" | "WARMUP" | undefined, exceptId?: string) {
  if (setKind === "WARMUP") return;
  if (effective.some((s) => s.id !== exceptId && s.exerciseId === exerciseId && s.setNumber === setNumber && s.setKind !== "WARMUP")) {
    throw new Error("SET_ALREADY_RECORDED: There's already a working set with that number. Mark this one as a warm-up, or remove the other.");
  }
}

export interface SetFixResult { fixEventId: string; performedSetId: string }

/** Corrects a set (or fills in a skipped one): a new row with the new values; the old one is retracted. */
export async function correctSet(performedSetId: string, input: SetFixInput): Promise<SetFixResult> {
  validate(input);
  return write(async () => {
    const { session, set, effective } = await load(performedSetId);
    const before = valuesOf(set);
    const after: SetFixValues = {
      weight: input.weight, reps: input.reps, skipped: false,
      ...(input.setKind ? { setKind: input.setKind } : set.setKind ? { setKind: set.setKind } : {}),
      ...(input.repsInReserve !== undefined ? { repsInReserve: input.repsInReserve } : {}),
    };
    if (sameValues(before, after)) throw new Error("SET_NO_OP: Nothing changed.");
    assertUniqueWorking(effective, set.exerciseId, set.setNumber, after.setKind, set.id);
    const newRow: PerformedSet = {
      id: newId(), beyondDayId: session.beyondDayId, sessionId: set.sessionId, exerciseId: set.exerciseId, setNumber: set.setNumber,
      weight: after.weight, reps: after.reps, skipped: false, recordedAt: set.recordedAt,
      ...(set.substitutedName ? { substitutedName: set.substitutedName } : {}),
      ...(after.setKind ? { setKind: after.setKind } : {}),
      ...(after.repsInReserve !== undefined ? { repsInReserve: after.repsInReserve } : {}),
      ...(set.seq !== undefined ? { seq: set.seq } : {}),
      // GRAYSON-TRAIN-LOCKSCREEN-001: a set from the lock screen keeps saying so after a fix.
      ...(set.from ? { from: set.from } : {}),
      correctsSetId: set.id,
    };
    const commandId = newId();
    const payload: SetCorrectedPayload = { commandId, sessionId: set.sessionId, exerciseId: set.exerciseId, setNumber: set.setNumber, replacesSetId: set.id, newPerformedSetId: newRow.id, before, after };
    const fixEventId = await logEvent(session.beyondDayId, "SET_CORRECTED", payload, "USER", commandId);
    await db.performedSets.add(newRow as unknown as PerformedSetRaw);
    return { fixEventId, performedSetId: newRow.id };
  });
}

/** Removes a set. It stays stored, retracted, and can be put back. */
export async function removeSet(performedSetId: string): Promise<SetFixResult> {
  return write(async () => {
    const { session, set } = await load(performedSetId);
    const commandId = newId();
    const payload: SetRemovedPayload = { commandId, sessionId: set.sessionId, exerciseId: set.exerciseId, setNumber: set.setNumber, performedSetId: set.id };
    const fixEventId = await logEvent(session.beyondDayId, "SET_REMOVED", payload, "USER", commandId);
    return { fixEventId, performedSetId: set.id };
  });
}

/**
 * Adds a set he forgot to a finished (COMPLETED or PARTIAL) session: the next free set number for that exercise, and
 * a time just after that exercise's last set, always inside the session's start and end.
 */
export async function addSetToSession(sessionId: string, exerciseId: string, input: SetFixInput): Promise<SetFixResult> {
  validate(input);
  return write(async () => {
    const session = await db.workoutSessions.get(sessionId);
    if (!session) throw new Error("SET_NOT_FOUND: That workout isn't saved any more.");
    if (!HISTORY_STATUSES.has(session.status)) throw new Error("SET_SESSION_NOT_FINISHED: Add sets to a finished workout. During a workout, log them as usual.");
    const projection = projectSetFixes(await getSetFixEvents());
    const rows = (await db.performedSets.where("sessionId").equals(sessionId).toArray()) as unknown as PerformedSet[];
    const effective = rows.filter((r) => !projection.retractedSetIds.has(r.id));
    const forExercise = effective.filter((s) => s.exerciseId === exerciseId);
    const setNumber = Math.max(0, ...forExercise.map((s) => s.setNumber)) + 1;
    assertUniqueWorking(effective, exerciseId, setNumber, input.setKind);
    const start = Date.parse(session.startedAt);
    const end = session.endedAt ? Date.parse(session.endedAt) : Number.POSITIVE_INFINITY;
    const last = forExercise.reduce((latest, s) => Math.max(latest, Date.parse(s.recordedAt)), start);
    const at = new Date(Math.min(Math.max(start, last + 1000), end)).toISOString();
    const substitutedName = [...forExercise].reverse().find((s) => s.substitutedName)?.substitutedName;
    const row: PerformedSet = {
      id: newId(), beyondDayId: session.beyondDayId, sessionId, exerciseId, setNumber, weight: input.weight, reps: input.reps, skipped: false, recordedAt: at,
      ...(substitutedName ? { substitutedName } : {}),
      ...(input.setKind ? { setKind: input.setKind } : {}),
      ...(input.repsInReserve !== undefined ? { repsInReserve: input.repsInReserve } : {}),
    };
    const commandId = newId();
    const payload: SetAddedPayload = {
      commandId, sessionId, exerciseId, setNumber, performedSetId: row.id, weight: row.weight, reps: row.reps,
      ...(row.setKind ? { setKind: row.setKind } : {}), ...(row.repsInReserve !== undefined ? { repsInReserve: row.repsInReserve } : {}),
    };
    const fixEventId = await logEvent(session.beyondDayId, "SET_ADDED", payload, "USER", commandId);
    const event = await db.events.get(fixEventId);
    await db.performedSets.add({ ...row, seq: event!.seq } as unknown as PerformedSetRaw);
    return { fixEventId, performedSetId: row.id };
  });
}

/** Undo / Put it back: cancels one fix, only the newest standing one on its set. */
export async function undoSetFix(fixEventId: string): Promise<void> {
  await write(async () => {
    const projection = projectSetFixes(await getSetFixEvents());
    const found = findSetFix(projection, fixEventId);
    if (!found) throw new Error("SET_FIX_NOT_FOUND: There's nothing to undo.");
    if (found.entry.undone) throw new Error("SET_FIX_ALREADY_UNDONE: That fix is already undone.");
    const newest = newestStandingFix(projection, found.entry.performedSetId);
    if (newest?.eventId !== fixEventId) throw new Error("SET_STALE: That set has changed since. Undo the newest fix first.");
    const event = await db.events.get(fixEventId);
    if (!event?.beyondDayId) throw new Error("SET_FIX_NOT_FOUND: There's nothing to undo.");
    const commandId = newId();
    const payload: SetFixUndonePayload = { commandId, fixEventId };
    await logEvent(event.beyondDayId, "SET_FIX_UNDONE", payload, "USER", commandId, fixEventId);
  });
}
