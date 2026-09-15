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
 *   **Reversed 2026-09-15, direct owner ruling — see INTENT-002 below.**
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
 * INTENT-002 (2026-09-15, direct owner ruling): Drop 01's original
 * restriction here ("do not implement a custom recurrence engine," "do
 * not introduce RRULE/rrule.js") is reversed — this repo's own
 * `docs/agent/CAPABILITY_MAP.md` had separately pre-approved rrule.js as
 * the standard for exactly this, once recurrence execution was ever
 * actually wanted. The genuine conflict between the two was surfaced to
 * the owner directly rather than silently resolved either way; the owner
 * chose rrule.js. Kept here, not deleted, for history — the prior
 * shape (`{ freq, interval }`) was dormant and never written by any real
 * UI, so this is a safe in-place replacement, not a data migration.
 *
 * `rrule` is a full two-line RFC 5545 string — `DTSTART:...\nRRULE:...`
 * — produced only by `engine/recurrence.ts`'s `buildRecurrenceRule`
 * (never hand-formatted). The DTSTART anchor matters: rrule.js computes
 * occurrences relative to it, not to whenever the rule happens to be
 * evaluated, so it must always be present and explicit — see that
 * module's own tests for why (confirmed empirically before writing any
 * real code: an RRule constructed with no dtstart silently defaults to
 * the object's own construction time, which would make BEYOND's
 * recurrence dates depend on exactly when the app happens to compute
 * them, not on the actual schedule the operator set up).
 */
export interface RecurrenceRule {
  rrule: string;
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
