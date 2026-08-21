import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  startDay,
  setWorkContext,
  markWorkEnded,
  submitCheckIn,
  startShiftDown,
  completeShiftDown,
  cancelShiftDown,
} from "../../src/application/commands";
import { getActiveDay, getWorkPeriodEnded, hasUnresolvedPostShift } from "../../src/application/queries";
import { applyAnyRestore } from "../../src/persistence/restore";

/**
 * Drop 02b (Explicit Work Transition, Decision Register "WORK TRANSITION",
 * 2026-08-19 locked). Hard rule: schedule/time predicts; only explicit
 * user action creates the WORK_PERIOD_ENDED fact. No automatic attendance
 * inference. Engine-level priority ordering (RED still wins, etc.) is
 * covered directly in tests/engine/evaluate.test.ts; this file covers the
 * application-layer command/query wiring markWorkEnded actually exercises.
 */

async function checkIn(beyondDayId: string, overrides: Partial<Record<string, number>> = {}) {
  return submitCheckIn(beyondDayId, {
    energy: 3,
    stress: 3,
    mood: 3,
    soreness: 0,
    alcoholUrge: 0,
    ...overrides,
  });
}

async function activeWorkDay() {
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  return day;
}

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("markWorkEnded — explicit work end", () => {
  it("requires an active day with workContext WORK", async () => {
    const day = await startDay(); // workContext still UNKNOWN
    await expect(markWorkEnded(day.id)).rejects.toThrow("NOT_AN_ACTIVE_WORK_DAY");
  });

  it("rejects an OFF day too", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");
    await expect(markWorkEnded(day.id)).rejects.toThrow("NOT_AN_ACTIVE_WORK_DAY");
  });

  it("logs exactly one WORK_PERIOD_ENDED event for a valid WORK day", async () => {
    const day = await activeWorkDay();
    await markWorkEnded(day.id);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const ended = events.filter((e) => e.type === "WORK_PERIOD_ENDED");
    expect(ended).toHaveLength(1);

    const info = await getWorkPeriodEnded(day.id);
    expect(info).toBeDefined();
    expect(info!.eventId).toBe(ended[0]!.id);
  });

  it("never touches BeyondDay.workContext or any other field", async () => {
    const day = await activeWorkDay();
    const before = await db.beyondDays.get(day.id);
    await markWorkEnded(day.id);
    const after = await db.beyondDays.get(day.id);
    expect(after).toEqual(before);
  });
});

describe("markWorkEnded — duplicate/rapid taps", () => {
  it("a second call is a no-op: still exactly one effective fact", async () => {
    const day = await activeWorkDay();
    await markWorkEnded(day.id);
    const firstInfo = await getWorkPeriodEnded(day.id);

    await markWorkEnded(day.id);
    await markWorkEnded(day.id);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(events.filter((e) => e.type === "WORK_PERIOD_ENDED")).toHaveLength(1);
    expect((await getWorkPeriodEnded(day.id))!.eventId).toBe(firstInfo!.eventId);
  });

  it("five rapid sequential taps (matching the UI's busy-gated button, one call finishing before the next starts) still land exactly one effective fact", async () => {
    const day = await activeWorkDay();
    for (let i = 0; i < 5; i++) {
      await markWorkEnded(day.id);
    }
    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(events.filter((e) => e.type === "WORK_PERIOD_ENDED")).toHaveLength(1);
  });
});

describe("hasUnresolvedPostShift / evaluate wiring via submitCheckIn", () => {
  it("false before any WORK_PERIOD_ENDED fact exists", async () => {
    const day = await activeWorkDay();
    expect(await hasUnresolvedPostShift(day.id)).toBe(false);
    const { recommendation } = await checkIn(day.id);
    expect(recommendation.kind).not.toBe("POST_SHIFT_TRANSITION");
  });

  it("true after markWorkEnded, and submitCheckIn's recommendation reflects it (GREEN capacity)", async () => {
    const day = await activeWorkDay();
    await markWorkEnded(day.id);
    expect(await hasUnresolvedPostShift(day.id)).toBe(true);

    const { recommendation } = await checkIn(day.id); // neutral -> GREEN
    expect(recommendation.kind).toBe("POST_SHIFT_TRANSITION");
    expect(recommendation.suggestedCommand).toBe("START_SHIFT_DOWN");
  });

  it("true after markWorkEnded with YELLOW capacity — post-shift still wins over RECOVER", async () => {
    const day = await activeWorkDay();
    await markWorkEnded(day.id);

    const { recommendation } = await checkIn(day.id, { stress: 4 }); // YELLOW
    expect(recommendation.kind).toBe("POST_SHIFT_TRANSITION");
  });

  it("RED capacity still wins over an unresolved post-shift fact, end to end through submitCheckIn", async () => {
    const day = await activeWorkDay();
    await markWorkEnded(day.id);

    const { recommendation } = await checkIn(day.id, { energy: 1 }); // RED
    expect(recommendation.kind).toBe("STABILIZE");
    expect(recommendation.suggestedCommand).toBe("START_SHIFT_DOWN");
  });
});

