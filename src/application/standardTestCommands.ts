import { db } from "../persistence/db";
import type { BodyLogVoidedPayload, DomainEvent, StandardTestKind, StandardTestRecordedPayload } from "../domain/common/types";
import { activeVoidedIds, type LogVoidUndonePayload } from "../domain/logVoids";
import { isStandardTestKind, STANDARD_NOTE_MAX, STANDARD_TEST, standardValueProblem } from "../domain/workout/standardTests";
import { ensureActiveDay, logEvent, newId, placeInDay } from "./commands";
import { DAY_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { resolveWhen } from "./logTimes";
import { undoLogVoid } from "./logVoidCommands";

/**
 * GRAYSON-TRAIN-STANDARDS-001 (Gavin, 2026-11-24): record, fix and remove a standards test result. Append-only:
 * a result is one STANDARD_TEST_RECORDED; a removal is the shared STANDARD_TEST_VOIDED (put back with
 * LOG_VOID_UNDONE, like every other removal); a fix voids the old result and records the new one in one write, so
 * the original stays in the log. Undo shows only after a fix or a removal.
 */

export interface StandardTestInput {
  test: StandardTestKind;
  value: number;
  /** "HH:MM" inside the lived day; omitted means now. */
  hhmm?: string;
  note?: string;
}

const READ_TYPES: DomainEvent["type"][] = ["STANDARD_TEST_RECORDED", "STANDARD_TEST_VOIDED", "LOG_VOID_UNDONE"];

function checkInput(input: StandardTestInput): { note?: string } {
  if (!isStandardTestKind(input.test)) throw new Error("STANDARD_TEST_UNKNOWN: that isn't one of the standards tests.");
  const problem = standardValueProblem(input.test, input.value);
  if (problem) throw new Error(`STANDARD_VALUE_INVALID: ${problem}`);
  const note = input.note?.trim();
  if (note && note.length > STANDARD_NOTE_MAX) throw new Error(`STANDARD_NOTE_TOO_LONG: keep the note to ${STANDARD_NOTE_MAX} characters.`);
  return note ? { note } : {};
}

/** The instant "HH:MM" names in that lived day (or now), checked against the day's 16:30 to 16:30 window. */
async function placeAt(beyondDayId: string, hhmm: string | undefined, now: Date): Promise<string> {
  const day = await db.beyondDays.get(beyondDayId);
  if (!day) throw new Error("DAY_NOT_FOUND");
  const at = hhmm ? resolveWhen({ kind: "AT", hhmm }, day.startedAt, now, day.createdAt) : undefined;
  return placeInDay(beyondDayId, at ?? now.toISOString());
}

async function writeResult(beyondDayId: string, input: StandardTestInput, at: string, note: { note?: string }, correctsEventId?: string): Promise<string> {
  const commandId = newId();
  const payload: StandardTestRecordedPayload = {
    commandId, test: input.test, value: input.value, unit: STANDARD_TEST[input.test].unit, at, beyondDayId,
    ...note, ...(correctsEventId ? { correctsEventId } : {}),
  };
  return logEvent(beyondDayId, "STANDARD_TEST_RECORDED", payload, "USER", commandId, correctsEventId, at);
}

/** RECORD: a new result in today's lived day. Returns its event id. */
export async function recordStandardTest(input: StandardTestInput, now: Date = new Date()): Promise<string> {
  const note = checkInput(input);
  const day = await ensureActiveDay();
  return writeAtomically(DAY_WRITE_TABLES, async () => {
    const at = await placeAt(day.id, input.hhmm, now);
    return writeResult(day.id, input, at, note);
  });
}

async function standingResult(eventId: string): Promise<DomainEvent> {
  const root = await db.events.get(eventId);
  if (!root || root.type !== "STANDARD_TEST_RECORDED" || !root.beyondDayId) throw new Error("STANDARD_RESULT_NOT_FOUND: that result could not be found.");
  const events = await db.events.where("type").anyOf(READ_TYPES).toArray();
  if (activeVoidedIds(events, "STANDARD_TEST_VOIDED").has(root.id)) throw new Error("STANDARD_RESULT_REMOVED: that result was already removed.");
  return root;
}

async function voidResult(root: DomainEvent): Promise<string> {
  const commandId = newId();
  const payload: BodyLogVoidedPayload = { commandId, loggedEventId: root.id };
  return logEvent(root.beyondDayId!, "STANDARD_TEST_VOIDED", payload, "USER", commandId, root.id);
}

export interface StandardFix { voidEventId: string; recordEventId: string }

/**
 * FIX: the old result is removed and the new one recorded in the same write, inside the old result's lived day. The
 * test itself can't change; a different test is a new RECORD.
 */
export async function fixStandardTest(eventId: string, input: Omit<StandardTestInput, "test">, now: Date = new Date()): Promise<StandardFix> {
  return writeAtomically(DAY_WRITE_TABLES, async () => {
    const root = await standingResult(eventId);
    const old = root.payload as StandardTestRecordedPayload;
    const next: StandardTestInput = { ...input, test: old.test };
    const note = checkInput(next);
    const day = await db.beyondDays.get(root.beyondDayId!);
    if (!day) throw new Error("DAY_NOT_FOUND");
    // A day that has ended has no "now" inside it: no time given keeps the original time.
    const at = next.hhmm ? await placeAt(day.id, next.hhmm, now) : old.at;
    const voidEventId = await voidResult(root);
    const recordEventId = await writeResult(day.id, next, at, note, root.id);
    return { voidEventId, recordEventId };
  });
}

/** REMOVE: one tap; returns the removal's id for UNDO. */
export async function removeStandardTest(eventId: string): Promise<string> {
  return writeAtomically(DAY_WRITE_TABLES, async () => voidResult(await standingResult(eventId)));
}

/** UNDO after a removal: the result is back (the shared put-back). */
export async function undoStandardRemove(voidEventId: string): Promise<void> {
  const v = await db.events.get(voidEventId);
  if (!v || v.type !== "STANDARD_TEST_VOIDED") throw new Error("LOG_VOID_NOT_FOUND: that removal could not be found.");
  await undoLogVoid(v.beyondDayId ?? null, voidEventId);
}

/** UNDO after a fix: the original is put back and the fixed result removed, in one write. */
export async function undoStandardFix(fix: StandardFix): Promise<void> {
  return writeAtomically(DAY_WRITE_TABLES, async () => {
    const v = await db.events.get(fix.voidEventId);
    const fixed = await db.events.get(fix.recordEventId);
    if (!v || v.type !== "STANDARD_TEST_VOIDED" || !fixed || fixed.type !== "STANDARD_TEST_RECORDED") {
      throw new Error("STANDARD_RESULT_NOT_FOUND: that fix could not be found.");
    }
    const events = await db.events.where("type").anyOf(READ_TYPES).toArray();
    const voided = activeVoidedIds(events, "STANDARD_TEST_VOIDED");
    if (voided.has(fixed.id) || !voided.has((v.payload as BodyLogVoidedPayload).loggedEventId)) return;
    const commandId = newId();
    const putBack: LogVoidUndonePayload = { commandId, voidEventId: v.id, voidedType: "STANDARD_TEST_VOIDED" };
    await logEvent(v.beyondDayId!, "LOG_VOID_UNDONE", putBack, "USER", commandId, v.id);
    await voidResult(fixed);
  });
}
