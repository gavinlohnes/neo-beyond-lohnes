import type { ScheduleException, ScheduleExceptionReason } from "../domain/scheduleExceptions";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { db } from "../persistence/db";
import { writeAtomically } from "./atomicWrite";
const newId = () => crypto.randomUUID();
import { getSchedulePattern } from "./queries";

/**
 * SCHEDULE-EXCEPTIONS-001 (Gavin, 2026-11-13; owner-approved Protected persistence): confirm, change and cancel future
 * exceptions to the standing rotation. Every write is a separate, operator-confirmed command (the UI previews first);
 * What-If, Alfred, calendars and patterns never call these. Rules:
 *  - only a lived day that hasn't started yet (16:30 on its date), and only with a saved rotation to change;
 *  - the change must differ from the rotation (overtime on a day off, time off on a work day);
 *  - one ACTIVE exception per date: a second is refused, never silently overwritten (change or cancel the first);
 *  - a shift swap confirms both dates in one transaction, and they change or cancel together;
 *  - nothing is deleted: a change or cancellation appends to `history` and moves `status`.
 * A rotation edited later leaves exceptions as confirmed; they are absolute WORK/OFF, not relative to the rotation.
 */
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TABLES = ["scheduleExceptions"] as const;

function livedStart(date: string): Date {
  if (!DATE.test(date)) throw new Error("EXCEPTION_DATE_INVALID: use yyyy-mm-dd.");
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 16, 30, 0, 0);
}

function assertFuture(date: string, now: Date) {
  if (livedStart(date).getTime() <= now.getTime()) {
    throw new Error("EXCEPTION_DAY_STARTED: that day has already started. Change it on TODAY instead.");
  }
}

async function rotationKind(date: string): Promise<"WORK" | "OFF"> {
  const pattern = await getSchedulePattern();
  if (!isOperatorSavedSchedule(pattern)) throw new Error("EXCEPTION_NO_SCHEDULE: save your work schedule first.");
  return scheduledWorkContextForLivedDay(livedStart(date), pattern);
}

async function assertFree(date: string) {
  const active = await db.scheduleExceptions.where("date").equals(date).filter((e) => e.status === "ACTIVE").first();
  if (active) throw new Error(`EXCEPTION_CONFLICT: ${date} already has a confirmed change. Change or cancel that one instead.`);
}

const reasonFor = (kind: "WORK" | "OFF"): ScheduleExceptionReason => (kind === "WORK" ? "OVERTIME" : "TIME_OFF");
const clean = (note: string | undefined) => (note?.trim() ? note.trim().slice(0, 200) : undefined);

/** Overtime or time off on one future day. */
export async function confirmScheduleException(input: { date: string; kind: "WORK" | "OFF"; note?: string }, now: Date = new Date()): Promise<ScheduleException> {
  assertFuture(input.date, now);
  if ((await rotationKind(input.date)) === input.kind) {
    throw new Error(`EXCEPTION_MATCHES_ROTATION: ${input.date} is already ${input.kind === "WORK" ? "a work day" : "a day off"} on your schedule.`);
  }
  return writeAtomically(TABLES, async () => {
    await assertFree(input.date);
    const at = now.toISOString(), note = clean(input.note);
    const exception: ScheduleException = {
      id: newId(), date: input.date, kind: input.kind, reason: reasonFor(input.kind), status: "ACTIVE",
      ...(note ? { note } : {}), history: [{ at, action: "CONFIRMED", kind: input.kind, ...(note ? { note } : {}) }], createdAt: at, updatedAt: at,
    };
    await db.scheduleExceptions.add(exception);
    return exception;
  });
}

/** A shift swap: work `workDate` (a scheduled day off) instead of `offDate` (a scheduled work day). Both or neither. */
export async function confirmShiftSwap(input: { workDate: string; offDate: string; note?: string }, now: Date = new Date()): Promise<ScheduleException[]> {
  if (input.workDate === input.offDate) throw new Error("EXCEPTION_SWAP_SAME_DAY: pick two different days.");
  assertFuture(input.workDate, now); assertFuture(input.offDate, now);
  if ((await rotationKind(input.workDate)) !== "OFF") throw new Error(`EXCEPTION_SWAP_WORK_DAY: ${input.workDate} is already a work day.`);
  if ((await rotationKind(input.offDate)) !== "WORK") throw new Error(`EXCEPTION_SWAP_OFF_DAY: ${input.offDate} is already a day off.`);
  return writeAtomically(TABLES, async () => {
    await assertFree(input.workDate); await assertFree(input.offDate);
    const at = now.toISOString(), swapId = newId(), note = clean(input.note);
    const half = (date: string, kind: "WORK" | "OFF"): ScheduleException => ({
      id: newId(), date, kind, reason: "SWAP", swapId, status: "ACTIVE", ...(note ? { note } : {}),
      history: [{ at, action: "CONFIRMED", kind, ...(note ? { note } : {}) }], createdAt: at, updatedAt: at,
    });
    const halves = [half(input.workDate, "WORK"), half(input.offDate, "OFF")];
    await db.scheduleExceptions.bulkAdd(halves);
    return halves;
  });
}

