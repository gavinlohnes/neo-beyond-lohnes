import type { DecisionJournalEntry, MissedReason } from "../domain/journal/types";
import type { Recommendation } from "../domain/common/types";
import { createDecisionJournalEntry, modifyDecisionJournalEntry, reviewDecisionJournalEntry } from "./journalCommands";
import { getDecisionJournalEntries } from "./journalQueries";
import { noteShiftHandoff } from "./commands";
import { skipShiftHandoff } from "./shiftHandoffQueries";
import { isRunDebriefSkipped, skipRunDebrief } from "../persistence/runDebriefSkips";

export { isRunDebriefSkipped, skipRunDebrief };

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
  /** GRAYSON C6.5: what BEYOND's data missed, optional. */
  missed?: MissedReason | null,
): Promise<DecisionJournalEntry> {
  return createDecisionJournalEntry({
    title: `Not doing: ${recommendation.title}`,
    context: `BEYOND suggested it: ${recommendation.why}`,
    decision: reason,
    ...(note?.trim() ? { reasoning: note.trim() } : {}),
    linkedRecommendationId: recommendation.id,
    ...(missed ? { missed } : {}),
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

/**
 * GRAYSON-RUN-DEBRIEF-001 (C2.5, Gavin 2026-11-24): on RUN OVER, "How did the run go?" One tap writes one journal
 * entry; "One thing for next run" is its optional expectation. Not SHIFT_DEBRIEF_TITLE, so followUpsDue never asks
 * "how did it go?" about it. The run is keyed by its last work day (PostRunReport.to), carried in the context line.
 */
export const RUN_DEBRIEF_TITLE = "Run debrief";
export const RUN_NEXT_MAX = 200;
const runShort = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** "Run Nov 18 to Nov 21, 4 shifts" (or "Run Nov 21, 1 shift"). The last date after "Run " / " to " is the key. */
export function runDebriefContext(run: { from: string; to: string; shifts: number }): string {
  const dates = run.from === run.to ? runShort(run.to) : `${runShort(run.from)} to ${runShort(run.to)}`;
  return `Run ${dates}, ${run.shifts} ${run.shifts === 1 ? "shift" : "shifts"}`;
}

export function isRunDebrief(entry: DecisionJournalEntry): boolean {
  return entry.title === RUN_DEBRIEF_TITLE;
}

/**
 * Pure: this run's debrief. Same title, the context's last date is the run's last work day, and it was written in the
 * 60 days after that day (so last year's Nov 21 isn't this year's).
 */
export function runDebriefFor(entries: readonly DecisionJournalEntry[], runEnd: string): DecisionJournalEntry | undefined {
  const key = runShort(runEnd);
  const end = new Date(`${runEnd}T00:00:00`).getTime();
  return entries.find((e) => {
    if (!isRunDebrief(e) || !e.context) return false;
    const m = /^Run (?:.+ to )?([A-Z][a-z]{2} \d{1,2}),/.exec(e.context);
    const at = Date.parse(e.createdAt);
    return m?.[1] === key && at >= end && at < end + 60 * 86_400_000;
  });
}

export async function getRunDebrief(runEnd: string): Promise<DecisionJournalEntry | undefined> {
  return runDebriefFor(await getDecisionJournalEntries(), runEnd);
}

export const runFeltLine = (felt: ShiftFelt) => `Run felt ${felt.toLowerCase()}`;
export const runNextLine = (next: string) => `Next run: ${next.trim()}`;

/** Tap 1: how the run felt. A new log, so the caller stays quiet (no Undo). */
export async function recordRunDebrief(input: { felt: ShiftFelt; run: { from: string; to: string; shifts: number } }): Promise<DecisionJournalEntry> {
  return createDecisionJournalEntry({ title: RUN_DEBRIEF_TITLE, context: runDebriefContext(input.run), decision: runFeltLine(input.felt) });
}

/** Tap 2 (optional), or a fix: the one thing for next run, on the same entry. */
export async function setRunDebriefNext(id: string, next: string): Promise<DecisionJournalEntry> {
  const text = next.trim();
  if (!text) throw new Error("EMPTY_RUN_NEXT: Write the one thing, or choose DONE.");
  if (text.length > RUN_NEXT_MAX) throw new Error(`RUN_NEXT_TOO_LONG: Keep it to ${RUN_NEXT_MAX} characters.`);
  return modifyDecisionJournalEntry(id, { expectation: runNextLine(text) });
}

/** A fix: re-pick the word on the same entry. */
export async function changeRunDebriefFelt(id: string, felt: ShiftFelt): Promise<DecisionJournalEntry> {
  return modifyDecisionJournalEntry(id, { decision: runFeltLine(felt) });
}

/** Undo of a fix: put the word and (if there was one) the line back as they were. */
export async function restoreRunDebrief(id: string, before: { decision: string; expectation?: string }): Promise<DecisionJournalEntry> {
  return modifyDecisionJournalEntry(id, { decision: before.decision, ...(before.expectation ? { expectation: before.expectation } : {}) });
}
