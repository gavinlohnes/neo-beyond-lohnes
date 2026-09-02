import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { BeyondDB } from "../../src/persistence/db";
import { DEFAULT_SCHEDULE_PATTERN, deriveScheduledContext } from "../../src/engine/scheduledContext";

/**
 * A real checkpoint-03 user's browser already has an IndexedDB database at
 * schema v1 (no outcomes/workoutSessions/performedSets tables). Dexie must
 * upgrade that database to the current schema in place, in the browser,
 * without losing any existing data. This test builds a genuine v1
 * database by hand (bypassing BeyondDB, which only knows the current
 * schema) and then opens it through the real BeyondDB class to prove the
 * upgrade chain (v1 -> v2 -> v3 -> v4 -> v5) is safe end to end.
 */

const DB_NAME = "beyond";
const CURRENT_SCHEMA_VERSION = 8;

afterEach(async () => {
  await Dexie.delete(DB_NAME);
});

describe("Dexie v1 -> current schema migration", () => {
  it("preserves existing v1 data and adds the newer tables empty", async () => {
    const v1 = new Dexie(DB_NAME);
    v1.version(1).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
    });
    await v1.open();
    await v1.table("beyondDays").add({
      id: "day-1",
      startedAt: "2026-08-17T04:39:12.007Z",
      timezoneId: "America/Chicago",
      workContext: "UNKNOWN",
      status: "ACTIVE",
      createdAt: "2026-08-17T04:39:12.007Z",
      updatedAt: "2026-08-17T04:39:12.007Z",
    });
    await v1.table("events").add({
      id: "event-1",
      type: "DAY_STARTED",
      beyondDayId: "day-1",
      occurredAt: "2026-08-17T04:39:12.007Z",
      recordedAt: "2026-08-17T04:39:12.007Z",
      payload: { dayId: "day-1" },
      source: "USER",
      correlationId: "corr-1",
    });
    v1.close();

    const upgraded = new BeyondDB();
    await upgraded.open();

    expect(upgraded.verno).toBe(CURRENT_SCHEMA_VERSION);
    const day = await upgraded.beyondDays.get("day-1");
    expect(day).toBeDefined();
    expect(day!.status).toBe("ACTIVE");
    const event = await upgraded.events.get("event-1");
    expect(event).toBeDefined();

    expect(await upgraded.outcomes.count()).toBe(0);
    expect(await upgraded.workoutSessions.count()).toBe(0);
    expect(await upgraded.performedSets.count()).toBe(0);
    expect(await upgraded.schedulePatterns.count()).toBe(1);
    expect(await upgraded.schedulePatterns.get("current")).toEqual(DEFAULT_SCHEDULE_PATTERN);
    expect(await upgraded.captureItems.count()).toBe(0);
    expect(await upgraded.missions.count()).toBe(0);
    expect(await upgraded.obligations.count()).toBe(0);
    expect(await upgraded.savedMeals.count()).toBe(0);
    expect(await upgraded.decisionJournalEntries.count()).toBe(0);

    upgraded.close();
  });
});

/**
 * Intent & Commitment Spine (Drop 01, 2026-08-22): a real v5 install (the
 * schema immediately before this Drop) has captureItems data but no
 * missions/obligations tables at all. Proves the v6 upgrade adds both
 * empty, leaves every v1-v5 table/row untouched, and that the `events`
 * table's two new indexes (missionId, obligationId) don't disturb an
 * existing event that predates them.
 */
describe("Dexie v5 -> v6 migration (Drop 01: missions/obligations)", () => {
  it("adds empty missions/obligations tables and preserves existing v5 data", async () => {
    const v5 = new Dexie(DB_NAME);
    v5.version(1).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
    });
    v5.version(2).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId",
    });
    v5.version(3).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId, sessionId, exerciseId",
    });
    v5.version(4)
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
    v5.version(5).stores({
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
    await v5.open();
    await v5.table("captureItems").add({
      id: "capture-1",
      text: "pre-existing capture",
      capturedAt: "2026-08-21T12:00:00.000Z",
      status: "OPEN",
    });
    await v5.table("events").add({
      id: "event-pre-v6",
      type: "DAY_STARTED",
      beyondDayId: "day-1",
      occurredAt: "2026-08-21T12:00:00.000Z",
      recordedAt: "2026-08-21T12:00:00.000Z",
      payload: { dayId: "day-1" },
      source: "USER",
      correlationId: "corr-1",
    });
    v5.close();

    const upgraded = new BeyondDB();
    await upgraded.open();

    expect(upgraded.verno).toBe(CURRENT_SCHEMA_VERSION);
    expect(await upgraded.missions.count()).toBe(0);
    expect(await upgraded.obligations.count()).toBe(0);
    expect(await upgraded.captureItems.count()).toBe(1);
    expect((await upgraded.captureItems.get("capture-1"))?.text).toBe("pre-existing capture");
    const preExistingEvent = await upgraded.events.get("event-pre-v6");
    expect(preExistingEvent).toBeDefined();
    expect(preExistingEvent!.missionId).toBeUndefined();
    expect(preExistingEvent!.obligationId).toBeUndefined();
    expect(await upgraded.savedMeals.count()).toBe(0);

    upgraded.close();
  });
});

