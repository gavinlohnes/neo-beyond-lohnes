import { db } from "../persistence/db";
import { newId, nextSeq } from "./commands";
import type { DomainEvent } from "../domain/common/types";
import type { DecisionJournalEntry } from "../domain/journal/types";
import {
  decisionJournalEntryInputSchema,
  decisionJournalEntryModifyInputSchema,
  decisionJournalEntryReviewInputSchema,
  type DecisionJournalEntryInput,
  type DecisionJournalEntryModifyInput,
  type DecisionJournalEntryReviewInput,
} from "../persistence/journalValidation";

/**
 * Decision Journal. Canonical records are directly mutated (current
 * state, same treatment as Mission/Obligation in intentCommands.ts)
 * while every meaningful lifecycle change also produces a real
 * historical DomainEvent — never both a mutation AND silence, never an
 * event with no matching canonical update. UI components must go through
 * these commands, never write to db.decisionJournalEntries directly.
 *
 * Mirrors intentCommands.ts's logIntentEvent exactly, scoped by
 * decisionJournalEntryId instead of missionId/obligationId — a journal
 * entry is BEYOND's third record type that outlives any single day.
 */
async function logJournalEvent(
  type: DomainEvent["type"],
  payload: unknown,
  source: DomainEvent["source"],
  correlationId: string,
  decisionJournalEntryId: string,
  causationId?: string,
): Promise<string> {
  const timestamp = new Date().toISOString();
  const event: DomainEvent = {
    id: newId(),
    type,
    occurredAt: timestamp,
    recordedAt: timestamp,
    payload,
    source,
    correlationId,
    seq: await nextSeq(),
    decisionJournalEntryId,
    ...(causationId ? { causationId } : {}),
  };
  await db.events.add(event);
  return event.id;
}

function notFound(id: string): Error {
  return new Error(`DECISION_JOURNAL_ENTRY_NOT_FOUND: no decision journal entry with id ${id}`);
}

/** Explicit operator action only (same authority doctrine as createMission/createObligation). Always source USER. */
export async function createDecisionJournalEntry(input: DecisionJournalEntryInput): Promise<DecisionJournalEntry> {
  const parsed = decisionJournalEntryInputSchema.parse(input);
  const now = new Date().toISOString();
  const entry: DecisionJournalEntry = {
    id: newId(),
    title: parsed.title,
    ...(parsed.context ? { context: parsed.context } : {}),
    ...(parsed.options ? { options: parsed.options } : {}),
    decision: parsed.decision,
    ...(parsed.reasoning ? { reasoning: parsed.reasoning } : {}),
    ...(parsed.expectation ? { expectation: parsed.expectation } : {}),
    status: "OPEN",
    source: "USER",
    seq: await nextSeq(),
    createdAt: now,
    updatedAt: now,
  };
  await db.decisionJournalEntries.add(entry);
  const correlationId = newId();
  await logJournalEvent(
    "DECISION_JOURNAL_CREATED",
    { commandId: correlationId, decisionJournalEntryId: entry.id, title: entry.title },
    "USER",
    correlationId,
    entry.id,
  );
  return entry;
}

export async function modifyDecisionJournalEntry(
  id: string,
  changes: DecisionJournalEntryModifyInput,
): Promise<DecisionJournalEntry> {
  const parsed = decisionJournalEntryModifyInputSchema.parse(changes);
  const existing = await db.decisionJournalEntries.get(id);
  if (!existing) throw notFound(id);
  const updated: DecisionJournalEntry = {
    ...existing,
    ...(parsed.title !== undefined ? { title: parsed.title } : {}),
    ...(parsed.context !== undefined ? { context: parsed.context } : {}),
    ...(parsed.options !== undefined ? { options: parsed.options } : {}),
    ...(parsed.decision !== undefined ? { decision: parsed.decision } : {}),
    ...(parsed.reasoning !== undefined ? { reasoning: parsed.reasoning } : {}),
    ...(parsed.expectation !== undefined ? { expectation: parsed.expectation } : {}),
    updatedAt: new Date().toISOString(),
  };
  await db.decisionJournalEntries.put(updated);
  const correlationId = newId();
  await logJournalEvent(
    "DECISION_JOURNAL_MODIFIED",
    { commandId: correlationId, decisionJournalEntryId: id, changes: parsed },
    "USER",
    correlationId,
    id,
  );
  return updated;
}

/**
 * Records what actually happened and what it teaches — the point of the
 * journal. Valid from OPEN only; a second review would silently overwrite
 * the first outcome/lesson, which is exactly the kind of "history quietly
 * rewritten" this repo's persistence doctrine rejects — correct a review
 * via modifyDecisionJournalEntry-style editing in a future Drop if that's
 * ever needed, not by calling this twice.
 */
export async function reviewDecisionJournalEntry(
  id: string,
  input: DecisionJournalEntryReviewInput,
): Promise<DecisionJournalEntry> {
  const parsed = decisionJournalEntryReviewInputSchema.parse(input);
  const existing = await db.decisionJournalEntries.get(id);
  if (!existing) throw notFound(id);
  if (existing.status === "REVIEWED") {
    throw new Error(`DECISION_JOURNAL_ALREADY_REVIEWED: entry ${id} was already reviewed.`);
  }
  const reviewedAt = new Date().toISOString();
  const updated: DecisionJournalEntry = {
    ...existing,
    outcome: parsed.outcome,
    ...(parsed.lesson ? { lesson: parsed.lesson } : {}),
    status: "REVIEWED",
    reviewedAt,
    updatedAt: reviewedAt,
  };
  await db.decisionJournalEntries.put(updated);
  const correlationId = newId();
  await logJournalEvent(
    "DECISION_JOURNAL_REVIEWED",
    { commandId: correlationId, decisionJournalEntryId: id, outcome: parsed.outcome, ...(parsed.lesson ? { lesson: parsed.lesson } : {}) },
    "USER",
    correlationId,
    id,
  );
  return updated;
}
