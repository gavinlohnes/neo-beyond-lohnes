import type { SchedulePattern } from "../domain/common/types";
import type { DailyNote } from "../domain/dailyNotes";
import { db } from "../persistence/db";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { saveDailyNote } from "./dailyNoteCommands";
import { getActiveDay, getSchedulePattern } from "./queries";
import { getConfirmedKinds } from "./scheduleExceptions";
import { shiftRun } from "./shiftRun";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { getBodyweightHistory } from "./bodyTrendQueries";
import { getLogNudge, usualTimesFor, type LogNudgeSettings } from "./logNudge";

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

/**
 * GRAYSON-CLOSE-GAPS-001 (Gavin, 2026-11-24: "I don't want it to be annoying and pester me"; "I should be able to edit
 * and tweak or correct everything in this app"): one muted line at the top of the close naming what didn't get logged,
 * at most two gaps, meals then weight. No counts, no streaks, no "you forgot". Tapping it opens Delta with the words
 * ready; nothing is sent until he sends it.
 */
export const CLOSE_GAP_WEIGH_DEFAULT = 3;
export const CLOSE_GAP_WEIGH_MIN = 1;
export const CLOSE_GAP_WEIGH_MAX = 14;
export interface CloseGapSettings { enabled: boolean; weighGapDays: number }
export const DEFAULT_CLOSE_GAPS: CloseGapSettings = { enabled: true, weighGapDays: CLOSE_GAP_WEIGH_DEFAULT };
export type CloseGapKind = "MEALS" | "WEIGHT";
export interface CloseGaps { gaps: { kind: CloseGapKind; text: string }[]; ask: string }
export const CLOSE_GAP_ASK: Record<CloseGapKind, string> = { MEALS: "I ate ", WEIGHT: "My weight this morning was " };

const localDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const calendarDaysBetween = (from: Date, to: Date) => Math.round((localDay(to) - localDay(from)) / 86_400_000);

/**
 * Pure. Meals: when this day kind has usual meal times (learned, or his own) and no live meal of this lived day falls
 * outside the shift window. Weight: no weigh-in for `weighGapDays` calendar days (his local dates), or none ever.
 */
export function deriveCloseGaps(input: {
  settings: CloseGapSettings; now: Date; hasUsualTimes: boolean; meals: readonly string[];
  shift: { start: Date; end: Date } | null; lastWeighIn: string | null;
}): CloseGaps | null {
  const { settings, now } = input;
  if (!settings.enabled) return null;
  const gaps: CloseGaps["gaps"] = [];
  if (input.hasUsualTimes) {
    const outside = input.meals.map((m) => Date.parse(m)).filter((t) => Number.isFinite(t)
      && !(input.shift && t >= input.shift.start.getTime() && t <= input.shift.end.getTime()));
    if (outside.length === 0) gaps.push({ kind: "MEALS", text: input.shift ? "No meals logged today outside your shift." : "No meals logged today." });
  }
  const last = input.lastWeighIn ? new Date(input.lastWeighIn) : null;
  if (!last || Number.isNaN(last.getTime())) gaps.push({ kind: "WEIGHT", text: "No weigh-in yet." });
  else if (calendarDaysBetween(last, now) >= settings.weighGapDays) {
    gaps.push({ kind: "WEIGHT", text: `No weigh-in since ${last.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.` });
  }
  if (gaps.length === 0) return null;
  const shown = gaps.slice(0, 2);
  return { gaps: shown, ask: CLOSE_GAP_ASK[shown[0]!.kind] };
}

/** Read only. The gaps for this day's close. `nudge` is his logging-nudge settings, so his own meal times count too. */
export async function getCloseGaps(dayId: string, settings: CloseGapSettings, nudge: LogNudgeSettings, now: Date = new Date()): Promise<CloseGaps | null> {
  if (!settings.enabled) return null;
  const [day, pattern, read, history] = await Promise.all([
    db.beyondDays.get(dayId), getSchedulePattern(), getLogNudge(dayId, now), getBodyweightHistory().catch(() => []),
  ]);
  if (!day || !read) return null;
  const shift = day.workContext === "OFF" ? null : livedDayShiftWindow(new Date(day.startedAt), pattern);
  const latest = history.reduce<string | null>((a, w) => (a === null || Date.parse(w.recordedAt) > Date.parse(a) ? w.recordedAt : a), null);
  return deriveCloseGaps({
    settings, now, meals: read.meals, shift, lastWeighIn: latest,
    hasUsualTimes: read.kind !== null && usualTimesFor(read.kind, read.learned, nudge).length > 0,
  });
}
