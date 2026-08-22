import Dexie, { type Table } from "dexie";
import type {
  BeyondDay,
  CaptureItem,
  DomainEvent,
  Outcome,
  PerformedSetRaw,
  Recommendation,
  SchedulePattern,
  StateCheckIn,
  WorkoutSession,
} from "../domain/common/types";
import type { Mission, Obligation } from "../domain/intent/types";
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
  captureItems!: Table<CaptureItem, string>;
  missions!: Table<Mission, string>;
  obligations!: Table<Obligation, string>;

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
    // v5 (Overdrive Phase 10, first connective capability): adds
    // captureItems — raw, timestamped, unclassified capture ("capture
    // first, organize second"). Purely additive; no upgrade callback
    // needed since there's no equivalent prior data to seed or migrate.
    // Existing v1-v4 tables/data untouched.
    this.version(5).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId, sessionId, exerciseId",
      schedulePatterns: "id",
      captureItems: "id, status, capturedAt",
    });
    // v6 (Intent & Commitment Spine, Drop 01, 2026-08-22): adds missions
    // and obligations — the first BEYOND records that are not day-scoped
    // but still require real historical DomainEvent truth (see
    // DomainEvent.missionId/obligationId in domain/common/types.ts).
    // `events` gains two new optional indexes (missionId, obligationId)
    // so Mission/Obligation history can be queried directly, same
    // treatment v2->v3 already gave performedSets when it needed new
    // indexes on an existing table — no upgrade() callback required
    // either time, since existing rows simply have no value for a new
    // index until written the new way. Purely additive: v1-v5 tables/data
    // untouched, and no upgrade callback for missions/obligations
    // themselves since (like captureItems at v5) there is no equivalent
    // prior data to seed or migrate.
    this.version(6).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt, missionId, obligationId",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId, sessionId, exerciseId",
      schedulePatterns: "id",
      captureItems: "id, status, capturedAt",
      missions: "id, status, createdAt",
      obligations: "id, status, missionId, dueAt, createdAt",
    });
  }
}

export const db = new BeyondDB();
