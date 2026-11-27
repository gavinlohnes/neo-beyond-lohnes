import type { DraftDecision } from "../intelligence/types";
import type { RunningPhase, RunningPlanVersion, RunningPosition, RunningSegment } from "../workout/runningPlan";
// Domain layer must not import React, Dexie, or UI code.

export type Capacity = "GREEN" | "YELLOW" | "RED";

/**
 * POST_SHIFT_TRANSITION (Drop 02b, Decision Register "WORK TRANSITION",
 * 2026-08-19 locked): "Engine priority: Stabilize -> explicit post-shift
 * transition when applicable -> Recover -> Execute planned work." A
 * distinct tier from STABILIZE — STABILIZE means capacity is critically
 * low; POST_SHIFT_TRANSITION means an explicit WORK_PERIOD_ENDED fact is
 * unresolved, regardless of capacity (except RED, which still wins).
 *
 * OBLIGATION_DUE (INTENT-ARBITRATION-001, direct owner ruling,
 * 2026-09-15): the first time an Obligation fact participates in primary
 * Engine arbitration, not just advisory context. Locked rank, bottom of
 * the stack — STABILIZE > POST_SHIFT_TRANSITION > RECOVER >
 * EXECUTE_PLANNED_WORK > OBLIGATION_DUE > NO_ACTION_REQUIRED. The
 * operator's own physical/temporal state (a capacity crisis, an
 * unresolved shift, active recovery/planned-work guidance) always wins;
 * an OVERDUE or DUE_TODAY commitment only becomes the primary
 * recommendation once none of those apply — see engine/evaluate.ts.
 * DUE_SOON and PLANNED_TODAY remain advisory-only (TODAY's ATTENTION
 * budget, engine/obligationRelevance.ts) — deliberately not promoted.
 */
