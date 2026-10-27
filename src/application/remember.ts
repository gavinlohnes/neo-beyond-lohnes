import type { DecisionJournalEntry } from "../domain/journal/types";
import type { Recommendation } from "../domain/common/types";
import { db } from "../persistence/db";
import { getDecisionJournalEntries } from "./journalQueries";
import { isShiftDebrief, livedDayStartOf } from "./reflect";
import { readExperiment } from "./tryExperiment";

/**
 * LOOP step 4 — REMEMBER (owner approval 2026-10-27, "go remember"; brief docs/agent/LOOP.md).
 * What you concluded comes back at the moment it applies, matched structurally — never by keyword
 * and never inferred:
 * - a reviewed reason you gave for declining a recommendation returns on the next recommendation
 *   of the same kind;
 * - your last shift debrief's "one thing for next shift" returns under PREP before the next shift;
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

export async function getRememberedLesson(current: Recommendation): Promise<RememberedLesson | undefined> {
  const linked = (await getDecisionJournalEntries()).filter((e) => e.status === "REVIEWED" && e.linkedRecommendationId);
  if (!linked.length) return undefined;
  const recs = await db.recommendations.bulkGet(linked.map((e) => e.linkedRecommendationId!));
  const kindOf = new Map(recs.flatMap((r) => r ? [[r.id, r.kind] as const] : []));
  return lessonForKind(linked, kindOf, current);
}

export interface DebriefCarry { entryId: string; plan: string; outcome?: string; lesson?: string }

/** Pure: the latest debrief from an earlier lived day that named one thing for next shift. */
export function debriefCarryForward(entries: readonly DecisionJournalEntry[], now: Date): DebriefCarry | undefined {
  const start = livedDayStartOf(now).getTime();
  const last = entries.filter((e) => isShiftDebrief(e) && Date.parse(e.createdAt) < start)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (!last?.expectation) return undefined;
  return { entryId: last.id, plan: last.expectation, ...(last.outcome ? { outcome: last.outcome } : {}), ...(last.lesson ? { lesson: last.lesson } : {}) };
}

export async function getDebriefCarryForward(now: Date = new Date()): Promise<DebriefCarry | undefined> {
  return debriefCarryForward(await getDecisionJournalEntries(), now);
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
