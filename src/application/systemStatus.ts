import { deriveCapacity } from "../engine/capacity";
import type { BeyondDay, Capacity } from "../domain/common/types";
import { db } from "../persistence/db";
import { getActiveDay, getLatestCheckIn, getSleepEntries } from "./queries";

/**
 * STATUS-001 (owner brief 2026-10-05; approved merge: System Status is one
 * line on TODAY). GREEN / AMBER / RED plus a one-line reason, from three
 * facts: last main sleep, today's check-in, and recent training load.
 * Example: "AMBER · 5h sleep, 3 hard sessions in 4 days".
 *
 * Deterministic and outside the Engine: it reads the same facts the rest
 * of TODAY reads and never feeds or changes a recommendation. Facts only,
 * no shame words. The thresholds below are the ones proposed in the Drop
 * contract, waiting for Gavin's sign-off at merge.
 */
export const RED_SLEEP_UNDER_MINUTES = 4 * 60;
export const AMBER_SLEEP_UNDER_MINUTES = 6 * 60;
export const HARD_SESSIONS_WINDOW_DAYS = 4;
export const AMBER_HARD_SESSIONS_AT_LEAST = 3;

export type SystemStatusLevel = "GREEN" | "AMBER" | "RED" | "NO_READ";

export interface SystemStatusInputs {
  /** The last main (PRIMARY) sleep, in minutes, or null when none is on record. */
  mainSleepMinutes: number | null;
  /** Today's check-in, as the Engine's own capacity rule reads it, or null. */
  checkIn: { capacity: Capacity; reasonCodes: string[] } | null;
  /** Finished strength (non-recovery) sessions in the last HARD_SESSIONS_WINDOW_DAYS days. */
  hardSessions: number;
}

/** One fact behind the color; TODAY's copy (statusCopy.ts) words it. */
export type SystemStatusFact =
  | { kind: "SLEEP"; minutes: number }
  | { kind: "CHECK_IN"; capacity: Capacity; reasonCodes: string[] }
  | { kind: "LOAD"; sessions: number; days: number };

export interface SystemStatus {
  level: SystemStatusLevel;
  /** The facts that set the color, in order: sleep, check-in, load. GREEN lists what it rests on. */
  facts: SystemStatusFact[];
}

export function deriveSystemStatus(inputs: SystemStatusInputs): SystemStatus {
  const { mainSleepMinutes: sleep, checkIn, hardSessions } = inputs;
  if (sleep === null && checkIn === null) return { level: "NO_READ", facts: [] };

  const sleepFact = (minutes: number): SystemStatusFact => ({ kind: "SLEEP", minutes });
  const checkInFact = (c: NonNullable<typeof checkIn>): SystemStatusFact => ({ kind: "CHECK_IN", ...c });
  const loadFact: SystemStatusFact = { kind: "LOAD", sessions: hardSessions, days: HARD_SESSIONS_WINDOW_DAYS };

  const red: SystemStatusFact[] = [];
  if (sleep !== null && sleep < RED_SLEEP_UNDER_MINUTES) red.push(sleepFact(sleep));
  if (checkIn?.capacity === "RED") red.push(checkInFact(checkIn));
  if (red.length > 0) return { level: "RED", facts: red };

  const amber: SystemStatusFact[] = [];
  if (sleep !== null && sleep < AMBER_SLEEP_UNDER_MINUTES) amber.push(sleepFact(sleep));
  if (checkIn?.capacity === "YELLOW") amber.push(checkInFact(checkIn));
  if (hardSessions >= AMBER_HARD_SESSIONS_AT_LEAST) amber.push(loadFact);
  if (amber.length > 0) return { level: "AMBER", facts: amber };

  const green: SystemStatusFact[] = [];
  if (sleep !== null) green.push(sleepFact(sleep));
  if (checkIn) green.push(checkInFact(checkIn));
  green.push(loadFact);
  return { level: "GREEN", facts: green };
}

/** A main sleep logged longer ago than this isn't "last night" any more, so it isn't read. */
export const MAIN_SLEEP_FRESH_HOURS = 36;

/**
 * The most recent PRIMARY sleep on the active day, else on the day before it
 * — only if it was logged within MAIN_SLEEP_FRESH_HOURS of now (an old short
 * sleep from weeks ago must never color today).
 */
async function lastMainSleepMinutes(activeDayId: string, now: Date): Promise<number | null> {
  const days = (await db.beyondDays.toArray()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const index = days.findIndex((d) => d.id === activeDayId);
  const since = now.getTime() - MAIN_SLEEP_FRESH_HOURS * 60 * 60 * 1000;
  for (const day of days.slice(Math.max(0, index), Math.max(0, index) + 2)) {
    const primary = (await getSleepEntries(day.id)).filter((e) => e.kind === "PRIMARY");
    if (primary.length === 0) continue;
    const last = primary.at(-1)!;
    return new Date(last.recordedAt).getTime() >= since ? last.effectiveDurationMinutes : null;
  }
  return null;
}

/**
 * `activeDay`: the caller's own already-read active day (TODAY passes its
 * refresh's, so the line can never disagree with the rest of the screen);
 * omitted, it is read here.
 */
export async function getSystemStatus(activeDay?: BeyondDay | null, now: Date = new Date()): Promise<SystemStatus> {
  const day = activeDay === undefined ? await getActiveDay() : activeDay;
  if (!day) return { level: "NO_READ", facts: [] };
  const [sleep, checkIn, sessions] = await Promise.all([
    lastMainSleepMinutes(day.id, now),
    getLatestCheckIn(day.id),
    db.workoutSessions.toArray(),
  ]);
  const since = now.getTime() - HARD_SESSIONS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const hardSessions = sessions.filter(
    (s) =>
      (s.status === "COMPLETED" || s.status === "PARTIAL") &&
      s.sessionType !== "RECOVERY" &&
      new Date(s.startedAt).getTime() >= since &&
      new Date(s.startedAt).getTime() <= now.getTime(),
  ).length;
  return deriveSystemStatus({ mainSleepMinutes: sleep, checkIn: checkIn ? deriveCapacity(checkIn) : null, hardSessions });
}
