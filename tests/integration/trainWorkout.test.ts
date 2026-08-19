import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, submitCheckIn } from "../../src/application/commands";
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
