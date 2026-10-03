import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { logSet, startWorkout } from "../../src/application/trainCommands";

/** Drop 1.6a (field soak): a logged set needs at least one rep; nothing is written otherwise. */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("logSet guard", () => {
  it("refuses 0 reps, fractional reps and negative weight, writing nothing", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await expect(logSet(day.id, session.id, "machine-chest-press", 1, 0, 0)).rejects.toThrow(/SET_REPS_REQUIRED/);
    await expect(logSet(day.id, session.id, "machine-chest-press", 1, 135, 2.5)).rejects.toThrow(/SET_REPS_REQUIRED/);
    await expect(logSet(day.id, session.id, "machine-chest-press", 1, -5, 8)).rejects.toThrow(/SET_WEIGHT_INVALID/);
    expect(await db.performedSets.count()).toBe(0);
    expect(await db.events.where("type").equals("SET_LOGGED").count()).toBe(0);
  });

  it("still logs a bodyweight set (0 lb) with reps", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 0, 12);
    expect(await db.performedSets.count()).toBe(1);
  });
});
