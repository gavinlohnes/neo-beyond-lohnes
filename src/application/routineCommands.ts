import { db } from "../persistence/db";
import { logEvent, newId, nextSeq } from "./commands";
import { ROUTINE_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { logIntentEvent } from "./intentCommands";
import { parseRoutine, routineInputSchema, routineModifyInputSchema, type RoutineInput, type RoutineModifyInput } from "../persistence/routineValidation";
import type { DomainEvent } from "../domain/common/types";
import type { Routine, RoutineMoment } from "../domain/routines";
import type { SchedulePhase } from "../engine/scheduledContext";
import { byTimeThenSeq } from "./queries";

/**
 * ROUTINES-001. The Routine row is current state; every change writes one event in the same
 * transaction (same contract as intentCommands.ts). A tick is a ROUTINE_STEP_SET day event;
 * the latest one per step wins, so unticking is just another event. Nothing here counts days,
 * derives streaks or calls anything missed.
 */

function notFound(id: string) { return new Error(`ROUTINE_NOT_FOUND: no routine with id ${id}`); }

export async function createRoutine(input: RoutineInput): Promise<Routine> {
  return writeAtomically(ROUTINE_WRITE_TABLES, async () => {
    const parsed = routineInputSchema.parse(input);
    const now = new Date().toISOString();
    const routine: Routine = {
      id: newId(), title: parsed.title, moment: parsed.moment,
      steps: parsed.steps.map((text) => ({ id: newId(), text })),
      status: "ACTIVE", source: "USER", seq: await nextSeq(), createdAt: now, updatedAt: now,
    };
    await db.routines.add(routine);
    const correlationId = newId();
    await logIntentEvent("ROUTINE_CREATED", { commandId: correlationId, routineId: routine.id, title: routine.title, moment: routine.moment, steps: routine.steps }, "USER", correlationId, {});
    return routine;
  });
}

/** `expectedUpdatedAt` rejects an edit made from a stale screen. Kept step ids keep their ticks. */
export async function modifyRoutine(routineId: string, changes: RoutineModifyInput, expectedUpdatedAt?: string): Promise<Routine> {
  return writeAtomically(ROUTINE_WRITE_TABLES, async () => {
    const parsed = routineModifyInputSchema.parse(changes);
    const existing = await db.routines.get(routineId);
    if (!existing) throw notFound(routineId);
    if (expectedUpdatedAt && existing.updatedAt !== expectedUpdatedAt) throw new Error("ROUTINE_CHANGED: this routine changed elsewhere. Nothing was saved.");
    const known = new Set(existing.steps.map((s) => s.id));
    const steps = parsed.steps?.map((s) => ({ id: s.id && known.has(s.id) ? s.id : newId(), text: s.text }));
    const updated: Routine = {
      ...existing,
      ...(parsed.title !== undefined ? { title: parsed.title } : {}),
      ...(parsed.moment !== undefined ? { moment: parsed.moment } : {}),
      ...(steps ? { steps } : {}),
      updatedAt: new Date().toISOString(),
    };
    await db.routines.put(updated);
    const correlationId = newId();
    await logIntentEvent("ROUTINE_MODIFIED", { commandId: correlationId, routineId, before: { title: existing.title, moment: existing.moment, steps: existing.steps }, after: { title: updated.title, moment: updated.moment, steps: updated.steps } }, "USER", correlationId, {});
    return updated;
  });
}

/** Put away or bring back. History and past ticks stay. Returns false if already there. */
export async function setRoutineArchived(routineId: string, archived: boolean): Promise<boolean> {
  return writeAtomically(ROUTINE_WRITE_TABLES, async () => {
    const existing = await db.routines.get(routineId);
    if (!existing) throw notFound(routineId);
    const status = archived ? "ARCHIVED" : "ACTIVE";
    if (existing.status === status) return false;
    await db.routines.update(routineId, { status, updatedAt: new Date().toISOString() });
    const correlationId = newId();
    await logIntentEvent(archived ? "ROUTINE_ARCHIVED" : "ROUTINE_RESTORED", { commandId: correlationId, routineId }, "USER", correlationId, {});
    return true;
  });
}

/** Tick or untick one step on one lived day. A no-op when it's already in that state. */
export async function setRoutineStep(dayId: string, routineId: string, stepId: string, done: boolean): Promise<boolean> {
  return writeAtomically(ROUTINE_WRITE_TABLES, async () => {
    if (!(await db.beyondDays.get(dayId))) throw new Error(`DAY_NOT_FOUND: no day with id ${dayId}`);
    const routine = await db.routines.get(routineId);
    if (!routine) throw notFound(routineId);
    if (!routine.steps.some((s) => s.id === stepId)) throw new Error("ROUTINE_STEP_NOT_FOUND: that step is no longer in this routine.");
    if ((await getRoutineTicks(dayId)).has(stepKey(routineId, stepId)) === done) return false;
    const correlationId = newId();
    await logEvent(dayId, "ROUTINE_STEP_SET", { commandId: correlationId, routineId, stepId, done }, "USER", correlationId);
    return true;
  });
}

export const stepKey = (routineId: string, stepId: string) => `${routineId}:${stepId}`;

/** The steps ticked on this lived day (latest event per step wins). */
export async function getRoutineTicks(dayId: string): Promise<Set<string>> {
  const events = (await db.events.where("beyondDayId").equals(dayId).toArray())
    .filter((e) => e.type === "ROUTINE_STEP_SET")
    .sort((a, b) => byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq));
  const state = new Map<string, boolean>();
  for (const e of events) {
    const p = e.payload as { routineId?: unknown; stepId?: unknown; done?: unknown };
    if (typeof p.routineId === "string" && typeof p.stepId === "string" && typeof p.done === "boolean") state.set(stepKey(p.routineId, p.stepId), p.done);
  }
  return new Set([...state].filter(([, done]) => done).map(([key]) => key));
}

