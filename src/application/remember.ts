import type { DecisionJournalEntry } from "../domain/journal/types";
import type { Recommendation } from "../domain/common/types";
import { db } from "../persistence/db";
import { getDecisionJournalEntries } from "./journalQueries";
import { readExperiment } from "./tryExperiment";

/**
 * LOOP step 4 — REMEMBER (owner approval 2026-10-27, "go remember"; brief docs/agent/LOOP.md).
 * What you concluded comes back at the moment it applies, matched structurally — never by keyword
 * and never inferred:
 * - a reviewed reason you gave for declining a recommendation returns on the next recommendation
 *   of the same kind;
 * - an unanswered reason returns there too, as "how did it go?" (LOOP-002);
 * - your shift handoff note returns on the next shift's "From last shift" row (NOTES-HANDOFF-001),
 *   where LOOP-002 asks whether it happened;
 * - lessons from closed experiments return when you start a new one.
 * Read-only and informational: it never changes, ranks or suppresses a recommendation, and is
 * never an Engine input. Your words are shown as written.
 */
export interface RememberedLesson { entryId: string; said: string; outcome: string; lesson?: string; when: string }

/** Pure: the most recent reviewed reflection on an earlier recommendation of the same kind. */
export function lessonForKind(entries: readonly DecisionJournalEntry[], kindOf: ReadonlyMap<string, Recommendation["kind"]>, current: Pick<Recommendation, "id" | "kind">): RememberedLesson | undefined {
  const match = entries
    .filter((e) => e.status === "REVIEWED" && e.outcome && e.linkedRecommendationId && e.linkedRecommendationId !== current.id && kindOf.get(e.linkedRecommendationId) === current.kind)
    .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))[0];
  return match ? { entryId: match.id, said: match.decision, outcome: match.outcome!, ...(match.lesson ? { lesson: match.lesson } : {}), when: match.createdAt } : undefined;
}

/** Pure: the most recent unanswered reason given on an earlier recommendation of the same kind. */
export function pendingForKind(entries: readonly DecisionJournalEntry[], kindOf: ReadonlyMap<string, Recommendation["kind"]>, current: Pick<Recommendation, "id" | "kind">): DecisionJournalEntry | undefined {
  return entries
    .filter((e) => e.status === "OPEN" && e.linkedRecommendationId && e.linkedRecommendationId !== current.id && kindOf.get(e.linkedRecommendationId) === current.kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export interface RecommendationMemory { lesson?: RememberedLesson; pending?: DecisionJournalEntry }

/** Both halves for TODAY's card in one read: what you concluded, and what still awaits "how did it go?". */
export async function getRecommendationMemory(current: Recommendation): Promise<RecommendationMemory> {
  const linked = (await getDecisionJournalEntries()).filter((e) => e.linkedRecommendationId);
  if (!linked.length) return {};
  const recs = await db.recommendations.bulkGet(linked.map((e) => e.linkedRecommendationId!));
  const kindOf = new Map(recs.flatMap((r) => r ? [[r.id, r.kind] as const] : []));
  const lesson = lessonForKind(linked, kindOf, current), pending = pendingForKind(linked, kindOf, current);
  return { ...(lesson ? { lesson } : {}), ...(pending ? { pending } : {}) };
}

export async function getRememberedLesson(current: Recommendation): Promise<RememberedLesson | undefined> {
  return (await getRecommendationMemory(current)).lesson;
}

/** Pure: closed experiments that left a lesson, newest first — shown when starting another. */
export function experimentLessons(entries: readonly DecisionJournalEntry[], limit = 3): { what: string; outcome: string; lesson: string }[] {
  return entries.flatMap((entry) => {
    const e = readExperiment(entry);
    return e && entry.status === "REVIEWED" && entry.lesson ? [{ what: e.what, outcome: entry.outcome ?? "", lesson: entry.lesson, at: entry.reviewedAt ?? "" }] : [];
  }).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit).map(({ what, outcome, lesson }) => ({ what, outcome, lesson }));
}

export function describeRememberedLesson(l: RememberedLesson): string {
  const when = new Date(l.when).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Last time (${when}) you said “${l.said}”. Looking back: ${l.outcome.toLowerCase()}${l.lesson ? `. Your lesson: ${l.lesson}` : ""}.`;
}
