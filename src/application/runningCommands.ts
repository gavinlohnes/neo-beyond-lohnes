import { db } from "../persistence/db";
import { parseRunningSession } from "../persistence/runningSessionValidation";
import { writeAtomically } from "./atomicWrite";
import { logEvent } from "./commands";
import { logIntentEvent } from "./intentCommands";
import {
  getActiveRunningSession,
  getRunningHome,
  projectRunningPlan,
  projectRunningPosition,
  projectRunningSessions,
  RUNNING_CUE_KEYS,
  RUNNING_EVENT_TYPES,
  runningElapsedSeconds,
  type RunningCuePreference,
} from "./runningQueries";
import type {
  DomainEvent,
  RunningEndReason,
  RunningPlanAdvancedPayload,
  RunningPlanEditedPayload,
  RunningPlanPositionSetPayload,
  RunningSession,
  RunningSessionCorrectedPayload,
  RunningSessionEndedPayload,
  RunningSessionPausedPayload,
  RunningSessionResumedPayload,
  RunningSessionStartedPayload,
  RunningSessionVoidedPayload,
} from "../domain/common/types";
import {
  foundationSegmentsAt,
  isRunningPositionInPlan,
  nextRunningPosition,
  RUNNING_PLAN_FOUNDATION,
  RUNNING_RUNS_IN_WEEK_MAX,
  runningSegmentsAt,
  runningTotalSeconds,
  validateRunningPlanVersion,
  validateRunningSegments,
  validateRunningWeekSettings,
  type RunningPlanVersion,
  type RunningPosition,
  type RunningSegment,
  type RunningWeekSettings,
} from "../domain/workout/runningPlan";

/**
 * GRAYSON-TRAIN-RUN-001: every running write. Each command writes its row (if any) and its append-only event in one
 * transaction. Refusals are plain sentences after a CODE: prefix (describeError shows the sentence). Running counts
 * toward TRAIN history and this plan only: no lift progression, PRs, A/B/C sequence, Engine or TODAY line reads it.
 */
const RUNNING_WRITE_TABLES = ["runningSessions", "workoutSessions", "beyondDays"] as const;
const write = <T>(fn: () => Promise<T>) => writeAtomically(RUNNING_WRITE_TABLES, fn);
const newId = () => crypto.randomUUID();
/** A stop this early isn't a run attempt worth keeping as PARTIAL. */
const ABANDON_BELOW_SECONDS = 60;

async function runningEvents(): Promise<DomainEvent[]> {
  return db.events.where("type").anyOf([...RUNNING_EVENT_TYPES]).toArray();
}

async function sessionRow(id: string): Promise<RunningSession> {
  const session = parseRunningSession(await db.runningSessions.get(id));
  if (!session) throw new Error("RUNNING_SESSION_NOT_FOUND: That run isn't in your history any more.");
  return session;
}

async function activeRow(id: string): Promise<RunningSession> {
  const session = await sessionRow(id);
  if (session.status !== "ACTIVE") throw new Error("RUNNING_NOT_ACTIVE: That run has already ended.");
  return session;
}

// ---- Session lifecycle ---------------------------------------------------------------------------------------

/**
 * Starts the run at `position` (default: his next run). One ACTIVE running session at a time (a second start
 * returns it), and none while a lift workout is ACTIVE.
 */
