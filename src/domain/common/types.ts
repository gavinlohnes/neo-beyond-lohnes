// Domain layer must not import React, Dexie, or UI code.

export type Capacity = "GREEN" | "YELLOW" | "RED";

/**
 * POST_SHIFT_TRANSITION (Drop 02b, Decision Register "WORK TRANSITION",
 * 2026-08-19 locked): "Engine priority: Stabilize -> explicit post-shift
 * transition when applicable -> Recover -> Execute planned work." A
 * distinct tier from STABILIZE — STABILIZE means capacity is critically
 * low; POST_SHIFT_TRANSITION means an explicit WORK_PERIOD_ENDED fact is
 * unresolved, regardless of capacity (except RED, which still wins).
 */
export type RecommendationKind =
  | "STABILIZE"
  | "POST_SHIFT_TRANSITION"
  | "RECOVER"
  | "EXECUTE_PLANNED_WORK"
  | "NO_ACTION_REQUIRED";

export interface StateCheckIn {
  id: string;
  beyondDayId: string;
  recordedAt: string; // ISO
  energy: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  mood: 1 | 2 | 3 | 4 | 5;
  soreness: 0 | 1 | 2 | 3 | 4 | 5;
  alcoholUrge: 0 | 1 | 2 | 3 | 4 | 5;
  /**
   * Deterministic same-instant tie-break (event-ordering redesign,
   * following Drop 02b): recordedAt stays the real, unmodified moment this
   * was recorded — seq only disambiguates two records that are otherwise
   * indistinguishable in time. Optional and unindexed: existing historical
   * rows simply don't have it and are unaffected. See
   * application/commands.ts's nextSeq for how it's assigned.
   */
  seq?: number;
}

export interface BeyondDay {
  id: string;
  startedAt: string;
  timezoneId: string;
  workContext: "WORK" | "OFF" | "UNKNOWN";
  status: "ACTIVE" | "ENDED";
  createdAt: string;
  updatedAt: string;
}

export interface DecisionTraceInput {
  key: string;
  value: string | number | boolean;
}

export interface DecisionTrace {
  engineVersion: string;
  evaluatedAt: string;
  inputs: DecisionTraceInput[];
  derived: DecisionTraceInput[];
  matchedRules: { ruleId: string; result: boolean; reason: string }[];
  selectedRecommendation: RecommendationKind;
  selectionReason: string;
}

export interface Recommendation {
  id: string;
  beyondDayId: string;
  issuedAt: string;
  kind: RecommendationKind;
  priority: number;
  title: string;
  rationale: string;
  suggestedCommand: string | null;
  trace: DecisionTrace;
  // Confirmed against both real historical backups: NO_ACTION_REQUIRED
  // recommendations carry statusAtIssue "NO_ACTION_REQUIRED", not the
  // generic "NO_ACTION" checkpoint 03 originally guessed.
  statusAtIssue: "ACTION" | "NO_ACTION_REQUIRED";
  /** See StateCheckIn.seq's doc comment — same deterministic tie-break, same shared counter. */
  seq?: number;
}

/**
 * Confirmed against both real historical backup exports. Outcome carries
 * either a recommendationId or a commandExecutionId (mutually exclusive in
 * both observed fixtures — never both, never neither), linking a result
 * back to the recommendation or command it resolves.
 */
/**
 * `rating` (GOOD/NEUTRAL/BAD) is a distinct new concept added this
 * checkpoint (Context & Safety Decisions, 2026-08-19, locked) — a light,
 * explicit user signal on how a recommendation actually went, captured
 * separately from `result`'s confirmed historical completion-status
 * meaning (UNKNOWN/NO_ACTION/COMPLETED/ABANDONED). BEYOND does not
 * silently adjust its own rules from this data; it's for later review
 * (BATCAVE pattern-surfacing), not automatic learning.
 */
export interface Outcome {
  id: string;
  beyondDayId: string;
  recordedAt: string;
  result: "UNKNOWN" | "NO_ACTION" | "COMPLETED" | "ABANDONED";
  recommendationId?: string;
  commandExecutionId?: string;
  rating?: "GOOD" | "NEUTRAL" | "BAD";
}

/** Confirmed against beyond-backup-2026-08-18T06-33-36-443Z.json. */
export interface WorkoutSession {
  id: string;
  schemaVersion: number;
  beyondDayId: string;
  templateId: string;
  sessionType: string;
  status: string;
  startedAt: string;
  endedAt?: string;
}

