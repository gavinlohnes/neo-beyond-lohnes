import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  endDay,
  logBodyweight,
  logSleep,
  performDueDayRollover,
  startDay,
} from "../../src/application/commands";
import { abandonWorkout, completeWorkout, startWorkout } from "../../src/application/trainCommands";
import { getActiveDay, getMinimumDayStatus, getMostRecentBodyweight } from "../../src/application/queries";
import { getAdvisoryNotes } from "../../src/application/advisoryQueries";
import { DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE } from "../../src/engine/dayRollover";

/**
 * DAY-ROLLOVER-001 — end-to-end proof of performDueDayRollover against
 * real application-layer commands/queries and fake-indexeddb, same shape
 * as tests/integration/foundationContinuity.test.ts.
 */

// A boundary-crossing instant: the day below is backdated to well before
// this, and `now` is set to just after it, on the same local calendar
// date used throughout.
const BOUNDARY_DAY = new Date(2026, 8, 21, DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE, 0, 0);
const JUST_AFTER_BOUNDARY = new Date(2026, 8, 21, DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE, 5, 0);
const BEFORE_BOUNDARY_SAME_DAY = new Date(2026, 8, 21, DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE - 1, 0, 0);

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

/** Backdates the given day's startedAt to well before BOUNDARY_DAY, so a check at/after it is due. */
async function backdateDayBeforeBoundary(dayId: string) {
  const wellBefore = new Date(2026, 8, 21, 10, 0, 0, 0).toISOString();
  await db.beyondDays.update(dayId, { startedAt: wellBefore });
}

describe("performDueDayRollover", () => {
  it("is a no-op with no active day at all (never spontaneously creates one — Lazy day creation preserved)", async () => {
    const result = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    expect(result).toBeUndefined();
    expect(await getActiveDay()).toBeUndefined();
  });

  it("is a no-op before the boundary has been crossed", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);
    const result = await performDueDayRollover(BEFORE_BOUNDARY_SAME_DAY);
    expect(result).toBeUndefined();
    const stillActive = await getActiveDay();
    expect(stillActive?.id).toBe(day.id);
  });

  it("closes the old day through the same DAY_ENDED path, flagged AUTO_CLOSED_DAY_ROLLOVER, stamped at the boundary instant (not the call-time now)", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);

    await performDueDayRollover(JUST_AFTER_BOUNDARY);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const dayEnded = events.find((e) => e.type === "DAY_ENDED");
    expect(dayEnded).toBeDefined();
    expect((dayEnded!.payload as { reason: string }).reason).toBe("AUTO_CLOSED_DAY_ROLLOVER");
    // occurredAt is the boundary, not JUST_AFTER_BOUNDARY (the real call time).
    expect(dayEnded!.occurredAt).toBe(BOUNDARY_DAY.toISOString());
    // recordedAt stays the real, unmodified write instant — never fabricated.
    expect(dayEnded!.recordedAt).not.toBe(BOUNDARY_DAY.toISOString());

    const closedRow = await db.beyondDays.get(day.id);
    expect(closedRow?.status).toBe("ENDED");
  });

  it("starts a fresh day stamped at the exact same boundary instant, with water/protein reset and bodyweight carried forward", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);
    await logBodyweight(day.id, 181.4);

    const newDay = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    expect(newDay).toBeDefined();
    expect(newDay!.id).not.toBe(day.id);
    expect(newDay!.startedAt).toBe(BOUNDARY_DAY.toISOString());

    const minimumDay = await getMinimumDayStatus(newDay!.id);
    expect(minimumDay.hydrate).toBe(false);
    expect(minimumDay.protein).toBe(false);

    // Weight already carries forward via getMostRecentBodyweight's
    // existing global (not per-day) scope — no new code needed for this,
    // this test proves it's still true through a rollover.
    expect(await getMostRecentBodyweight()).toBe(181.4);

    const active = await getActiveDay();
    expect(active?.id).toBe(newDay!.id);
  });

  it("collapses a multi-day-closed-app catch-up to exactly one rollover, not one per elapsed boundary", async () => {
    const day = await startDay();
    // Started 4 days before the boundary being checked — several 16:30s
    // have elapsed while "the app was closed."
    await db.beyondDays.update(day.id, { startedAt: new Date(2026, 8, 17, 10, 0, 0, 0).toISOString() });

    const newDay = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    expect(newDay).toBeDefined();

    const allDays = await db.beyondDays.toArray();
    expect(allDays).toHaveLength(2); // the original + exactly one new one
    const dayEndedEvents = (await db.events.where("type").equals("DAY_ENDED").toArray()).filter(
      (e) => (e.payload as { reason?: string }).reason === "AUTO_CLOSED_DAY_ROLLOVER",
    );
    expect(dayEndedEvents).toHaveLength(1);
  });

  it("does not interrupt an in-progress workout — no-ops, and rolls over once the workout ends", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);
    const session = await startWorkout(day.id, "A", "STANDARD");

    const blockedResult = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    expect(blockedResult).toBeUndefined();
    const stillActiveDay = await getActiveDay();
    expect(stillActiveDay?.id).toBe(day.id);
    expect(stillActiveDay?.status).toBe("ACTIVE");

    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    const afterWorkoutEnds = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    expect(afterWorkoutEnds).toBeDefined();
    expect(afterWorkoutEnds!.id).not.toBe(day.id);
  });

  it("an abandoned workout also unblocks the rollover", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);
    const session = await startWorkout(day.id, "A", "STANDARD");
    await abandonWorkout(day.id, session.id, "STANDARD");

    const result = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    expect(result).toBeDefined();
  });

  it("a day manually ended before the boundary is not double-closed by a later rollover check", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);
    await endDay(day.id, "EXPLICIT_END_DAY");

    const result = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    expect(result).toBeUndefined();

    const dayEndedEvents = await db.events.where("beyondDayId").equals(day.id).toArray();
    const dayEndedCount = dayEndedEvents.filter((e) => e.type === "DAY_ENDED").length;
    expect(dayEndedCount).toBe(1);
    expect((dayEndedEvents.find((e) => e.type === "DAY_ENDED")!.payload as { reason: string }).reason).toBe(
      "EXPLICIT_END_DAY",
    );
  });
});

