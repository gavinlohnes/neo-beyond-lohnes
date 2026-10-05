import { db } from "../persistence/db";
import { newId, nextSeq } from "./commands";
import { formatLocalDate } from "../engine/scheduledContext";
import {
  TIME_CAPSULE_MAX_LENGTH,
  TIME_CAPSULE_MONTHS,
  type DomainEvent,
  type TimeCapsuleOpenedPayload,
  type TimeCapsuleSealedPayload,
} from "../domain/common/types";

/**
 * NOTES-CAPSULE-001 (owner rulings 2026-10-04): sealing and opening a time
 * capsule. Both are append-only events not tied to a day (no beyondDayId),
 * written the same way as Decision Journal events.
 */

export type CapsuleMonths = (typeof TIME_CAPSULE_MONTHS)[number];

/** The local date `months` after `from`, clamped to the month's last day (Jan 31 + 1 month = Feb 28). */
export function opensOnAfter(from: Date, months: CapsuleMonths): string {
  const target = new Date(from.getFullYear(), from.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(from.getDate(), lastDay));
  return formatLocalDate(target);
}

async function logCapsuleEvent(type: DomainEvent["type"], payload: unknown, correlationId: string, causationId?: string): Promise<string> {
  const timestamp = new Date().toISOString();
  const event: DomainEvent = {
    id: newId(),
    type,
    occurredAt: timestamp,
    recordedAt: timestamp,
    payload,
    source: "USER",
    correlationId,
    seq: await nextSeq(),
    ...(causationId ? { causationId } : {}),
  };
  await db.events.add(event);
  return event.id;
}

/** Seals a note to open `months` from `now`. Trimmed; empty or over 500 characters is rejected without writing. */
export async function sealTimeCapsule(note: string, months: CapsuleMonths, now: Date = new Date()): Promise<string> {
  const trimmed = note.trim();
  if (!trimmed) throw new Error("EMPTY_CAPSULE: Write something for future you.");
  if (trimmed.length > TIME_CAPSULE_MAX_LENGTH) {
    throw new Error(`CAPSULE_TOO_LONG: Keep it to ${TIME_CAPSULE_MAX_LENGTH} characters.`);
  }
  if (!(TIME_CAPSULE_MONTHS as readonly number[]).includes(months)) throw new Error("INVALID_CAPSULE_DATE: Pick 1, 3, 6 or 12 months.");
  const commandId = newId();
  const payload: TimeCapsuleSealedPayload = { commandId, note: trimmed, opensOn: opensOnAfter(now, months) };
  return logCapsuleEvent("TIME_CAPSULE_SEALED", payload, commandId);
}

/** GOT IT on an opened capsule. */
export async function markTimeCapsuleOpened(capsuleEventId: string): Promise<void> {
  const commandId = newId();
  const payload: TimeCapsuleOpenedPayload = { commandId, capsuleEventId };
  await logCapsuleEvent("TIME_CAPSULE_OPENED", payload, commandId, capsuleEventId);
}
