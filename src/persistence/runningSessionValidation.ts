import { z } from "zod";
import type { RunningSession } from "../domain/common/types";
import type { RunningPlanVersion } from "../domain/workout/runningPlan";
import { validateRunningPlanVersion } from "../domain/workout/runningPlan";

/**
 * GRAYSON-TRAIN-RUN-001: a hand-edited or damaged backup can hold a malformed running row or plan snapshot.
 * Readers use these to treat such data as unusable (skipped), never to crash TRAIN.
 */
const segmentSchema = z.object({
  kind: z.enum(["WARMUP", "RUN", "WALK", "COOLDOWN"]),
  seconds: z.number().int().min(1).max(24 * 60 * 60),
});

const runningSessionSchema = z.object({
  id: z.string().min(1),
  beyondDayId: z.string().min(1),
  schemaVersion: z.literal(1),
  kind: z.literal("PLAN_RUN"),
  planId: z.string().min(1),
  phase: z.enum(["FOUNDATION", "SPECIFIC"]),
  week: z.number().int().min(1),
  run: z.number().int().min(1),
  segments: z.array(segmentSchema).min(1),
  status: z.enum(["ACTIVE", "COMPLETED", "PARTIAL", "ABANDONED"]),
  startedAt: z.string().refine((v) => Number.isFinite(Date.parse(v))),
  endedAt: z.string().refine((v) => Number.isFinite(Date.parse(v))).optional(),
  pausedAt: z.string().refine((v) => Number.isFinite(Date.parse(v))).optional(),
  pausedMs: z.number().min(0),
  completedSeconds: z.number().min(0),
  endReason: z.enum(["FINISHED", "STOPPED", "PAIN"]).optional(),
});

/** The row as a RunningSession, or null if it is malformed. */
export function parseRunningSession(row: unknown): RunningSession | null {
  const parsed = runningSessionSchema.safeParse(row);
  return parsed.success ? (parsed.data as RunningSession) : null;
}

const planSchema = z.object({
  planId: z.string().min(1),
  phase: z.enum(["FOUNDATION", "SPECIFIC"]),
  weeks: z.array(z.array(z.array(segmentSchema))),
  runsPerWeek: z.number(),
  showOptional: z.boolean(),
  weekStartsOn: z.number(),
});

/** A stored plan snapshot, or null if it is malformed or would not run. */
export function parseRunningPlanVersion(raw: unknown): RunningPlanVersion | null {
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) return null;
  const plan = parsed.data as RunningPlanVersion;
  return validateRunningPlanVersion(plan) === null ? plan : null;
}
