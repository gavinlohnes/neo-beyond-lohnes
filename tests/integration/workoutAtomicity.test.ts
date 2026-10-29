import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { importLegacyBackup, parseLegacyBackup } from "../../src/persistence/compat/legacyBackup";
import { startDay } from "../../src/application/commands";
import {
  abandonWorkout,
  completeRecoverySession,
  completeWorkout,
  logSet,
  skipSet,
  startWorkout,
  undoLastSet,
} from "../../src/application/trainCommands";
import { getActiveWorkoutSession, getPerformedSets, suggestTemplateForNextWorkout } from "../../src/application/trainQueries";
import { getWorkoutRecordMismatches } from "../../src/application/workoutIntegrityQueries";

/**
 * WORKOUT-ATOMICITY-001 (owner approval 2026-10-13, issue #221, option A).
 * Each workout command's row and event commit together or not at all, and a
 * read-only check reports any split already in history without writing.
 */

const PROTECTED_DIR = fileURLToPath(new URL("../../test-fixtures/protected", import.meta.url));

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  db.close();
});

function failNextEventWrite() {
  return vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("simulated storage failure"));
}

async function snapshot() {
  return {
    sessions: await db.workoutSessions.toArray(),
    sets: await db.performedSets.toArray(),
    events: await db.events.toArray(),
  };
}

describe("workout commands are atomic", () => {
  it("startWorkout: a failed event write leaves no ACTIVE session, and a retry starts cleanly", async () => {
    const day = await startDay();
    const before = await snapshot();
    failNextEventWrite();
    await expect(startWorkout(day.id, "A", "STANDARD")).rejects.toThrow("simulated storage failure");
    expect(await snapshot()).toEqual(before);
    expect(await getActiveWorkoutSession()).toBeUndefined();

    const session = await startWorkout(day.id, "A", "STANDARD");
    expect(await db.workoutSessions.count()).toBe(1);
    const started = await db.events.where("type").equals("WORKOUT_STARTED").toArray();
    expect(started).toHaveLength(1);
    expect((started[0]!.payload as { sessionId: string }).sessionId).toBe(session.id);
    expect(await getWorkoutRecordMismatches()).toEqual([]);
  });

  it("logSet and skipSet: a failed event write saves no set row", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    const before = await snapshot();

    failNextEventWrite();
    await expect(logSet(day.id, session.id, "squat", 1, 135, 5)).rejects.toThrow("simulated storage failure");
    failNextEventWrite();
    await expect(skipSet(day.id, session.id, "squat", 2)).rejects.toThrow("simulated storage failure");

    expect(await snapshot()).toEqual(before);
    expect(await getPerformedSets(session.id)).toEqual([]);

    await logSet(day.id, session.id, "squat", 1, 135, 5);
    await skipSet(day.id, session.id, "squat", 2);
    expect(await db.performedSets.count()).toBe(2);
    expect(await db.events.where("type").anyOf("SET_LOGGED", "SET_SKIPPED").count()).toBe(2);
    expect(await getWorkoutRecordMismatches()).toEqual([]);
  });

  it("a failed set-row write records no event either", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    const before = await snapshot();
    vi.spyOn(db.performedSets, "add").mockRejectedValueOnce(new Error("simulated row failure"));
    await expect(logSet(day.id, session.id, "squat", 1, 135, 5)).rejects.toThrow("simulated row failure");
    expect(await snapshot()).toEqual(before);
  });

  it("completeWorkout: a failed event write leaves the session ACTIVE and the rotation where it was", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10); // OWNER-GO-001: empty completions don't advance
    const nextBefore = await suggestTemplateForNextWorkout();
    const before = await snapshot();

    failNextEventWrite();
    await expect(completeWorkout(day.id, session.id, "STANDARD", "COMPLETED", 40)).rejects.toThrow("simulated storage failure");

    expect(await snapshot()).toEqual(before);
    expect((await db.workoutSessions.get(session.id))?.status).toBe("ACTIVE");
    expect(await suggestTemplateForNextWorkout()).toBe(nextBefore);

    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED", 40);
    expect((await db.workoutSessions.get(session.id))?.status).toBe("COMPLETED");
    expect(await db.events.where("type").equals("WORKOUT_COMPLETED").count()).toBe(1);
    expect(await suggestTemplateForNextWorkout()).not.toBe(nextBefore);
    expect(await getWorkoutRecordMismatches()).toEqual([]);
  });

  it("abandonWorkout and a zero-minute recovery session: a failed event write leaves the session ACTIVE", async () => {
    const day = await startDay();
    const standard = await startWorkout(day.id, "A", "STANDARD");
    const before = await snapshot();
    failNextEventWrite();
    await expect(abandonWorkout(day.id, standard.id, "STANDARD", 5)).rejects.toThrow("simulated storage failure");
    expect(await snapshot()).toEqual(before);
    await abandonWorkout(day.id, standard.id, "STANDARD", 5);
    expect((await db.workoutSessions.get(standard.id))?.status).toBe("ABANDONED");

    const recovery = await startWorkout(day.id, null, "RECOVERY");
    const beforeRecovery = await snapshot();
    failNextEventWrite();
    await expect(completeRecoverySession(day.id, recovery.id, 0)).rejects.toThrow("simulated storage failure");
    expect(await snapshot()).toEqual(beforeRecovery);
    failNextEventWrite();
    await expect(completeRecoverySession(day.id, recovery.id, 12)).rejects.toThrow("simulated storage failure");
    expect(await snapshot()).toEqual(beforeRecovery);

    await completeRecoverySession(day.id, recovery.id, 12);
    expect((await db.workoutSessions.get(recovery.id))?.status).toBe("COMPLETED");
    expect(await getWorkoutRecordMismatches()).toEqual([]);
  });

  it("an undone set keeps its row and event paired, so the check stays clean", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "squat", 1, 135, 5);
    await undoLastSet(day.id, session.id);
    await logSet(day.id, session.id, "squat", 1, 140, 5);
    expect(await db.performedSets.count()).toBe(2);
    expect(await getWorkoutRecordMismatches()).toEqual([]);
  });
});

