import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import {
  abandonWorkout,
  adjustRest,
  completeWorkout,
  logSet,
  skipRest,
  skipSet,
  startRest,
  startWorkout,
  undoLastSet,
} from "../../src/application/trainCommands";
import { getPerformedSets } from "../../src/application/trainQueries";

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("undoLastSet — TRAIN-WAVE-A Set Commit Choreography", () => {
  it("removes only the most recently logged set from getPerformedSets, without deleting the raw row", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 10);

    await undoLastSet(day.id, session.id);

    expect(await getPerformedSets(session.id)).toHaveLength(0);
    // Never mutated or deleted — this codebase's append-only doctrine for
    // raw facts (see SetUndonePayload's doc comment).
    const rawRows = await db.performedSets.where("sessionId").equals(session.id).toArray();
    expect(rawRows).toHaveLength(1);
    expect(rawRows[0]).toMatchObject({ exerciseId: "machine-chest-press", weight: 135, reps: 10 });
  });

  it("undoes the LIFO-last action regardless of insertion order, leaving earlier sets untouched", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 10);
    await logSet(day.id, session.id, "machine-chest-press", 2, 140, 8);

    await undoLastSet(day.id, session.id);

    const sets = await getPerformedSets(session.id);
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ setNumber: 1, weight: 135, reps: 10 });
  });

  it("undoes a skipped set too, when it was the most recent action", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await skipSet(day.id, session.id, "machine-chest-press", 1);

    await undoLastSet(day.id, session.id);

    expect(await getPerformedSets(session.id)).toHaveLength(0);
  });

  it("is a no-op when there is nothing to undo", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await expect(undoLastSet(day.id, session.id)).resolves.toBeUndefined();
    expect(await getPerformedSets(session.id)).toHaveLength(0);
  });

  it("undoing twice in a row undoes two distinct sets, not the same one again", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 10);
    await logSet(day.id, session.id, "machine-chest-press", 2, 140, 8);

    await undoLastSet(day.id, session.id);
    await undoLastSet(day.id, session.id);

    expect(await getPerformedSets(session.id)).toHaveLength(0);
    // Both raw rows still exist untouched.
    expect(await db.performedSets.where("sessionId").equals(session.id).toArray()).toHaveLength(2);
  });
});

describe("startRest / adjustRest / skipRest — TRAIN-WAVE-A Persistent Rest", () => {
  it("starts rest as an absolute end time roughly durationSeconds from now", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    const before = Date.now();

    await startRest(session.id, 90);

    const after = Date.now();
    const updated = await db.workoutSessions.get(session.id);
    expect(updated?.activeRestEndsAt).toBeDefined();
    const endsAtMs = new Date(updated!.activeRestEndsAt!).getTime();
    // activeRestEndsAt is computed from Date.now() *inside* startRest, at
    // some point between `before` and `after` — bound the window around
    // that call rather than assuming it lands on `before` exactly.
    expect(endsAtMs).toBeGreaterThanOrEqual(before + 90_000);
    expect(endsAtMs).toBeLessThanOrEqual(after + 90_000);
  });

  it("adjustRest extends or shortens the remaining time", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await startRest(session.id, 90);
    const original = (await db.workoutSessions.get(session.id))!.activeRestEndsAt!;

    await adjustRest(session.id, 15);
    const extended = (await db.workoutSessions.get(session.id))!.activeRestEndsAt!;
    expect(new Date(extended).getTime() - new Date(original).getTime()).toBe(15_000);

    await adjustRest(session.id, -30);
    const shortened = (await db.workoutSessions.get(session.id))!.activeRestEndsAt!;
    expect(new Date(extended).getTime() - new Date(shortened).getTime()).toBe(30_000);
  });

  it("adjustRest never lets the end time fall before now", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await startRest(session.id, 5);

    await adjustRest(session.id, -3600);

    const updated = await db.workoutSessions.get(session.id);
    expect(new Date(updated!.activeRestEndsAt!).getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
  });

  it("adjustRest is a no-op when there is no active rest", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await adjustRest(session.id, 15);
    expect((await db.workoutSessions.get(session.id))?.activeRestEndsAt).toBeUndefined();
  });

  it("skipRest clears the rest end time entirely", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await startRest(session.id, 90);

    await skipRest(session.id);

    expect((await db.workoutSessions.get(session.id))?.activeRestEndsAt).toBeUndefined();
  });

  it("completing a workout clears any lingering active rest", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await startRest(session.id, 90);

    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    expect((await db.workoutSessions.get(session.id))?.activeRestEndsAt).toBeUndefined();
  });

  it("abandoning a workout clears any lingering active rest", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await startRest(session.id, 90);

    await abandonWorkout(day.id, session.id, "STANDARD");

    expect((await db.workoutSessions.get(session.id))?.activeRestEndsAt).toBeUndefined();
  });
});
