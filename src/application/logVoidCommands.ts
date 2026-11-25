import { db } from "../persistence/db";
import type { DomainEvent } from "../domain/common/types";
import type { SleepLoggedPayload } from "../domain/common/types";
import { activeVoids, isLogVoidType, voidedRootId, type LogVoidType, type LogVoidUndonePayload } from "../domain/logVoids";
import { logEvent, newId, replaceGarminSleep } from "./commands";
import { DAY_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { logUnscopedEvent } from "./unscopedEvents";

/**
 * GRAYSON-FIX-UNDO-001 (Gavin, 2026-11-24): put a removed log back. Removal is now one tap with an 8-second UNDO,
 * and History keeps a PUT IT BACK on every removed entry. Appends LOG_VOID_UNDONE naming the standing removal; the
 * removal stays in the log, so History shows "Removed" and "Put back" side by side. Every reader goes through
 * domain/logVoids.activeVoids, so the entry returns to every total at once. Nothing is re-evaluated: removing a log
 * never re-evaluated either.
 */
export type LogVoidUndoResult = "PUT_BACK" | "NO_OP";

const ROOT_TYPE_BY_VOID: Record<LogVoidType, DomainEvent["type"]> = {
  MEAL_LOG_VOIDED: "MEAL_LOGGED",
  PROTEIN_LOG_VOIDED: "PROTEIN_LOGGED",
  WATER_LOG_VOIDED: "WATER_LOGGED",
  SLEEP_LOG_VOIDED: "SLEEP_LOGGED",
  BODYWEIGHT_LOG_VOIDED: "BODYWEIGHT_LOGGED",
  MEASUREMENT_LOG_VOIDED: "MEASUREMENT_LOGGED",
  STANDARD_TEST_VOIDED: "STANDARD_TEST_RECORDED",
};

const VOID_READ_TYPES = [...Object.keys(ROOT_TYPE_BY_VOID), "LOG_VOID_UNDONE"];

function rootIdOf(event: DomainEvent): string {
  return (event.payload as { originalEventId?: string }).originalEventId ?? event.id;
}

/** The standing owner removal of an entry (its root or any correction id), if any. */
export async function findActiveLogVoid(entryEventId: string): Promise<DomainEvent | undefined> {
  const target = await db.events.get(entryEventId);
  if (!target) return undefined;
  const rootId = rootIdOf(target);
  const voids = await db.events.where("type").anyOf(VOID_READ_TYPES).toArray();
  return activeVoids(voids).find((e) => voidedRootId(e) === rootId && e.source === "USER");
}

/**
 * Put back the removal `voidEventId` (`beyondDayId` null for a measurement, which belongs to no day). NO_OP when it
 * was already put back, so an UNDO racing a second tap can't double-write. Refused when the removal can't be found
 * or wasn't the owner's: a SYSTEM removal is how Garmin steps aside for the owner's own sleep entry (GARMIN-003).
 */
export async function undoLogVoid(beyondDayId: string | null, voidEventId: string): Promise<LogVoidUndoResult> {
  return writeAtomically(DAY_WRITE_TABLES, async () => {
    const voidEvent = await db.events.get(voidEventId);
    if (!voidEvent || !isLogVoidType(voidEvent.type) || (voidEvent.beyondDayId ?? null) !== beyondDayId) {
      throw new Error("LOG_VOID_NOT_FOUND: that removal could not be found.");
    }
    if (voidEvent.source !== "USER") throw new Error("SYSTEM_REMOVAL: Garmin stepped aside for your own entry; that can't be put back.");
    const voids = await db.events.where("type").anyOf(VOID_READ_TYPES).toArray();
    if (!activeVoids(voids).some((e) => e.id === voidEventId)) return "NO_OP";
    const voidedType = voidEvent.type;
    const root = await db.events.get(voidedRootId(voidEvent) ?? "");
    if (!root || root.type !== ROOT_TYPE_BY_VOID[voidedType]) throw new Error("LOG_NOT_FOUND: that entry could not be found.");
    const commandId = newId();
    const payload: LogVoidUndonePayload = { commandId, voidEventId, voidedType };
    if (beyondDayId === null) {
      await logUnscopedEvent("LOG_VOID_UNDONE", payload, commandId, voidEventId);
      return "PUT_BACK";
    }
    await logEvent(beyondDayId, "LOG_VOID_UNDONE", payload, "USER", commandId, voidEventId);
    // GARMIN-003 unchanged: the owner's own sleep entry, back again, still replaces Garmin's entry of the same kind,
    // exactly as when it was first logged. A Garmin night put back is just put back.
    const sleep = root.payload as SleepLoggedPayload;
    if (voidedType === "SLEEP_LOG_VOIDED" && sleep.source?.kind !== "GARMIN") {
      await replaceGarminSleep(beyondDayId, sleep.kind ?? "PRIMARY", root.id);
    }
    return "PUT_BACK";
  });
}

/** Put back an entry by its root or any correction id: the UNDO right after a removal and History's PUT IT BACK. */
export async function putBackLogEntry(entryEventId: string): Promise<LogVoidUndoResult> {
  const standing = await findActiveLogVoid(entryEventId);
  if (!standing) return "NO_OP";
  return undoLogVoid(standing.beyondDayId ?? null, standing.id);
}
