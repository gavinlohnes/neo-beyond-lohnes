import { db } from "../persistence/db";
import type { PerformedSet } from "../domain/workout/types";
import { formatLocalDate, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { getAllRecords } from "./personalRecordQueries";
import { getExerciseNames } from "./exerciseLibraryQueries";
import { getActiveDay, getSchedulePattern, getSleepEntries } from "./queries";
import { getTimeCapsules } from "./timeCapsuleQueries";
import { getUndoneSetIds } from "./trainQueries";

/**
 * REPORT-001 (owner brief 2026-10-05; approved merge: Briefing and After
 * Action Report are one report). One report, two timings: on a work night
 * between 0200 and 0500 TODAY offers "BRIEFING READY"; on the first day off
 * after a work block, "AFTER ACTION READY". Weekly opens it any time.
 *
 * At most five items: this block vs last; what moved (PRs); what stalled
 * (a lift trained this block with no PR in 3+ weeks); what's coming (the
 * next work block, a capsule opening); and ONE call, phrased as a
 * suggestion, from a fixed ordered list. Deterministic: the same data and
 * time always give the same report. An item with nothing behind it is left
 * out. Read only; it never feeds the Engine.
 *
 * A "block" is a run of consecutive scheduled work days (the saved
 * schedule; a day counts as work when its 16:30 lived day owns a shift).
 * Its period runs from 16:30 on the day before its first work day to 16:30
 * on its last work day's next day — the lived days that hold its shifts.
 */
export const STALLED_AFTER_DAYS = 21;
export const BRIEFING_FROM_HOUR = 2;
export const BRIEFING_UNTIL_HOUR = 5;
export const LOW_SLEEP_MINUTES = 6 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOOK_DAYS = 28;

export type ReportTiming = "BRIEFING" | "AFTER_ACTION" | null;

export interface BlockFacts {
  /** Local dates of the block's first and last work days. */
  from: string;
  to: string;
  shifts: number;
  sessions: number;
  sets: number;
  avgSleepMinutes: number | null;
}

export type ReportItem =
  | { kind: "BLOCK"; current: BlockFacts; previous: BlockFacts | null }
  | { kind: "MOVED"; prs: { name: string; weight: number; reps: number }[] }
  | { kind: "STALLED"; lifts: { name: string; lastMovedOn: string }[] }
  | { kind: "COMING"; nextBlock: { from: string; to: string; shifts: number } | null; capsuleOpensOn: string | null }
  | { kind: "CALL"; call: { kind: "LIGHTER_WEEK"; lift: string } | { kind: "PROTECT_SLEEP" } };

export interface Report {
  items: ReportItem[];
}

function noon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
}
/** 16:30 on a calendar date — the lived-day boundary. */
function boundary(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 16, 30).getTime();
}

type WorkOn = (d: Date) => boolean;

/** Consecutive work days ending at the most recent work day on or before `upTo` (within LOOK_DAYS). */
function blockEndingBy(upTo: Date, workOn: WorkOn): { first: Date; last: Date } | null {
  let last: Date | null = null;
  for (let i = 0; i <= LOOK_DAYS; i++) {
    const d = addDays(upTo, -i);
    if (workOn(d)) {
      last = d;
      break;
    }
  }
  if (!last) return null;
  let first = last;
  while (workOn(addDays(first, -1)) && last.getTime() - first.getTime() < LOOK_DAYS * DAY_MS) first = addDays(first, -1);
  return { first, last };
}

function nextBlockAfter(day: Date, workOn: WorkOn): { first: Date; last: Date } | null {
  for (let i = 1; i <= LOOK_DAYS; i++) {
    const d = addDays(day, i);
    if (workOn(d)) {
      let last = d;
      while (workOn(addDays(last, 1)) && last.getTime() - d.getTime() < LOOK_DAYS * DAY_MS) last = addDays(last, 1);
      return { first: d, last };
    }
  }
  return null;
}

/**
 * Which line, if any, TODAY shows now. BRIEFING: last night's shift is under
 * way (yesterday is a scheduled work day) and the clock reads 0200–0459.
 * AFTER_ACTION: from 0600, today is a scheduled day off and yesterday was a
 * work day. `lastNight` is the declared work context of the lived day that
 * holds last night (the active day, when it began before today's 16:30): a
 * night declared OFF wasn't worked, so neither line shows for it.
 */
export function deriveReportTiming(now: Date, workOn: WorkOn, lastNight: "WORK" | "OFF" | "UNKNOWN" | null): ReportTiming {
  if (lastNight === "OFF") return null;
  const hour = now.getHours();
  const yesterdayWorked = workOn(addDays(now, -1));
  if (hour >= BRIEFING_FROM_HOUR && hour < BRIEFING_UNTIL_HOUR && yesterdayWorked) return "BRIEFING";
  if (hour >= 6 && yesterdayWorked && !workOn(noon(now))) return "AFTER_ACTION";
  return null;
}

export async function getReportTiming(now: Date = new Date()): Promise<ReportTiming> {
  const [pattern, day] = await Promise.all([getSchedulePattern(), getActiveDay()]);
  const workOn: WorkOn = (d) => scheduledWorkContextForLivedDay(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17), pattern) === "WORK";
  // The active day holds last night only if it began before today's 16:30 boundary (and after yesterday's).
  const started = day ? new Date(day.startedAt).getTime() : null;
  const holdsLastNight = started !== null && started < boundary(now) && started >= boundary(addDays(now, -1)) - 60 * 60 * 1000;
  return deriveReportTiming(now, workOn, holdsLastNight ? day!.workContext : null);
}

