import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { importLegacyBackup, parseLegacyBackup } from "../../src/persistence/compat/legacyBackup";
import { endDay, startDay, submitCheckIn } from "../../src/application/commands";
import {
  archiveMission,
  createMission,
  createObligation,
  releaseObligation,
  satisfyObligation,
} from "../../src/application/intentCommands";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "../../src/application/journalCommands";
import { logSet, startWorkout } from "../../src/application/trainCommands";
import { getRecordMismatches } from "../../src/application/recordIntegrityQueries";
import { getWorkoutRecordMismatches } from "../../src/application/workoutIntegrityQueries";

/**
 * COMMAND-ATOMICITY-002 (#225): the read-only record check is clean on
 * real command output and the protected historical backups, finds each
 * covered split, tolerates malformed payloads, reads one snapshot, and
 * never writes.
 */

const PROTECTED_DIR = fileURLToPath(new URL("../../test-fixtures/protected", import.meta.url));
const FIXTURES = [
  { file: "beyond-backup-2026-08-17T23-15-09-360Z.json", sha256: "8818f6e7e8c6a23d2c89b148c7975176f9f2314af3e4178c1a66ec34a496a8db" },
  { file: "beyond-backup-2026-08-18T06-33-36-443Z.json", sha256: "a5bb46f1b1da5070f55f1c255812235ba33e643a41f9af176dfccbb0e9481c15" },
];

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  db.close();
});

async function snapshot() {
  return Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()] as const)));
}

async function everyCommandFamily() {
  const first = await startDay();
  await submitCheckIn(first.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  await endDay(first.id);
  const day = await startDay();
  const session = await startWorkout(day.id, "A", "RECOVERY");
  await logSet(day.id, session.id, "squat", 1, 100, 5);
  const mission = await createMission({ title: "Direction" });
  const satisfied = await createObligation({ title: "Done one", missionId: mission.id });
  await satisfyObligation(satisfied.id);
  const released = await createObligation({ title: "Dropped one" });
  await releaseObligation(released.id);
  await archiveMission(mission.id);
  const entry = await createDecisionJournalEntry({ title: "Job", decision: "Take it" });
  await reviewDecisionJournalEntry(entry.id, { outcome: "Went well" });
  return { day, mission, satisfied, released, entry };
}

function event(type: string, fields: Record<string, unknown>) {
  return {
    id: `synthetic-${type}-${Math.random()}`,
    type,
    occurredAt: "2026-10-01T10:00:00.000Z",
    recordedAt: "2026-10-01T10:00:00.000Z",
    source: "USER",
    correlationId: "synthetic",
    seq: 9_000,
    payload: {},
    ...fields,
  } as never;
}

describe("getRecordMismatches", () => {
  it("is clean after every covered command family runs for real", async () => {
    await everyCommandFamily();
    expect(await getRecordMismatches()).toEqual([]);
  });

  it("reports nothing for either protected historical backup, which stays byte-identical", async () => {
    for (const fixture of FIXTURES) {
      const path = join(PROTECTED_DIR, fixture.file);
      await importLegacyBackup(db, parseLegacyBackup(JSON.parse(readFileSync(path, "utf8"))));
      expect(await getRecordMismatches()).toEqual([]);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(fixture.sha256);
    }
  });

  it("finds each covered split, in both directions, without writing", async () => {
    const { day, mission, satisfied, entry } = await everyCommandFamily();
    // Rows saved without their events (the old failure mode), written directly.
    await db.beyondDays.add({ ...day, id: "orphan-day", status: "ENDED", startedAt: "2026-10-02T09:00:00.000Z" });
    await db.checkIns.add({ id: "orphan-check-in", beyondDayId: day.id, recordedAt: "2026-10-02T09:00:00.000Z", seq: 9_100, energy: 3, stress: 3, mood: 3, soreness: 3, alcoholUrge: 0 });
    await db.missions.put({ ...mission, id: "orphan-mission", title: "Orphan direction", status: "ARCHIVED" });
    await db.obligations.update(satisfied.id, { status: "RELEASED" });
    await db.decisionJournalEntries.put({ ...(await db.decisionJournalEntries.get(entry.id))!, id: "orphan-entry", title: "Orphan decision" });
    // Events without their rows.
    await db.events.add(event("RECOMMENDATION_ISSUED", { beyondDayId: day.id, payload: { recommendationId: "missing-rec", kind: "RECOVER" } }));
    await db.events.add(event("OBLIGATION_CREATED", { obligationId: "missing-obligation", payload: { obligationId: "missing-obligation" } }));
    await db.events.add(event("DAY_ENDED", { beyondDayId: day.id, payload: { reason: "EXPLICIT_END_DAY" } }));

    const before = await snapshot();
    const mismatches = await getRecordMismatches();
    expect(await snapshot()).toEqual(before);

    const found = mismatches.map((m) => `${m.area}:${m.kind}:${m.recordId}`).sort();
    expect(found).toEqual(
      [
        "DAY:RECORD_WITHOUT_DAY_STARTED:orphan-day",
        "DAY:ENDED_WITHOUT_EVENT:orphan-day",
        `DAY:DAY_ENDED_WITHOUT_MATCHING_RECORD:${day.id}`,
        "DAY:RECORD_WITHOUT_STATE_CHECKED_IN:orphan-check-in",
        "DAY:RECOMMENDATION_ISSUED_WITHOUT_RECORD:missing-rec",
        "INTENT:RECORD_WITHOUT_MISSION_CREATED:orphan-mission",
        "INTENT:ARCHIVED_WITHOUT_EVENT:orphan-mission",
        "INTENT:OBLIGATION_CREATED_WITHOUT_RECORD:missing-obligation",
        `INTENT:RELEASED_WITHOUT_EVENT:${satisfied.id}`,
        `INTENT:OBLIGATION_SATISFIED_WITHOUT_MATCHING_RECORD:${satisfied.id}`,
        "JOURNAL:RECORD_WITHOUT_DECISION_JOURNAL_CREATED:orphan-entry",
        "JOURNAL:REVIEWED_WITHOUT_EVENT:orphan-entry",
      ].sort(),
    );
    const messages = mismatches.map((m) => m.message);
    expect(messages).toContain("Obligation “Done one” has a OBLIGATION_SATISFIED event but is saved as RELEASED.");
    expect(messages).toContain("Decision “Orphan decision” is saved without its DECISION_JOURNAL_CREATED event.");
  });

  it("tolerates null and malformed payloads instead of failing the whole read", async () => {
    const day = await startDay();
    for (const payload of [null, "text", 42, ["array"]]) {
      for (const type of ["WORKOUT_COMPLETED", "SET_LOGGED", "RECOMMENDATION_ISSUED", "STATE_CHECKED_IN", "OBLIGATION_SATISFIED"]) {
        await db.events.add(event(type, { beyondDayId: day.id, payload }));
      }
    }
    const mismatches = await getRecordMismatches();
    expect(Array.isArray(mismatches)).toBe(true);
    expect(await getWorkoutRecordMismatches()).toEqual(expect.any(Array));
    expect(mismatches.every((m) => typeof m.message === "string" && !m.message.includes("undefined"))).toBe(true);
  });

  it("reads every table inside one read-only transaction", async () => {
    await everyCommandFamily();
    const spy = vi.spyOn(db, "transaction");
    await getRecordMismatches();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toBe("r");
  });
});
