// Domain layer must not import React, Dexie, or UI code.

export type Capacity = "GREEN" | "YELLOW" | "RED";

export type RecommendationKind =
  | "STABILIZE"
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
  | "BODYWEIGHT_LOGGED"
  | "PROTEIN_LOGGED"
  | "OUTCOME_RATED"
  | "WORK_CONTEXT_SET"
  | "STATE_CHECKED_IN"
  | "RECOMMENDATION_ISSUED"
  | "RECOMMENDATION_ACCEPTED"
  | "NO_ACTION_RECORDED"
  | "COMMAND_STARTED"
  | "COMMAND_COMPLETED"
  | "RESET_STARTED"
  | "RESET_COMPLETED"
  | "SHIFT_DOWN_STARTED"
  | "SHIFT_DOWN_COMPLETED"
  | "WORKOUT_STARTED"
  | "WORKOUT_ABANDONED"
  | "WORKOUT_COMPLETED"
  | "SET_LOGGED"
  | "SET_SKIPPED"
  | "WATER_LOGGED"
  | "WATER_LOG_CORRECTED";

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
 * V0.1 sleep logging (Decision Register, BODY/SLEEP): duration only, in
 * whole minutes, of the primary sleep period preceding the active
 * BeyondDay. No goal/target, no dedicated table — stored as event history
 * only. Minimal prerequisite for CP4's "Engine suggests ending right after
 * primary sleep is logged" behavior.
 */
export interface SleepLoggedPayload {
  commandId: string;
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

/** Protein logging: amount only, no daily target (2026-08-19, locked — explicitly not carrying over the legacy mockup's 165g+ target). */
export interface ProteinLoggedPayload {
  commandId: string;
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
  beyondDayId: string;
  occurredAt: string;
  recordedAt: string;
  payload: TPayload;
  source: "USER" | "ENGINE" | "SYSTEM";
  correlationId: string;
  causationId?: string;
}
