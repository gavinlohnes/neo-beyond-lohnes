import type { DailyNote } from "../domain/dailyNotes";
import type { Learning } from "./delta";
import type { Obligation } from "../domain/intent/types";
import { formatLocalDate } from "../engine/scheduledContext";
import { db } from "../persistence/db";
import { saveDailyNote } from "./dailyNoteCommands";
import { createObligation } from "./intentCommands";
import { noteTags } from "./noteTags";
import { getActiveDay } from "./queries";
import { getWholePicture } from "./wholePictureQueries";
import type { PictureRow } from "./wholePictureProjection";

/**
 * BIG-IDEAS-001 item 5, the weekly interview and timeline (Gavin, 2026-11-11: "Implement Weekly Interview /
 * Timeline"). The last 7 finished lived days as a timeline of what was recorded (shift or day off, sleep, naps,
 * check-in energy, workouts and the day's note), and three short questions chosen from that week's own records:
 * its best day, its hardest day and its gaps, then one thing to carry forward. Read only until SAVE: the answers
 * are added to a daily note tagged #timeline (no new data type), and the carry-forward answer becomes a plan item
 * only on its own confirmation. Never an Engine input.
 */
export const TIMELINE_TAG = "timeline";
export const WEEK_DAYS = 7;

export interface TimelineDay {
  date: string;
  dayId: string | undefined;
  context: "WORK" | "OFF" | "UNKNOWN";
  sleepHours: number | undefined;
  napMinutes: number | undefined;
  energy: number | undefined;
  workouts: number;
  /** The note's first line, at most 120 characters, and its #tags. */
  note: string | undefined;
  tags: string[];
}
export interface InterviewQuestion { id: "BEST" | "HARD" | "GAP" | "CARRY"; text: string; /** What in the records chose it. */ why: string }
export interface WeeklyInterview { from: string; to: string; days: TimelineDay[]; questions: InterviewQuestion[] }

const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const firstLine = (text: string) => { const line = text.split("\n").find((l) => l.trim())?.trim(); return line ? (line.length > 120 ? `${line.slice(0, 119)}…` : line) : undefined; };

export function deriveWeeklyInterview(rows: readonly PictureRow[], notes: ReadonlyMap<string, string>): WeeklyInterview | null {
  const week = rows.slice(-WEEK_DAYS);
  if (week.length === 0) return null;
  const days: TimelineDay[] = week.map((row) => {
    const dayId = row.dayIds[0];
    const text = dayId ? notes.get(dayId) : undefined;
    return {
      date: formatLocalDate(new Date(row.start)), dayId, context: row.context,
      sleepHours: row.sleepHours, napMinutes: row.napMinutes, energy: row.energy, workouts: row.dayIds.length ? row.sessions : 0,
      note: text ? firstLine(text) : undefined, tags: text ? noteTags(text) : [],
    };
  });

  const questions: InterviewQuestion[] = [];
  // Ties go to the earliest day, so the same records always ask the same questions.
  const pick = (values: { day: TimelineDay; v: number }[], better: (a: number, b: number) => boolean) =>
    values.reduce<{ day: TimelineDay; v: number } | null>((p, c) => (!p || better(c.v, p.v) ? c : p), null);
  const energies = days.flatMap((day) => day.energy === undefined ? [] : [{ day, v: day.energy }]);
  const sleeps = days.flatMap((day) => day.sleepHours === undefined ? [] : [{ day, v: day.sleepHours }]);

  const best = pick(energies, (a, b) => a > b);
  questions.push(best && energies.length >= 2
    ? { id: "BEST", text: `${weekday(best.day.date)} was your highest-energy day this week. What made it work?`, why: `Check-in energy ${best.v} of 5, the highest of ${energies.length} checked-in days.` }
    : { id: "BEST", text: "What went well this week?", why: "Fewer than 2 check-ins this week, so no best day is named." });

  const low = pick(sleeps, (a, b) => a < b);
  const lowEnergy = pick(energies, (a, b) => a < b);
  questions.push(low && sleeps.length >= 2
    ? { id: "HARD", text: `${weekday(low.day.date)} had your shortest sleep this week. What got in the way?`, why: `${low.v.toFixed(1)} h, the shortest of ${sleeps.length} days with sleep logged.` }
    : lowEnergy && energies.length >= 2 && lowEnergy.v !== best?.v
      ? { id: "HARD", text: `${weekday(lowEnergy.day.date)} was your lowest-energy day. What took it out of you?`, why: `Check-in energy ${lowEnergy.v} of 5.` }
      : { id: "HARD", text: "What was the hardest part of this week?", why: "Too little sleep or energy logged to name a day." });

  const blank = days.filter((day) => !day.dayId);
  const quiet = days.filter((day) => day.dayId && day.energy === undefined && day.sleepHours === undefined && !day.note);
  const gap = blank.length ? blank : quiet;
  questions.push(gap.length
    ? { id: "GAP", text: `${gap.length === 1 ? weekday(gap[0]!.date) : `${gap.length} days`} ${gap.length === 1 ? "has" : "have"} little on record. What happened${gap.length === 1 ? " that day" : " on them"}?`,
        why: `${gap.map((day) => weekday(day.date)).join(", ")}: ${blank.length ? "no day opened" : "no sleep, check-in or note"}.` }
    : { id: "GAP", text: "Anything this week the records don't show?", why: "Every day has something on record." });

  questions.push({ id: "CARRY", text: "What's one thing to carry into next week?", why: "You can also save it as a plan item." });
  return { from: days[0]!.date, to: days.at(-1)!.date, days, questions };
}

