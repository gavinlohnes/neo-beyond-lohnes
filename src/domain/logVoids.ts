import type { DomainEvent } from "./common/types";

/**
 * GRAYSON-FIX-UNDO-001 (Gavin, 2026-11-24: "I should be able to edit and tweak or correct everything in this app";
 * 02:02 CT: undo shows only after a fix or a removal). Pure: which log removals still count. A removal (one of the six
 * *_LOG_VOIDED events) stops counting once a LOG_VOID_UNDONE names it, and the entry is back everywhere. Nothing stored
 * is edited or deleted, so History keeps the removal and the put-back side by side.
 */
export const LOG_VOID_TYPES = [
  "MEAL_LOG_VOIDED",
  "PROTEIN_LOG_VOIDED",
  "WATER_LOG_VOIDED",
  "SLEEP_LOG_VOIDED",
  "BODYWEIGHT_LOG_VOIDED",
  "MEASUREMENT_LOG_VOIDED",
] as const;
export type LogVoidType = (typeof LOG_VOID_TYPES)[number];

export interface LogVoidUndonePayload {
  commandId: string;
  voidEventId: string;
  voidedType: LogVoidType;
}

export function isLogVoidType(type: string): type is LogVoidType {
  return (LOG_VOID_TYPES as readonly string[]).includes(type);
}

/** The root *_LOGGED event a removal names (meals and protein use their own field names). */
export function voidedRootId(event: DomainEvent): string | undefined {
  const p = event.payload as { mealEventId?: string; proteinEventId?: string; loggedEventId?: string };
  return event.type === "MEAL_LOG_VOIDED" ? p.mealEventId : event.type === "PROTEIN_LOG_VOIDED" ? p.proteinEventId : p.loggedEventId;
}

/** Removal event ids that were put back. */
export function undoneVoidIds(events: readonly DomainEvent[]): Set<string> {
  return new Set(events.filter((e) => e.type === "LOG_VOID_UNDONE").map((e) => (e.payload as LogVoidUndonePayload).voidEventId));
}

/** The removal events that still count: every *_LOG_VOIDED minus those a LOG_VOID_UNDONE names. */
export function activeVoids(events: readonly DomainEvent[]): DomainEvent[] {
  const undone = undoneVoidIds(events);
  return events.filter((e) => isLogVoidType(e.type) && !undone.has(e.id));
}

/** Root ids removed by a standing removal of this type. */
export function activeVoidedIds(events: readonly DomainEvent[], type: LogVoidType): Set<string> {
  const ids = new Set<string>();
  for (const e of activeVoids(events)) {
    if (e.type !== type) continue;
    const id = voidedRootId(e);
    if (id) ids.add(id);
  }
  return ids;
}