export async function getReport(now: Date = new Date()): Promise<Report> {
  const [pattern, sessions, undone, records, names, days, capsules] = await Promise.all([
    getSchedulePattern(),
    db.workoutSessions.toArray(),
    getUndoneSetIds(),
    getAllRecords(),
    getExerciseNames(),
    db.beyondDays.toArray(),
    getTimeCapsules(now),
  ]);
  const workOn: WorkOn = (d) => scheduledWorkContextForLivedDay(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17), pattern) === "WORK";
  const finished = sessions.filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL");
  const finishedById = new Map(finished.map((s) => [s.id, s] as const));
  const sets = ((await db.performedSets.toArray()) as unknown as PerformedSet[]).filter(
    (s) => finishedById.has(s.sessionId) && !undone.has(s.id) && !s.skipped,
  );
  const sleepByDay = new Map<string, number>();
  for (const day of days) {
    const primary = (await getSleepEntries(day.id)).filter((e) => e.kind === "PRIMARY");
    if (primary.length) sleepByDay.set(day.id, primary.at(-1)!.effectiveDurationMinutes);
  }

  const facts = (block: { first: Date; last: Date }): BlockFacts & { start: number; end: number } => {
    const start = boundary(addDays(block.first, -1));
    const end = Math.min(boundary(addDays(block.last, 1)), now.getTime());
    const within = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= start && t < end;
    };
    const blockSessions = finished.filter((s) => within(s.startedAt));
    const ids = new Set(blockSessions.map((s) => s.id));
    const sleeps = days.filter((d) => within(d.startedAt) && sleepByDay.has(d.id)).map((d) => sleepByDay.get(d.id)!);
    return {
      from: formatLocalDate(block.first),
      to: formatLocalDate(block.last),
      shifts: Math.round((block.last.getTime() - block.first.getTime()) / DAY_MS) + 1,
      sessions: blockSessions.length,
      sets: sets.filter((s) => ids.has(s.sessionId)).length,
      avgSleepMinutes: sleeps.length ? Math.round(sleeps.reduce((a, b) => a + b, 0) / sleeps.length) : null,
      start,
      end,
    };
  };

  const items: ReportItem[] = [];
  // "This block" is the one running now (a work night) or just finished (the first day off).
  const currentBlock = blockEndingBy(noon(workOn(noon(now)) ? now : addDays(now, -1)), workOn);
  if (!currentBlock) return { items };
  const current = facts(currentBlock);
  const previousBlock = blockEndingBy(addDays(currentBlock.first, -2), workOn);
  const previous = previousBlock ? facts(previousBlock) : null;
  const strip = ({ start: _s, end: _e, ...rest }: BlockFacts & { start: number; end: number }): BlockFacts => rest;
  items.push({ kind: "BLOCK", current: strip(current), previous: previous ? strip(previous) : null });

  const inBlock = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= current.start && t < current.end;
  };
  const moved = records.filter((r) => inBlock(r.recordedAt));
  if (moved.length) {
    items.push({ kind: "MOVED", prs: moved.map((r) => ({ name: r.exerciseName, weight: r.record.weight, reps: r.record.reps })) });
  }

  // Stalled: a lift trained this block (as itself, not a substitute) whose latest PR — or, with none,
  // its first session — is 21+ days old.
  const stallCutoff = now.getTime() - STALLED_AFTER_DAYS * DAY_MS;
  const trainedNow = [
    ...new Set(sets.filter((s) => !s.substitutedName && inBlock(finishedById.get(s.sessionId)!.startedAt)).map((s) => s.exerciseId)),
  ];
  const stalled: { name: string; lastMovedOn: string }[] = [];
  for (const exerciseId of trainedNow) {
    const latestPr = records.filter((r) => r.exerciseId === exerciseId).map((r) => r.recordedAt).sort().at(-1);
    const firstSession = sets
      .filter((s) => s.exerciseId === exerciseId && !s.substitutedName)
      .map((s) => finishedById.get(s.sessionId)!.startedAt)
      .sort()[0]!;
    const lastMoved = latestPr ?? firstSession;
    if (new Date(lastMoved).getTime() <= stallCutoff) {
      stalled.push({ name: names[exerciseId] ?? exerciseId, lastMovedOn: formatLocalDate(new Date(lastMoved)) });
    }
  }
  stalled.sort((a, b) => a.lastMovedOn.localeCompare(b.lastMovedOn) || a.name.localeCompare(b.name));
  if (stalled.length) items.push({ kind: "STALLED", lifts: stalled });

  const next = nextBlockAfter(currentBlock.last, workOn);
  const capsule = capsules.waiting.find((c) => new Date(`${c.opensOn}T12:00:00`).getTime() - now.getTime() <= 14 * DAY_MS);
  if (next || capsule) {
    items.push({
      kind: "COMING",
      nextBlock: next ? { from: formatLocalDate(next.first), to: formatLocalDate(next.last), shifts: Math.round((next.last.getTime() - next.first.getTime()) / DAY_MS) + 1 } : null,
      capsuleOpensOn: capsule?.opensOn ?? null,
    });
  }

  // ONE call, from a fixed ordered list (owner sign-off at merge).
  if (stalled.length) items.push({ kind: "CALL", call: { kind: "LIGHTER_WEEK", lift: stalled[0]!.name } });
  else if (current.avgSleepMinutes !== null && current.avgSleepMinutes < LOW_SLEEP_MINUTES) items.push({ kind: "CALL", call: { kind: "PROTECT_SLEEP" } });

  return { items: items.slice(0, 5) };
}