describe("read-only workout record check (option A)", () => {
  it("reports each kind of split that the old two-write commands could leave, without writing", async () => {
    const day = await startDay();
    const clean = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, clean.id, "squat", 1, 135, 5);

    // Simulate pre-transaction splits by writing only one half directly.
    await db.workoutSessions.add({
      id: "orphan-session",
      schemaVersion: 1,
      beyondDayId: day.id,
      templateId: "B",
      sessionType: "STANDARD",
      status: "COMPLETED",
      startedAt: "2026-10-01T10:00:00.000Z",
      endedAt: "2026-10-01T11:00:00.000Z",
    });
    await db.performedSets.add({
      id: "orphan-set",
      beyondDayId: day.id,
      sessionId: clean.id,
      exerciseId: "bench",
      setNumber: 1,
      weight: 95,
      reps: 8,
      skipped: false,
      recordedAt: "2026-10-02T10:00:00.000Z",
    });
    await db.events.add({
      id: "orphan-start-event",
      type: "WORKOUT_STARTED",
      beyondDayId: day.id,
      occurredAt: "2026-10-03T10:00:00.000Z",
      recordedAt: "2026-10-03T10:00:00.000Z",
      payload: { commandId: "c", sessionId: "missing-session", templateId: "C", sessionType: "STANDARD" },
      source: "USER",
      correlationId: "c",
      seq: 9_000,
    });
    await db.events.add({
      id: "orphan-end-event",
      type: "WORKOUT_COMPLETED",
      beyondDayId: day.id,
      occurredAt: "2026-10-04T10:00:00.000Z",
      recordedAt: "2026-10-04T10:00:00.000Z",
      payload: { commandId: "d", sessionId: clean.id, status: "COMPLETED", sessionType: "STANDARD" },
      source: "USER",
      correlationId: "d",
      seq: 9_001,
    });

    const before = await snapshot();
    const mismatches = await getWorkoutRecordMismatches();
    expect(await snapshot()).toEqual(before);

    expect(mismatches.map((m) => m.kind).sort()).toEqual([
      "ENDED_SESSION_WITHOUT_END_EVENT",
      "END_EVENT_WITHOUT_MATCHING_SESSION",
      "SESSION_WITHOUT_START_EVENT",
      "SET_ROWS_AND_EVENTS_DIFFER",
      "START_EVENT_WITHOUT_SESSION",
    ]);
    const messages = mismatches.map((m) => m.message).join("\n");
    expect(messages).toContain("Workout from 2026-10-01 is saved without its start event.");
    expect(messages).toContain("Workout from 2026-10-01 is saved as COMPLETED without a matching end event.");
    expect(messages).toContain("Logged set 1 of bench on 2026-10-02: 1 saved, 0 recorded as events.");
    expect(messages).toContain("Workout start event from 2026-10-03 has no saved workout.");
    expect(messages).toContain("has a COMPLETED end event but is saved as ACTIVE.");
  });

  it("reports nothing for an empty database or the protected historical backup", async () => {
    expect(await getWorkoutRecordMismatches()).toEqual([]);
    const file = join(PROTECTED_DIR, "beyond-backup-2026-08-18T06-33-36-443Z.json");
    const bytes = readFileSync(file);
    await importLegacyBackup(db, parseLegacyBackup(JSON.parse(bytes.toString("utf8"))));
    expect(await db.workoutSessions.count()).toBe(1);
    expect(await getWorkoutRecordMismatches()).toEqual([]);
    expect(createHash("sha256").update(readFileSync(file)).digest("hex")).toBe(
      "a5bb46f1b1da5070f55f1c255812235ba33e643a41f9af176dfccbb0e9481c15",
    );
  });
});
