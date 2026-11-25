import type { EatingWindowDayKind } from "../domain/common/types";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { db } from "../persistence/db";
import { dayKindFor } from "./eatingWindow";
import { deriveLifeState, lifeStateInput } from "./lifeState";
import { getMealEntries } from "./nutritionQueries";
import { getSchedulePattern } from "./queries";
import { getConfirmedKinds } from "./scheduleExceptions";
import { getTodayPicture } from "./todayPicture";

/**
 * GRAYSON-LOG-NUDGE-001 (Gavin, 2026-11-24: "my big problem is like remembering that I need to log stuff... I open the
 * app a lot to see my steps"; "I don't want it to be annoying and pester me"): one quiet line under TODAY's AT A GLANCE
 * tiles, at his usual meal times, that opens Delta with "I ate ". Read only; the write is Delta's existing meal log.
 *
 * Usual times are learned per day kind (WORK, RECOVERY, OFF) from his own root MEAL_LOGGED times (voids left out by
 * getMealEntries) over the last 28 lived days, leaving out meals inside the shift (the catch-up owns those). They are
 * kept as wall-clock minutes into the lived day (from its 16:30 start), so a DST change never moves them by an hour.
 */

/** Not editable yet (GRAYSON-LOG-NUDGE-001): the look-back and the evidence floor. */
export const NUDGE_LOOKBACK_DAYS = 28;
export const NUDGE_MIN_DAYS = 4;
/** Meals closer than this on one day are one meal; also how far back a logged meal answers a usual time. */
export const NUDGE_CLUSTER_MINUTES = 90;
export const NUDGE_LOOKBACK_MINUTES = 90;
export const NUDGE_MAX_TIMES = 4;
export const NUDGE_DEFAULT_DELAY = 45;
export const NUDGE_DELAY_MIN = 15;
export const NUDGE_DELAY_MAX = 120;
export const NUDGE_KINDS: readonly EatingWindowDayKind[] = ["WORK", "RECOVERY", "OFF"];

const LIVED_START_MINUTE = 16 * 60 + 30;

/** Pure. Wall-clock minutes from the lived day's 16:30 start (0–1439). */
export function livedMinute(at: Date): number {
  const m = at.getHours() * 60 + at.getMinutes() - LIVED_START_MINUTE;
  return m < 0 ? m + 1440 : m;
}
/** Pure. The instant a lived-day minute names on the lived day starting at `livedStart` (wall clock). */
export const atLivedMinute = (livedStart: Date, minute: number): Date =>
  new Date(livedStart.getFullYear(), livedStart.getMonth(), livedStart.getDate(), 16, 30 + minute);

export interface NudgeDay { kind: EatingWindowDayKind; meals: readonly number[] }
export interface LearnedTime { minute: number; days: number }
export type LearnedTimes = Record<EatingWindowDayKind, LearnedTime[]>;
export interface LogNudgeSettings { enabled: boolean; delayMinutes: number; edited: Partial<Record<EatingWindowDayKind, number[]>> }
export const DEFAULT_LOG_NUDGE: LogNudgeSettings = { enabled: true, delayMinutes: NUDGE_DEFAULT_DELAY, edited: {} };

const median = (xs: readonly number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return Math.round(s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2); };

/** Pure. One day's meals grouped into meals: a meal within 90 minutes of the one before joins it; each keeps its first time. */
function dayClusters(meals: readonly number[]): number[] {
  const out: number[] = [];
  let last = -Infinity;
  for (const m of [...meals].sort((a, b) => a - b)) {
    if (m - last >= NUDGE_CLUSTER_MINUTES) out.push(m);
    last = m;
  }
  return out;
}

/** Pure. His usual meal times per day kind: a 90-minute group of day-meals seen on at least 4 days, at its median. */
export function learnUsualMealTimes(days: readonly NudgeDay[]): LearnedTimes {
  const learned: LearnedTimes = { WORK: [], RECOVERY: [], OFF: [] };
  for (const kind of NUDGE_KINDS) {
    // Within a day, meal starts are at least 90 minutes apart, so each point in a 90-minute group is a different day.
    const points = days.filter((d) => d.kind === kind).flatMap((d) => dayClusters(d.meals)).sort((a, b) => a - b);
    const groups: number[][] = [];
    for (const p of points) {
      const g = groups.at(-1);
      if (g && p - g[0]! < NUDGE_CLUSTER_MINUTES) g.push(p); else groups.push([p]);
    }
    learned[kind] = groups.filter((g) => g.length >= NUDGE_MIN_DAYS)
      .map((g) => ({ minute: median(g), days: g.length }))
      .sort((a, b) => b.days - a.days || a.minute - b.minute)
      .slice(0, NUDGE_MAX_TIMES)
      .sort((a, b) => a.minute - b.minute);
  }
  return learned;
}

/** Pure. The times in use for a kind: his edited times win; otherwise the learned ones. */
export function usualTimesFor(kind: EatingWindowDayKind, learned: LearnedTimes, settings: LogNudgeSettings): number[] {
  const edited = settings.edited[kind];
  return [...(edited ?? learned[kind].map((t) => t.minute))].sort((a, b) => a - b);
}

