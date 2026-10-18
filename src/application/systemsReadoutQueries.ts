import { deriveCapacity } from "../engine/capacity";
import type { BeyondDay, Capacity, WorkContextSource } from "../domain/common/types";
import type { WorkoutTemplateId } from "../domain/workout/types";
import { db } from "../persistence/db";
import { getDaysSinceLastBackup } from "../persistence/backup";
import {
  getActiveDay,
  getDayProteinTotalG,
  getEffectiveHydrationTotal,
  getLatestCheckIn,
  getLatestRecommendation,
  getMostRecentBodyweight,
  getWorkContextSource,
} from "./queries";
import { getEffectiveProteinTargetG } from "./nutritionTargetQueries";
import { suggestTemplateForNextWorkout } from "./trainQueries";
import { getLastMainSleep, getSystemStatus, type SystemStatus } from "./systemStatus";

/**
 * SUIT-001: the SYSTEMS readout. Read only, composed from existing queries:
 * the same day totals TODAY and BODY show, System Status unchanged, and the
 * training facts TRAIN already records. No score, no combined number, no new
 * interpretation, and nothing here reaches the Engine.
 */
export const SESSIONS_WINDOW_DAYS = 7;

export interface SystemsReadout {
  day: BeyondDay | null;
  lastMainSleep: { minutes: number; recordedAt: string } | null;
  /** null without an active day: there is no "today" to total. */
  proteinG: number | null;
  proteinTargetG: number | undefined;
  waterOz: number | null;
  bodyweightLbs: number | undefined;
  /** Finished (COMPLETED or PARTIAL) sessions of any type in the last SESSIONS_WINDOW_DAYS days. */
  sessionsInWindow: number;
  lastSession: { templateId: string; at: string; status: "COMPLETED" | "PARTIAL" } | null;
  nextTemplateId: WorkoutTemplateId | null;
  checkIn: { capacity: Capacity; reasonCodes: string[]; recordedAt: string } | null;
  status: SystemStatus;
  /** True when the status is RED and the latest recommendation is "No action required" (TODAY's existing note). */
  statusRedWithNoAction: boolean;
  workContextSource: WorkContextSource | undefined;
  daysSinceLastBackup: number | null;
}

export async function getSystemsReadout(now: Date = new Date()): Promise<SystemsReadout> {
  const day = (await getActiveDay()) ?? null;
  const [sessions, bodyweightLbs, proteinTargetG, nextTemplateId, status] = await Promise.all([
    db.workoutSessions.toArray(),
    getMostRecentBodyweight(),
    getEffectiveProteinTargetG(),
    suggestTemplateForNextWorkout().catch(() => null),
    getSystemStatus(day, now),
  ]);
  const finished = sessions
    .filter((s): s is typeof s & { status: "COMPLETED" | "PARTIAL" } => s.status === "COMPLETED" || s.status === "PARTIAL")
    .map((s) => ({ templateId: s.templateId, at: s.endedAt ?? s.startedAt, status: s.status, startedAt: s.startedAt }))
    .sort((a, b) => a.at.localeCompare(b.at));
  const since = now.getTime() - SESSIONS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const sessionsInWindow = finished.filter((s) => {
    const started = new Date(s.startedAt).getTime();
    return started >= since && started <= now.getTime();
  }).length;
  const last = finished.at(-1);

  let lastMainSleep: SystemsReadout["lastMainSleep"] = null;
  let proteinG: number | null = null;
  let waterOz: number | null = null;
  let checkIn: SystemsReadout["checkIn"] = null;
  let statusRedWithNoAction = false;
  let workContextSource: WorkContextSource | undefined;
  if (day) {
    const [sleep, protein, water, latestCheckIn, recommendation, source] = await Promise.all([
      getLastMainSleep(day.id, now),
      getDayProteinTotalG(day.id),
      getEffectiveHydrationTotal(day.id),
      getLatestCheckIn(day.id),
      getLatestRecommendation(day.id),
      getWorkContextSource(day.id),
    ]);
    lastMainSleep = sleep;
    proteinG = protein;
    waterOz = water;
    checkIn = latestCheckIn ? { ...deriveCapacity(latestCheckIn), recordedAt: latestCheckIn.recordedAt } : null;
    statusRedWithNoAction = status.level === "RED" && recommendation?.kind === "NO_ACTION_REQUIRED";
    workContextSource = source;
  }

  return {
    day,
    lastMainSleep,
    proteinG,
    proteinTargetG,
    waterOz,
    bodyweightLbs,
    sessionsInWindow,
    lastSession: last ? { templateId: last.templateId, at: last.at, status: last.status } : null,
    nextTemplateId,
    checkIn,
    status,
    statusRedWithNoAction,
    workContextSource,
    daysSinceLastBackup: getDaysSinceLastBackup(),
  };
}