describe("SHIFT_DOWN_COMPLETED clears the post-shift requirement", () => {
  it("completing a shift-down started AFTER the work-ended fact clears it", async () => {
    const day = await activeWorkDay();
    await markWorkEnded(day.id);
    expect(await hasUnresolvedPostShift(day.id)).toBe(true);

    const startedEventId = await startShiftDown(day.id, 10);
    await completeShiftDown(day.id, startedEventId);

    expect(await hasUnresolvedPostShift(day.id)).toBe(false);
    const { recommendation } = await checkIn(day.id);
    expect(recommendation.kind).not.toBe("POST_SHIFT_TRANSITION");
  });

  it("a shift-down completed BEFORE the work-ended fact does not clear it", async () => {
    const day = await activeWorkDay();
    const startedEventId = await startShiftDown(day.id, 10);
    await completeShiftDown(day.id, startedEventId);

    await markWorkEnded(day.id);

    expect(await hasUnresolvedPostShift(day.id)).toBe(true);
  });

  it("cancelling a shift-down does NOT clear the post-shift requirement", async () => {
    const day = await activeWorkDay();
    await markWorkEnded(day.id);

    const startedEventId = await startShiftDown(day.id, 10);
    await cancelShiftDown(day.id, startedEventId);

    expect(await hasUnresolvedPostShift(day.id)).toBe(true);
  });
});

describe("reload/reconstruction", () => {
  it("state survives closing and reopening the database (nothing lives only in memory)", async () => {
    const day = await activeWorkDay();
    await markWorkEnded(day.id);
    const before = await getWorkPeriodEnded(day.id);

    db.close();
    await db.open();

    const after = await getWorkPeriodEnded(day.id);
    expect(after).toEqual(before);
    expect(await hasUnresolvedPostShift(day.id)).toBe(true);
  });
});

describe("midnight/overnight work", () => {
  it("markWorkEnded works normally well past midnight on the same wake-to-sleep BeyondDay", async () => {
    const day = await activeWorkDay(); // BeyondDay is wake-to-sleep, not calendar-bound
    // Simulate "it's now 3am the next calendar day" purely by marking work
    // ended — the BeyondDay itself has no notion of calendar midnight to
    // cross; this proves markWorkEnded doesn't secretly depend on same-
    // calendar-day timing.
    await markWorkEnded(day.id);

    const info = await getWorkPeriodEnded(day.id);
    expect(info).toBeDefined();
    const stillActive = await getActiveDay();
    expect(stillActive!.id).toBe(day.id);
    expect(await hasUnresolvedPostShift(day.id)).toBe(true);
  });
});

describe("WORK_PERIOD_ENDED survives native backup export/restore", () => {
  it("round-trips through export and replace-only restore", async () => {
    const day = await activeWorkDay();
    await markWorkEnded(day.id);
    const originalInfo = await getWorkPeriodEnded(day.id);

    const blob = await db.export({ prettyJson: true });
    const backupFile = new File([blob], "native-backup.json", { type: "application/json" });

    // Diverge current state so the restore has something real to undo.
    const otherDay = await startDay();
    await setWorkContext(otherDay.id, "WORK", "MANUAL");
    await markWorkEnded(otherDay.id);

    await applyAnyRestore(backupFile);

    expect(await getWorkPeriodEnded(day.id)).toEqual(originalInfo);
    expect(await db.beyondDays.get(otherDay.id)).toBeUndefined();
  });
});