export interface LogNudgeInput {
  settings: LogNudgeSettings;
  usual: readonly number[];
  livedStart: Date;
  /** When today's live (not voided) meals were eaten. */
  meals: readonly string[];
  onClock: boolean;
  operationsOnly: boolean;
  /** Usual-time minutes he answered NOT NOW to on this lived day. */
  dismissed: ReadonlySet<number>;
}
export interface LogNudge { usualMinute: number; usualAt: string; text: string }

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * Pure. The one line, if any: the latest usual time that is at least `delay` behind now, unless a meal was logged
 * since 90 minutes before it, he said NOT NOW to it, he is on the clock, or TODAY is in operations-only mode. Once a
 * usual time is answered or dismissed, only the next usual time can bring the line back.
 */
export function deriveLogNudge(input: LogNudgeInput, now: Date): LogNudge | null {
  const { settings } = input;
  if (!settings.enabled || input.onClock || input.operationsOnly) return null;
  const due = [...input.usual].sort((a, b) => a - b)
    .map((minute) => ({ minute, at: atLivedMinute(input.livedStart, minute) }))
    .filter((u) => now.getTime() >= u.at.getTime() + settings.delayMinutes * 60_000)
    .at(-1);
  if (!due || input.dismissed.has(due.minute)) return null;
  const since = new Date(due.at.getTime() - NUDGE_LOOKBACK_MINUTES * 60_000);
  const times = input.meals.map((m) => Date.parse(m)).filter((t) => Number.isFinite(t) && t <= now.getTime());
  if (times.some((t) => t >= since.getTime())) return null;
  const tail = times.length === 0 ? "Nothing logged yet today." : `Nothing logged since ${clock(since)}.`;
  return { usualMinute: due.minute, usualAt: due.at.toISOString(), text: `Usually you eat around ${clock(due.at)}. ${tail}` };
}

/** What a usual time reads as in settings, e.g. "13:10". */
export const minuteClock = (minute: number) => clock(atLivedMinute(new Date(2026, 0, 5, 16, 30), minute));
/** "HH:MM" from a time input, as a lived-day minute. */
export function minuteFromClock(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]), mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return livedMinute(new Date(2026, 0, 5, h, mm));
}

/** Read only. His learned usual times per day kind, from the last 28 lived days before `now`'s. */
export async function getLearnedMealTimes(now: Date = new Date()): Promise<LearnedTimes> {
  const [pattern, confirmed] = await Promise.all([getSchedulePattern(), getConfirmedKinds()]);
  const todayStart = mostRecentBoundaryAtOrBefore(now);
  const from = new Date(todayStart.getTime() - NUDGE_LOOKBACK_DAYS * 86_400_000 - 2 * 3_600_000);
  const records = (await db.beyondDays.where("startedAt").between(from.toISOString(), todayStart.toISOString(), true, false).toArray());
  // The recorded work context per lived day (any WORK record makes it a work day), for yesterday's side of each state.
  const keyOf = (d: Date) => mostRecentBoundaryAtOrBefore(d).getTime();
  const recorded = new Map<number, "WORK" | "OFF">();
  for (const r of records) {
    const k = keyOf(new Date(r.startedAt));
    if (r.workContext === "WORK") recorded.set(k, "WORK");
    else if (r.workContext === "OFF" && !recorded.has(k)) recorded.set(k, "OFF");
  }
  const byDay = new Map<number, { kind: EatingWindowDayKind; meals: number[] }>();
  for (const r of records) {
    const start = mostRecentBoundaryAtOrBefore(new Date(r.startedAt));
    const k = start.getTime();
    const prior = mostRecentBoundaryAtOrBefore(new Date(k - 3_600_000)).getTime();
    const reading = deriveLifeState(lifeStateInput(start, pattern, recorded.get(k) ?? null, recorded.get(prior) ?? null, undefined, confirmed));
    const kind = dayKindFor(reading?.state);
    if (!kind) continue;
    const shift = r.workContext === "OFF" ? null : livedDayShiftWindow(new Date(r.startedAt), pattern);
    const meals = (await getMealEntries(r.id).catch(() => []))
      .map((m) => Date.parse(m.at))
      .filter((t) => Number.isFinite(t) && !(shift && t >= shift.start.getTime() && t <= shift.end.getTime()))
      .map((t) => livedMinute(new Date(t)));
    const e = byDay.get(k) ?? { kind, meals: [] };
    e.meals.push(...meals);
    byDay.set(k, e);
  }
  return learnUsualMealTimes([...byDay.values()]);
}

export interface LogNudgeRead { kind: EatingWindowDayKind | null; livedStart: Date; meals: string[]; learned: LearnedTimes }

/** Read only. What TODAY needs to decide the line: today's kind, its live meals and the learned times. */
export async function getLogNudge(dayId: string, now: Date = new Date()): Promise<LogNudgeRead | null> {
  const day = await db.beyondDays.get(dayId);
  if (!day) return null;
  const livedStart = mostRecentBoundaryAtOrBefore(new Date(day.startedAt));
  const [picture, meals, learned] = await Promise.all([
    getTodayPicture(now).catch(() => null),
    getMealEntries(dayId).catch(() => []),
    getLearnedMealTimes(livedStart),
  ]);
  return { kind: dayKindFor(picture?.now?.state), livedStart, meals: meals.map((m) => m.at), learned };
}
