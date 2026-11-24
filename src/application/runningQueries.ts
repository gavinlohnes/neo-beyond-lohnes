import { db } from "../persistence/db";
import { parseRunningPlanVersion, parseRunningSession } from "../persistence/runningSessionValidation";
import { formatLocalDate } from "../engine/scheduledContext";
import { livedDayStartOf } from "./reflect";
import type {
  BeyondDay,
  DomainEvent,
  RunningPlanAdvancedPayload,
  RunningPlanEditedPayload,
  RunningPlanPositionSetPayload,
  RunningSession,
  RunningSessionCorrectedPayload,
  RunningSessionStatus,
  RunningSessionVoidedPayload,
} from "../domain/common/types";
import {
  defaultRunningPlanVersion,
  isRunningPositionInPlan,
  runningSegmentsAt,
  runningTotalSeconds,
  type RunningPlanVersion,
  type RunningPosition,
  type RunningSegment,
} from "../domain/workout/runningPlan";

/**
 * GRAYSON-TRAIN-RUN-001: reads for running sessions and his plan. Everything here is derived from the
 * runningSessions rows plus the append-only RUNNING_* events: plan version, position and corrections are never
 * stored as mutable counters. RUN-002 (placement) reads nextRun() and the week count from getRunningHome().
 */

export const RUNNING_EVENT_TYPES = [
  "RUNNING_SESSION_STARTED",
  "RUNNING_SESSION_PAUSED",
  "RUNNING_SESSION_RESUMED",
  "RUNNING_SESSION_ENDED",
  "RUNNING_SESSION_CORRECTED",
  "RUNNING_SESSION_VOIDED",
  "RUNNING_PLAN_ADVANCED",
  "RUNNING_PLAN_POSITION_SET",
  "RUNNING_PLAN_EDITED",
] as const satisfies readonly DomainEvent["type"][];

const byOrder = (a: DomainEvent, b: DomainEvent) => (a.seq ?? 0) - (b.seq ?? 0) || a.recordedAt.localeCompare(b.recordedAt);

// ---- His plan version ----------------------------------------------------------------------------------------

export interface RunningPlanState {
  plan: RunningPlanVersion;
  /** The newest usable RUNNING_PLAN_EDITED, if any: the one "Undo" takes back. */
  latestEditEventId: string | null;
  latestEditReason: RunningPlanEditedPayload["reason"] | null;
  /** True when his version differs from the NHS pattern (any run edited, added or reset away). */
  edited: boolean;
}

/** The plan in force after these events (or before `beforeEventId`, when given). Malformed snapshots are skipped. */
export function projectRunningPlan(events: readonly DomainEvent[], beforeEventId?: string): RunningPlanState {
  let plan = defaultRunningPlanVersion();
  let latestEditEventId: string | null = null;
  let latestEditReason: RunningPlanEditedPayload["reason"] | null = null;
  for (const event of [...events].filter((e) => e.type === "RUNNING_PLAN_EDITED").sort(byOrder)) {
    if (event.id === beforeEventId) break;
    const payload = event.payload as RunningPlanEditedPayload;
    const parsed = parseRunningPlanVersion(payload?.plan);
    if (!parsed) continue;
    plan = parsed;
    latestEditEventId = event.id;
    latestEditReason = payload.reason;
  }
  const edited = JSON.stringify(plan.weeks) !== JSON.stringify(defaultRunningPlanVersion().weeks);
  return { plan, latestEditEventId, latestEditReason, edited };
}

// ---- Effective sessions (rows + corrections + voids) ---------------------------------------------------------

export interface RunningHistoryEntry {
  id: string;
  week: number;
  run: number;
  segments: RunningSegment[];
  totalSeconds: number;
  status: RunningSessionStatus;
  completedSeconds: number;
  /** The local date (YYYY-MM-DD) the run counts on: its lived day's date, or the day he corrected it to. */
  dayDate: string;
  startedAt: string;
  endedAt?: string;
  endReason?: RunningSession["endReason"];
  corrected: boolean;
  /** As recorded, before any correction. */
  recorded: { status: RunningSessionStatus; completedSeconds: number; dayDate: string };
  /** The newest correction event, for the next correction's supersedesEventId. */
  latestCorrectionEventId: string | null;
}

function livedDayDate(day: BeyondDay | undefined, fallbackIso: string): string {
  return formatLocalDate(new Date(day?.startedAt ?? fallbackIso));
}

