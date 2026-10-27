import type { DecisionJournalEntry } from "../domain/journal/types";
import type { Recommendation } from "../domain/common/types";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "./journalCommands";
import { getDecisionJournalEntries } from "./journalQueries";
import { noteShiftHandoff } from "./commands";
import { skipShiftHandoff } from "./shiftHandoffQueries";

/**
 * LOOP step 2 — REFLECT (owner approval 2026-10-27, "go reflect"; brief docs/agent/LOOP.md).
 * Pushback and debriefs are ordinary Decision Journal entries written through the existing
 * journal commands — no new record kind, event type or schema. A declined recommendation's reason
 * carries the journal's dormant `linkedRecommendationId`; a shift debrief is titled
 * SHIFT_DEBRIEF_TITLE. Either asks "how did it go?" from the next lived day, answered through the
 * journal's own review. Nothing here feeds the Engine or changes a recommendation.
 *
 * LOOP-002 (owner approval 2026-10-27, "go LOOP-002"): the debrief is no longer its own card. It is
 * one question ("How was it?") in the existing NOTES-HANDOFF-001 prompt after MARK WORK ENDED; the
 * handoff note is the debrief's "one thing for next shift", and the next shift's "From last shift"
 * row asks whether it happened.
 */
export const SHIFT_DEBRIEF_TITLE = "Shift debrief";

export const DECLINE_REASONS = ["Not today", "Wrong for me"] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export const SHIFT_FELT = ["Rough", "OK", "Good"] as const;
export type ShiftFelt = (typeof SHIFT_FELT)[number];

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

/** Pure: the open debrief written with a handoff note — same lived day as the note, with a plan to ask about. */
export function debriefForNote(entries: readonly DecisionJournalEntry[], notedAt: string): DecisionJournalEntry | undefined {
  const day = livedDayStartOf(new Date(notedAt)).getTime();
  return entries.find((e) => isShiftDebrief(e) && e.status === "OPEN" && e.expectation && livedDayStartOf(new Date(e.createdAt)).getTime() === day);
}

export async function getDebriefForNote(notedAt: string): Promise<DecisionJournalEntry | undefined> {
  return debriefForNote(await getDecisionJournalEntries(), notedAt);
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

/** The debrief: how the shift felt, and the one thing for next shift (the handoff note). */
export async function recordShiftDebrief(input: { felt: ShiftFelt; next?: string; now?: Date }): Promise<DecisionJournalEntry> {
  const day = livedDayStartOf(input.now ?? new Date()).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return createDecisionJournalEntry({
    title: SHIFT_DEBRIEF_TITLE,
    context: `Lived day starting ${day}`,
    decision: `Shift felt ${input.felt.toLowerCase()}`,
    ...(input.next?.trim() ? { expectation: `Next shift: ${input.next.trim()}` } : {}),
  });
}

/**
 * LOOP-002: closing the shift in one step. A note is the existing handoff (SHIFT_HANDOFF_NOTED); a
 * feeling is a debrief journal entry carrying that note as its plan. Feeling only: the prompt is
 * dismissed the way SKIP does it. The note is written first — the handoff is the part the next
 * shift depends on.
 */
export async function closeShift(dayId: string, input: { felt?: ShiftFelt | null; note?: string }): Promise<void> {
  const note = input.note?.trim() ?? "";
  if (!note && !input.felt) throw new Error("EMPTY_HANDOFF: Write a note, or skip it.");
  if (note) await noteShiftHandoff(dayId, note);
  if (input.felt) await recordShiftDebrief({ felt: input.felt, ...(note ? { next: note } : {}) });
  if (!note) skipShiftHandoff(dayId);
}

/** "How did it go?" — the journal's own review, so the outcome and lesson live with the entry. */
export async function answerFollowUp(id: string, outcome: string, lesson?: string): Promise<DecisionJournalEntry> {
  return reviewDecisionJournalEntry(id, { outcome, ...(lesson?.trim() ? { lesson: lesson.trim() } : {}) });
}