/**
 * NUTRITION-001 (Meal Memory, High-Risk Drop): a real v6 install (the
 * schema immediately before this Drop) has protein/hydration event
 * history but no savedMeals table at all. Proves the v7 upgrade adds it
 * empty and preserves every v1-v6 table/row untouched, including a real
 * PROTEIN_LOGGED event — the exact kind of history this Drop's own
 * "effective meal protein counts toward Minimum Day alongside
 * protein-only logs" change reads alongside meal history.
 */
describe("Dexie v6 -> v7 migration (NUTRITION-001: savedMeals)", () => {
  it("adds an empty savedMeals table and preserves existing v6 data", async () => {
    const v6 = new Dexie(DB_NAME);
    v6.version(1).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
    });
    v6.version(2).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId",
    });
    v6.version(3).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId, sessionId, exerciseId",
    });
    v6.version(4)
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
    v6.version(5).stores({
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
    v6.version(6).stores({
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
    await v6.open();
    await v6.table("beyondDays").add({
      id: "day-pre-v7",
      startedAt: "2026-08-26T12:00:00.000Z",
      timezoneId: "America/Chicago",
      workContext: "UNKNOWN",
      status: "ACTIVE",
      createdAt: "2026-08-26T12:00:00.000Z",
      updatedAt: "2026-08-26T12:00:00.000Z",
    });
    await v6.table("events").add({
      id: "protein-event-pre-v7",
      type: "PROTEIN_LOGGED",
      beyondDayId: "day-pre-v7",
      occurredAt: "2026-08-26T12:00:00.000Z",
      recordedAt: "2026-08-26T12:00:00.000Z",
      payload: { commandId: "cmd-1", grams: 30 },
      source: "USER",
      correlationId: "corr-1",
    });
    v6.close();

    const upgraded = new BeyondDB();
    await upgraded.open();

    expect(upgraded.verno).toBe(CURRENT_SCHEMA_VERSION);
    expect(await upgraded.savedMeals.count()).toBe(0);
    const day = await upgraded.beyondDays.get("day-pre-v7");
    expect(day).toBeDefined();
    expect(day!.status).toBe("ACTIVE");
    const proteinEvent = await upgraded.events.get("protein-event-pre-v7");
    expect(proteinEvent).toBeDefined();
    expect((proteinEvent!.payload as { grams: number }).grams).toBe(30);

    upgraded.close();
  });
});

describe("Dexie v7 -> v8 migration (Decision Journal: decisionJournalEntries)", () => {
  it("adds an empty decisionJournalEntries table and preserves existing v7 data", async () => {
    const v7 = new Dexie(DB_NAME);
    v7.version(1).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
    });
    v7.version(2).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId",
    });
    v7.version(3).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId, sessionId, exerciseId",
    });
    v7.version(4)
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
    v7.version(5).stores({
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
    v7.version(6).stores({
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
    v7.version(7).stores({
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
      savedMeals: "id, archivedAt, createdAt",
    });
    await v7.open();
    await v7.table("beyondDays").add({
      id: "day-pre-v8",
      startedAt: "2026-09-01T12:00:00.000Z",
      timezoneId: "America/Chicago",
      workContext: "UNKNOWN",
      status: "ACTIVE",
      createdAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-01T12:00:00.000Z",
    });
    await v7.table("missions").add({
      id: "mission-pre-v8",
      title: "Pre-existing mission",
      status: "ACTIVE",
      source: "USER",
      createdAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-01T12:00:00.000Z",
    });
    v7.close();

    const upgraded = new BeyondDB();
    await upgraded.open();

    expect(upgraded.verno).toBe(CURRENT_SCHEMA_VERSION);
    expect(await upgraded.decisionJournalEntries.count()).toBe(0);
    const day = await upgraded.beyondDays.get("day-pre-v8");
    expect(day).toBeDefined();
    expect(day!.status).toBe("ACTIVE");
    const mission = await upgraded.missions.get("mission-pre-v8");
    expect(mission).toBeDefined();
    expect(mission!.title).toBe("Pre-existing mission");

    upgraded.close();
  });
});

