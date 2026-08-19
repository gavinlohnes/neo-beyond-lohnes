import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, skipSet, startWorkout } from "../../src/application/trainCommands";
import { getProgressionSuggestion } from "../../src/application/trainQueries";

/**
 * TRAIN progression, exercised through the real command/query layer
 * (Decision Register TRAIN, locked; reconfirmed 2026-08-19, replacing the
 * phone session's rejected universal +2.5lb rule). Pure-logic edge cases
 * already covered by tests/engine/progression.test.ts — this file proves
 * the query correctly finds "the most recent matching session" and scopes
 * by (templateId, sessionType, exerciseId).
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getProgressionSuggestion — real session history", () => {
  it("NO_HISTORY before any session has ever been logged for this exercise", async () => {
    const result = await getProgressionSuggestion("A", "STANDARD", "machine-chest-press");
    expect(result.recommendation).toBe("NO_HISTORY");
  });

  it("suggests INCREASE after a completed session with all sets at the top of range", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 12);
    await logSet(day.id, session.id, "machine-chest-press", 2, 135, 12);
    await logSet(day.id, session.id, "machine-chest-press", 3, 135, 12);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    const result = await getProgressionSuggestion("A", "STANDARD", "machine-chest-press");
    expect(result.recommendation).toBe("INCREASE");
    expect(result.suggestedNextWeight).toBe(140);
  });

  it("uses the MOST RECENT matching session, not an older one", async () => {
    const day = await startDay();

    const first = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, first.id, "machine-chest-press", 1, 100, 12);
    await logSet(day.id, first.id, "machine-chest-press", 2, 100, 12);
    await logSet(day.id, first.id, "machine-chest-press", 3, 100, 12);
    await completeWorkout(day.id, first.id, "STANDARD", "COMPLETED");

    const second = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, second.id, "machine-chest-press", 1, 130, 5);
    await logSet(day.id, second.id, "machine-chest-press", 2, 130, 6);
    await logSet(day.id, second.id, "machine-chest-press", 3, 130, 4);
    await completeWorkout(day.id, second.id, "STANDARD", "PARTIAL");

    const result = await getProgressionSuggestion("A", "STANDARD", "machine-chest-press");
    expect(result.recommendation).toBe("REDUCE"); // based on the SECOND (more recent) session, not the first's INCREASE
    expect(result.lastWeight).toBe(130);
  });

  it("does not cross-contaminate history between different (templateId, sessionType) contexts for the same exercise", async () => {
    // Triceps Pressdown is 2 sets in A but 3 sets in C — different
    // prescriptions, so a session in one context must not answer for the
    // other.
    const day = await startDay();
    const sessionA = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, sessionA.id, "triceps-pressdown", 1, 50, 15);
    await logSet(day.id, sessionA.id, "triceps-pressdown", 2, 50, 15);
    await completeWorkout(day.id, sessionA.id, "STANDARD", "COMPLETED");

    const resultA = await getProgressionSuggestion("A", "STANDARD", "triceps-pressdown");
    expect(resultA.recommendation).toBe("INCREASE");

    const resultC = await getProgressionSuggestion("C", "STANDARD", "triceps-pressdown");
    expect(resultC.recommendation).toBe("NO_HISTORY"); // no C-context session has ever happened
  });

  it("REDUCED history does not answer for STANDARD, and vice versa", async () => {
    const day = await startDay();
    const reducedSession = await startWorkout(day.id, "A", "REDUCED");
    // REDUCED prescribes 2 sets for machine-chest-press regardless of A's own 3.
    await logSet(day.id, reducedSession.id, "machine-chest-press", 1, 135, 12);
    await logSet(day.id, reducedSession.id, "machine-chest-press", 2, 135, 12);
    await completeWorkout(day.id, reducedSession.id, "REDUCED", "COMPLETED");

    const reducedResult = await getProgressionSuggestion("A", "REDUCED", "machine-chest-press");
    expect(reducedResult.recommendation).toBe("INCREASE");

    const standardResult = await getProgressionSuggestion("A", "STANDARD", "machine-chest-press");
    expect(standardResult.recommendation).toBe("NO_HISTORY");
  });

  it("a skipped set in the most recent session yields HOLD via incomplete evidence, exercised end to end", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 12);
    await logSet(day.id, session.id, "machine-chest-press", 2, 135, 12);
    await skipSet(day.id, session.id, "machine-chest-press", 3);
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");

    const result = await getProgressionSuggestion("A", "STANDARD", "machine-chest-press");
    expect(result.recommendation).toBe("HOLD");
  });
});