export type RecommendationKind =
  | "STABILIZE"
  | "POST_SHIFT_TRANSITION"
  | "RECOVER"
  | "EXECUTE_PLANNED_WORK"
  | "OBLIGATION_DUE"
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
   * Check-in draft (Drop 5, 2026-10-03): present only when the form opened
   * with BEYOND's draft (the operator's previous answers carried forward) —
   * CONFIRMED when submitted unchanged, ADJUSTED when any value changed.
   * Absent for ALL GOOD and for a check-in started blank. The values above
   * are always the operator's own, submitted by them.
   */
  draft?: DraftDecision;
  /**
   * GRAYSON-CHECKIN-EDIT-001: set only on a corrected row, naming the check-in row it supersedes. The corrected row
   * keeps the original's `recordedAt` and carries no `draft` (that describes how the original was submitted).
   */
  correctsCheckInId?: string;
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
  /** GRAYSON-TRAIN-HOME-LINK-001: exact owner-confirmed programme/form context; absent for every legacy and ordinary workout. */
  programmeContext?: { programmeRevisionId: string; memberKey: "A" | "B" | "C"; parentTemplateId: string; form: "HOME" | "SHORT" };
  /**
   * TRAIN-WAVE-A (Persistent Rest, 2026-09-02): absolute end time of the
   * current rest period, or absent when not resting. Absolute rather than
   * a remaining-duration counter so a reload/backgrounding recovers the
   * correct remaining time from `Date.now()` comparison rather than a
   * counter that would need its own pause/resume bookkeeping — same
   * reasoning UX_DECISIONS.md's TRAIN section already requires for an
   * in-progress workout session itself ("must survive a page reload...
   * not a best effort"), extended to rest state. Non-indexed: nothing
   * queries workoutSessions by this field, so it needed no Dexie schema
   * version bump — see db.ts, unchanged at v8.
   */
  activeRestEndsAt?: string;
  /**
   * GRAYSON-HOME-STRETCH-001 slice B: the stretch routine a RECOVERY session played, and whether it was played to the
   * end. Non-indexed and optional (no Dexie version); absent on every other session.
   */
  stretchRoutine?: { id: string; name: string; completed: boolean };
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
  | "SET_UNDONE"
  | "WATER_LOGGED"
  | "WATER_LOG_CORRECTED"
  | "MEAL_LOGGED"
  | "MEAL_LOG_CORRECTED"
  | "MEAL_LOG_VOIDED"
  | "PROTEIN_LOG_VOIDED"
  | "WATER_LOG_VOIDED"
  | "SLEEP_LOG_VOIDED"
  | "BODYWEIGHT_LOG_VOIDED"
  | "WORK_PERIOD_ENDED"
  /** SHIFT-CHANGE-001 (owner go 2026-10-28): the operator's one-tap "on the clock now"; at most one per day. */
  | "WORK_PERIOD_STARTED"
  /** LOG-TIME-001 (owner go 2026-10-28): when a water, protein or meal log actually happened, set after the fact. */
  | "LOG_RETIMED"
  /**
   * SHIFT-CORRECT-001 (Gavin, 2026-11-15: "Yes, amend WORK TRANSITION to allow explicit shift start/end corrections"):
   * the operator's explicit correction of a recorded WORK_PERIOD_STARTED/ENDED mark: when it really happened, or that
   * it shouldn't count (a shift end voided is a reopened shift). Append-only; the original mark is never touched.
   */
  | "WORK_PERIOD_RETIMED"
  | "WORK_PERIOD_VOIDED"
  | "MISSION_CREATED"
  | "MISSION_MODIFIED"
  | "MISSION_ARCHIVED"
  | "OBLIGATION_CREATED"
  | "OBLIGATION_MODIFIED"
  | "OBLIGATION_MARKED_WAITING"
  | "OBLIGATION_MARKED_OPEN"
  | "OBLIGATION_SATISFIED"
  | "OBLIGATION_RELEASED"
  /** PROJECTS-001: Project lifecycle, and a commitment joining or leaving a Project. */
  | "PROJECT_CREATED"
  | "PROJECT_MODIFIED"
  | "PROJECT_STATUS_CHANGED"
  | "PROJECT_NEXT_SET"
  | "OBLIGATION_PROJECT_SET"
  /** ROUTINES-001: routine lifecycle, and a step ticked or unticked on a lived day. */
  | "ROUTINE_CREATED"
  | "ROUTINE_MODIFIED"
  | "ROUTINE_ARCHIVED"
  | "ROUTINE_RESTORED"
  | "ROUTINE_STEP_SET"
  /** HABITS-001: latest completion state for one habit on one lived day; false corrects a prior tap. */
  | "HABIT_SET"
  | "DECISION_JOURNAL_CREATED"
  | "DECISION_JOURNAL_MODIFIED"
  | "DECISION_JOURNAL_REVIEWED"
  | "PLANNED_WORK_SET"
  | "CLEAN_DAY_LOGGED"
  | "URGE_LOGGED"
  | "URGE_UNDONE"
  | "URGE_PLAN_RESPONDED"
  /** TRAIN-PROGRAM-001: confirmed global programme snapshots; no Engine authority. */
  | "TRAIN_PROGRAM_SET"
  | "EXERCISE_CUE_SET"
  | "SHIFT_HANDOFF_NOTED"
  | "SHIFT_HANDOFF_READ"
  | "TIME_CAPSULE_SEALED"
  | "TIME_CAPSULE_OPENED"
  | "WEEKLY_REVIEW_SAVED"
  | "PREPARATION_RECORDED"
  | "MEMORY_RECORDED"
  /** GRAYSON C6.1: his answer to one of Delta's learnings (Keep / Narrow / Not true / Drop / Undo). Global; payload in domain/learningLifecycle.ts. */
  | "LEARNING_RESPONDED"
  /** GRAYSON-CHALLENGE-LADDER-001 (C6.6): his answer to a habit ladder line. Global; payload in application/habitLadder.ts. */
  | "HABIT_LADDER_ANSWERED"
  /**
   * GRAYSON-MISSION-REVIEW-001 slice A (HONEST-BURN, Gavin 2026-11-24): his mark that a lived day's food was not fully
   * logged, under that day's beyondDayId. The newest for a day wins; unmarking is the same event with partial false.
   * Payload in application/foodDayMark.ts.
   */
  | "FOOD_DAY_PARTIAL_SET"
  // GRAYSON C4.8a (Gavin, 2026-11-20 design #601; build approved 2026-11-23): Eating Window boundaries he marks, a
  // one-day skip, and undo of either. Day-scoped to the active lived day when tapped. Payloads below.
  | "EATING_WINDOW_MARKED"
  | "EATING_WINDOW_DAY_SKIPPED"
  | "EATING_WINDOW_MARK_VOIDED"
  // GRAYSON-CHECKIN-EDIT-001 (Gavin, 2026-11-24): a sent check-in corrected, and that fix undone. USER-sourced, under the
  // check-in's own beyondDayId. Append-only: no check-in row is edited or deleted. Payloads below.
  | "CHECK_IN_CORRECTED"
  | "CHECK_IN_CORRECTION_UNDONE"
  // GRAYSON-FIX-UNDO-001 (Gavin, 2026-11-24): a removal of a meal, protein, water, sleep, bodyweight or measurement log
  // put back. USER-sourced, under the entry's own beyondDayId (measurements: unscoped). Payload in domain/logVoids.ts.
  | "LOG_VOID_UNDONE"
  // GRAYSON-TRAIN-EDIT-001 (Gavin, 2026-11-24): fix any logged set, live or past. USER-sourced, under the set's own
  // session's beyondDayId. Append-only: the replaced row stays, retracted. Payloads in the block at the end.
  | "SET_CORRECTED"
  | "SET_REMOVED"
  | "SET_ADDED"
  | "SET_FIX_UNDONE"
  // GRAYSON-TRAIN-RUN-001 (Gavin, 2026-11-24): running sessions and his editable run/walk plan. "RUNNING", never
  // "RUN": a run is a work run in this codebase. Session events are day-scoped to the session's lived day; plan
  // edits and position jumps are global configuration (like TRAIN_PROGRAM_SET). Payloads in the block at the end.
  | "RUNNING_SESSION_STARTED"
  | "RUNNING_SESSION_PAUSED"
  | "RUNNING_SESSION_RESUMED"
  | "RUNNING_SESSION_ENDED"
  | "RUNNING_SESSION_CORRECTED"
  | "RUNNING_SESSION_VOIDED"
  | "RUNNING_PLAN_ADVANCED"
  | "RUNNING_PLAN_POSITION_SET"
  | "RUNNING_PLAN_EDITED"
  // GRAYSON-ROUTINE-EDIT-001 (Gavin, 2026-11-25): a routine edited, reset or an edit undone in TRAIN's routine editor.
  // Global (no beyondDayId), USER. For A, B and C the latest wins over the code's version; for his own routines it
  // keeps the version it replaced. Payload in domain/workout/routineEdit.ts.
  | "ROUTINE_EDITED"
  // GRAYSON-HOME-STRETCH-001 slice B (Gavin, 2026-11-26): his whole list of stretch routines, edited, reset or deleted.
  // Global (no beyondDayId), USER, like TRAIN_PROGRAM_SET; the newest wins. Payload in application/stretchRoutines.ts.
  | "STRETCH_ROUTINES_SET"
  // GRAYSON-WORKOUT-CHANGES-001 (Gavin, 2026-11-25): an exercise added, swapped or removed in a live workout. USER,
  // under the session's own beyondDayId. Today only; the routine changes only on KEEP FOR NEXT TIME (ROUTINE_EDITED).
  // Payload in domain/workout/workoutChanges.ts.
  | "WORKOUT_PLAN_CHANGED"
  // GRAYSON-BLOCK-CYCLE-001 (Gavin, 2026-11-25): a training block he started, changed, ended or undid, and his block
  // settings. Global (no beyondDayId), USER; latest wins. Payload in domain/workout/trainingBlock.ts.
  | "TRAINING_BLOCK_SET"
  // GRAYSON-TRAIN-STANDARDS-001 (Gavin, 2026-11-24): a sit-and-reach, one-minute sit-up or 1.5-mile run test result,
  // day-scoped to the lived day it was recorded in. Removed through the shared void family (STANDARD_TEST_VOIDED,
  // domain/logVoids.ts) and put back with LOG_VOID_UNDONE; a fix voids the old result and records a new one.
  | "STANDARD_TEST_RECORDED"
  | "STANDARD_TEST_VOIDED"

  // REVIEW-001 Phase 1a — not day-scoped; payloads in domain/body/types.ts.
  | "MEASUREMENT_LOGGED"
  | "MEASUREMENT_LOG_CORRECTED"
  | "MEASUREMENT_LOG_VOIDED"
  | "PROGRESS_PHOTO_ADDED"
  | "PROGRESS_PHOTO_CORRECTED"
  | "PROGRESS_PHOTO_HIDDEN"
  | "PROGRESS_PHOTO_DELETED";

