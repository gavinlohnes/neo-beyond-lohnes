import { db } from "../persistence/db";
import { newId, nextSeq } from "./commands";
import type { DomainEvent } from "../domain/common/types";
import type { Mission, Obligation } from "../domain/intent/types";
import {
  missionInputSchema,
  missionModifyInputSchema,
  obligationInputSchema,
  obligationModifyInputSchema,
  type MissionInput,
  type MissionModifyInput,
  type ObligationInput,
  type ObligationModifyInput,
} from "../persistence/intentValidation";

/**
 * Intent & Commitment Spine — Drop 01 (approved 2026-08-22). Mission and
 * Obligation canonical records are directly mutated (current state,
 * same treatment as BeyondDay's own fields) while every meaningful
 * lifecycle change also produces a real historical DomainEvent — never
 * both a mutation AND silence, never an event with no matching canonical
 * update. UI components must go through these commands, never write to
 * db.missions/db.obligations directly (Drop 01 section 10) — this is
 * also the one seam a future TODAY/Search/COMMAND/LINK surface can share
 * without inventing a second mutation path.
 *
 * Mirrors application/commands.ts's logEvent exactly, except scoped by
 * missionId/obligationId instead of a required beyondDayId — Mission and
 * Obligation are BEYOND's first records that outlive any single day (same
 * reasoning CaptureItem's own doc comment gives for being day-independent
 * — see domain/common/types.ts's DomainEvent.beyondDayId doc comment).
 */
async function logIntentEvent(
  type: DomainEvent["type"],
  payload: unknown,
  source: DomainEvent["source"],
  correlationId: string,
  scope: { missionId?: string; obligationId?: string },
  causationId?: string,
): Promise<string> {
  const timestamp = new Date().toISOString();
  const event: DomainEvent = {
    id: newId(),
    type,
    occurredAt: timestamp,
    recordedAt: timestamp,
    payload,
    source,
    correlationId,
    seq: await nextSeq(),
    ...(scope.missionId ? { missionId: scope.missionId } : {}),
    ...(scope.obligationId ? { obligationId: scope.obligationId } : {}),
    ...(causationId ? { causationId } : {}),
  };
  await db.events.add(event);
  return event.id;
}

function notFound(kind: "MISSION" | "OBLIGATION", id: string): Error {
  return new Error(`${kind}_NOT_FOUND: no ${kind.toLowerCase()} with id ${id}`);
}

/** Explicit operator action only (locked doctrine: "the operator retains authority over their creation"). Always source USER — Drop 01 never creates one automatically. */
export async function createMission(input: MissionInput): Promise<Mission> {
  const parsed = missionInputSchema.parse(input);
  const now = new Date().toISOString();
  const mission: Mission = {
    id: newId(),
    title: parsed.title,
    ...(parsed.description ? { description: parsed.description } : {}),
    status: "ACTIVE",
    source: "USER",
    seq: await nextSeq(),
    createdAt: now,
    updatedAt: now,
  };
  await db.missions.add(mission);
  const correlationId = newId();
  await logIntentEvent(
    "MISSION_CREATED",
    { commandId: correlationId, missionId: mission.id, title: mission.title },
    "USER",
    correlationId,
    { missionId: mission.id },
  );
  return mission;
}

export async function modifyMission(missionId: string, changes: MissionModifyInput): Promise<Mission> {
  const parsed = missionModifyInputSchema.parse(changes);
  const existing = await db.missions.get(missionId);
  if (!existing) throw notFound("MISSION", missionId);
  const updated: Mission = {
    ...existing,
    ...(parsed.title !== undefined ? { title: parsed.title } : {}),
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    updatedAt: new Date().toISOString(),
  };
  await db.missions.put(updated);
  const correlationId = newId();
  await logIntentEvent(
    "MISSION_MODIFIED",
    { commandId: correlationId, missionId, changes: parsed },
    "USER",
    correlationId,
    { missionId },
  );
  return updated;
}

/**
 * Smallest semantics consistent with the approved Mission model (Drop 01
 * section 4): archiving is a one-way "no longer active" flag, not a
 * delete — obligations already linked to it keep their missionId
 * unchanged and remain fully queryable.
 */
export async function archiveMission(missionId: string): Promise<void> {
  const existing = await db.missions.get(missionId);
  if (!existing) throw notFound("MISSION", missionId);
  if (existing.status === "ARCHIVED") return; // idempotent, matching markWorkEnded's precedent for a fact that's either already true or isn't
  await db.missions.update(missionId, { status: "ARCHIVED", updatedAt: new Date().toISOString() });
  const correlationId = newId();
  await logIntentEvent("MISSION_ARCHIVED", { commandId: correlationId, missionId }, "USER", correlationId, {
    missionId,
  });
}

/** Explicit operator action only — same authority doctrine as createMission. An Obligation may exist without a Mission (Drop 01 section 6). */
export async function createObligation(input: ObligationInput): Promise<Obligation> {
  const parsed = obligationInputSchema.parse(input);
  if (parsed.missionId) {
    const mission = await db.missions.get(parsed.missionId);
    if (!mission) throw notFound("MISSION", parsed.missionId);
  }
  const now = new Date().toISOString();
  const obligation: Obligation = {
    id: newId(),
    title: parsed.title,
    ...(parsed.description ? { description: parsed.description } : {}),
    status: "OPEN",
    ...(parsed.missionId ? { missionId: parsed.missionId } : {}),
    ...(parsed.dueAt ? { dueAt: parsed.dueAt } : {}),
    ...(parsed.plannedAt ? { plannedAt: parsed.plannedAt } : {}),
    ...(parsed.recurrence ? { recurrence: parsed.recurrence } : {}),
    source: "USER",
    seq: await nextSeq(),
    createdAt: now,
    updatedAt: now,
  };
  await db.obligations.add(obligation);
  const correlationId = newId();
  await logIntentEvent(
    "OBLIGATION_CREATED",
    {
      commandId: correlationId,
      obligationId: obligation.id,
      title: obligation.title,
      ...(obligation.missionId ? { missionId: obligation.missionId } : {}),
    },
    "USER",
    correlationId,
    { obligationId: obligation.id },
  );
  return obligation;
}