async function activeById(id: string): Promise<ScheduleException> {
  const exception = await db.scheduleExceptions.get(id);
  if (!exception || exception.status !== "ACTIVE") throw new Error("EXCEPTION_NOT_ACTIVE: that change isn't active.");
  return exception;
}
async function group(exception: ScheduleException): Promise<ScheduleException[]> {
  return exception.swapId ? (await db.scheduleExceptions.where("swapId").equals(exception.swapId).toArray()).filter((e) => e.status === "ACTIVE") : [exception];
}

/**
 * Edit an active exception's note (both halves of a swap together). Its WORK/OFF can't be flipped here: the opposite
 * would just be the rotation again, which is a cancellation. To change the day, use moveScheduleException.
 */
export async function changeScheduleException(id: string, change: { note: string }, now: Date = new Date()): Promise<ScheduleException[]> {
  return writeAtomically(TABLES, async () => {
    const exception = await activeById(id);
    const all = await group(exception);
    for (const e of all) assertFuture(e.date, now);
    const at = now.toISOString(), note = clean(change.note);
    const updated = all.map((e): ScheduleException => {
      const { note: _old, ...rest } = e;
      return { ...rest, ...(note ? { note } : {}), updatedAt: at, history: [...e.history, { at, action: "CHANGED", kind: e.kind, ...(note ? { note } : {}) }] };
    });
    await db.scheduleExceptions.bulkPut(updated);
    return updated;
  });
}

/** Move a single-day exception to another future date (same kind). Recorded as a cancellation and a new confirmation. */
export async function moveScheduleException(id: string, date: string, now: Date = new Date()): Promise<ScheduleException> {
  const exception = await activeById(id);
  if (exception.swapId) throw new Error("EXCEPTION_SWAP_MOVE: cancel the swap and confirm a new one.");
  assertFuture(exception.date, now); assertFuture(date, now);
  if ((await rotationKind(date)) === exception.kind) throw new Error(`EXCEPTION_MATCHES_ROTATION: ${date} is already ${exception.kind === "WORK" ? "a work day" : "a day off"} on your schedule.`);
  return writeAtomically(TABLES, async () => {
    const current = await activeById(id);
    await assertFree(date);
    const at = now.toISOString();
    await db.scheduleExceptions.put({ ...current, status: "CANCELLED", updatedAt: at, history: [...current.history, { at, action: "CANCELLED", kind: current.kind, note: `Moved to ${date}` }] });
    const moved: ScheduleException = {
      id: newId(), date, kind: current.kind, reason: current.reason, status: "ACTIVE", ...(current.note ? { note: current.note } : {}),
      history: [{ at, action: "CONFIRMED", kind: current.kind, note: `Moved from ${current.date}` }], createdAt: at, updatedAt: at,
    };
    await db.scheduleExceptions.add(moved);
    return moved;
  });
}

/** Cancel: the day goes back to the rotation. Both halves of a swap are cancelled together. Nothing is deleted. */
export async function cancelScheduleException(id: string, now: Date = new Date()): Promise<ScheduleException[]> {
  return writeAtomically(TABLES, async () => {
    const all = await group(await activeById(id));
    for (const e of all) assertFuture(e.date, now);
    const at = now.toISOString();
    const cancelled = all.map((e): ScheduleException => ({ ...e, status: "CANCELLED", updatedAt: at, history: [...e.history, { at, action: "CANCELLED", kind: e.kind }] }));
    await db.scheduleExceptions.bulkPut(cancelled);
    return cancelled;
  });
}

// ---- Reads ----

/** Active exceptions by date. */
export async function getConfirmedExceptions(dates?: readonly string[]): Promise<Map<string, ScheduleException>> {
  const rows = dates ? await db.scheduleExceptions.where("date").anyOf([...dates]).toArray() : await db.scheduleExceptions.toArray();
  return new Map(rows.filter((e) => e.status === "ACTIVE").map((e) => [e.date, e]));
}

/** The lived-day dates from the day before yesterday to tomorrow, around `now` (16:30 lived days). */
export function livedDatesAround(now: Date): string[] {
  const at = new Date(now); if (at.getHours() * 60 + at.getMinutes() < 16 * 60 + 30) at.setDate(at.getDate() - 1);
  return [-2, -1, 0, 1].map((k) => formatLocalDate(new Date(at.getFullYear(), at.getMonth(), at.getDate() + k, 12)));
}

/** Upcoming active exceptions (lived day not yet over), soonest first, for the list in Week Ahead. */
export async function getUpcomingExceptions(now: Date = new Date()): Promise<ScheduleException[]> {
  const today = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12));
  return (await db.scheduleExceptions.where("date").aboveOrEqual(today).toArray())
    .filter((e) => e.status === "ACTIVE").sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

/** What confirming would change, for the preview (read only). */
export async function previewScheduleException(date: string, kind: "WORK" | "OFF"): Promise<{ rotation: "WORK" | "OFF"; reason: ScheduleExceptionReason } | null> {
  try { const rotation = await rotationKind(date); return rotation === kind ? null : { rotation, reason: reasonFor(kind) }; } catch { return null; }
}
