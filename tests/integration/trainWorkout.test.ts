import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { getLatestCheckIn } from "../../src/application/queries";
import { deriveCapacity } from "../../src/engine/capacity";
import {
  abandonWorkout,
  completeRecoverySession,
  completeWorkout,
  logSet,
  skipSet,
  startWorkout,
} from "../../src/application/trainCommands";
import {
  getActiveWorkoutSession,
  getLastAdvancingTemplate,
  getPerformedSets,
  suggestTemplateForNextWorkout,
} from "../../src/application/trainQueries";

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

async function checkIn(beyondDayId: string, overrides: Partial<Record<string, number>> = {}) {
  return submitCheckIn(beyondDayId, {
    energy: 3,
    stress: 3,
    mood: 3,
    soreness: 0,
    alcoholUrge: 0,
    ...overrides,
  } as never);
}

describe("startWorkout — RED-capacity override enforcement", () => {
  it("STANDARD starts freely with no check-in yet (capacity null, not RED)", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    expect(session.status).toBe("ACTIVE");
  });

  it("STANDARD starts freely when capacity is GREEN", async () => {
    const day = await startDay();
    await checkIn(day.id);
    await expect(startWorkout(day.id, "A", "STANDARD")).resolves.toBeDefined();
  });

  it("STANDARD is blocked by RED capacity without explicit override confirmation", async () => {
    const day = await startDay();
    await checkIn(day.id, { energy: 1 }); // RED
    await expect(startWorkout(day.id, "A", "STANDARD")).rejects.toThrow(/RED_OVERRIDE_NOT_CONFIRMED/);
  });

  it("STANDARD proceeds under RED capacity once explicitly confirmed", async () => {
    const day = await startDay();
    await checkIn(day.id, { energy: 1 }); // RED
    const session = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    expect(session.status).toBe("ACTIVE");
  });

  it("REDUCED never requires override confirmation, even under RED capacity", async () => {
    const day = await startDay();
    await checkIn(day.id, { energy: 1 }); // RED
    await expect(startWorkout(day.id, "A", "REDUCED")).resolves.toBeDefined();
  });

  it("RECOVERY never requires override confirmation, even under RED capacity", async () => {
    const day = await startDay();
    await checkIn(day.id, { energy: 1 }); // RED
    await expect(startWorkout(day.id, null, "RECOVERY")).resolves.toBeDefined();
  });
});

/**
 * TRAIN command-layer current-capacity correctness fix: currentCapacity()
 * in trainCommands.ts previously used `db.checkIns.where("beyondDayId")
 * .equals(beyondDayId).last()`, which — for a non-unique index — orders by
 * primary key (a random UUID) among same-day rows, not recorded
 * chronology. It now reuses application/queries.ts's getLatestCheckIn
 * (recordedAt + seq ordering), the same canonical query TRAIN's displayed
 * capacity already reads. Every check-in below is inserted directly via
 * db.checkIns.add with an id deliberately adversarial to its intended
 * recordedAt/seq order — alphabetically opposite of chronological order —
 * so a primary-key-ordering bug would silently pick the wrong row while
 * the canonical recordedAt/seq ordering picks correctly regardless of id.
 */