export async function startRunningSession(beyondDayId: string, position?: RunningPosition): Promise<RunningSession> {
  return write(async () => {
    const existing = await getActiveRunningSession();
    if (existing) return existing;
    if (await db.workoutSessions.filter((s) => s.status === "ACTIVE").first()) {
      throw new Error("RUNNING_LIFT_ACTIVE: Finish or stop your workout before starting a run.");
    }
    const day = await db.beyondDays.get(beyondDayId);
    if (!day || day.status !== "ACTIVE") throw new Error("RUNNING_DAY_NOT_ACTIVE: Start your day before starting a run.");
    const home = await getRunningHome();
    const at = position ?? home.next?.position;
    if (!at) throw new Error("RUNNING_PLAN_DONE: The foundation is done. Pick a run from the plan to run it again.");
    const segments = runningSegmentsAt(home.plan.plan, at);
    if (!segments) throw new Error("RUNNING_RUN_NOT_IN_PLAN: That run isn't in your plan.");
    const session: RunningSession = {
      id: newId(), beyondDayId, schemaVersion: 1, kind: "PLAN_RUN", planId: home.plan.plan.planId, phase: home.plan.plan.phase,
      week: at.week, run: at.run, segments, status: "ACTIVE", startedAt: new Date().toISOString(), pausedMs: 0, completedSeconds: 0,
    };
    await db.runningSessions.add(session);
    const commandId = newId();
    const payload: RunningSessionStartedPayload = { commandId, runningSessionId: session.id, planId: session.planId, phase: session.phase, week: at.week, run: at.run, segments };
    await logEvent(beyondDayId, "RUNNING_SESSION_STARTED", payload, "USER", commandId);
    return session;
  });
}

export async function pauseRunningSession(id: string): Promise<RunningSession> {
  return write(async () => {
    const session = await activeRow(id);
    if (session.pausedAt) return session;
    const next = { ...session, pausedAt: new Date().toISOString() };
    await db.runningSessions.put(next);
    const commandId = newId();
    const payload: RunningSessionPausedPayload = { commandId, runningSessionId: id };
    await logEvent(session.beyondDayId, "RUNNING_SESSION_PAUSED", payload, "USER", commandId);
    return next;
  });
}

export async function resumeRunningSession(id: string): Promise<RunningSession> {
  return write(async () => {
    const session = await activeRow(id);
    if (!session.pausedAt) return session;
    const pausedMs = session.pausedMs + Math.max(0, Date.now() - Date.parse(session.pausedAt));
    const { pausedAt: _resumed, ...rest } = session;
    const next: RunningSession = { ...rest, pausedMs };
    await db.runningSessions.put(next);
    const commandId = newId();
    const payload: RunningSessionResumedPayload = { commandId, runningSessionId: id, pausedMs };
    await logEvent(session.beyondDayId, "RUNNING_SESSION_RESUMED", payload, "USER", commandId);
    return next;
  });
}

/**
 * Ends a run. Reaching the end is COMPLETED. Stopping early is PARTIAL (ABANDONED under a minute in). The pain
 * control is always PARTIAL. Neither PARTIAL nor ABANDONED can move the plan on.
 */
export async function endRunningSession(id: string, reason: RunningEndReason): Promise<RunningSession> {
  return write(async () => {
    const session = await activeRow(id);
    const total = runningTotalSeconds(session.segments);
    const completedSeconds = Math.min(total, runningElapsedSeconds(session));
    const status: RunningSession["status"] = reason === "PAIN" ? "PARTIAL"
      : completedSeconds >= total ? "COMPLETED"
      : completedSeconds < ABANDON_BELOW_SECONDS ? "ABANDONED" : "PARTIAL";
    const endReason: RunningEndReason = status === "COMPLETED" ? "FINISHED" : reason === "FINISHED" ? "STOPPED" : reason;
    const { pausedAt: _paused, ...rest } = session;
    const pausedMs = session.pausedAt ? session.pausedMs + Math.max(0, Date.now() - Date.parse(session.pausedAt)) : session.pausedMs;
    const next: RunningSession = { ...rest, pausedMs, status, completedSeconds, endReason, endedAt: new Date().toISOString() };
    await db.runningSessions.put(next);
    const commandId = newId();
    const payload: RunningSessionEndedPayload = { commandId, runningSessionId: id, status, completedSeconds, endReason };
    await logEvent(session.beyondDayId, "RUNNING_SESSION_ENDED", payload, "USER", commandId);
    return next;
  });
}

// ---- Position ------------------------------------------------------------------------------------------------

export interface RunningAdvanceResult { eventId: string; to: RunningPosition; done: boolean }

