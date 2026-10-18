import { db } from "../persistence/db";
import { newId, nextSeq } from "./commands";
import type { DomainEvent } from "../domain/common/types";

/**
 * REVIEW-001 Phase 1a: one helper for events that belong to no BeyondDay —
 * body measurements (dated by when they were taken) and progress photos.
 * Same event shape as timeCapsuleCommands' and journalCommands' own helpers:
 * no beyondDayId, a real seq, recordedAt = occurredAt = now. Callers that
 * also write a table run it inside writeAtomically.
 */
export async function logUnscopedEvent(
  type: DomainEvent["type"],
  payload: unknown,
  correlationId: string,
  causationId?: string,
): Promise<string> {
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
