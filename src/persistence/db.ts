import Dexie, { type Table } from "dexie";
import type {
  BeyondDay,
  DomainEvent,
  Outcome,
  PerformedSetRaw,
  Recommendation,
  SchedulePattern,
  StateCheckIn,
  WorkoutSession,
} from "../domain/common/types";
import { DEFAULT_SCHEDULE_PATTERN } from "../engine/scheduledContext";

export class BeyondDB extends Dexie {
  beyondDays!: Table<BeyondDay, string>;
  events!: Table<DomainEvent, string>;
  checkIns!: Table<StateCheckIn, string>;
  recommendations!: Table<Recommendation, string>;
  outcomes!: Table<Outcome, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  performedSets!: Table<PerformedSetRaw, string>;
  schedulePatterns!: Table<SchedulePattern, string>;

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
    // v4 (Drop 02a, Daily Intelligence / Context — first slice): adds
    // schedulePatterns, a single-row table holding the work-rotation
    // config that engine/scheduledContext.ts used to hardcode as source
    // constants. Seeded on upgrade with DEFAULT_SCHEDULE_PATTERN — the
    // exact values those constants held — so an upgrading install's
    // schedule predictions are unchanged immediately before and after
    // this migration (proven by tests/persistence/schemaMigration.test.ts).
    // A fresh v4 install also gets the row via this same upgrade callback,
    // since Dexie runs every version's upgrade function in order on first
    // open. Existing v1-v3 tables/data untouched.
    this.version(4)
      .stores({
        beyondDays: "id, status, startedAt",
        events: "id, beyondDayId, type, occurredAt",
        checkIns: "id, beyondDayId, recordedAt",
        recommendations: "id, beyondDayId, issuedAt",
        outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
        workoutSessions: "id, beyondDayId, templateId, status, startedAt",
        performedSets: "id, beyondDayId, sessionId, exerciseId",
        schedulePatterns: "id",
      })
      .upgrade(async (tx) => {
        await tx.table("schedulePatterns").put(DEFAULT_SCHEDULE_PATTERN);
      });
  }
}

export const db = new BeyondDB();