/** Non-voided sessions with every correction applied (latest of each field wins), in recorded order. */
export function projectRunningSessions(
  rows: readonly unknown[],
  events: readonly DomainEvent[],
  days: readonly BeyondDay[],
): RunningHistoryEntry[] {
  const dayById = new Map(days.map((d) => [d.id, d]));
  const voided = new Set<string>();
  const corrections = new Map<string, DomainEvent<RunningSessionCorrectedPayload>[]>();
  for (const event of [...events].sort(byOrder)) {
    if (event.type === "RUNNING_SESSION_VOIDED") voided.add((event.payload as RunningSessionVoidedPayload).runningSessionId);
    if (event.type === "RUNNING_SESSION_CORRECTED") {
      const id = (event.payload as RunningSessionCorrectedPayload).runningSessionId;
      corrections.set(id, [...(corrections.get(id) ?? []), event as DomainEvent<RunningSessionCorrectedPayload>]);
    }
  }
  const sessions = rows.map(parseRunningSession).filter((s): s is RunningSession => s !== null && !voided.has(s.id));
  return sessions
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((session) => {
      const recorded = { status: session.status, completedSeconds: session.completedSeconds, dayDate: livedDayDate(dayById.get(session.beyondDayId), session.startedAt) };
      const effective = { ...recorded };
      const chain = corrections.get(session.id) ?? [];
      for (const event of chain) {
        const p = event.payload;
        if (p.status === "COMPLETED" || p.status === "PARTIAL") effective.status = p.status;
        if (typeof p.completedSeconds === "number" && Number.isFinite(p.completedSeconds) && p.completedSeconds >= 0) effective.completedSeconds = p.completedSeconds;
        if (typeof p.dayDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.dayDate)) effective.dayDate = p.dayDate;
      }
      return {
        id: session.id,
        week: session.week,
        run: session.run,
        segments: session.segments,
        totalSeconds: runningTotalSeconds(session.segments),
        ...effective,
        startedAt: session.startedAt,
        ...(session.endedAt ? { endedAt: session.endedAt } : {}),
        ...(session.endReason ? { endReason: session.endReason } : {}),
        corrected: chain.length > 0,
        recorded,
        latestCorrectionEventId: chain.at(-1)?.id ?? null,
      };
    });
}

// ---- Position ------------------------------------------------------------------------------------------------

export interface RunningPositionState {
  position: RunningPosition;
  /** Past the last run of the last week: the foundation is done. */
  done: boolean;
  /** The newest counted position change, for Undo on the finish sheet. */
  latestEventId: string | null;
}

/**
 * Where he is: Week 1, run 1, then the newest counted RUNNING_PLAN_ADVANCED / RUNNING_PLAN_POSITION_SET. An advance
 * counts only while its run still stands as COMPLETED, so removing or correcting that run to PARTIAL takes it back.
 */
export function projectRunningPosition(
  events: readonly DomainEvent[],
  sessions: readonly RunningHistoryEntry[],
  plan: RunningPlanVersion,
): RunningPositionState {
  const status = new Map(sessions.map((s) => [s.id, s.status]));
  let position: RunningPosition = { week: 1, run: 1 };
  let latestEventId: string | null = null;
  for (const event of [...events].sort(byOrder)) {
    if (event.type === "RUNNING_PLAN_ADVANCED") {
      const p = event.payload as RunningPlanAdvancedPayload;
      if (status.get(p.runningSessionId) !== "COMPLETED") continue;
      position = { ...p.to }; latestEventId = event.id;
    } else if (event.type === "RUNNING_PLAN_POSITION_SET") {
      position = { ...(event.payload as RunningPlanPositionSetPayload).to }; latestEventId = event.id;
    }
  }
  const done = position.week > plan.weeks.length;
  if (!done && !isRunningPositionInPlan(plan, position)) {
    // A position that no longer exists in his plan falls back to the first run of that week, else Week 1.
    position = isRunningPositionInPlan(plan, { week: position.week, run: 1 }) ? { week: position.week, run: 1 } : { week: 1, run: 1 };
  }
  return { position, done, latestEventId };
}

// ---- The week ------------------------------------------------------------------------------------------------

/** The first date (YYYY-MM-DD) of the week containing `date`, starting on `weekStartsOn` (0 = Sunday). */
export function runningWeekStart(date: string, weekStartsOn: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const local = new Date(y, m - 1, d, 12);
  const back = (local.getDay() - weekStartsOn + 7) % 7;
  return formatLocalDate(new Date(y, m - 1, d - back, 12));
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return formatLocalDate(new Date(y, m - 1, d + days, 12));
}

export interface RunningWeekCount {
  done: number;
  expected: number;
  showOptional: boolean;
  from: string;
  to: string;
}

export function countRunningWeek(sessions: readonly RunningHistoryEntry[], plan: RunningPlanVersion, today: string): RunningWeekCount {
  const from = runningWeekStart(today, plan.weekStartsOn);
  const to = addDays(from, 6);
  const done = sessions.filter((s) => s.status === "COMPLETED" && s.dayDate >= from && s.dayDate <= to).length;
  return { done, expected: plan.runsPerWeek, showOptional: plan.showOptional, from, to };
}