/** Move on, from the finish sheet of a COMPLETED run: the run after the one he just ran. Only ever on his tap. */
export async function advanceRunningPlan(runningSessionId: string): Promise<RunningAdvanceResult> {
  return write(async () => {
    const [rows, events, days] = await Promise.all([db.runningSessions.toArray(), runningEvents(), db.beyondDays.toArray()]);
    const session = projectRunningSessions(rows, events, days).find((s) => s.id === runningSessionId);
    if (!session) throw new Error("RUNNING_SESSION_NOT_FOUND: That run isn't in your history any more.");
    if (session.status !== "COMPLETED") throw new Error("RUNNING_NOT_COMPLETED: Only a finished run moves the plan on. Repeat it when you're ready.");
    const { plan } = projectRunningPlan(events);
    const from = { week: session.week, run: session.run };
    const next = nextRunningPosition(plan, from);
    const to = next ?? { week: plan.weeks.length + 1, run: 1 };
    const commandId = newId();
    const payload: RunningPlanAdvancedPayload = { commandId, runningSessionId, from, to };
    const sessionDay = (await sessionRow(runningSessionId)).beyondDayId;
    const eventId = await logEvent(sessionDay, "RUNNING_PLAN_ADVANCED", payload, "USER", commandId);
    return { eventId, to, done: next === null };
  });
}

/** Undo a Move on he just tapped: back to the run he moved on from, only while that Move on is still the newest. */
export async function undoRunningAdvance(advanceEventId: string): Promise<RunningPosition> {
  return write(async () => {
    const [rows, events, days] = await Promise.all([db.runningSessions.toArray(), runningEvents(), db.beyondDays.toArray()]);
    const advance = events.find((e) => e.id === advanceEventId && e.type === "RUNNING_PLAN_ADVANCED");
    if (!advance) throw new Error("RUNNING_UNDO_NOT_FOUND: There's nothing to undo.");
    const { plan } = projectRunningPlan(events);
    const state = projectRunningPosition(events, projectRunningSessions(rows, events, days), plan);
    if (state.latestEventId !== advanceEventId) throw new Error("RUNNING_UNDO_STALE: Your place in the plan has changed since. Pick the run from the plan instead.");
    const to = { ...(advance.payload as RunningPlanAdvancedPayload).from };
    const commandId = newId();
    const payload: RunningPlanPositionSetPayload = { commandId, to, reason: "UNDO_MOVE_ON" };
    await logIntentEvent("RUNNING_PLAN_POSITION_SET", payload, "USER", commandId, {}, advanceEventId);
    return to;
  });
}

/** Jump to any week and run, forward or back. */
export async function setRunningPosition(to: RunningPosition): Promise<void> {
  await write(async () => {
    const events = await runningEvents();
    const { plan } = projectRunningPlan(events);
    if (!isRunningPositionInPlan(plan, to)) throw new Error("RUNNING_RUN_NOT_IN_PLAN: That run isn't in your plan.");
    const commandId = newId();
    const payload: RunningPlanPositionSetPayload = { commandId, to: { week: to.week, run: to.run }, reason: "JUMP" };
    await logIntentEvent("RUNNING_PLAN_POSITION_SET", payload, "USER", commandId, {});
  });
}

// ---- His plan ------------------------------------------------------------------------------------------------

export interface RunningPlanEditResult { eventId: string; plan: RunningPlanVersion }

async function savePlan(change: (plan: RunningPlanVersion) => RunningPlanVersion, reason: RunningPlanEditedPayload["reason"]): Promise<RunningPlanEditResult> {
  return write(async () => {
    const state = projectRunningPlan(await runningEvents());
    const next = change(structuredClone(state.plan));
    const problem = validateRunningPlanVersion(next);
    if (problem) throw new Error(`RUNNING_PLAN_INVALID: ${problem}`);
    if (JSON.stringify(next) === JSON.stringify(state.plan)) throw new Error("RUNNING_PLAN_NO_CHANGE: Nothing changed.");
    const commandId = newId();
    const payload: RunningPlanEditedPayload = { commandId, plan: next, reason, ...(state.latestEditEventId ? { previousEventId: state.latestEditEventId } : {}) };
    const eventId = await logIntentEvent("RUNNING_PLAN_EDITED", payload, "USER", commandId, {});
    return { eventId, plan: next };
  });
}

