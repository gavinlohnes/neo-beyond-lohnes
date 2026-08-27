import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import {
  abandonWorkout,
  completeRecoverySession,
  completeWorkout,
  logSet,
  skipSet,
  startWorkout,
} from "../../src/application/trainCommands";
import {
  getCurrentProgressionSuggestions,
  getLastStrengthSession,
  getRecentStrengthSessions,
} from "../../src/application/trainQueries";

/**
 * TRAIN-003 (Performance Brief): getLastStrengthSession and
 * getRecentStrengthSessions exercised through the real command/query
 * layer — same convention as trainWorkout.test.ts/trainProgression.test.ts.
 * These are read-only derived-intelligence queries: nothing here writes
 * to Engine, persistence, schema, or correction state; every assertion is
 * about what these two new queries report given real, command-produced
 * history.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getLastStrengthSession — empty history", () => {
  it("is null before any strength session has ever been logged", async () => {
    expect(await getLastStrengthSession()).toBeNull();
  });
});

describe("getLastStrengthSession — eligibility", () => {
  it("reports a COMPLETED STANDARD session with its real working-set count and duration", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 10);
    await logSet(day.id, session.id, "machine-chest-press", 2, 135, 10);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED", 30);

    const last = await getLastStrengthSession();
    expect(last).not.toBeNull();
    expect(last!.templateId).toBe("A");
    expect(last!.sessionType).toBe("STANDARD");
    expect(last!.status).toBe("COMPLETED");
    expect(last!.workingSetCount).toBe(2);
    expect(last!.durationMinutes).not.toBeNull();
  });

  it("skipped sets are never counted as performed working sets", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 10);
    await skipSet(day.id, session.id, "machine-chest-press", 2);
    await skipSet(day.id, session.id, "machine-chest-press", 3);
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");

    const last = await getLastStrengthSession();
    expect(last!.status).toBe("PARTIAL");
    expect(last!.workingSetCount).toBe(1);
  });

  it("duration is null when endedAt is missing, never derived from the current time", async () => {
    const day = await startDay();
    // A direct-insert COMPLETED session with no endedAt at all — a shape
    // the app's own commands never produce (completeWorkout always sets
    // endedAt), but a real edge case this query must still handle
    // honestly rather than guessing a duration from "now". Same
    // direct-db-write convention as trainWorkout.test.ts's own residual-
    // risk edge case.
    await db.workoutSessions.add({
      id: "no-ended-at-session",
      schemaVersion: 1,
      beyondDayId: day.id,
      templateId: "A",
      sessionType: "STANDARD",
      status: "COMPLETED",
      startedAt: new Date().toISOString(),
    });
    await db.performedSets.add({
      id: "no-ended-at-set-1",
      beyondDayId: day.id,
      sessionId: "no-ended-at-session",
      exerciseId: "machine-chest-press",
      setNumber: 1,
      weight: 135,
      reps: 10,
      skipped: false,
      recordedAt: new Date().toISOString(),
    });

    const last = await getLastStrengthSession();
    expect(last!.status).toBe("COMPLETED");
    expect(last!.durationMinutes).toBeNull();
    expect(last!.workingSetCount).toBe(1);
  });

  it("an ACTIVE session is not eligible — it is not finished history yet", async () => {
    const day = await startDay();
    await startWorkout(day.id, "A", "STANDARD");
    expect(await getLastStrengthSession()).toBeNull();
  });

  it("an ABANDONED session is not eligible — it must never masquerade as completed training", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 10);
    await abandonWorkout(day.id, session.id, "STANDARD");
    expect(await getLastStrengthSession()).toBeNull();
  });

  it("a RECOVERY session never contaminates the strength-performance summary", async () => {
    const day = await startDay();
    const recovery = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, recovery.id, 15);
    expect(await getLastStrengthSession()).toBeNull();
  });

  it("uses the most recent eligible session, skipping a more recent ABANDONED/RECOVERY one", async () => {
    const day = await startDay();
    const first = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, first.id, "machine-chest-press", 1, 135, 10);
    await completeWorkout(day.id, first.id, "STANDARD", "COMPLETED");

    const abandoned = await startWorkout(day.id, "B", "STANDARD");
    await abandonWorkout(day.id, abandoned.id, "STANDARD");

    const recovery = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, recovery.id, 15);

    const last = await getLastStrengthSession();
    expect(last!.templateId).toBe("A");
  });
});

describe("getRecentStrengthSessions", () => {
  it("is empty before any strength session has ever been logged", async () => {
    expect(await getRecentStrengthSessions()).toEqual([]);
  });

  it("excludes RECOVERY and ACTIVE, includes ABANDONED under its own real status, most-recent-first", async () => {
    const day = await startDay();

    const completed = await startWorkout(day.id, "A", "STANDARD");
    await completeWorkout(day.id, completed.id, "STANDARD", "COMPLETED");

    const abandoned = await startWorkout(day.id, "B", "STANDARD");
    await abandonWorkout(day.id, abandoned.id, "STANDARD");

    const recovery = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, recovery.id, 15);

    await startWorkout(day.id, "C", "STANDARD"); // left ACTIVE

    const recent = await getRecentStrengthSessions();
    expect(recent.map((r) => r.templateId)).toEqual(["B", "A"]);
    expect(recent.find((r) => r.templateId === "B")!.status).toBe("ABANDONED");
    expect(recent.some((r) => r.sessionType === ("RECOVERY" as never))).toBe(false);
  });
});

describe("getCurrentProgressionSuggestions — templateId disambiguates repeated exercises across templates", () => {
  it("carries the templateId each suggestion was evaluated under", async () => {
    const results = await getCurrentProgressionSuggestions();
    const tricepsEntries = results.filter((r) => r.prescription.exerciseId === "triceps-pressdown");
    // Triceps Pressdown appears in both A and C with different set counts —
    // this must never collapse into one undifferentiated entry.
    const templateIds = new Set(tricepsEntries.map((r) => r.templateId));
    expect(templateIds.size).toBe(tricepsEntries.length);
    expect(templateIds.has("A")).toBe(true);
    expect(templateIds.has("C")).toBe(true);
  });
});