/**
 * UNCONFIRMED SHAPE: both protected fixtures contain zero performedSets
 * rows, so no real field names have been observed. Stored as opaque
 * historical data (id/beyondDayId only are relied upon) rather than
 * inventing a detailed schema the Canonical Spec's TRAIN doctrine implies
 * (exercise, ordinal, weight, reps, completion) but that no evidence
 * confirms yet. Replace with a confirmed shape once real performedSets
 * evidence exists.
 */
export interface PerformedSetRaw {
  id: string;
  beyondDayId: string;
  [key: string]: unknown;
}

export type DomainEventType =
  | "DAY_STARTED"
  | "DAY_ENDED"
  | "SLEEP_LOGGED"
  | "SLEEP_LOG_CORRECTED"
  | "BODYWEIGHT_LOGGED"
  | "BODYWEIGHT_LOG_CORRECTED"
  | "PROTEIN_LOGGED"
  | "PROTEIN_LOG_CORRECTED"
  | "OUTCOME_RATED"
  | "WORK_CONTEXT_SET"
  | "MINIMUM_DAY_ENABLED"
  | "MEDS_COMPLETED"
  | "HYGIENE_COMPLETED"
  | "MOVE_COMPLETED"
  | "RECOVER_CONNECT_COMPLETED"
  | "STATE_CHECKED_IN"
  | "RECOMMENDATION_ISSUED"
  | "RECOMMENDATION_ACCEPTED"
  | "RECOMMENDATION_DECLINED"
  | "NO_ACTION_RECORDED"
  | "COMMAND_STARTED"
  | "COMMAND_COMPLETED"
  | "RESET_STARTED"
  | "RESET_COMPLETED"
  | "RESET_CANCELLED"
  | "SHIFT_DOWN_STARTED"
  | "SHIFT_DOWN_COMPLETED"
  | "SHIFT_DOWN_CANCELLED"
  | "WORKOUT_STARTED"
  | "WORKOUT_ABANDONED"
  | "WORKOUT_COMPLETED"
  | "SET_LOGGED"
  | "SET_SKIPPED"
  | "WATER_LOGGED"
  | "WATER_LOG_CORRECTED"
  | "WORK_PERIOD_ENDED"
  | "MISSION_CREATED"
  | "MISSION_MODIFIED"
  | "MISSION_ARCHIVED"
  | "OBLIGATION_CREATED"
  | "OBLIGATION_MODIFIED"
  | "OBLIGATION_MARKED_WAITING"
  | "OBLIGATION_MARKED_OPEN"
  | "OBLIGATION_SATISFIED"
  | "OBLIGATION_RELEASED";

/**
 * DERIVED, not stored. Computed by walking a WATER_LOGGED event and any
 * WATER_LOG_CORRECTED events that chain from it. BEYOND stores what
 * happened (the events); this is the effective view of that history.
 */
export interface HydrationEntry {
  rootEventId: string;
  headEventId: string;
  originalAmountOz: number;
  effectiveAmountOz: number;
  correctionCount: number;
  recordedAt: string;
}

export interface WaterLoggedPayload {
  commandId: string;
  amountOz: number;
}

/**
 * Field names confirmed against the real historical app's backup export
 * (test-fixtures/protected/beyond-backup-2026-08-18T06-33-36-443Z.json):
 * originalEventId identifies the root/original fact and stays constant
 * across an entire correction chain; supersedesEventId identifies the
 * immediate currently-effective fact this correction replaces (the chain's
 * current HEAD at the time of correction, which may itself already be a
 * correction).
 */
export interface WaterLogCorrectedPayload {
  commandId: string;
  originalEventId: string;
  supersedesEventId: string;
  amountOz: number;
}

/**
 * BeyondDay lifecycle (Context & Safety Decisions, 2026-08-19): ends via
 * explicit END DAY action only, or as a fallback auto-close when a new day
 * starts while one is still ACTIVE. Calendar midnight is explicitly
 * rejected as a boundary. END DAY closes silently — no recap.
 */
export interface DayEndedPayload {
  reason: "EXPLICIT_END_DAY" | "AUTO_CLOSED_ON_NEW_DAY_START";
}

/**
 * Sleep logging (Decision Register, BODY/SLEEP; Sleep/Day-Ownership Model
 * DECISION, 2026-08-19): duration in whole minutes, no goal/target, no
 * dedicated table — stored as event history only.
 *
 * `kind` (Sleep/Day-Ownership DECISION): PRIMARY is the sleep that
 * actually closes a BeyondDay out — CP4's "Engine suggests ending right
 * after primary sleep is logged" only fires on PRIMARY. SUPPLEMENTAL is a
 * nap or other non-day-closing sleep; logging one never suggests ending
 * the day. Backward compatibility: events logged before this decision
 * have no `kind` field at all — application/queries.ts's
 * shouldSuggestEndDay treats an absent kind as PRIMARY (the only kind
 * that existed when they were logged), never reinterpreting them as
 * SUPPLEMENTAL.
 */