function weekOf(plan: RunningPlanVersion, week: number): RunningSegment[][] {
  const runs = plan.weeks[week - 1];
  if (!runs) throw new Error("RUNNING_RUN_NOT_IN_PLAN: That week isn't in your plan.");
  return runs;
}

/** Saves his version of one run's intervals. Past sessions keep the segments they ran with. */
export function editRunningRun(position: RunningPosition, segments: readonly RunningSegment[]): Promise<RunningPlanEditResult> {
  const problem = validateRunningSegments(segments);
  if (problem) return Promise.reject(new Error(`RUNNING_PLAN_INVALID: ${problem}`));
  return savePlan((plan) => {
    const runs = weekOf(plan, position.week);
    if (!runs[position.run - 1]) throw new Error("RUNNING_RUN_NOT_IN_PLAN: That run isn't in your plan.");
    runs[position.run - 1] = segments.map((s) => ({ kind: s.kind, seconds: s.seconds }));
    return plan;
  }, "EDIT_RUN");
}

/** Adds a run to a week, starting as a copy of that week's last run. */
export function addRunningRun(week: number): Promise<RunningPlanEditResult> {
  return savePlan((plan) => {
    const runs = weekOf(plan, week);
    if (runs.length >= RUNNING_RUNS_IN_WEEK_MAX) throw new Error(`RUNNING_PLAN_INVALID: A week can hold at most ${RUNNING_RUNS_IN_WEEK_MAX} runs.`);
    runs.push(runs.at(-1)!.map((s) => ({ ...s })));
    return plan;
  }, "ADD_RUN");
}

/** Back to the NHS pattern for one run. A run he added has no NHS version. */
export function resetRunningRun(position: RunningPosition): Promise<RunningPlanEditResult> {
  const original = foundationSegmentsAt(position);
  if (!original) return Promise.reject(new Error("RUNNING_RESET_NONE: You added this run, so there's no plan version to reset it to."));
  return savePlan((plan) => {
    const runs = weekOf(plan, position.week);
    if (!runs[position.run - 1]) throw new Error("RUNNING_RUN_NOT_IN_PLAN: That run isn't in your plan.");
    runs[position.run - 1] = original;
    return plan;
  }, "RESET_RUN");
}

/** Back to the NHS pattern for every run (his runs-a-week settings stay as he set them). */
export function resetRunningPlan(): Promise<RunningPlanEditResult> {
  return savePlan((plan) => ({ ...plan, weeks: structuredClone(RUNNING_PLAN_FOUNDATION.weeks) }), "RESET_PLAN");
}

export function setRunningWeekSettings(settings: RunningWeekSettings): Promise<RunningPlanEditResult> {
  const problem = validateRunningWeekSettings(settings);
  if (problem) return Promise.reject(new Error(`RUNNING_PLAN_INVALID: ${problem}`));
  return savePlan((plan) => ({ ...plan, runsPerWeek: settings.runsPerWeek, showOptional: settings.showOptional, weekStartsOn: settings.weekStartsOn }), "WEEK_SETTINGS");
}

/** Undo the newest plan edit (a reset included): the plan returns to what it was before it. */
export async function undoRunningPlanEdit(editEventId: string): Promise<RunningPlanEditResult> {
  return write(async () => {
    const events = await runningEvents();
    const state = projectRunningPlan(events);
    if (state.latestEditEventId !== editEventId) throw new Error("RUNNING_UNDO_STALE: The plan has changed since. Edit it directly instead.");
    const before = projectRunningPlan(events, editEventId).plan;
    const commandId = newId();
    const payload: RunningPlanEditedPayload = { commandId, plan: before, reason: "UNDO", previousEventId: editEventId };
    const eventId = await logIntentEvent("RUNNING_PLAN_EDITED", payload, "USER", commandId, {}, editEventId);
    return { eventId, plan: before };
  });
}

