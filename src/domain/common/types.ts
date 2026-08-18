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
  statusAtIssue: "ACTION" | "NO_ACTION";
}

export type DomainEventType =
  | "DAY_STARTED"
  | "STATE_CHECKED_IN"
  | "RECOMMENDATION_ISSUED"
  | "RECOMMENDATION_ACCEPTED"
  | "NO_ACTION_RECORDED"
  | "COMMAND_STARTED"
  | "COMMAND_COMPLETED"
  | "RESET_STARTED"
  | "RESET_COMPLETED"
  | "WORKOUT_STARTED"
  | "WORKOUT_ABANDONED"
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