export interface SleepLoggedPayload {
  commandId: string;
  durationMinutes: number;
  kind: "PRIMARY" | "SUPPLEMENTAL";
}

/**
 * Phase 5 (BODY logging): same correction-chain shape as
 * WaterLogCorrectedPayload — originalEventId is the chain's root and
 * never changes; supersedesEventId is the HEAD this correction replaces.
 * `kind` is NOT correctable here — a correction fixes the duration typo,
 * not whether it was a nap; re-logging under the other kind is the way
 * to fix a kind mistake, matching how a wrong WATER_LOGGED amount is
 * corrected rather than the fact of having logged water at all.
 */
export interface SleepLogCorrectedPayload {
  commandId: string;
  originalEventId: string;
  supersedesEventId: string;
  durationMinutes: number;
}

/**
 * Bodyweight logging (BODY & Backup / Context & Safety Decisions,
 * 2026-08-19): a fact only in this checkpoint — no goal/target field.
 * Tonight's phone session proposed carrying forward a 210->165 goal from
 * the legacy mockup, but the 2026-08-19 authority reconciliation rejected
 * the parallel sleep-goal proposal on "goals remain deferred" grounds and
 * flagged the bodyweight goal as hinging on the same question — Gavin's
 * checkpoint instructions explicitly scope this to logging only.
 */
export interface BodyweightLoggedPayload {
  commandId: string;
  weightLbs: number;
}

/** Phase 5 (BODY logging): same correction-chain shape as WaterLogCorrectedPayload. */
export interface BodyweightLogCorrectedPayload {
  commandId: string;
  originalEventId: string;
  supersedesEventId: string;
  weightLbs: number;
}

/** Protein logging: amount only, no daily target (2026-08-19, locked — explicitly not carrying over the legacy mockup's 165g+ target). */
export interface ProteinLoggedPayload {
  commandId: string;
  grams: number;
}

/** Phase 5 (BODY logging): same correction-chain shape as WaterLogCorrectedPayload. */
export interface ProteinLogCorrectedPayload {
  commandId: string;
  originalEventId: string;
  supersedesEventId: string;
  grams: number;
}

/**
 * Outcome rating (Context & Safety Decisions, 2026-08-19, locked):
 * captured via a light, explicit signal (thumbs up/down/neutral), tied to
 * the recommendation lifecycle — not folded into quick check-in, not
 * automatic inference.
 */
export interface OutcomeRatedPayload {
  commandId: string;
  recommendationId: string;
  rating: "GOOD" | "NEUTRAL" | "BAD";
}

/**
 * Work schedule / predictive context (Decision Register, "WORK SCHEDULE /
 * CONTEXT — SUPERSEDING REFINEMENT", 2026-08-19): the ONLY way
 * BeyondDay.workContext ever changes. Schedule-derived predictions never
 * write this directly — every change is this one explicit, confirmed
 * fact, whether the user typed it manually or accepted a schedule
 * suggestion. Doctrine: PREDICTION IS NOT FACT.
 */
export interface WorkContextSetPayload {
  commandId: string;
  workContext: "WORK" | "OFF";
  source: "MANUAL" | "SCHEDULE_SUGGESTION_ACCEPTED";
}

/**
 * Drop 02b (Explicit Work Transition, Decision Register "WORK TRANSITION",
 * 2026-08-19 locked): the only historical fact marking a work shift as
 * actually over. Created solely by application/commands.ts's
 * markWorkEnded on explicit user confirmation — never inferred from clock
 * time, schedule prediction, or any other automatic signal. "Shift end is
 * never inferred from time, schedule, GPS, inactivity, or other hidden
 * signals." At most one effective WORK_PERIOD_ENDED event exists per
 * BeyondDay — markWorkEnded is idempotent, not a correction chain, since
 * there is nothing to correct about "did the shift end," only whether it
 * has been marked yet.
 */
export interface WorkPeriodEndedPayload {
  commandId: string;
}

/**
 * Intent & Commitment Spine — Drop 01 (2026-08-22, approved): event
 * payloads for the Mission/Obligation lifecycle. Every mutation of a
 * Mission/Obligation canonical record (src/domain/intent/types.ts) is
 * paired with one of these, logged via application/intentCommands.ts's
 * logIntentEvent — same DomainEvent shape as every other fact in BEYOND,
 * scoped by missionId/obligationId instead of beyondDayId (see
 * DomainEvent's doc comment above). `commandId` doubles as
 * DomainEvent.correlationId, matching every other command in this file.
 */