// ---- Correcting a past run -----------------------------------------------------------------------------------

export interface RunningCorrection {
  status?: "COMPLETED" | "PARTIAL";
  /** Whole seconds he ran (the sheet asks in minutes). */
  completedSeconds?: number;
  /** The local date (YYYY-MM-DD) the run belongs to. */
  dayDate?: string;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Corrects status, minutes or the day of a finished run. The recorded row is never edited. */
export async function correctRunningSession(runningSessionId: string, correction: RunningCorrection): Promise<string> {
  return write(async () => {
    const [rows, events, days] = await Promise.all([db.runningSessions.toArray(), runningEvents(), db.beyondDays.toArray()]);
    const entry = projectRunningSessions(rows, events, days).find((s) => s.id === runningSessionId);
    if (!entry) throw new Error("RUNNING_SESSION_NOT_FOUND: That run isn't in your history any more.");
    if (entry.status === "ACTIVE") throw new Error("RUNNING_ACTIVE: End the run before correcting it.");
    const changes: Omit<RunningSessionCorrectedPayload, "commandId" | "runningSessionId"> = {};
    if (correction.status !== undefined) {
      if (correction.status !== "COMPLETED" && correction.status !== "PARTIAL") throw new Error("RUNNING_CORRECTION_INVALID: Choose completed or partial.");
      if (correction.status !== entry.status) changes.status = correction.status;
    }
    if (correction.completedSeconds !== undefined) {
      const s = correction.completedSeconds;
      if (!Number.isInteger(s) || s < 0 || s > 24 * 60 * 60) throw new Error("RUNNING_CORRECTION_INVALID: Enter whole minutes from 0.");
      if (s !== entry.completedSeconds) changes.completedSeconds = s;
    }
    if (correction.dayDate !== undefined) {
      if (!isRealDate(correction.dayDate)) throw new Error("RUNNING_CORRECTION_INVALID: Choose a real date.");
      if (correction.dayDate !== entry.dayDate) changes.dayDate = correction.dayDate;
    }
    if (Object.keys(changes).length === 0) throw new Error("RUNNING_CORRECTION_NO_CHANGE: Nothing changed.");
    const commandId = newId();
    const payload: RunningSessionCorrectedPayload = { commandId, runningSessionId, ...(entry.latestCorrectionEventId ? { supersedesEventId: entry.latestCorrectionEventId } : {}), ...changes };
    const sessionDay = (await sessionRow(runningSessionId)).beyondDayId;
    return logEvent(sessionDay, "RUNNING_SESSION_CORRECTED", payload, "USER", commandId);
  });
}

/** Removes a run from his history: it stops counting toward the week and his place in the plan. */
export async function voidRunningSession(runningSessionId: string): Promise<string> {
  return write(async () => {
    const [rows, events, days] = await Promise.all([db.runningSessions.toArray(), runningEvents(), db.beyondDays.toArray()]);
    const entry = projectRunningSessions(rows, events, days).find((s) => s.id === runningSessionId);
    if (!entry) throw new Error("RUNNING_SESSION_NOT_FOUND: That run is already removed.");
    if (entry.status === "ACTIVE") throw new Error("RUNNING_ACTIVE: End the run before removing it.");
    const commandId = newId();
    const payload: RunningSessionVoidedPayload = { commandId, runningSessionId };
    const sessionDay = (await sessionRow(runningSessionId)).beyondDayId;
    return logEvent(sessionDay, "RUNNING_SESSION_VOIDED", payload, "USER", commandId);
  });
}

// ---- Cue preferences -----------------------------------------------------------------------------------------

export function setRunningCuePreference(preference: RunningCuePreference, on: boolean): void {
  try { localStorage.setItem(RUNNING_CUE_KEYS[preference], on ? "on" : "off"); } catch { /* Storage unavailable: the default stays. */ }
}