/** The exact text SAVE adds to the note: a #timeline block with each answered question. Empty answers are left out. */
export function interviewNoteText(interview: Pick<WeeklyInterview, "from" | "to" | "questions">, answers: Partial<Record<InterviewQuestion["id"], string>>): string | null {
  const answered = interview.questions.filter((q) => answers[q.id]?.trim());
  if (!answered.length) return null;
  return [`#${TIMELINE_TAG} Week ${weekday(interview.from)} – ${weekday(interview.to)}`, ...answered.flatMap((q) => [`Q: ${q.text}`, `A: ${answers[q.id]!.trim()}`])].join("\n");
}

export async function getWeeklyInterview(now: Date = new Date()): Promise<WeeklyInterview | null> {
  const picture = await getWholePicture(now);
  const week = picture.rows.slice(-WEEK_DAYS);
  const ids = week.flatMap((row) => row.dayIds.slice(0, 1));
  const notes = (await db.dailyNotes.bulkGet(ids)).filter((n): n is DailyNote => !!n);
  return deriveWeeklyInterview(picture.rows, new Map(notes.map((n) => [n.dayId, n.text])));
}

/** Where SAVE adds the block: today's open lived day, else the newest day in the week. */
export async function interviewNoteDay(interview: WeeklyInterview): Promise<{ dayId: string; date: string } | null> {
  const active = await getActiveDay();
  if (active) return { dayId: active.id, date: formatLocalDate(new Date(active.startedAt)) };
  const last = [...interview.days].reverse().find((day) => day.dayId);
  return last ? { dayId: last.dayId!, date: last.date } : null;
}

/** SAVE, after the preview: adds the block to the end of that day's note (its existing text is kept) through saveDailyNote. */
export async function saveInterviewNote(dayId: string, block: string): Promise<DailyNote> {
  const existing = (await db.dailyNotes.get(dayId))?.text.trim();
  return saveDailyNote(dayId, existing ? `${existing}\n\n${block}` : block);
}

/** The carry-forward answer as a plan item, only on its own confirmation. Undated, so it never reaches arbitration. */
export function saveCarryForward(answer: string): Promise<Obligation> {
  const title = answer.trim().length > 120 ? `${answer.trim().slice(0, 119)}…` : answer.trim();
  return createObligation({ title, description: "From your weekly interview." });
}

/** Past interviews: notes carrying #timeline, newest first. The existing search already finds them by their words. */
export async function getTimelineEntries(): Promise<{ dayId: string; text: string; updatedAt: string }[]> {
  const notes = await db.dailyNotes.orderBy("updatedAt").reverse().toArray();
  return notes.filter((n) => noteTags(n.text).includes(TIMELINE_TAG)).map((n) => ({ dayId: n.dayId, text: n.text, updatedAt: n.updatedAt }));
}

/** REFLECT-001: DELTA's learnings dated inside the interview's week (by local date), newest first, at most `limit`. */
export function learnedThisWeek(learnings: readonly Learning[], week: Pick<WeeklyInterview, "from" | "to">, limit = 3): Learning[] {
  return learnings.filter((l) => { const d = formatLocalDate(new Date(l.learnedOn)); return d >= week.from && d <= week.to; })
    .sort((a, b) => b.learnedOn.localeCompare(a.learnedOn)).slice(0, limit);
}

/** REFLECT-001: how many of the last 7 days (by when the lived day started) have a saved daily note. */
export async function getWeekNoteCount(now: Date = new Date()): Promise<number> {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (WEEK_DAYS - 1)).toISOString();
  const days = await db.beyondDays.where("startedAt").aboveOrEqual(since).toArray();
  const notes = await db.dailyNotes.bulkGet(days.map((d) => d.id));
  return notes.filter((n) => n?.text.trim()).length;
}
