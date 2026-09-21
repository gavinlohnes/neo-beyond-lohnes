import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  /**
   * ROLLOVER-ON-RESUME (2026-09-21): a real browser can dispatch both
   * visibilitychange and pageshow for the same resume, each independently
   * calling performDueDayRollover() — without the in-flight-promise
   * memoization this would race two concurrent reads of "still ACTIVE"
   * into two separate close+reopen sequences. Calling it twice without
   * awaiting between (the same shape as two near-simultaneous resume
   * events) proves that can't happen.
   */
  it("two concurrent calls (simulating two resume events firing together) cause at most one rollover", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);

    const [first, second] = await Promise.all([
      performDueDayRollover(JUST_AFTER_BOUNDARY),
      performDueDayRollover(JUST_AFTER_BOUNDARY),
    ]);

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.id).toBe(second!.id);

    const allDays = await db.beyondDays.toArray();
    expect(allDays).toHaveLength(2); // the original + exactly one new one, not two
    const rolloverEvents = (await db.events.where("type").equals("DAY_ENDED").toArray()).filter(
      (e) => (e.payload as { reason?: string }).reason === "AUTO_CLOSED_DAY_ROLLOVER",
    );
    expect(rolloverEvents).toHaveLength(1);
  });

  it("a genuinely later call (after the in-flight one resolves) still performs a real, separate rollover when a new boundary is due", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);

    const first = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    expect(first).toBeDefined();

    // The next day's own boundary, a day after JUST_AFTER_BOUNDARY.
    const nextDayBoundary = new Date(2026, 8, 22, DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE, 5, 0);
    const second = await performDueDayRollover(nextDayBoundary);
    expect(second).toBeDefined();
    expect(second!.id).not.toBe(first!.id);
  });

  /**
   * PR #111 review finding: closing the old day and creating the
   * replacement were two independent writes — a failure between them
   * (e.g. an IndexedDB quota error, a crash) could leave BEYOND with no
   * ACTIVE day at all, and a later call would see nothing active and
   * silently no-op forever rather than self-healing. Fixed by wrapping
   * both calls in one Dexie transaction, so they commit or roll back
   * together. Simulates the failure at the exact point described — the
   * write startDay() itself performs (db.beyondDays.add) — by rejecting
   * it once, after endDay()'s own writes would already have run within
   * the same transaction.
   */
  it("a failure between the old day's close and the new day's creation leaves the old day untouched (atomic), and a later call recovers correctly", async () => {
    const day = await startDay();
    await backdateDayBeforeBoundary(day.id);

    const addSpy = vi
      .spyOn(db.beyondDays, "add")
      .mockRejectedValueOnce(new Error("simulated failure creating the replacement day"));

    await expect(performDueDayRollover(JUST_AFTER_BOUNDARY)).rejects.toThrow(
      "simulated failure creating the replacement day",
    );

    // The whole transaction rolled back — the old day was never actually
    // left closed with nothing active to replace it.
    const stillActive = await db.beyondDays.get(day.id);
    expect(stillActive?.status).toBe("ACTIVE");
    expect(await db.beyondDays.count()).toBe(1);
    const dayEndedAfterFailure = (await db.events.where("beyondDayId").equals(day.id).toArray()).filter(
      (e) => e.type === "DAY_ENDED",
    );
    expect(dayEndedAfterFailure).toHaveLength(0);

    addSpy.mockRestore();

    // A later invocation — the same call an app-mount or resume check
    // would naturally make next — completes the rollover correctly, with
    // nothing left to "recover": there was no partial state to clean up.
    const recovered = await performDueDayRollover(JUST_AFTER_BOUNDARY);
    expect(recovered).toBeDefined();
    expect(recovered!.id).not.toBe(day.id);

    const closedAfterRecovery = await db.beyondDays.get(day.id);
    expect(closedAfterRecovery?.status).toBe("ENDED");
    const rolloverEvents = (await db.events.where("beyondDayId").equals(day.id).toArray()).filter(
      (e) => e.type === "DAY_ENDED" && (e.payload as { reason?: string }).reason === "AUTO_CLOSED_DAY_ROLLOVER",
    );
    // Not double-closed: exactly one DAY_ENDED for the old day.
    expect(rolloverEvents).toHaveLength(1);
    // Not a duplicate/fabricated day: the original plus exactly one new one.
    expect(await db.beyondDays.count()).toBe(2);
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