describe("startWorkout — current-capacity selection uses canonical recorded chronology, not row id order", () => {
  it("selects the chronologically latest check-in for RED-override enforcement, not primary-key/insertion order", async () => {
    const day = await startDay();
    // Alphabetically first id, but the true latest by recordedAt — RED.
    await db.checkIns.add({
      id: "aaa-newer-red",
      beyondDayId: day.id,
      recordedAt: "2026-08-24T12:00:00.000Z",
      seq: 2,
      energy: 1,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });
    // Alphabetically last id, but chronologically earlier — GREEN. A
    // primary-key-ordered .last() would incorrectly pick this one.
    await db.checkIns.add({
      id: "zzz-older-green",
      beyondDayId: day.id,
      recordedAt: "2026-08-24T10:00:00.000Z",
      seq: 1,
      energy: 3,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });

    await expect(startWorkout(day.id, "A", "STANDARD")).rejects.toThrow(/RED_OVERRIDE_NOT_CONFIRMED/);
  });

  it("does not require RED override when the canonical latest check-in is non-RED, even though an older one was RED", async () => {
    const day = await startDay();
    // Alphabetically first id, but the true latest by recordedAt — GREEN.
    await db.checkIns.add({
      id: "aaa-newer-green",
      beyondDayId: day.id,
      recordedAt: "2026-08-24T12:00:00.000Z",
      seq: 2,
      energy: 3,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });
    // Alphabetically last id, but chronologically earlier — RED. A
    // primary-key-ordered .last() would incorrectly pick this one and
    // wrongly demand an override.
    await db.checkIns.add({
      id: "zzz-older-red",
      beyondDayId: day.id,
      recordedAt: "2026-08-24T10:00:00.000Z",
      seq: 1,
      energy: 1,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });

    await expect(startWorkout(day.id, "A", "STANDARD")).resolves.toBeDefined();
  });

  it("uses seq as a deterministic tie-break when two check-ins share an identical recordedAt", async () => {
    const day = await startDay();
    const sameInstant = "2026-08-24T12:00:00.000Z";
    // Alphabetically first id, higher seq — the true latest on a genuine tie — RED.
    await db.checkIns.add({
      id: "aaa-seq2-red",
      beyondDayId: day.id,
      recordedAt: sameInstant,
      seq: 2,
      energy: 1,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });
    // Alphabetically last id, lower seq — GREEN. A primary-key-ordered
    // .last() would incorrectly pick this one on the recordedAt tie.
    await db.checkIns.add({
      id: "zzz-seq1-green",
      beyondDayId: day.id,
      recordedAt: sameInstant,
      seq: 1,
      energy: 3,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });

    await expect(startWorkout(day.id, "A", "STANDARD")).rejects.toThrow(/RED_OVERRIDE_NOT_CONFIRMED/);
  });

  it("command-layer enforcement agrees with the exact same canonical check-in TRAIN's displayed capacity reads", async () => {
    const day = await startDay();
    await checkIn(day.id, { energy: 1 }); // RED

    const latest = await getLatestCheckIn(day.id);
    const displayedCapacity = latest ? deriveCapacity(latest).capacity : null;
    expect(displayedCapacity).toBe("RED");

    // Command layer must agree with the same canonical latest check-in.
    await expect(startWorkout(day.id, "A", "STANDARD")).rejects.toThrow(/RED_OVERRIDE_NOT_CONFIRMED/);
    const session = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    expect(session.status).toBe("ACTIVE");
  });
});

describe("performed sets — logged vs skipped", () => {
  it("logs a set with weight/reps and no skipped flag set", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 10);

    const sets = await getPerformedSets(session.id);
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ exerciseId: "machine-chest-press", weight: 135, reps: 10, skipped: false });
  });

  it("records a skipped set as history, not as a zero", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await skipSet(day.id, session.id, "pec-deck", 1);

    const sets = await getPerformedSets(session.id);
    expect(sets).toHaveLength(1);
    expect(sets[0]!.skipped).toBe(true);
  });

  it("records free-text exercise substitution while preserving the original exerciseId slot", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "leg-press", 1, 200, 10, "Hack Squat (leg press unavailable)");

    const sets = await getPerformedSets(session.id);
    expect(sets[0]!.exerciseId).toBe("leg-press");
    expect(sets[0]!.substitutedName).toBe("Hack Squat (leg press unavailable)");
  });
});

describe("getActiveWorkoutSession — resumable across refresh", () => {
  it("finds the ACTIVE session for the day, and stops once it ends", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    expect((await getActiveWorkoutSession(day.id))?.id).toBe(session.id);

    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    expect(await getActiveWorkoutSession(day.id)).toBeUndefined();
  });
});

/**
 * Leverage Implementation 001 (deterministic ordering hardening,
 * 2026-08-22): getActiveWorkoutSession's sort (representative of all six
 * timestamp sorts audited in application/trainQueries.ts this checkpoint)
 * was deliberately LEFT UNCHANGED — WorkoutSession carries no `seq` field,
 * unlike StateCheckIn/Recommendation/DomainEvent, and adding one would be
 * a schema-adjacent change and a TRAIN progression touch, both outside
 * this checkpoint's explicit scope. Two simultaneously-ACTIVE sessions
 * isn't a state the app's own commands create today; manufactured
 * directly here purely to characterize, and put a regression tripwire
 * on, the current known-ambiguous behavior — not to prove a fix.
 */
