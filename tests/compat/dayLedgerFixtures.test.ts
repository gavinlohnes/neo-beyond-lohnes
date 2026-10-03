import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLegacyBackup } from "../../src/persistence/compat/legacyBackup";
import { projectDaySummaries } from "../../src/engine/dayLedger";
import { mostRecentBoundaryAtOrBefore } from "../../src/engine/dayRollover";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import type { BeyondDay, DomainEvent, WorkoutSession } from "../../src/domain/common/types";
import type { PerformedSet } from "../../src/domain/workout/types";

/**
 * Drop 1 — the Day Ledger against the real historical backups (read only;
 * see test-fixtures/protected/MANIFEST.md). Both are exports of the same
 * pre-rollover BeyondDay. Expected values come from MANIFEST.md and a
 * by-hand count of each fixture's events, not from the ledger itself.
 */
const PROTECTED_DIR = join(__dirname, "../../test-fixtures/protected");

function ledgerFor(file: string) {
  const backup = parseLegacyBackup(JSON.parse(readFileSync(join(PROTECTED_DIR, file), "utf8")));
  return projectDaySummaries({
    days: backup.payload.beyondDays as unknown as BeyondDay[],
    events: backup.payload.events as unknown as DomainEvent[],
    workoutSessions: backup.payload.workoutSessions as unknown as WorkoutSession[],
    performedSets: backup.payload.performedSets as unknown as PerformedSet[],
    schedule: DEFAULT_SCHEDULE_PATTERN,
  });
}

const DAY_ID = "31014bdb-f21b-40bf-aed5-07e97d1f346f";
const STARTED_AT = "2026-08-17T04:39:12.007Z";

describe("Day Ledger — Fixture A (2026-08-17 export)", () => {
  const [summary, ...rest] = ledgerFor("beyond-backup-2026-08-17T23-15-09-360Z.json");

  it("is one record for the one BeyondDay, still active", () => {
    expect(rest).toHaveLength(0);
    expect(summary!.beyondDayId).toBe(DAY_ID);
    expect(summary!.startedAt).toBe(STARTED_AT);
    expect(summary!.endedAt).toBeUndefined();
    expect(summary!.livedDayStart).toBe(mostRecentBoundaryAtOrBefore(new Date(STARTED_AT)).toISOString());
  });

  it("leaves everything that was never logged missing", () => {
    expect(summary!.waterOz).toBeUndefined();
    expect(summary!.proteinG).toBeUndefined();
    expect(summary!.kcal).toBeUndefined();
    expect(summary!.sleep).toEqual({});
    expect(summary!.workouts).toEqual([]);
    expect(summary!.urges).toEqual([]);
    expect(summary!.cleanDay).toBe(false);
    expect(summary!.work).toMatchObject({ declared: "UNKNOWN" });
    expect(summary!.work).not.toHaveProperty("declaredSource");
    expect(summary!.work).not.toHaveProperty("workEndedAt");
  });

  it("reads the last of 15 check-ins (all 5s and 1s → GREEN) and the recorded no-action decision", () => {
    expect(summary!.checkIn).toMatchObject({ capacity: "GREEN", count: 15 });
    expect(summary!.recommendation).toMatchObject({
      recommendationId: "d56ce0e4-bb36-4bf4-aa31-6a3d4a3e91a6",
      kind: "NO_ACTION_REQUIRED",
      decision: "NO_ACTION_RECORDED",
    });
  });

  it("counts burden: 15 check-ins + 3 accepted + 1 no-action = 19 entries, no corrections", () => {
    expect(summary!.burden).toMatchObject({ manualEntries: 19, corrections: 0, trainingSets: 0 });
  });
});

describe("Day Ledger — Fixture B (2026-08-18 export)", () => {
  const [summary, ...rest] = ledgerFor("beyond-backup-2026-08-18T06-33-36-443Z.json");

  it("is still one record for the same BeyondDay", () => {
    expect(rest).toHaveLength(0);
    expect(summary!.beyondDayId).toBe(DAY_ID);
  });

  it("resolves the real hydration correction chain to its effective 17 oz", () => {
    expect(summary!.waterOz).toBe(17);
  });

  it("reports the abandoned template A workout: 13 seconds rounds to 0 minutes, never judged for PRs", () => {
    expect(summary!.workouts).toEqual([
      {
        sessionId: "c0df547d-83b0-4bcf-b416-d659f66b3791",
        templateId: "A",
        sessionType: "STANDARD",
        status: "ABANDONED",
        startedAt: "2026-08-18T00:36:46.258Z",
        endedAt: "2026-08-18T00:36:58.953Z",
        durationMinutes: 0,
        setsLogged: 0,
      },
    ]);
  });

  it("keeps the latest recommendation undecided, and still no sleep, protein or meals", () => {
    expect(summary!.recommendation).toMatchObject({ recommendationId: "c6bc20ed-4c47-4672-b4b1-274c3f7a7079", kind: "NO_ACTION_REQUIRED" });
    expect(summary!.recommendation).not.toHaveProperty("decision");
    expect(summary!.checkIn).toMatchObject({ capacity: "GREEN", count: 16 });
    expect(summary!.sleep).toEqual({});
    expect(summary!.proteinG).toBeUndefined();
    expect(summary!.kcal).toBeUndefined();
  });

  it("counts burden: 16 check-ins + 1 water + 3 accepted + 1 no-action = 21 entries, 1 correction", () => {
    expect(summary!.burden).toMatchObject({ manualEntries: 21, corrections: 1, trainingSets: 0 });
  });
});