// ---- Reads for TRAIN -----------------------------------------------------------------------------------------

async function readRunningEvents(): Promise<DomainEvent[]> {
  return db.events.where("type").anyOf([...RUNNING_EVENT_TYPES]).toArray();
}

export interface RunningNext {
  position: RunningPosition;
  segments: RunningSegment[];
  totalSeconds: number;
}

export interface RunningPlanListEntry {
  week: number;
  run: number;
  totalSeconds: number;
  segments: RunningSegment[];
  done: boolean;
  next: boolean;
  /** A run he added beyond the NHS plan's three. */
  added: boolean;
}

export interface RunningHome {
  active: RunningSession | null;
  next: RunningNext | null;
  done: boolean;
  week: RunningWeekCount;
  plan: RunningPlanState;
  latestPositionEventId: string | null;
  list: RunningPlanListEntry[][];
  history: RunningHistoryEntry[];
}

/** Everything TRAIN's running card, plan list and history show, from one read. */
export async function getRunningHome(now: Date = new Date()): Promise<RunningHome> {
  const [rows, events, days] = await Promise.all([db.runningSessions.toArray(), readRunningEvents(), db.beyondDays.toArray()]);
  const plan = projectRunningPlan(events);
  const sessions = projectRunningSessions(rows, events, days);
  const pos = projectRunningPosition(events, sessions, plan.plan);
  const activeDay = [...days].filter((d) => d.status === "ACTIVE").sort((a, b) => a.startedAt.localeCompare(b.startedAt)).at(-1);
  const today = formatLocalDate(activeDay ? new Date(activeDay.startedAt) : livedDayStartOf(now));
  const finished = sessions.filter((s) => s.status !== "ACTIVE");
  const completed = new Set(finished.filter((s) => s.status === "COMPLETED").map((s) => `${s.week}:${s.run}`));
  const segments = pos.done ? null : runningSegmentsAt(plan.plan, pos.position);
  const active = rows.map(parseRunningSession).find((s): s is RunningSession => s?.status === "ACTIVE") ?? null;
  return {
    active,
    next: segments ? { position: pos.position, segments, totalSeconds: runningTotalSeconds(segments) } : null,
    done: pos.done,
    week: countRunningWeek(finished, plan.plan, today),
    plan,
    latestPositionEventId: pos.latestEventId,
    list: plan.plan.weeks.map((runs, w) => runs.map((segs, r) => ({
      week: w + 1,
      run: r + 1,
      totalSeconds: runningTotalSeconds(segs),
      segments: segs,
      done: completed.has(`${w + 1}:${r + 1}`),
      next: !pos.done && pos.position.week === w + 1 && pos.position.run === r + 1,
      added: r >= 3,
    }))),
    history: [...finished].reverse(),
  };
}

export async function getActiveRunningSession(): Promise<RunningSession | null> {
  const rows = await db.runningSessions.where("status").equals("ACTIVE").toArray();
  return rows.map(parseRunningSession).find((s): s is RunningSession => s !== null) ?? null;
}

/** RUN-002 seam: the next run, or null when the foundation is done. */
export async function nextRun(): Promise<RunningNext | null> {
  return (await getRunningHome()).next;
}

/** Seconds elapsed in a session from its absolute timestamps; never from a ticking counter. */
export function runningElapsedSeconds(session: Pick<RunningSession, "startedAt" | "pausedAt" | "pausedMs">, nowMs: number = Date.now()): number {
  const end = session.pausedAt ? Date.parse(session.pausedAt) : nowMs;
  return Math.max(0, Math.floor((end - Date.parse(session.startedAt) - session.pausedMs) / 1000));
}

// ---- Cue preferences (localStorage; travel in the backup's beyondSettings block) -------------------------------

export const RUNNING_CUE_KEYS = {
  buzz: "beyond:runningBuzz",
  halfway: "beyond:runningHalfwayCue",
  keepAwake: "beyond:runningKeepAwake",
} as const;
export type RunningCuePreference = keyof typeof RUNNING_CUE_KEYS;
export type RunningCuePreferences = Record<RunningCuePreference, boolean>;

/** All on by default; anything but "off" reads as on, so a damaged value never silences a cue by accident. */
export function readRunningCuePreferences(): RunningCuePreferences {
  const read = (key: string) => { try { return localStorage.getItem(key) !== "off"; } catch { return true; } };
  return { buzz: read(RUNNING_CUE_KEYS.buzz), halfway: read(RUNNING_CUE_KEYS.halfway), keepAwake: read(RUNNING_CUE_KEYS.keepAwake) };
}