export interface MissionCreatedPayload {
  commandId: string;
  missionId: string;
  title: string;
}

export interface MissionModifiedPayload {
  commandId: string;
  missionId: string;
  changes: { title?: string; description?: string };
}

export interface MissionArchivedPayload {
  commandId: string;
  missionId: string;
}

export interface ObligationCreatedPayload {
  commandId: string;
  obligationId: string;
  title: string;
  missionId?: string;
  /**
   * Post-FIELD Capability Acceleration Campaign, Slice 3 (Capture
   * Processing, 2026-08-23, owner-approved "provenance-tracked"): set
   * only when this Obligation was created via the explicit CREATE
   * OBLIGATION handoff from an existing CaptureItem
   * (application/intentCommands.ts's convertCaptureToObligation).
   * Event-level provenance only — never a field on the canonical
   * Obligation record itself, which stays exactly what Drop 01 defined
   * it as. Absent for every other creation path, including IntentScreen's
   * own manual "ADD" form.
   */
  sourceCaptureId?: string;
}

export interface ObligationModifiedPayload {
  commandId: string;
  obligationId: string;
  changes: {
    title?: string;
    description?: string;
    missionId?: string;
    dueAt?: string;
    plannedAt?: string;
    recurrence?: { freq: "DAILY" | "WEEKLY" | "MONTHLY"; interval: number };
  };
}

export interface ObligationMarkedWaitingPayload {
  commandId: string;
  obligationId: string;
}

export interface ObligationMarkedOpenPayload {
  commandId: string;
  obligationId: string;
}

export interface ObligationSatisfiedPayload {
  commandId: string;
  obligationId: string;
  resolutionNote?: string;
}

export interface ObligationReleasedPayload {
  commandId: string;
  obligationId: string;
  resolutionNote?: string;
}

/**
 * Drop 02a (Daily Intelligence / Context — first slice). One entry in a
 * rotating work schedule's cycle. `workdays` uses JS Date.getDay()
 * convention (0=Sunday..6=Saturday) to match engine/scheduledContext.ts's
 * existing date arithmetic.
 */
export interface ScheduleWeekDefinition {
  workdays: number[];
}

/**
 * Drop 02a: the user-editable configuration that used to be hardcoded
 * constants in engine/scheduledContext.ts (ANCHOR_MONDAY, WEEK_A/B_WORKDAYS,
 * SHIFT_START/END_HOUR). Stored so it can be edited from MORE -> Work
 * Schedule instead of requiring a code change.
 *
 * `weeks` is an array, not fixed weekA/weekB fields, specifically so a
 * future rotation longer than two weeks doesn't require a storage
 * migration — only `weeks.length` changes. 02a's editor only ever writes
 * exactly two entries; the shape simply doesn't forbid more.
 *
 * This is configuration, not domain history: single mutable row (id
 * "current"), no DomainEvent per edit, same treatment as BeyondDay's own
 * directly-mutated fields. It becomes canonical BEYOND-owned state once
 * saved and is included in native export/import automatically (a real
 * Dexie table, no special-casing needed in persistence/backup.ts).
 *
 * `anchorMonday` (YYYY-MM-DD, local calendar date of a Monday) is which
 * real-world Monday begins `weeks[0]`. The editor never asks the user to
 * pick this directly — it derives it from "which week is active right
 * now," per Decision Register/R&D guidance to keep this a config detail,
 * not user-facing jargon.
 */
