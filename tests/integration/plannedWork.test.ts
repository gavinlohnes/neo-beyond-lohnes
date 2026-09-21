import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { setPlannedWork, startDay, submitCheckIn } from "../../src/application/commands";
import { getActiveDay, getPlannedWorkDeclaration, hasActivePlannedWork } from "../../src/application/queries";
import { abandonWorkout, completeWorkout, startWorkout } from "../../src/application/trainCommands";
import type { StateCheckIn } from "../../src/domain/common/types";

/**
 * PLANNED-WORK-001 — real application-layer coverage, same conventions as
 * tests/integration/stabilizationRegressionSuite.test.ts: real Dexie
 * (fake-indexeddb) against the actual commands/queries, not a hand-mocked
 * Engine. Proves the hardcoded `hasPlannedWork: false` gap FOUNDATION-1B
 * discovered is now genuinely fixed end to end, per the direct owner
 * ruling (explicit operator intent, GREEN capacity must never itself
 * imply planned work).
 */

const GREEN: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq"> = {
  energy: 5,
  stress: 1,
  mood: 5,
  soreness: 0,
  alcoholUrge: 0,
};
const RED: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq"> = {
  energy: 1,
  stress: 1,
  mood: 3,
  soreness: 0,
  alcoholUrge: 0,
};

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getPlannedWorkDeclaration", () => {
  it("undefined before any declaration — never answered is distinct from explicit no", async () => {
    const day = await startDay();
    expect(await getPlannedWorkDeclaration(day.id)).toBeUndefined();
  });

  it("reflects the operator's most recent explicit declaration", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, true);
    expect(await getPlannedWorkDeclaration(day.id)).toBe(true);
    await setPlannedWork(day.id, false);
    expect(await getPlannedWorkDeclaration(day.id)).toBe(false);
    await setPlannedWork(day.id, true);
    expect(await getPlannedWorkDeclaration(day.id)).toBe(true);
  });
});

describe("hasActivePlannedWork", () => {
  it("false when never declared — GREEN capacity alone never implies planned work", async () => {
    const day = await startDay();
    expect(await hasActivePlannedWork(day.id)).toBe(false);
  });

  it("false when explicitly declared false", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, false);
    expect(await hasActivePlannedWork(day.id)).toBe(false);
  });

  it("true when explicitly declared true and not yet resolved", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, true);
    expect(await hasActivePlannedWork(day.id)).toBe(true);
  });

  it("resolves back to false once a workout completes after the declaration", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, true);
    expect(await hasActivePlannedWork(day.id)).toBe(true);

    const session = await startWorkout(day.id, "A", "STANDARD");
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED", 45);

    expect(await hasActivePlannedWork(day.id)).toBe(false);
  });

  it("resolves back to false even on an abandoned (not just completed) session", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, true);
    const session = await startWorkout(day.id, "A", "STANDARD");
    await abandonWorkout(day.id, session.id, "STANDARD");

    expect(await hasActivePlannedWork(day.id)).toBe(false);
  });

  it("a later re-declaration after resolution is active again", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, true);
    const session = await startWorkout(day.id, "A", "STANDARD");
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED", 45);
    expect(await hasActivePlannedWork(day.id)).toBe(false);

    await setPlannedWork(day.id, true);
    expect(await hasActivePlannedWork(day.id)).toBe(true);
  });
});

describe("submitCheckIn end-to-end (the real gap FOUNDATION-1B found)", () => {
  it("GREEN capacity, no declaration -> NO_ACTION_REQUIRED (unchanged from before this Drop)", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, GREEN);
    expect(recommendation.kind).toBe("NO_ACTION_REQUIRED");
  });

  it("GREEN capacity, explicit declaration -> EXECUTE_PLANNED_WORK is now genuinely reachable", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, true);
    const { recommendation } = await submitCheckIn(day.id, GREEN);
    expect(recommendation.kind).toBe("EXECUTE_PLANNED_WORK");
  });

  it("RED capacity still wins over an explicit declaration — STABILIZE outranks EXECUTE_PLANNED_WORK unchanged", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, true);
    const { recommendation } = await submitCheckIn(day.id, RED);
    expect(recommendation.kind).toBe("STABILIZE");
  });

  it("declaring, then completing the workout, then checking in again -> back to NO_ACTION_REQUIRED", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, true);
    const { recommendation: first } = await submitCheckIn(day.id, GREEN);
    expect(first.kind).toBe("EXECUTE_PLANNED_WORK");

    const session = await startWorkout(day.id, "A", "STANDARD");
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED", 45);

    const { recommendation: second } = await submitCheckIn(day.id, GREEN);
    expect(second.kind).toBe("NO_ACTION_REQUIRED");
  });

  it("sanity: the active day used throughout is the real current day", async () => {
    const day = await startDay();
    await setPlannedWork(day.id, true);
    const active = await getActiveDay();
    expect(active?.id).toBe(day.id);
  });
});
