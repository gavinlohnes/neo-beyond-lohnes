import type { SchedulePattern } from "../domain/common/types";
import type { DailyNote } from "../domain/dailyNotes";
import { db } from "../persistence/db";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { saveDailyNote } from "./dailyNoteCommands";
import { getActiveDay, getSchedulePattern } from "./queries";
import { getConfirmedKinds } from "./scheduleExceptions";
import { shiftRun } from "./shiftRun";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";

/**
 * GRAYSON C1.3 + C1.4 (Gavin, 2026-11-20): the close. It follows SHIFT DOWN, his getting-home ritual ("shifting down
 * from Deputy Lohnes to just Gavin at home", 5–15 minutes), never END DAY, which he doesn't use. Under a minute and
 * optional: one line on what's next when it differs, up to two short prompts he picked, and SAVE adds the answers to
 * that day's Daily Note as a #close block, the way the weekly interview adds #timeline. Nothing else is written.
 */

export const CLOSE_TAG = "close";
export type ClosePromptId = "WELL" | "BETTER" | "THANKFUL" | "LEARN";
export const CLOSE_PROMPTS: Record<ClosePromptId, string> = {
  WELL: "What went well?",
  BETTER: "What could go better next time?",
  THANKFUL: "Anything you're thankful for?",
  LEARN: "Anything Delta should learn?",
};
export const DEFAULT_CLOSE_PROMPTS: readonly ClosePromptId[] = ["WELL", "LEARN"];
export const MAX_CLOSE_PROMPTS = 2;

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long" });
const sameDate = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * C1.4 · "Tomorrow differs". Pure. One sentence about the next lived day when it differs from this one: the run's
 * last shift, the run ending, or the way back onto shift. Abstains when the next day is more of the same, or with no
 * saved schedule. From the saved rotation and his confirmed schedule changes only.
 */
export function tomorrowDiffers(input: { now: Date; dayStartedAt: string; today: "WORK" | "OFF" | "UNKNOWN"; pattern: SchedulePattern; confirmed?: ReadonlyMap<string, "WORK" | "OFF"> }): string | null {
  const { now, pattern, confirmed } = input;
  if (input.today === "UNKNOWN") return null;
  // Review of #599: anchored to this day's own lived start (a day opened early starts at its 16:30), not the clock.
  const anchor = mostRecentBoundaryAtOrBefore(new Date(input.dayStartedAt));
  const nextStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 1, 16, 30);
  const next = shiftRun(nextStart, pattern, 21, confirmed);
  if (!next) return null;
  const shift = next.kind === "WORK" ? livedDayShiftWindow(nextStart, pattern) : null;
  const when = shift ? (sameDate(shift.start, now) ? "tonight" : weekday(shift.start)) : "";
  if (input.today === "WORK" && next.kind === "WORK") {
    return next.position === next.length && next.length > 1 ? `Next: ${when}'s shift is the last of the run.` : null;
  }
  if (input.today === "WORK" && next.kind === "OFF") {
    const back = livedDayShiftWindow(next.next, pattern);
    return `Next: the run is done. ${next.length === 1 ? "One day off" : `${next.length} days off`}${back ? `, back on ${weekday(back.start)}` : ""}.`;
  }
  if (input.today === "OFF" && next.kind === "WORK" && shift) {
    return `Next: back on shift ${when} at ${clock(shift.start)}${next.length > 1 ? `, night 1 of ${next.length}` : ""}.`;
  }
  return null;
}

/** The exact text SAVE adds to the note: a #close block with each answered prompt. Empty answers are left out. */
export function closeNoteText(label: string, answers: readonly { prompt: string; answer: string }[]): string | null {
  const answered = answers.filter((a) => a.answer.trim());
  if (!answered.length) return null;
  return [`#${CLOSE_TAG} ${label}`, ...answered.flatMap((a) => [`Q: ${a.prompt}`, `A: ${a.answer.trim()}`])].join("\n");
}

/** SAVE: adds the block to the end of that day's note (its existing text is kept) through saveDailyNote. */
export async function saveCloseNote(dayId: string, block: string): Promise<DailyNote> {
  const existing = (await db.dailyNotes.get(dayId))?.text.trim();
  return saveDailyNote(dayId, existing ? `${existing}\n\n${block}` : block);
}

/** Read only. What the close shows for the active day: its label and the "next" line, if any. */
export async function getDayClose(now: Date = new Date()): Promise<{ dayId: string; label: string; next: string | null } | null> {
  const day = await getActiveDay();
  if (!day) return null;
  const [pattern, confirmed] = await Promise.all([getSchedulePattern(), getConfirmedKinds().catch(() => new Map<string, "WORK" | "OFF">())]);
  // Named for the lived day it closes (it began at its 16:30 start), not the morning it's written.
  // Review of #599: the lived day's own date, even for a day started after midnight.
  const label = mostRecentBoundaryAtOrBefore(new Date(day.startedAt)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return { dayId: day.id, label, next: tomorrowDiffers({ now, dayStartedAt: day.startedAt, today: day.workContext, pattern, confirmed }) };
}