describe("getActiveWorkoutSession — residual risk with identical startedAt (documented, not fixed this checkpoint)", () => {
  it("resolves ambiguously (order-dependent, not deterministic) when two ACTIVE-flagged sessions share an identical startedAt", async () => {
    const day = await startDay();
    const now = new Date().toISOString();
    await db.workoutSessions.add({
      id: "residual-session-a",
      schemaVersion: 1,
      beyondDayId: day.id,
      templateId: "A",
      sessionType: "STANDARD",
      status: "ACTIVE",
      startedAt: now,
    });
    await db.workoutSessions.add({
      id: "residual-session-b",
      schemaVersion: 1,
      beyondDayId: day.id,
      templateId: "B",
      sessionType: "STANDARD",
      status: "ACTIVE",
      startedAt: now,
    });

    const active = await getActiveWorkoutSession(day.id);
    expect(active).toBeDefined();
    // Deliberately NOT asserting which one wins — that's the point being
    // documented: WorkoutSession has no seq to make this deterministic today.
    expect(["residual-session-a", "residual-session-b"]).toContain(active!.id);
  });
});

describe("A -> B -> C rotation advancement", () => {
  it("suggests A when no session has ever completed", async () => {
    expect(await suggestTemplateForNextWorkout()).toBe("A");
  });

  it("STANDARD COMPLETED advances the rotation", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    expect(await suggestTemplateForNextWorkout()).toBe("B");
  });

  it("STANDARD PARTIAL does NOT advance the rotation", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");
    expect(await suggestTemplateForNextWorkout()).toBe("A");
  });

  it("an ABANDONED STANDARD workout does not advance the rotation; same workout suggested again", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await abandonWorkout(day.id, session.id, "STANDARD");
    expect(await suggestTemplateForNextWorkout()).toBe("A");
  });

  it("REDUCED COMPLETED advances the rotation", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "REDUCED");
    await completeWorkout(day.id, session.id, "REDUCED", "COMPLETED");
    expect(await suggestTemplateForNextWorkout()).toBe("B");
  });

  it("REDUCED PARTIAL also advances the rotation (unlike STANDARD PARTIAL)", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "REDUCED");
    await completeWorkout(day.id, session.id, "REDUCED", "PARTIAL");
    expect(await suggestTemplateForNextWorkout()).toBe("B");
  });

  it("REDUCED ABANDONED does not advance the rotation", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "REDUCED");
    await abandonWorkout(day.id, session.id, "REDUCED");
    expect(await suggestTemplateForNextWorkout()).toBe("A");
  });

  it("a full A -> B -> C -> A cycle advances correctly across separate sessions", async () => {
    const day = await startDay();
    const a = await startWorkout(day.id, "A", "STANDARD");
    await completeWorkout(day.id, a.id, "STANDARD", "COMPLETED");
    expect(await suggestTemplateForNextWorkout()).toBe("B");

    const b = await startWorkout(day.id, "B", "STANDARD");
    await completeWorkout(day.id, b.id, "STANDARD", "COMPLETED");
    expect(await suggestTemplateForNextWorkout()).toBe("C");

    const c = await startWorkout(day.id, "C", "STANDARD");
    await completeWorkout(day.id, c.id, "STANDARD", "COMPLETED");
    expect(await suggestTemplateForNextWorkout()).toBe("A");
  });
});

/**
 * Phase 6 (TRAIN redesign), item 2: explains WHY a template is suggested
 * without inventing false history. Additive query, doesn't touch
 * suggestTemplateForNextWorkout's own tested behavior above.
 */
describe("getLastAdvancingTemplate — basis for explaining the rotation suggestion", () => {
  it("is null when nothing has ever advanced the rotation", async () => {
    expect(await getLastAdvancingTemplate()).toBeNull();
  });

  it("names the real template once a session has advanced the rotation", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    expect(await getLastAdvancingTemplate()).toBe("A");
  });

  it("does not count a non-advancing session (e.g. STANDARD PARTIAL)", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");
    expect(await getLastAdvancingTemplate()).toBeNull();
  });
});

describe("RECOVERY sessions", () => {
  it("never advances the rotation regardless of outcome", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, session.id, 20); // well over 10min -> COMPLETED
    expect(await suggestTemplateForNextWorkout()).toBe("A");
  });

  it("derives COMPLETED at 10+ minutes, PARTIAL at 1-9, and ABANDONED at 0 via the actual command", async () => {
    const day = await startDay();

    const s1 = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, s1.id, 15);
    expect((await db.workoutSessions.get(s1.id))!.status).toBe("COMPLETED");

    const s2 = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, s2.id, 5);
    expect((await db.workoutSessions.get(s2.id))!.status).toBe("PARTIAL");

    const s3 = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, s3.id, 0);
    expect((await db.workoutSessions.get(s3.id))!.status).toBe("ABANDONED");

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(events.some((e) => e.type === "WORKOUT_ABANDONED" && (e.payload as { sessionId: string }).sessionId === s3.id)).toBe(true);
  });
});
