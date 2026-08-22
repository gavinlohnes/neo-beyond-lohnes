// Domain layer must not import React, Dexie, or UI code.

/**
 * Intent & Commitment Spine — Drop 01 (approved 2026-08-22). First
 * implementation of Missions and Obligations in BEYOND.
 *
 * Locked doctrine this Drop models (nothing more):
 * - direction (Mission), requirement (Obligation), temporal expectation,
 *   provenance, relationships, resolution.
 * - Due time, planned attention, and actual occurrence are distinct and
 *   never collapsed into one generic date.
 * - Derived states (overdue, priority, urgency, attention) are Engine/UI
 *   interpretation at read time — never stored here. There is
 *   deliberately no `overdue` field anywhere below.
 * - Recurrence-compatible shape only (RecurrenceRule): stored so a future
 *   recurrence-EXECUTION Drop doesn't need a data migration, but nothing
 *   in this Drop reads it to generate anything. No rrule/RRULE dependency.
 * - Mission/Obligation canonical records are directly mutated (current
 *   state), matching BeyondDay's own treatment — NOT a correction chain
 *   like water/sleep/protein/bodyweight logs. Meaningful lifecycle
 *   changes are additionally recorded as historical DomainEvents (see
 *   the Mission- and Obligation-prefixed payloads in ../common/types.ts)
 *   — that historical trail, not this record, is where "evidence of
 *   resolution" ultimately lives.
 */

export type MissionStatus = "ACTIVE" | "ARCHIVED";

export type ObligationStatus = "OPEN" | "WAITING" | "SATISFIED" | "RELEASED";

/**
 * Deliberately BEYOND's own minimal vocabulary, not a standard-conformant
 * recurrence engine (Drop 01 section 5/15: "do not implement a custom
 * recurrence engine," "do not introduce RRULE/rrule.js"). Dormant in V1 —
 * nothing reads this to create a future Obligation; it only prevents a
 * later migration if/when recurrence execution is ever approved.
 */
export interface RecurrenceRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number;
}

/**
 * Mission: durable direction/context. No score, no priority, no due date
 * of its own — just what it is and whether it's still active. An
 * Obligation may reference one via `missionId`; a Mission has no reverse
 * pointer (see getObligationsForMission in application/intentQueries.ts).
 */
export interface Mission {
  id: string;
  title: string;
  description?: string;
  status: MissionStatus;
  /** Provenance: how this record originated. Mirrors DomainEvent.source's vocabulary rather than inventing a new one. Always "USER" in Drop 01 — ENGINE/SYSTEM stay reserved for a future BEYOND-proposed flow the operator still explicitly confirms (locked doctrine: creation authority is always the operator's). */
  source: "USER" | "ENGINE" | "SYSTEM";
  /** See StateCheckIn.seq's doc comment in ../common/types.ts — same deterministic tie-break, same shared counter. */
  seq?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Obligation: a condition requiring deliberate resolution. `dueAt` (when
 * it must/should become true) and `plannedAt` (when the operator intends
 * to work on it) are plain YYYY-MM-DD calendar dates, not instants — a
 * due/planned obligation is naturally day-grained, and inventing
 * sub-day precision nothing asked for would be exactly the kind of false
 * precision BEYOND's doctrine elsewhere rejects. `resolvedAt` is a real
 * instant (ISO timestamp) — what actually happened, when it actually
 * happened. `overdue` is NOT a field: always derived by comparing dueAt
 * to now, at read time, never stored.
 */
export interface Obligation {
  id: string;
  title: string;
  description?: string;
  status: ObligationStatus;
  /** An Obligation may exist without a Mission — this is optional by design (Drop 01 section 6). */
  missionId?: string;
  /** YYYY-MM-DD. Due expectation — distinct from plannedAt and resolvedAt. */
  dueAt?: string;
  /** YYYY-MM-DD. Planned attention — distinct from dueAt and resolvedAt. */
  plannedAt?: string;
  /** ISO timestamp. Set only by satisfyObligation/releaseObligation — actual occurrence, distinct from dueAt/plannedAt. */
  resolvedAt?: string;
  /** Freeform evidence of how it was resolved — set only alongside resolvedAt. */
  resolutionNote?: string;
  recurrence?: RecurrenceRule;
  /** See Mission.source's doc comment — same vocabulary, same reservation for a future BEYOND-proposed flow. */
  source: "USER" | "ENGINE" | "SYSTEM";
  /** See StateCheckIn.seq's doc comment in ../common/types.ts — same deterministic tie-break, same shared counter. */
  seq?: number;
  createdAt: string;
  updatedAt: string;
}