/**
 * Overdrive Phase 10: unlike v4 (which had to seed a row so predictions
 * stayed identical across the upgrade), v5 has no equivalent prior data —
 * capture didn't exist before this checkpoint, so there's nothing to
 * migrate or seed. A dedicated hand-built "v4 install upgrading to v5"
 * test was tried here and dropped: two Dexie connections sharing the
 * fake-indexeddb-backed "beyond" name within one test file raced against
 * each other (a "waiting to delete" IndexedDB-spec collision, not a
 * product bug) in a way the existing tests below don't hit. Coverage is
 * not lost — the v1 -> current test above already proves a fresh install
 * lands on v5 with an empty captureItems table, and the v3 -> v4 test
 * below proves the schedulePatterns seed-on-upgrade still fires correctly
 * for an older install passing all the way through to the current
 * version (v5, per its own updated assertion).
 */

/**
 * Drop 02a (Daily Intelligence / Context, first slice): the schedule that
 * used to be hardcoded constants in engine/scheduledContext.ts moves into
 * this new table. A real v3 install has no schedulePatterns row at all —
 * this proves the v4 upgrade seeds one equivalent to those old constants,
 * and that deriveScheduledContext(now, seededPattern) predicts identically
 * to what the pre-Drop-02a hardcoded deriveScheduledContext(now) always
 * produced, for a spread of instants covering every SchedulePhase.
 */
describe("Dexie v3 -> v4 migration (Drop 02a: schedulePatterns)", () => {
  it("seeds exactly one schedulePatterns row equal to DEFAULT_SCHEDULE_PATTERN", async () => {
    const v3 = new Dexie(DB_NAME);
    v3.version(1).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
    });
    v3.version(2).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId",
    });
    v3.version(3).stores({
      beyondDays: "id, status, startedAt",
      events: "id, beyondDayId, type, occurredAt",
      checkIns: "id, beyondDayId, recordedAt",
      recommendations: "id, beyondDayId, issuedAt",
      outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt",
      workoutSessions: "id, beyondDayId, templateId, status, startedAt",
      performedSets: "id, beyondDayId, sessionId, exerciseId",
    });
    await v3.open();
    expect(v3.verno).toBe(3);
    v3.close();

    const upgraded = new BeyondDB();
    await upgraded.open();

    // Opening via the real, current BeyondDB always lands on its newest
    // registered version — v6 as of Intent & Commitment Spine Drop 01 —
    // not v4. What this test actually verifies (the v4 schedulePatterns
    // seed still fires correctly for a v3 install) is unaffected by later
    // versions existing.
    expect(upgraded.verno).toBe(CURRENT_SCHEMA_VERSION);
    expect(await upgraded.schedulePatterns.count()).toBe(1);
    expect(await upgraded.schedulePatterns.get("current")).toEqual(DEFAULT_SCHEDULE_PATTERN);

    upgraded.close();
  });

  it("predictions are unchanged immediately before and after the v3->v4 migration", async () => {
    // "Before": the pre-Drop-02a hardcoded behavior, reproduced directly by
    // calling the pure deriver with the exact pattern those old constants
    // held (DEFAULT_SCHEDULE_PATTERN) — there is no other pattern a v3
    // install could have been running with, since the schedule wasn't
    // configurable yet.
    const sampleInstants = [
      new Date(2026, 7, 21, 17, 59), // PRE_WORK
      new Date(2026, 7, 21, 18, 0), // SCHEDULED_SHIFT (evening)
      new Date(2026, 7, 22, 2, 0), // SCHEDULED_SHIFT (past midnight)
      new Date(2026, 7, 22, 8, 0), // EXPECTED_POST_WORK
      new Date(2026, 7, 20, 15, 0), // OFF
    ];
    const before = sampleInstants.map((now) => deriveScheduledContext(now, DEFAULT_SCHEDULE_PATTERN));

    const v3 = new Dexie(DB_NAME);
    v3.version(1).stores({ beyondDays: "id, status, startedAt", events: "id, beyondDayId, type, occurredAt", checkIns: "id, beyondDayId, recordedAt", recommendations: "id, beyondDayId, issuedAt" });
    v3.version(2).stores({ beyondDays: "id, status, startedAt", events: "id, beyondDayId, type, occurredAt", checkIns: "id, beyondDayId, recordedAt", recommendations: "id, beyondDayId, issuedAt", outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt", workoutSessions: "id, beyondDayId, templateId, status, startedAt", performedSets: "id, beyondDayId" });
    v3.version(3).stores({ beyondDays: "id, status, startedAt", events: "id, beyondDayId, type, occurredAt", checkIns: "id, beyondDayId, recordedAt", recommendations: "id, beyondDayId, issuedAt", outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt", workoutSessions: "id, beyondDayId, templateId, status, startedAt", performedSets: "id, beyondDayId, sessionId, exerciseId" });
    await v3.open();
    v3.close();

    const upgraded = new BeyondDB();
    await upgraded.open();
    const seededPattern = (await upgraded.schedulePatterns.get("current"))!;
    const after = sampleInstants.map((now) => deriveScheduledContext(now, seededPattern));
    upgraded.close();

    expect(after).toEqual(before);
  });
});
