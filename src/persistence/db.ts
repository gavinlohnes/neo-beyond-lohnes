import Dexie, { type Table } from "dexie";
import type {
  BeyondDay,
  DomainEvent,
  Outcome,
  PerformedSetRaw,
  Recommendation,
  StateCheckIn,
  WorkoutSession,
} from "../domain/common/types";

export class BeyondDB extends Dexie {
  beyondDays!: Table<BeyondDay, string>;
  events!: Table<DomainEvent, string>;
  checkIns!: Table<StateCheckIn, string>;
  recommendations!: Table<Recommendation, string>;
  outcomes!: Table<Outcome, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  performedSets!: Table<PerformedSetRaw, string>;

  constructor() {
    super("beyond");
    this.version(1).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
    });
    // v2: adds outcomes/workoutSessions/performedSets tables. Not driven by
    // new app functionality (TRAIN remains deferred) — required to
    // faithfully reconstruct the real historical BEYOND_BACKUP fixtures,
    // which include these record types. Existing v1 tables/data untouched.
    this.version(2).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId",
    });
    // v3: adds sessionId/exerciseId indexes to performedSets, now that
    // TRAIN (this checkpoint) gives it a real, confirmed shape instead of
    // the previously opaque placeholder. Existing v1/v2 tables/data
    // untouched.
    this.version(3).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId, sessionId, exerciseId",
    });
  }
}

export const db = new BeyondDB();
