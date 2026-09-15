import MiniSearch from "minisearch";
import type { DecisionJournalEntry } from "../domain/journal/types";

/**
 * JOURNAL-001 (approved 2026-09-15, via direct owner sign-off on the
 * bounded "surface past Journal Lessons as read-only advisory context on
 * TODAY" proposal). Pure, deterministic keyword-relevance match between
 * already-fetched, already-REVIEWED DecisionJournalEntry records and a
 * caller-supplied set of query terms — no I/O, no Dexie, no knowledge of
 * Mission/Obligation beyond the plain strings the caller hands in.
 *
 * A parallel interpretation layer in the same sense as
 * obligationRelevance.ts: it has no knowledge of Recommendation, TODAY's
 * composition, or Engine arbitration, and advisory.ts/evaluate.ts must
 * never treat this module's output as anything other than an optional,
 * skippable read (see .claude/rules/engine.md and this Drop's contract —
 * no scoring into evaluate.ts, no new persisted linkage).
 *
 * MiniSearch is already an approved, zero-new-dependency choice
 * (SEARCH-002, src/application/searchQueries.ts) — reused here for the
 * same fuzzy/prefix lexical matching, not a new BUILD/BORROW decision.
 * DecisionJournalEntry has no missionId field (checked directly against
 * domain/journal/types.ts), so this module matches on free text only —
 * title/context/decision/lesson — never on any structural Mission link.
 *
 * Abstains (returns []) rather than guessing whenever there is nothing
 * genuinely relevant to say — no fabricated relevance, matching this
 * repo's "no fabrication" doctrine for anything surfaced to the operator.
 */
interface IndexedJournalDoc {
  id: string;
  title: string;
  context: string;
  decision: string;
  lesson: string;
}

const RELEVANCE_FIELDS: Array<keyof Omit<IndexedJournalDoc, "id">> = ["title", "context", "decision", "lesson"];

/**
 * `queryTerms` are joined into one MiniSearch query string — the caller
 * (advisoryQueries.ts) supplies already-current-state text (today:
 * eligible Obligation titles); this module has no opinion on where terms
 * come from. `limit` caps how many past entries can surface at once, so
 * a broad match can't flood TODAY's Support tier.
 */
export function findRelevantReviewedEntries(
  entries: DecisionJournalEntry[],
  queryTerms: string[],
  limit = 3,
): DecisionJournalEntry[] {
  const query = queryTerms
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .join(" ");
  if (entries.length === 0 || query.length === 0) return [];

  const docs: IndexedJournalDoc[] = entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    context: entry.context ?? "",
    decision: entry.decision,
    lesson: entry.lesson ?? "",
  }));

  const index = new MiniSearch<IndexedJournalDoc>({
    fields: RELEVANCE_FIELDS,
    storeFields: ["id"],
  });
  index.addAll(docs);

  // fuzzy/prefix/boost mirror searchAll's own tuning exactly (see
  // searchQueries.ts) — one typo per ~5 characters tolerated, title
  // matches outrank context/decision/lesson-only matches. combineWith
  // "OR" so any one matching term (e.g. one shared word out of several
  // Obligation-title terms) is enough to surface a genuinely relevant
  // past entry, rather than requiring every term to match at once.
  const hits = index.search(query, { fuzzy: 0.2, prefix: true, combineWith: "OR", boost: { title: 2 } });

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return hits
    .slice(0, limit)
    .map((hit) => byId.get(hit.id as string))
    .filter((entry): entry is DecisionJournalEntry => entry !== undefined);
}
