import type { DecisionJournalEntry } from "../domain/journal/types";
import type { Recommendation } from "../domain/common/types";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "./journalCommands";
import { getDecisionJournalEntries } from "./journalQueries";

/**
 * LOOP step 2 — REFLECT (owner approval 2026-10-27, "go reflect"; brief docs/agent/LOOP.md).
 * Pushback and debriefs are ordinary Decision Journal entries written through the existing
 * journal commands — no new record kind, event type or schema. A declined recommendation's reason
 * carries the journal's dormant `linkedRecommendationId`; a shift debrief is titled
 * SHIFT_DEBRIEF_TITLE. Either asks "how did it go?" from the next lived day, answered through the
 * journal's own review. Nothing here feeds the Engine or changes a recommendation.
 */
export const SHIFT_DEBRIEF_TITLE = "Shift debrief";

export const DECLINE_REASONS = ["Not today", "Wrong for me"] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export const SHIFT_FELT = ["Rough", "OK", "Good"] as const;
export type ShiftFelt = (typeof SHIFT_FELT)[number];
export const SHIFT_BECAUSE = ["Sleep", "Workload", "Food", "People", "Training"] as const;

/** Quick answers to "how did it go?": a declined recommendation, and a debrief's plan for next shift. */
export const DECLINE_OUTCOMES = ["Glad I didn't", "Should have done it", "No real difference"] as const;
export const DEBRIEF_OUTCOMES = ["Did it", "Didn't get to it", "Changed my mind"] as const;

/** The 16:30 start of the lived day containing `now`. */
export function livedDayStartOf(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 30, 0, 0);
  return now >= start ? start : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 16, 30, 0, 0);
}

export function isShiftDebrief(entry: DecisionJournalEntry): boolean {
  return entry.title === SHIFT_DEBRIEF_TITLE;
}

/** The reason already given for this recommendation, if any. */
export async function getReflectionFor(recommendationId: string): Promise<DecisionJournalEntry | undefined> {
  return (await getDecisionJournalEntries()).find((entry) => entry.linkedRecommendationId === recommendationId);
}

/** This lived day's debrief, if one was written. */
export async function getShiftDebriefFor(now: Date = new Date()): Promise<DecisionJournalEntry | undefined> {
  const start = livedDayStartOf(now).getTime();
  return (await getDecisionJournalEntries()).find((entry) => isShiftDebrief(entry) && Date.parse(entry.createdAt) >= start);
}

/** Open reflections and debriefs from an earlier lived day — ready for "how did it go?". Oldest first. Pure. */
export function followUpsDue(entries: readonly DecisionJournalEntry[], now: Date = new Date()): DecisionJournalEntry[] {
  const start = livedDayStartOf(now).getTime();
  return entries
    .filter((entry) => entry.status === "OPEN" && (entry.linkedRecommendationId || isShiftDebrief(entry)) && Date.parse(entry.createdAt) < start)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export async function getFollowUpsDue(now: Date = new Date()): Promise<DecisionJournalEntry[]> {
  return followUpsDue(await getDecisionJournalEntries(), now);
}

/** "Not doing this" — and why. Records the reason only; the decline itself is declineRecommendation's. */
export async function reflectOnDecline(
  recommendation: { id: Recommendation["id"]; title: string; why: string },
  reason: DeclineReason,
  note?: string,
): Promise<DecisionJournalEntry> {
  return createDecisionJournalEntry({
    title: `Not doing: ${recommendation.title}`,
    context: `BEYOND suggested it: ${recommendation.why}`,
    decision: reason,
    ...(note?.trim() ? { reasoning: note.trim() } : {}),
    linkedRecommendationId: recommendation.id,
  });
}

/** The 30-second debrief: how it felt, what made it so, and one thing for next shift. */
export async function recordShiftDebrief(input: { felt: ShiftFelt; because: readonly string[]; next?: string; now?: Date }): Promise<DecisionJournalEntry> {
  const day = livedDayStartOf(input.now ?? new Date()).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return createDecisionJournalEntry({
    title: SHIFT_DEBRIEF_TITLE,
    context: `Lived day starting ${day}`,
    decision: `Shift felt ${input.felt.toLowerCase()}`,
    ...(input.because.length ? { reasoning: `Mostly: ${input.because.join(", ").toLowerCase()}` } : {}),
    ...(input.next?.trim() ? { expectation: `Next shift: ${input.next.trim()}` } : {}),
  });
}

/** "How did it go?" — the journal's own review, so the outcome and lesson live with the entry. */
export async function answerFollowUp(id: string, outcome: string, lesson?: string): Promise<DecisionJournalEntry> {
  return reviewDecisionJournalEntry(id, { outcome, ...(lesson?.trim() ? { lesson: lesson.trim() } : {}) });
}
