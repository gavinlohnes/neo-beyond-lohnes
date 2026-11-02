import { db } from "../../persistence/db";
import { getActiveDay, getSchedulePattern } from "../queries";
import { readOperatorContext, personalContextVersion } from "../operatorContext";
import type { OperatorContext, ContextSource } from "../../domain/operatorContext";
import { computeDueRollover, mostRecentBoundaryAtOrBefore } from "../../engine/dayRollover";
export type { ContextKind, ContextSource } from "../../domain/operatorContext";
export { readPersonalSources, personalContextVersion } from "../operatorContext";
export type PlanningContext = OperatorContext & { personalVersion: string; actionVersion: string };

/** Confirmation must not apply a proposal to a different lived day or changed task. */
export async function proposalContextVersion(): Promise<string> {
  const [day, schedule] = await Promise.all([getActiveDay(), getSchedulePattern()]);
  return JSON.stringify([mostRecentBoundaryAtOrBefore(new Date()).toISOString(), day?.id ?? null,
    day ? computeDueRollover(new Date(day.startedAt), new Date()) : null, schedule]);
}

export function buildPlanningContext(includePersonal: boolean, now = new Date()): Promise<PlanningContext> {
  return db.transaction("r", db.tables, async () => {
    const { records: _records, ...context } = await readOperatorContext({ purpose: "conversation", includePersonal }, now);
    return { ...context, personalVersion: await personalContextVersion(includePersonal), actionVersion: await proposalContextVersion() };
  });
}

/** Inspect by canonical identity, not by whichever sources fit the next request's catalog budget. */
export async function inspectContextSource(ref: ContextSource, includePersonal: boolean): Promise<ContextSource | null> {
  if ((ref.kind === "MEMORY" || ref.kind === "MISSION") && !includePersonal) return null;
  const context = await readOperatorContext({ purpose: "conversation", includePersonal });
  return context.records.find((s) => s.key === ref.key) ?? null;
}
