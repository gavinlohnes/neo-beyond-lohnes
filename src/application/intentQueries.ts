import { db } from "../persistence/db";
import type { DomainEvent } from "../domain/common/types";
import type { Mission, Obligation } from "../domain/intent/types";
import { parseMission, parseObligation } from "../persistence/intentValidation";
import { filterCurrentlyEligibleObligations } from "../engine/obligationEligibility";
import { byTimeThenSeq } from "./queries";

/**
 * Intent & Commitment Spine — Drop 01. Minimum query capability the spec
 * calls for: retrieve Missions, active Missions, Obligations, unresolved
 * Obligations, Obligations for a Mission, and per-record history. Every
 * result is run through parseMission/parseObligation first — a row that
 * fails validation (e.g. a hand-edited or corrupted imported backup) is
 * silently excluded rather than crashing or being treated as truth,
 * matching getSchedulePattern's "unknown is better than false precision"
 * precedent. No fuzzy search, no derived priority/urgency — deterministic
 * sort only (byTimeThenSeq on createdAt), same tie-break every other
 * "list this" query in the app already uses.
 */

async function validMissions(): Promise<Mission[]> {
  const raw = await db.missions.toArray();
  return raw.map(parseMission).filter((m): m is Mission => m !== null);
}

async function validObligations(): Promise<Obligation[]> {
  const raw = await db.obligations.toArray();
  return raw.map(parseObligation).filter((o): o is Obligation => o !== null);
}

function sortByCreated<T extends { createdAt: string; seq?: number }>(records: T[]): T[] {
  return records.sort((a, b) => byTimeThenSeq(a.createdAt, a.seq, b.createdAt, b.seq));
}

export async function getMissions(): Promise<Mission[]> {
  return sortByCreated(await validMissions());
}

export async function getActiveMissions(): Promise<Mission[]> {
  return sortByCreated((await validMissions()).filter((m) => m.status === "ACTIVE"));
}

export async function getMission(id: string): Promise<Mission | undefined> {
  const raw = await db.missions.get(id);
  return raw ? (parseMission(raw) ?? undefined) : undefined;
}

export async function getObligations(): Promise<Obligation[]> {
  return sortByCreated(await validObligations());
}

/** OPEN or WAITING — not yet SATISFIED or RELEASED. Management/audit semantics: includes Obligations whose parent Mission is ARCHIVED (see getCurrentlyEligibleUnresolvedObligations for the current-attention projection). */
export async function getUnresolvedObligations(): Promise<Obligation[]> {
  return sortByCreated((await validObligations()).filter((o) => o.status === "OPEN" || o.status === "WAITING"));
}

/**
 * Intent Lifecycle Integrity — owner-approved correction (2026-08-23, see
 * docs/UX_DECISIONS.md). The one reusable Intent-owned projection every
 * current-attention/intelligence consumer (TODAY commitment/attention,
 * AdvisoryNotes, and any future one) should read from instead of
 * getUnresolvedObligations() directly — getUnresolvedObligations() itself
 * stays unchanged and keeps its literal OPEN/WAITING management meaning
 * (the Obligations management surface in IntentScreen.tsx intentionally
 * still uses it directly, since an operator must be able to find and act
 * on an obligation whose parent Mission was archived, not have it
 * silently disappear from management).
 */
export async function getCurrentlyEligibleUnresolvedObligations(): Promise<Obligation[]> {
  const [obligations, missions] = await Promise.all([getUnresolvedObligations(), getMissions()]);
  const missionsById = new Map(missions.map((m) => [m.id, m]));
  return filterCurrentlyEligibleObligations(obligations, missionsById);
}

export async function getObligationsForMission(missionId: string): Promise<Obligation[]> {
  return sortByCreated((await validObligations()).filter((o) => o.missionId === missionId));
}

export async function getObligation(id: string): Promise<Obligation | undefined> {
  const raw = await db.obligations.get(id);
  return raw ? (parseObligation(raw) ?? undefined) : undefined;
}

const MISSION_EVENT_TYPES = new Set(["MISSION_CREATED", "MISSION_MODIFIED", "MISSION_ARCHIVED"]);
const OBLIGATION_EVENT_TYPES = new Set([
  "OBLIGATION_CREATED",
  "OBLIGATION_MODIFIED",
  "OBLIGATION_MARKED_WAITING",
  "OBLIGATION_MARKED_OPEN",
  "OBLIGATION_SATISFIED",
  "OBLIGATION_RELEASED",
]);

/** Oldest first — the full historical trail for one Mission, via the missionId index added in db.ts v6. */
export async function getMissionHistory(missionId: string): Promise<DomainEvent[]> {
  const events = await db.events.where("missionId").equals(missionId).toArray();
  return events
    .filter((e) => MISSION_EVENT_TYPES.has(e.type))
    .sort((a, b) => byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq));
}

/** Oldest first — the full historical trail for one Obligation, via the obligationId index added in db.ts v6. */
export async function getObligationHistory(obligationId: string): Promise<DomainEvent[]> {
  const events = await db.events.where("obligationId").equals(obligationId).toArray();
  return events
    .filter((e) => OBLIGATION_EVENT_TYPES.has(e.type))
    .sort((a, b) => byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq));
}