export interface SchedulePattern {
  id: string;
  anchorMonday: string;
  weeks: ScheduleWeekDefinition[];
  shiftStartHour: number;
  shiftEndHour: number;
  /**
   * Hours after shift end that EXPECTED_POST_WORK still applies, before
   * falling back to PRE_WORK/OFF. Not itself a locked schedule value (see
   * scheduledContext.ts) — carried forward as configuration so a future
   * evidence-driven change doesn't require touching source.
   */
  postWorkTailHours: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * MINIMUM DAY (Decision Register, RESET/CAPACITY — locked six-item
 * baseline). MEDS/HYGIENE are always this generic shape ("no medication
 * names/doses" / "no private detail" — the completion fact itself is all
 * that's ever stored). MOVE_COMPLETED/RECOVER_CONNECT_COMPLETED use the
 * same shape as the manual fallback when no RECOVERY session duration
 * satisfies them automatically.
 */
export interface GenericCompletionPayload {
  commandId: string;
}

/**
 * RECOVER_CONNECT_COMPLETED's payload (Phase 3, low-capacity experience):
 * "activity" is optional so the requirement itself hasn't changed — either
 * still satisfies the same single recoverConnect boolean
 * (application/queries.ts's getMinimumDayStatus) — it only records which
 * of the two the user says they actually did, since TodayScreen now offers
 * Recover and Connect as distinct tap targets rather than one generic
 * "mark done." Omitted for the automatic RECOVERY-session-duration path,
 * which has no such distinction to record.
 */
export interface RecoverConnectCompletedPayload extends GenericCompletionPayload {
  activity?: "RECOVER" | "CONNECT";
}

/** Field names confirmed against real historical WORKOUT_STARTED events. */
export interface WorkoutStartedPayload {
  commandId: string;
  sessionId: string;
  templateId: string;
  sessionType: string;
}

/**
 * Shared shape for WORKOUT_COMPLETED and WORKOUT_ABANDONED (field names
 * confirmed against the real historical WORKOUT_ABANDONED event) — the
 * event `type` and `status` distinguish the outcome.
 */
export interface WorkoutEndedPayload {
  commandId: string;
  sessionId: string;
  status: string;
  sessionType: string;
  /** RECOVERY sessions only — the actual logged duration, needed for MINIMUM DAY's MOVE/RECOVER-CONNECT derivation. */
  durationMinutes?: number;
}

export interface SetLoggedPayload {
  commandId: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  substitutedName?: string;
}

export interface SetSkippedPayload {
  commandId: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
}

/** SHIFT DOWN mirrors RESET's shape: duration input, then a two-step START/COMPLETE flow. */
export interface ShiftDownStartedPayload {
  commandId: string;
  durationMinutes: number;
}

export interface ShiftDownCompletedPayload {
  commandId: string;
  shiftDownStartedEventId: string;
}

export interface DomainEvent<TPayload = unknown> {
  id: string;
  type: DomainEventType;
  /**
   * Intent & Commitment Spine (Drop 01, 2026-08-22): widened from required
   * to optional. Every event logged before this Drop always carried a real
   * BeyondDay it happened on and still does — nothing about that changes.
   * Mission/Obligation lifecycle events are the first events in BEYOND
   * that are NOT day-scoped (same reasoning CaptureItem's own doc comment
   * already gives for why it isn't a DomainEvent at all: "a capture can
   * outlive the BeyondDay it was written during"). Missions/Obligations
   * must still produce real historical DomainEvents (locked Drop 01
   * doctrine), so the day-scoping requirement is loosened here rather than
   * inventing a second, parallel event shape. See missionId/obligationId
   * below for how those events are scoped instead.
   */
  beyondDayId?: string;
  /** Intent & Commitment Spine (Drop 01): set on MISSION_* events instead of beyondDayId. */
  missionId?: string;
  /** Intent & Commitment Spine (Drop 01): set on OBLIGATION_* events instead of beyondDayId. */
  obligationId?: string;
  occurredAt: string;
  recordedAt: string;
  payload: TPayload;
  source: "USER" | "ENGINE" | "SYSTEM";
  correlationId: string;
  causationId?: string;
  /** See StateCheckIn.seq's doc comment — same deterministic tie-break, same shared counter. */
  seq?: number;
}

/**
 * Overdrive Phase 10 (Daily Intelligence -> first connective capability):
 * the smallest slice of the approved CAPTURE / Universal Inbox R&D that
 * doesn't require inventing unbuilt policy. The R&D's own core doctrine —
 * "capture first, organize second, act only when earned... capture should
 * be extremely low friction and preserve raw input before classification"
 * — is fully satisfied by this shape alone. The fuller CAPTURE PROCESSOR
 * design (Future R&D Register #14) describes routing captures to
 * KNOWLEDGE/ENTITY_UPDATE/OBLIGATION_PROPOSAL/MISSION_PROPOSAL/etc. — none
 * of those domain concepts exist in BEYOND yet, so building that router
 * now would mean inventing their policy from scratch rather than
 * implementing approved design. Deliberately not attempted here.
 *
 * Not day-scoped and not a DomainEvent: a capture can (and often should)
 * outlive the BeyondDay it was written during — "inbox age is not
 * urgency" — so it has no beyondDayId and isn't part of any day's event
 * history. It is its own small, directly-mutable record, same treatment
 * as SchedulePattern: `text`/`capturedAt` never change after creation;
 * only `status`/`resolvedAt` do, via resolveCaptureItem/reopenCaptureItem.
 */
export interface CaptureItem {
  id: string;
  text: string;
  capturedAt: string;
  status: "OPEN" | "RESOLVED";
  resolvedAt?: string;
  /** See StateCheckIn.seq's doc comment — same deterministic tie-break, same shared counter. */
  seq?: number;
}
