import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { BeyondDB } from "../../src/persistence/db";

/**
 * A real checkpoint-03 user's browser already has an IndexedDB database at
 * schema v1 (no outcomes/workoutSessions/performedSets tables). Dexie must
 * upgrade that database to the current schema in place, in the browser,
 * without losing any existing data. This test builds a genuine v1
 * database by hand (bypassing BeyondDB, which only knows the current
 * schema) and then opens it through the real BeyondDB class to prove the
 * upgrade chain (v1 -> v2 -> v3) is safe end to end.
 */

const DB_NAME = "beyond";
const CURRENT_SCHEMA_VERSION = 3;

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

    upgraded.close();
  });
});