/**
 * DERIVED, not stored. Computed by walking a WATER_LOGGED event and any
 * WATER_LOG_CORRECTED events that chain from it. BEYOND stores what
 * happened (the events); this is the effective view of that history.
 */
export interface HydrationEntry {
  /** LOG-TIME-001: when the drink happened (a retime, else the log's own occurredAt). */
  at: string;
  rootEventId: string;
  headEventId: string;
  originalAmountOz: number;
  effectiveAmountOz: number;
  correctionCount: number;
  recordedAt: string;
}

/**
 * LOG-TIME-001: moves one water, protein or meal log to when it actually happened. Additive and
 * separate from the amount-correction chains: the latest retime of a root wins, the original log and
 * its corrections are never touched. `occurredAt` stays inside the log's own lived day.
 */
export interface LogRetimedPayload {
  commandId: string;
  rootEventId: string;
  loggedType: "WATER_LOGGED" | "PROTEIN_LOGGED" | "MEAL_LOGGED";
  occurredAt: string;
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
 * explicit END DAY action, a fallback auto-close when a new day starts
 * while one is still ACTIVE, or (DAY-ROLLOVER-001, direct owner ruling,
 * 2026-09-21) an automatic 16:30 local-time boundary — see
 * engine/dayRollover.ts and application/commands.ts's
 * performDueDayRollover. The 2026-08-19 decision explicitly rejected
 * calendar midnight as a boundary; the 2026-09-21 ruling is a deliberate,
 * recorded override of that same "no automatic clock boundary" doctrine
 * for this specific 16:30 case (see docs/UX_DECISIONS.md's "Day model"
 * section) — it does not reopen calendar midnight or any other automatic
 * boundary. END DAY closes silently — no recap.
 */
export interface DayEndedPayload {
  reason: "EXPLICIT_END_DAY" | "AUTO_CLOSED_ON_NEW_DAY_START" | "AUTO_CLOSED_DAY_ROLLOVER";
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
  /**
   * Sleep draft (2026-10-03): present only when the log came from BEYOND's
   * draft — CONFIRMED as proposed, or ADJUSTED first. Absent for a sleep
   * typed in BODY. Additive; older logs simply don't have it.
   */
  draft?: DraftDecision;
  /**
   * GARMIN-003 (owner ruling 2026-10-22): present only when Garmin filled this entry in from a
   * confirmed import. The owner's own entry of the same kind replaces it. Additive.
   */
  source?: { kind: "GARMIN"; recordKey: string; sourceVersion: string };
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
 * NUTRITION-001 (Meal Memory, High-Risk Drop): a SavedMeal (below) is a
 * small, directly-mutable reusable preset — same treatment as
 * CaptureItem/SchedulePattern, not itself event-sourced. Logging one
 * snapshots its CURRENT calories/proteinG/carbsG/fatG into this
 * immutable event at the moment of logging — editing or archiving the
 * SavedMeal afterward never rewrites this or any other past MEAL_LOGGED
 * fact. savedMealId is provenance only (which preset this came from);
 * the snapshot fields are what's authoritative for history, exactly the
 * property that makes "SavedMeal edits/archives never rewrite past logs"
 * true by construction rather than by a rule someone has to remember.
 */
export interface MealLoggedPayload {
  commandId: string;
  /** null is an explicitly manual meal, never a fabricated preset reference. */
  savedMealId: string | null;
  /** Absent in older logs means one serving; macros always describe the consumed total. */
  servings?: number;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** NUTRIENTS-001: optional, from the food database when it has them; absent means not recorded, never 0. */
  fiberG?: number;
  sodiumMg?: number;
}

/**
 * Same correction-chain shape as WaterLogCorrectedPayload/
 * ProteinLogCorrectedPayload. `name` is NOT correctable here, matching
 * SleepLogCorrectedPayload's precedent (kind isn't correctable either) —
 * a correction fixes a macro-value mistake, not what meal was logged;
 * re-logging under the right SavedMeal is the way to fix a wrong-meal
 * mistake.
 */
export interface MealLogCorrectedPayload {
  commandId: string;
  originalEventId: string;
  supersedesEventId: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * HOTFIX (BODY logging trust, owner ruling 2026-10-03): removes one logged
 * meal — its whole MEAL_LOGGED chain, corrections included — from every
 * total, without touching the original events. Append-only, same shape as
 * SET_UNDONE/URGE_UNDONE. Used by both DELETE and the post-log UNDO.
 */
export interface MealLogVoidedPayload {
  commandId: string;
  /** The root MEAL_LOGGED event's id. */
  mealEventId: string;
}

/**
 * DROP 1.5 (owner brief 2026-10-03): DELETE for a protein-only log — the
 * same void treatment as MEAL_LOG_VOIDED. Removes the whole PROTEIN_LOGGED
 * chain, corrections included, from every total; nothing is erased.
 */
export interface ProteinLogVoidedPayload {
  commandId: string;
  /** The root PROTEIN_LOGGED event's id. */
  proteinEventId: string;
}

/**
 * UNDO-001 (owner approval 2026-10-04): UNDO for water, sleep and bodyweight
 * logs — the same void treatment as MEAL_LOG_VOIDED and PROTEIN_LOG_VOIDED,
 * one shape for all three (WATER_LOG_VOIDED, SLEEP_LOG_VOIDED,
 * BODYWEIGHT_LOG_VOIDED). Removes the whole chain, corrections included,
 * from every total; nothing is erased.
 */
export interface BodyLogVoidedPayload {
  commandId: string;
  /** The root *_LOGGED event's id. */
  loggedEventId: string;
}

/**
 * NUTRITION-001 (Meal Memory): a reusable saved preset — "the sandwich I
 * always make," not a food-database entry. No barcode, no serving
 * ontology, no recipe, no goal/target field (matching Protein/Bodyweight's
 * own "facts only, no goal" precedent). Directly mutable: `name`/
 * `calories`/`proteinG`/`carbsG`/`fatG` change in place when edited, and
 * `archivedAt` hides it from the active picker without deleting it or
 * anything it already produced — MEAL_LOGGED events reference this
 * record's id for provenance only and never re-read its current fields.
 */
export interface SavedMeal {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** NUTRIENTS-001: optional, from the food database when it has them; absent means not recorded, never 0. */
  fiberG?: number;
  sodiumMg?: number;
  createdAt: string;
  archivedAt?: string;
}

/**
 * NUTRITION-003 (Calorie + Protein Targets, High-Risk Drop, direct owner
 * ruling): a single, directly-mutable settings record — same treatment
 * as SchedulePattern (one row keyed "current", not itself event-sourced).
 * calorieTargetKcal is optional and set directly by the operator, never
 * computed from a formula. proteinMultiplierGPerLb always has a value
 * (seeded by migration, default 1.0 g/lb); the actual gram target is
 * DERIVED at read time from this multiplier x the most recently logged
 * bodyweight (engine/nutritionTargets.ts's deriveProteinTargetG), never
 * stored as a static number, so it stays correct as bodyweight changes
 * without needing to be re-entered.
 */
export interface NutritionTargets {
  id: string;
  calorieTargetKcal?: number;
  proteinMultiplierGPerLb: number;
  /** Drop 5 (owner approval 2026-09-30): optional goal bodyweight, used only for BODY's projected goal date. */
  goalWeightLbs?: number;
  /** REVIEW-001 C2: operator choices used only for read-only Review comparisons. */
  weightChangeTargetPercentPerWeek?: number;
  muscleSetsTargetPerWeek?: number;
  strengthSessionsTargetPerWeek?: number;
  /** TARGET-PROPOSAL-002 (Gavin, 2026-11-15): the lowest calorie target Weekly may propose; unset means 1,500. */
  calorieFloorKcal?: number;
  /** GRAYSON C4.6 (Gavin, 2026-11-23): his own daily water target in oz; unset means no target and no nag. */
  waterTargetOz?: number;
  /** GRAYSON-DAY-TARGETS-001: operator-owned adjustments layered over the plain daily target. */
  dayTargets?: {
    on: boolean;
    adjustKcal: Record<"WORK" | "RECOVERY" | "OFF" | "LIFT", number>;
  };
  /**
   * GRAYSON-PROTEIN-HEADSUP-001 (Gavin, 2026-11-26): the protein heads-up's switch and his numbers (under `underPercent`
   * on `days` of the last `windowDays` logged days), and when he last tapped THAT'S FINE. Optional and additive.
   */
  proteinHeadsUp?: { on: boolean; underPercent: number; days: number; windowDays: number; dismissedAt?: string | undefined };
  createdAt: string;
  updatedAt: string;
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
 *
 * SCHEDULE_STANDING (DROP 0, owner-approved exception, 2026-10-03): the
 * operator's own saved schedule counts as their declaration when it's clear
 * (engine/scheduledContext.ts's deriveStandingWorkContext), so startDay may
 * write this one source itself. A later MANUAL declaration always wins.
 */
/** SCHEDULE_EXCEPTION (SCHEDULE-EXCEPTIONS-001): set at day start from an operator-confirmed exception. */
export type WorkContextSource = "MANUAL" | "SCHEDULE_SUGGESTION_ACCEPTED" | "SCHEDULE_STANDING" | "SCHEDULE_EXCEPTION";

export interface WorkContextSetPayload {
  commandId: string;
  workContext: "WORK" | "OFF";
  source: WorkContextSource;
}

/**
 * Drop 02b (Explicit Work Transition, Decision Register "WORK TRANSITION",
 * 2026-08-19 locked): the only historical fact marking a work shift as
 * actually over. Created solely by application/commands.ts's
 * markWorkEnded on explicit user confirmation — never inferred from clock
 * time, schedule prediction, or any other automatic signal. "Shift end is
 * never inferred from time, schedule, GPS, inactivity, or other hidden
 * signals." At most one effective WORK_PERIOD_ENDED event exists per
 * BeyondDay — markWorkEnded is idempotent.
 *
 * SHIFT-CORRECT-001 amendment (Gavin, 2026-11-15: "Yes, amend WORK TRANSITION
 * to allow explicit shift start/end corrections"): the operator may correct a
 * recorded mark explicitly — WORK_PERIOD_RETIMED (when it really happened) or
 * WORK_PERIOD_VOIDED (it shouldn't count; for an end, the shift is reopened).
 * Corrections supersede, never overwrite; nothing is inferred. "Effective"
 * means the latest unvoided mark, at its latest retimed time
 * (engine/workMarks.ts).
 */
export interface WorkPeriodEndedPayload {
  commandId: string;
}

/**
 * SHIFT-CORRECT-001 (Decision Register "WORK TRANSITION", amended 2026-11-15): a recorded work mark's real time, set
 * after the fact by the operator's explicit correction — never inferred from clock, schedule or any hidden signal.
 * `markEventId` names the original WORK_PERIOD_STARTED/ENDED event (also the causationId); `occurredAt` is the
 * corrected time, inside that mark's lived day and not after the correction was made. The latest retime wins.
 */
export interface WorkPeriodRetimedPayload {
  commandId: string;
  markEventId: string;
  mark: "STARTED" | "ENDED";
  occurredAt: string;
}

/**
 * SHIFT-CORRECT-001: the operator's explicit "this mark shouldn't count". A voided WORK_PERIOD_ENDED is a reopened
 * shift: the day has no effective work-ended fact again, and a later explicit WORK ENDED records a new one. The
 * original mark stays in history. Still at most one EFFECTIVE (unvoided) mark of each kind per BeyondDay.
 */
export interface WorkPeriodVoidedPayload {
  commandId: string;
  markEventId: string;
  mark: "STARTED" | "ENDED";
}

/**
 * PLANNED-WORK-001 (direct owner ruling, 2026-09-20): the ONLY way
 * `evaluate.ts`'s `hasPlannedWork` input can ever be true —
 * application/queries.ts's `hasActivePlannedWork` reads this event, never
 * infers planned work from capacity, schedule, or TRAIN's rotation state
 * (`suggestTemplateForNextWorkout` always has a "next" template, so
 * "a workout exists in rotation" is trivially true every day and cannot
 * be the signal). Same "explicit, confirmed fact" doctrine as
 * `WorkContextSetPayload`: `planned: false` is how the operator
 * explicitly clears a declaration, not merely the absence of one.
 *
 * `kind` is a real union rather than a bare boolean specifically so a
 * later Drop can add a second planned-activity source without changing
 * this event's shape or any consumer's read logic — deliberately not
 * populated with a second value now (see docs/agent/drops/
 * PLANNED-WORK-001.md's exclusions). TRAIN is the only source for this
 * Drop; `application/queries.ts`'s `hasActivePlannedWork` already reads
 * this generically (any kind, not a workout-specific check), so the
 * generalization boundary needs no further change when that day comes.
 */
/**
 * Drop 6 (quit tracker, owner approval 2026-09-30): the habit to avoid,
 * named by the owner. A single mutable settings row ("current"), same
 * treatment as NutritionTargets — configuration, not history. Clean days
 * and urges are ordinary events (CLEAN_DAY_LOGGED / URGE_LOGGED).
 */
export interface QuitHabit {
  id: string;
  name: string;
  /** What the habit costs on a day it happens, in US dollars. Drives "money saved". */
  dailyCostUsd?: number;
  /** A short owner-written plan shown inside SHIFT DOWN. */
  postShiftPlan?: string;
  /**
   * Drop 4 (urge if-then plans, 2026-10-03): the owner's own "if this sets
   * it off, then I'll…" plan per trigger, shown right after an urge with
   * that trigger is logged. Configuration, like postShiftPlan; never
   * written or suggested by BEYOND.
   */
  ifThenPlans?: Partial<Record<UrgeTrigger, string>>;
  createdAt: string;
  updatedAt: string;
}

export const URGE_TRIGGERS = ["AFTER_SHIFT", "STRESS", "TIRED", "SOCIAL", "BORED", "OTHER"] as const;
export type UrgeTrigger = (typeof URGE_TRIGGERS)[number];

/** Drop 6: logged by the owner with hold-to-confirm; at most one per BeyondDay. Never inferred. */
export interface CleanDayLoggedPayload {
  commandId: string;
  habitName: string;
}

/** Drop 6: one-tap urge log — the event's own time plus what set it off. */
export interface UrgeLoggedPayload {
  commandId: string;
  trigger: UrgeTrigger;
}

/**
 * Drop 4 (urge if-then plans, 2026-10-03): the operator's one-tap answer to
 * their own plan shown after an urge — PLAN USED or NOT THIS TIME. A fact
 * they chose to record; never asked twice, never inferred, never judged.
 * The latest answer for an urge stands.
 */
export interface UrgePlanRespondedPayload {
  commandId: string;
  urgeEventId: string;
  trigger: UrgeTrigger;
  /** The plan text as it read when answered (the setting can change later). */
  plan: string;
  used: boolean;
}

/** Drop 6: undoes one URGE_LOGGED without touching it, same append-only shape as SET_UNDONE. */
export interface UrgeUndonePayload {
  commandId: string;
  urgeEventId: string;
}

/**
 * GYM-002 (owner sign-off 2026-10-04): Gavin's own cue text for one lift,
 * shown in the gym screen. Append-only: the latest EXERCISE_CUE_SET for an
 * exerciseId is its cue, and an empty `cue` clears it. Written under the
 * active workout's day; it rides in backups like every other event.
 */
export interface ExerciseCueSetPayload {
  commandId: string;
  exerciseId: string;
  /** Trimmed, at most EXERCISE_CUE_MAX_LENGTH characters; "" clears the cue. */
  cue: string;
}

export const EXERCISE_CUE_MAX_LENGTH = 140;

/**
 * NOTES-HANDOFF-001 (owner rulings 2026-10-04, 1A/2A): a note for the next
 * shift, written after MARK WORK ENDED under that day. Shown at the top of
 * TODAY on the next work day until SHIFT_HANDOFF_READ names it. Append-only.
 */
export interface ShiftHandoffNotedPayload {
  commandId: string;
  /** Trimmed, 1..SHIFT_HANDOFF_MAX_LENGTH characters. */
  note: string;
}

export interface ShiftHandoffReadPayload {
  commandId: string;
  handoffEventId: string;
}

export const SHIFT_HANDOFF_MAX_LENGTH = 280;

/**
 * NOTES-CAPSULE-001 (owner rulings 2026-10-04, 1A/2A): a note to future
 * Gavin, sealed until `opensOn` (a local "YYYY-MM-DD" date). Not tied to a
 * day (no beyondDayId), like Decision Journal events. TIME_CAPSULE_OPENED
 * marks one as read on TODAY. Append-only.
 */
export interface TimeCapsuleSealedPayload {
  commandId: string;
  /** Trimmed, 1..TIME_CAPSULE_MAX_LENGTH characters. */
  note: string;
  opensOn: string;
}

export interface TimeCapsuleOpenedPayload {
  commandId: string;
  capsuleEventId: string;
}

export const TIME_CAPSULE_MAX_LENGTH = 500;
export const TIME_CAPSULE_MONTHS = [1, 3, 6, 12] as const;

export interface PlannedWorkSetPayload {
  commandId: string;
  planned: boolean;
  kind: "WORKOUT";
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
    /** REMIND-AT-001: HH:MM on the due date; null removed it. */
    remindAt?: string | null;
    /** TIMEBOX-001: his estimate in whole minutes; null removed it. */
    estimateMinutes?: number | null;
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
  /**
   * BRIDGE-NOTIFY-001: the owner's key-moment alert settings, kept on the same "current" row so native
   * backups carry them with no schema change. Optional and unindexed; read and validated on its own
   * (application/keyMomentAlerts.ts), never by the schedule's own parser.
   */
  keyMomentAlerts?: KeyMomentAlertSettings;
  /**
   * C4.2a (Gavin, 2026-11-20, "Start it"): the shift sleep plan's own numbers he can change, kept on the same row so
   * native backups carry them with no schema change. Optional and unindexed; read and validated on its own
   * (application/sleepPlanSettings.ts), never by the schedule's own parser. Absent means the cited defaults.
   */
  sleepPlanSettings?: SleepPlanSettings;
  /** GRAYSON C4.8a: the Eating Window programme's settings; configuration, not history (like the caffeine cut-off). */
  eatingWindowSettings?: EatingWindowSettings;
}

/** GRAYSON C4.8a: the day kinds a planned eating window is set for. */
export type EatingWindowDayKind = "WORK" | "RECOVERY" | "OFF";
export interface EatingWindowSettings {
  /** Off until he turns it on. */
  enabled: boolean;
  /** Hours the window is open (6–16). 12, 10, 8 and 6 are the presets 12:12, 14:10, 16:8 and 18:6. */
  eatingHours: number;
  /** When eating opens on each kind of lived day, "HH:MM" local. Times before 16:30 fall on the lived day's second date. */
  opensAt: Record<EatingWindowDayKind, string>;
  /** When he completed the safety check (answers are never stored). */
  safetyCheckedAt: string;
  setAt: string;
}
/** EATING_WINDOW_MARKED: CLOSED = he stopped eating (a fast starts); OPENED = he started eating (the fast ends). */
export interface EatingWindowMarkedPayload { commandId: string; boundary: "CLOSED" | "OPENED" }
export interface EatingWindowDaySkippedPayload { commandId: string }
/** Undo of a mark or a skip, naming the event it voids. The voided event is never deleted. */
export interface EatingWindowMarkVoidedPayload { commandId: string; voidsEventId: string }

/** C4.2a: owner-set caffeine cutoff configuration and its timestamp. No automated proposal or experiment. */
export interface SleepPlanSettings {
  caffeineCutoff?: { hours: number; setAt: string; setBy: "OWNER" };
  /**
   * GRAYSON-FLIP-PLAN-001: his own flip-plan values. Only the ones he changed are stored (the rest are the defaults in
   * application/flipPlan.ts); `setAt` is the last SAVE, for UNDO.
   */
  flip?: {
    show?: boolean; getUpBy?: number; shortBreak?: "FLIP_BACK" | "STAY_LATE"; longBreak?: "FLIP_BACK" | "STAY_LATE";
    stayLateBed?: number; stayLateWake?: number; laterHours?: number; daylightStart?: number; daylightMinutes?: number;
    setAt: string;
  };
}

/** BRIDGE-NOTIFY-001: the four existing Health Bridge moment kinds (BRIDGE-MOMENTS-001/002). No others. */
export type KeyMomentKind = "BEFORE_SHIFT" | "SHIFT_DONE" | "TASK_DUE" | "WAKE" | "WINDOW_OPEN";

/** BRIDGE-NOTIFY-001: which kinds are off, and the owner's quiet hours ("HH:MM" local, may cross midnight). */
export interface KeyMomentAlertSettings {
  off: KeyMomentKind[];
  quietFrom: string | null;
  quietTo: string | null;
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
  /** GRAYSON-TRAIN-LOCKSCREEN-001: logged by DONE on the lock-screen notification (event occurredAt is the tap). */
  from?: "LOCK_SCREEN";
}

export interface SetSkippedPayload {
  commandId: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  /** GRAYSON-TRAIN-LOCKSCREEN-001: skipped by SKIP on the lock-screen notification. */
  from?: "LOCK_SCREEN";
}

/**
 * TRAIN-WAVE-A (Set Commit Choreography, 2026-09-02): records that a
 * previously-logged-or-skipped set was retracted, without mutating or
 * deleting the original `performedSets` row — same append-only doctrine
 * BODY's `*_CORRECTED` correction-chain events already follow.
 * `performedSetId` identifies the exact row to exclude; queries resolve
 * "what's currently true" by filtering out any set with a later
 * SET_UNDONE event referencing it (see trainQueries.ts's
 * getPerformedSets).
 */
export interface SetUndonePayload {
  commandId: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  performedSetId: string;
}

/** GRAYSON-CHECKIN-EDIT-001: `checkIn` is the corrected row, also stored in `checkIns`. */
export interface CheckInCorrectedPayload {
  commandId: string;
  supersedesCheckInId: string;
  originalCheckInId: string;
  checkIn: StateCheckIn;
}

/** GRAYSON-CHECKIN-EDIT-001: only the newest standing fix of a check-in can be undone. */
export interface CheckInCorrectionUndonePayload {
  commandId: string;
  correctionEventId: string;
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
   * below for how those events are scoped instead. OPERATOR-CONTEXT-002B
   * also permits explicitly global PERSONAL_FACT memory revisions; all
   * other MEMORY_RECORDED kinds retain required lived-day provenance. TRAIN_PROGRAM_SET
   * also records global operator configuration, independent of any lived day.
   */
  beyondDayId?: string;
  /** Intent & Commitment Spine (Drop 01): set on MISSION_* events instead of beyondDayId. */
  missionId?: string;
  /** Intent & Commitment Spine (Drop 01): set on OBLIGATION_* events instead of beyondDayId. */
  obligationId?: string;
  /** Decision Journal: set on DECISION_JOURNAL_* events instead of beyondDayId — same day-independence reasoning as missionId/obligationId above. */
  decisionJournalEntryId?: string;
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

// ---------------------------------------------------------------------------------------------------------------
// GRAYSON-TRAIN-EDIT-001 (Gavin, 2026-11-24): set fixes. Projected by domain/workout/setFixes.ts into the one
// retracted-set filter every set reader already uses (getUndoneSetIds).

/** The values a fix can change on a set. */
export interface SetFixValues {
  weight: number;
  reps: number;
  skipped: boolean;
  setKind?: "WORKING" | "WARMUP";
  repsInReserve?: number;
}

/**
 * A set corrected: `newPerformedSetId` is a new performedSets row with the `after` values and the replaced row's
 * sessionId, exerciseId, setNumber, recordedAt and seq. `replacesSetId` is retracted while this fix stands.
 */
export interface SetCorrectedPayload {
  commandId: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  replacesSetId: string;
  newPerformedSetId: string;
  before: SetFixValues;
  after: SetFixValues;
}

/** A set removed: `performedSetId` is retracted while this fix stands. */
export interface SetRemovedPayload {
  commandId: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  performedSetId: string;
}

/** A forgotten set added to a finished session, as a new performedSets row inside the session's window. */
export interface SetAddedPayload {
  commandId: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  performedSetId: string;
  weight: number;
  reps: number;
  setKind?: "WORKING" | "WARMUP";
  repsInReserve?: number;
}

/** Cancels one fix (the newest on its set): its retraction is lifted, and a row it created is retracted. */
export interface SetFixUndonePayload { commandId: string; fixEventId: string }
// GRAYSON-TRAIN-RUN-001 (Gavin, 2026-11-24): running sessions. One additive table (db.ts v27); every change is an
// append-only event, so history stays honest and backups carry it.

export type RunningSessionStatus = "ACTIVE" | "COMPLETED" | "PARTIAL" | "ABANDONED";
export type RunningEndReason = "FINISHED" | "STOPPED" | "PAIN";

/**
 * One running session. `segments` is a snapshot of what he ran, so a later plan edit never rewrites history.
 * Timing is absolute (`startedAt` + `pausedMs`, like WorkoutSession.activeRestEndsAt): a reload or backgrounding
 * recovers the right interval from Date.now(). (B4 standards tests are a separate event, per GRAYSON-TRAIN-STANDARDS-001.)
 * Status and minutes as recorded; corrections are RUNNING_SESSION_CORRECTED / _VOIDED events, never row edits.
 */
export interface RunningSession {
  id: string;
  beyondDayId: string;
  schemaVersion: 1;
  kind: "PLAN_RUN";
  planId: string;
  phase: RunningPhase;
  week: number;
  run: number;
  segments: RunningSegment[];
  status: RunningSessionStatus;
  startedAt: string;
  endedAt?: string;
  /** Set while paused; cleared on resume. */
  pausedAt?: string;
  /** Total time spent paused before the current pause. */
  pausedMs: number;
  /** Seconds of the plan he completed (warm-up and cool-down included). */
  completedSeconds: number;
  endReason?: RunningEndReason;
}

export interface RunningSessionStartedPayload {
  commandId: string;
  runningSessionId: string;
  planId: string;
  phase: RunningPhase;
  week: number;
  run: number;
  segments: RunningSegment[];
}
export interface RunningSessionPausedPayload { commandId: string; runningSessionId: string }
export interface RunningSessionResumedPayload { commandId: string; runningSessionId: string; pausedMs: number }
export interface RunningSessionEndedPayload {
  commandId: string;
  runningSessionId: string;
  status: Exclude<RunningSessionStatus, "ACTIVE">;
  completedSeconds: number;
  endReason: RunningEndReason;
}
/**
 * His correction of a finished run: any of status, minutes or the day it belongs to (a local YYYY-MM-DD date).
 * The latest correction of each field wins; `supersedesEventId` is the correction it replaces, if any.
 */
export interface RunningSessionCorrectedPayload {
  commandId: string;
  runningSessionId: string;
  supersedesEventId?: string;
  status?: "COMPLETED" | "PARTIAL";
  completedSeconds?: number;
  dayDate?: string;
}
export interface RunningSessionVoidedPayload { commandId: string; runningSessionId: string }
/** Only from his tap on Move on, after a COMPLETED run. */
export interface RunningPlanAdvancedPayload { commandId: string; runningSessionId: string; from: RunningPosition; to: RunningPosition }
export interface RunningPlanPositionSetPayload { commandId: string; to: RunningPosition; reason: "JUMP" | "UNDO_MOVE_ON" }
/** The full plan snapshot after an edit, a reset, a weekly-count change or an undo of one of those. */
export interface RunningPlanEditedPayload {
  commandId: string;
  plan: RunningPlanVersion;
  reason: "EDIT_RUN" | "ADD_RUN" | "RESET_RUN" | "RESET_PLAN" | "WEEK_SETTINGS" | "UNDO";
  previousEventId?: string;
}

/** GRAYSON-TRAIN-STANDARDS-001: one result of one standards test. `at` is when he did it, inside `beyondDayId`. */
export type StandardTestKind = "SIT_AND_REACH" | "SIT_UPS_1MIN" | "RUN_1_5_MILE";
export type StandardTestUnit = "in" | "reps" | "seconds";
export interface StandardTestRecordedPayload {
  commandId: string;
  test: StandardTestKind;
  value: number;
  unit: StandardTestUnit;
  at: string;
  beyondDayId: string;
  note?: string;
  /** Set when this result is a fix: the result it replaced (voided in the same write). */
  correctsEventId?: string;
}
