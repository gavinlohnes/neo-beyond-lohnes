import { db } from "../persistence/db";
import type { DomainEvent } from "../domain/common/types";
import type { DecisionJournalEntry } from "../domain/journal/types";
import { parseDecisionJournalEntry } from "../persistence/journalValidation";
import { byTimeThenSeq } from "./queries";

/**
 * Decision Journal. Mirrors intentQueries.ts exactly: every result runs
 * through parseDecisionJournalEntry first — a row that fails validation
 * is silently excluded rather than crashing or being treated as truth.
 * Deterministic sort only (byTimeThenSeq on createdAt), same tie-break
 * every other "list this" query in the app already uses.
 */

async function validEntries(): Promise<DecisionJournalEntry[]> {
  const raw = await db.decisionJournalEntries.toArray();
  return raw.map(parseDecisionJournalEntry).filter((e): e is DecisionJournalEntry => e !== null);
}

function sortByCreated<T extends { createdAt: string; seq?: number }>(records: T[]): T[] {
  return records.sort((a, b) => byTimeThenSeq(a.createdAt, a.seq, b.createdAt, b.seq));
}

/** Newest first — matches how MoreScreen/IntentScreen present record lists to the operator. */
export async function getDecisionJournalEntries(): Promise<DecisionJournalEntry[]> {
  return sortByCreated(await validEntries()).reverse();
}

/** Awaiting review — the operator hasn't yet recorded what happened. */
export async function getOpenDecisionJournalEntries(): Promise<DecisionJournalEntry[]> {
  return sortByCreated((await validEntries()).filter((e) => e.status === "OPEN")).reverse();
}

export async function getDecisionJournalEntry(id: string): Promise<DecisionJournalEntry | undefined> {
  const raw = await db.decisionJournalEntries.get(id);
  return raw ? (parseDecisionJournalEntry(raw) ?? undefined) : undefined;
}

const DECISION_JOURNAL_EVENT_TYPES = new Set([
  "DECISION_JOURNAL_CREATED",
  "DECISION_JOURNAL_MODIFIED",
  "DECISION_JOURNAL_REVIEWED",
]);

/** Oldest first — the full historical trail for one entry, via the decisionJournalEntryId index added in db.ts v8. */
export async function getDecisionJournalHistory(decisionJournalEntryId: string): Promise<DomainEvent[]> {
  const events = await db.events.where("decisionJournalEntryId").equals(decisionJournalEntryId).toArray();
  return events
    .filter((e) => DECISION_JOURNAL_EVENT_TYPES.has(e.type))
    .sort((a, b) => byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq));
}