export async function getRoutines(): Promise<Routine[]> {
  return (await db.routines.toArray()).map(parseRoutine).filter((r): r is Routine => r !== null)
    .sort((a, b) => byTimeThenSeq(a.createdAt, a.seq, b.createdAt, b.seq));
}

export async function getRoutineHistory(routineId: string): Promise<DomainEvent[]> {
  const types = ["ROUTINE_CREATED", "ROUTINE_MODIFIED", "ROUTINE_ARCHIVED", "ROUTINE_RESTORED"];
  return (await db.events.where("type").anyOf(types).toArray())
    .filter((e) => (e.payload as { routineId?: unknown })?.routineId === routineId)
    .sort((a, b) => byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq));
}

/**
 * Which moment of the rotation it is now, from the same schedule phase TODAY already shows.
 * A day declared off is a day off; otherwise the shift phase decides. Returns null when no
 * moment applies: a work day's quiet stretch, or a day whose work context isn't declared yet.
 */
export function routineMomentFor(input: { phase: SchedulePhase | null; workContext: string | null | undefined; workStarted: boolean; workEnded: boolean; predictedPhase?: SchedulePhase | null | undefined }): RoutineMoment | null {
  if (input.workContext === "OFF") return "DAY_OFF";
  // UX-POLISH-001: before the work question is answered, follow this lived day's own scheduled shift
  // (the caller passes it, live). A scheduled day off has no prediction, so nothing shows.
  if (input.phase === null) {
    if (input.workContext === "WORK" || !input.predictedPhase || input.predictedPhase === "OFF") return null;
    return routineMomentFor({ ...input, phase: input.predictedPhase, predictedPhase: undefined });
  }
  // Review of #357 (M1, L1): follow TODAY's own rules. STARTED WORK only overrides the schedule
  // before the shift (TODAY's startedEarly); a forgotten END WORK can't hold "on shift" all morning.
  // An ended shift is "after shift" until the schedule's quiet stretch, same as an unrecorded end.
  if (input.workEnded) return input.phase === "OFF" ? null : "AFTER_SHIFT";
  switch (input.phase) {
    case "PRE_WORK": return input.workStarted ? "ON_SHIFT" : "BEFORE_SHIFT";
    case "SCHEDULED_SHIFT": return "ON_SHIFT";
    case "EXPECTED_POST_WORK": return "AFTER_SHIFT";
    // A work day's quiet stretch, or a day not yet declared: no moment rather than a guess.
    case "OFF": return null;
  }
}

/** Keeps the id (and today's tick) of any step whose words are unchanged; new or reworded lines are new steps. */
export function matchSteps(routine: Routine, texts: string[]): { id?: string; text: string }[] {
  const pool = [...routine.steps];
  return texts.map((text) => {
    const i = pool.findIndex((s) => s.text === text.trim());
    return i >= 0 ? pool.splice(i, 1)[0]! : { text };
  });
}