describe("dayRolloverAmbiguity advisory", () => {
  it("flags a PRIMARY sleep logged on a rollover-created day", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);
    const newDay = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    await logSleep(newDay!.id, 420, "PRIMARY");

    const notes = await getAdvisoryNotes(JUST_AFTER_BOUNDARY);
    const ambiguityNote = notes.find((n) => n.sourceModule === "dayRolloverAmbiguity");
    expect(ambiguityNote).toBeDefined();
    expect(ambiguityNote!.attentionLevel).toBe("SURFACE");
  });

  it("does not flag a PRIMARY sleep logged on an explicitly-started (non-rollover) day", async () => {
    const day = await startDay();
    await logSleep(day.id, 420, "PRIMARY");

    const notes = await getAdvisoryNotes(JUST_AFTER_BOUNDARY);
    expect(notes.some((n) => n.sourceModule === "dayRolloverAmbiguity")).toBe(false);
  });

  it("does not flag a SUPPLEMENTAL sleep on a rollover-created day", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);
    const newDay = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    await logSleep(newDay!.id, 30, "SUPPLEMENTAL");

    const notes = await getAdvisoryNotes(JUST_AFTER_BOUNDARY);
    expect(notes.some((n) => n.sourceModule === "dayRolloverAmbiguity")).toBe(false);
  });

  it("does not flag a rollover-created day with no sleep logged at all", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);
    await performDueDayRollover(JUST_AFTER_BOUNDARY);

    const notes = await getAdvisoryNotes(JUST_AFTER_BOUNDARY);
    expect(notes.some((n) => n.sourceModule === "dayRolloverAmbiguity")).toBe(false);
  });
});
