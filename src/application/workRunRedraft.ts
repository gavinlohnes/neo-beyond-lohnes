import type { CaptureItem, Recommendation } from "../domain/common/types";
import { traceShortSleepStreak } from "../engine/evaluate";
import { formatLocalDate } from "../engine/scheduledContext";
import { db } from "../persistence/db";
import { getActiveDay, getAllCaptureItems, getLatestRecommendation } from "./queries";
import { getWeekPlanner, type PlannerDay } from "./weekPlannerQueries";

/**
 * WORK-RUN-REDRAFT-001: offer a fresh work-run draft when something changed since the saved plan note.
 * A pure comparison of the latest saved note's own day lines (its snapshot) with today's inputs. It never writes,
 * never re-plans and never edits a saved note; a new note is saved only through the existing confirm step.
 */
export const WORK_RUN_NOTE_PREFIX = "Work-run plan · ";

/** `implied`: a date between the note's local save date and its first day line — a known day off when it was drafted. */
export interface SavedRunDay { date: string; work: "WORK" | "OFF"; startHour: number | null; implied?: true }
export interface SavedRunNote { id: string; capturedAt: string; days: SavedRunDay[] }
export type RedraftReason =
  | { kind: "WORK_CHANGED"; date: string; saved: SavedRunDay; now: { work: "WORK" | "OFF"; startHour: number | null; basis: PlannerDay["basis"] } }
  | { kind: "SHORT_SLEEP"; evidence: string; firstIssuedAt: string };
/** The existing two-short-sleeps fact as issued: the nights the Engine judged, and when guidance first carried them. */
export interface ShortSleepSighting { evidence: string; firstIssuedAt: string }
export interface RedraftOffer { noteId: string; savedAt: string; reasons: RedraftReason[]; fingerprint: string }

// The exact day header composeWorkRunDraft writes. An edited line that no longer matches is simply not compared.
const DAY_LINE = /^(\d{4}-\d{2}-\d{2}) — (Work|Day off) \([^)]*\)(?: · starts (\d{2}):00)?\s*$/;

/** Reads the saved note's own day lines. Null when it is not a work-run note or no day line survives editing. */
export function parseWorkRunNote(item: Pick<CaptureItem, "id" | "text" | "capturedAt">): SavedRunNote | null {
  if (!item.text.startsWith(WORK_RUN_NOTE_PREFIX)) return null;
  const days: SavedRunDay[] = [];
  for (const line of item.text.split("\n")) {
    const match = DAY_LINE.exec(line.trim());
    if (!match || days.some((d) => d.date === match[1])) continue;
    days.push({ date: match[1]!, work: match[2] === "Work" ? "WORK" : "OFF", startHour: match[3] ? Number(match[3]) : null });
  }
  return days.length ? { id: item.id, capturedAt: item.capturedAt, days } : null;
}

const comparable = (d: PlannerDay) => d.basis !== "UNKNOWN" && d.basis !== "WHAT_IF";
const traceValue = (rec: Pick<Recommendation, "trace">, key: string) => rec.trace?.inputs.find((input) => input.key === key)?.value;

/**
 * SLEEP-ENGINE-001's fact, keyed on the trace's own `shortSleepEvidence` (the nights judged), not on a recommendation:
 * guidance is reissued at every check-in with the same nights. `firstIssuedAt` is the earliest issued guidance that
 * carried exactly this evidence with the streak. No evidence, or no streak, is no sighting.
 */
export function shortSleepSighting(latest: Pick<Recommendation, "issuedAt" | "trace"> | null, issued: readonly Pick<Recommendation, "issuedAt" | "trace">[]): ShortSleepSighting | null {
  if (!latest || !traceShortSleepStreak(latest.trace)) return null;
  const evidence = traceValue(latest, "shortSleepEvidence");
  if (typeof evidence !== "string" || !evidence) return null;
  const firstIssuedAt = [latest, ...issued].filter((rec) => traceShortSleepStreak(rec.trace) && traceValue(rec, "shortSleepEvidence") === evidence)
    .map((rec) => rec.issuedAt).sort()[0]!;
  return { evidence, firstIssuedAt };
}

/**
 * The two triggers, and only these:
 * 1. A date the note still covers (today's calendar date or later, inside Week planner's seven dates) now resolves to a
 *    different work/off context, or a different known shift start, from recorded / confirmed / forecast context —
 *    a confirmed extra shift, a confirmed day off, a recorded override or a saved-rotation change. Unknown now is not a
 *    change (unknown days are never guessed). The dates from the note's local save date up to its first day line count
 *    as saved days off: the draft (`runBlock`) only skips known leading days off, so an extra shift confirmed on one of
 *    them is a change too.
 * 2. SLEEP-ENGINE-001's existing two-short-main-sleeps fact, when guidance first carried its nights (its evidence) after
 *    the note was saved, while the note still covers a date. Reissued guidance with the same nights is not new.
 * Past dates, dates outside the horizon, resolved notes and notes with no readable day lines never produce an offer.
 */