export async function modifyObligation(obligationId: string, changes: ObligationModifyInput): Promise<Obligation> {
  const parsed = obligationModifyInputSchema.parse(changes);
  const existing = await db.obligations.get(obligationId);
  if (!existing) throw notFound("OBLIGATION", obligationId);
  if (parsed.missionId) {
    const mission = await db.missions.get(parsed.missionId);
    if (!mission) throw notFound("MISSION", parsed.missionId);
  }
  const updated: Obligation = {
    ...existing,
    ...(parsed.title !== undefined ? { title: parsed.title } : {}),
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    ...(parsed.missionId !== undefined ? { missionId: parsed.missionId } : {}),
    ...(parsed.dueAt !== undefined ? { dueAt: parsed.dueAt } : {}),
    ...(parsed.plannedAt !== undefined ? { plannedAt: parsed.plannedAt } : {}),
    ...(parsed.recurrence !== undefined ? { recurrence: parsed.recurrence } : {}),
    updatedAt: new Date().toISOString(),
  };
  await db.obligations.put(updated);
  const correlationId = newId();
  await logIntentEvent(
    "OBLIGATION_MODIFIED",
    { commandId: correlationId, obligationId, changes: parsed },
    "USER",
    correlationId,
    { obligationId },
  );
  return updated;
}

function assertObligationExists(existing: Obligation | undefined, obligationId: string): asserts existing is Obligation {
  if (!existing) throw notFound("OBLIGATION", obligationId);
}

/** OPEN -> WAITING only (Drop 01 section 4: "transition OPEN <-> WAITING where valid"). Throws on any other current status, matching markWorkEnded's precedent of surfacing an invalid transition immediately rather than silently no-opping. */
export async function markObligationWaiting(obligationId: string): Promise<void> {
  const existing = await db.obligations.get(obligationId);
  assertObligationExists(existing, obligationId);
  if (existing.status === "WAITING") return; // idempotent no-op for the already-true case
  if (existing.status !== "OPEN") {
    throw new Error(`INVALID_OBLIGATION_TRANSITION: cannot mark ${existing.status} obligation as WAITING (must be OPEN).`);
  }
  await db.obligations.update(obligationId, { status: "WAITING", updatedAt: new Date().toISOString() });
  const correlationId = newId();
  await logIntentEvent("OBLIGATION_MARKED_WAITING", { commandId: correlationId, obligationId }, "USER", correlationId, {
    obligationId,
  });
}

/** WAITING -> OPEN only. Throws on any other current status. */
export async function markObligationOpen(obligationId: string): Promise<void> {
  const existing = await db.obligations.get(obligationId);
  assertObligationExists(existing, obligationId);
  if (existing.status === "OPEN") return; // idempotent no-op for the already-true case
  if (existing.status !== "WAITING") {
    throw new Error(`INVALID_OBLIGATION_TRANSITION: cannot mark ${existing.status} obligation as OPEN (must be WAITING).`);
  }
  await db.obligations.update(obligationId, { status: "OPEN", updatedAt: new Date().toISOString() });
  const correlationId = newId();
  await logIntentEvent("OBLIGATION_MARKED_OPEN", { commandId: correlationId, obligationId }, "USER", correlationId, {
    obligationId,
  });
}

/** Valid from OPEN or WAITING only — an already-resolved (SATISFIED/RELEASED) obligation cannot be satisfied again; re-open is not a Drop 01 operation. */
export async function satisfyObligation(obligationId: string, resolutionNote?: string): Promise<void> {
  const existing = await db.obligations.get(obligationId);
  assertObligationExists(existing, obligationId);
  if (existing.status === "SATISFIED" || existing.status === "RELEASED") {
    throw new Error(`OBLIGATION_ALREADY_RESOLVED: obligation is already ${existing.status}.`);
  }
  const resolvedAt = new Date().toISOString();
  await db.obligations.update(obligationId, {
    status: "SATISFIED",
    resolvedAt,
    ...(resolutionNote ? { resolutionNote } : {}),
    updatedAt: resolvedAt,
  });
  const correlationId = newId();
  await logIntentEvent(
    "OBLIGATION_SATISFIED",
    { commandId: correlationId, obligationId, ...(resolutionNote ? { resolutionNote } : {}) },
    "USER",
    correlationId,
    { obligationId },
  );
}

/** Valid from OPEN or WAITING only — "no longer required," distinct from SATISFIED. Same one-way-from-unresolved rule as satisfyObligation. */
export async function releaseObligation(obligationId: string, resolutionNote?: string): Promise<void> {
  const existing = await db.obligations.get(obligationId);
  assertObligationExists(existing, obligationId);
  if (existing.status === "SATISFIED" || existing.status === "RELEASED") {
    throw new Error(`OBLIGATION_ALREADY_RESOLVED: obligation is already ${existing.status}.`);
  }
  const resolvedAt = new Date().toISOString();
  await db.obligations.update(obligationId, {
    status: "RELEASED",
    resolvedAt,
    ...(resolutionNote ? { resolutionNote } : {}),
    updatedAt: resolvedAt,
  });
  const correlationId = newId();
  await logIntentEvent(
    "OBLIGATION_RELEASED",
    { commandId: correlationId, obligationId, ...(resolutionNote ? { resolutionNote } : {}) },
    "USER",
    correlationId,
    { obligationId },
  );
}