export function detectWorkRunChange(note: SavedRunNote | null, days: readonly PlannerDay[], sleep: ShortSleepSighting | null): RedraftOffer | null {
  if (!note || !days.length) return null;
  const today = days[0]!.date, current = new Map(days.map((d) => [d.date, d]));
  const first = note.days.map((d) => d.date).sort()[0]!, savedOn = formatLocalDate(new Date(note.capturedAt));
  const leading: SavedRunDay[] = days.filter((d) => d.date >= savedOn && d.date < first).map((d) => ({ date: d.date, work: "OFF", startHour: null, implied: true }));
  const remaining = [...leading, ...note.days].filter((d) => d.date >= today);
  if (!remaining.length) return null;
  const reasons: RedraftReason[] = [];
  for (const saved of remaining) {
    const now = current.get(saved.date);
    if (!now || !comparable(now)) continue;
    const startChanged = saved.work === "WORK" && now.work === "WORK" && saved.startHour !== null && now.shiftStartHour !== null && saved.startHour !== now.shiftStartHour;
    if (saved.work !== now.work || startChanged) reasons.push({ kind: "WORK_CHANGED", date: saved.date, saved, now: { work: now.work, startHour: now.work === "WORK" ? now.shiftStartHour : null, basis: now.basis } });
  }
  if (sleep && sleep.firstIssuedAt > note.capturedAt) reasons.push({ kind: "SHORT_SLEEP", evidence: sleep.evidence, firstIssuedAt: sleep.firstIssuedAt });
  if (!reasons.length) return null;
  const fingerprint = [note.id, ...reasons.map((r) => r.kind === "SHORT_SLEEP" ? `sleep:${r.evidence}` : `${r.date}:${r.now.work}:${r.now.startHour ?? ""}`)].join("|");
  return { noteId: note.id, savedAt: note.capturedAt, reasons, fingerprint };
}

/** Read-only: the latest saved work-run note (unless resolved in Capture), Week planner context and issued guidance. */
export async function getWorkRunRedraftOffer(now = new Date()): Promise<RedraftOffer | null> {
  const items = await getAllCaptureItems();
  const latest = [...items].reverse().find((item) => item.text.startsWith(WORK_RUN_NOTE_PREFIX));
  if (!latest || latest.status === "RESOLVED") return null;
  const note = parseWorkRunNote(latest);
  if (!note) return null;
  const [week, active] = await Promise.all([getWeekPlanner(now), getActiveDay()]);
  const recommendation = active ? await getLatestRecommendation(active.id) : undefined;
  const streak = recommendation && traceShortSleepStreak(recommendation.trace) ? await db.recommendations.filter((rec) => traceShortSleepStreak(rec.trace)).toArray() : [];
  return detectWorkRunChange(note, week.days, shortSleepSighting(recommendation ?? null, streak));
}

const BASIS: Record<PlannerDay["basis"], string> = { RECORDED: "recorded", CONFIRMED: "confirmed change", PREDICTED: "saved schedule", WHAT_IF: "what-if", UNKNOWN: "unknown" };
const label = (work: "WORK" | "OFF", hour: number | null) => work === "WORK" ? `Work${hour !== null ? ` from ${String(hour).padStart(2, "0")}:00` : ""}` : "Day off";
export function describeRedraftReason(reason: RedraftReason): string {
  if (reason.kind === "SHORT_SLEEP") return "Two short main sleeps in a row were counted in BEYOND's guidance after this note was saved.";
  if (reason.saved.implied) return `${reason.date}: a day off before your note's first day; now ${label(reason.now.work, reason.now.startHour)} (${BASIS[reason.now.basis]}).`;
  return `${reason.date}: your note says ${label(reason.saved.work, reason.saved.startHour)}; now ${label(reason.now.work, reason.now.startHour)} (${BASIS[reason.now.basis]}).`;
}

// NOT NOW lasts until the change itself changes (same pattern as the coach card's SKIP): the fingerprint is the note,
// each changed date with its new context, and the judged nights for short sleep — not a recommendation id, so reissued
// guidance with the same nights stays dismissed. A display preference only: it never touches a record, and an
// unreadable value simply shows the offer again.
const DISMISSED = "beyond.workRunRedraft.dismissed.v1";
export function isRedraftDismissed(offer: RedraftOffer): boolean {
  try { return localStorage.getItem(DISMISSED) === offer.fingerprint; } catch { return false; }
}
export function dismissRedraftOffer(offer: RedraftOffer): void {
  localStorage.setItem(DISMISSED, offer.fingerprint);
}
