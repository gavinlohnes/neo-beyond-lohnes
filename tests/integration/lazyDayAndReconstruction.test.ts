import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  completeReset,
  completeShiftDown,
  endDay,
  ensureActiveDay,
  startDay,
  startReset,
  startShiftDown,
} from "../../src/application/commands";
import { getOpenReset, getOpenShiftDown } from "../../src/application/queries";

/**
 * P0: lazy day creation (ensureActiveDay) and interrupted RESET/SHIFT DOWN
 * session reconstruction after reload (getOpenReset/getOpenShiftDown).
 * Both were pure React state before this phase — a reload lost track of
 * an in-progress RESET/SHIFT DOWN entirely, letting a fresh START create
 * an orphaned duplicate with no matching completion.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("ensureActiveDay", () => {
  it("creates a new day when none is active", async () => {
    expect(await db.beyondDays.count()).toBe(0);
    const day = await ensureActiveDay();
    expect(day.status).toBe("ACTIVE");
    expect(await db.beyondDays.count()).toBe(1);
  });

  it("returns the existing active day without creating a second one", async () => {
    const first = await ensureActiveDay();
    const second = await ensureActiveDay();
    expect(second.id).toBe(first.id);
    expect(await db.beyondDays.count()).toBe(1);
  });

  it("still uses startDay()'s own auto-close fallback if the active day were somehow stale", async () => {
    // Simulate the pre-existing auto-close-fallback path: calling startDay
    // directly while a day is ACTIVE closes it. ensureActiveDay should
    // never trigger this itself (it must find the existing day first),
    // but confirms the two compose correctly if startDay is called
    // explicitly afterward.
    const day = await ensureActiveDay();
    const fresh = await startDay();
    expect(fresh.id).not.toBe(day.id);
    expect((await db.beyondDays.get(day.id))!.status).toBe("ENDED");
  });
});

describe("getOpenReset — interrupted RESET reconstruction", () => {
  it("is undefined when no RESET has ever been started", async () => {
    const day = await startDay();
    expect(await getOpenReset(day.id)).toBeUndefined();
  });

  it("finds a started-but-not-completed RESET and returns its original intensity", async () => {
    const day = await startDay();
    const startedId = await startReset(day.id, 4);

    const open = await getOpenReset(day.id);
    expect(open).toEqual({ eventId: startedId, intensity: 4 });
  });

  it("is undefined again once the RESET is completed", async () => {
    const day = await startDay();
    const startedId = await startReset(day.id, 2);
    await completeReset(day.id, startedId);

    expect(await getOpenReset(day.id)).toBeUndefined();
  });

  it("finds the most recent open RESET if more than one somehow exists", async () => {
    const day = await startDay();
    const first = await startReset(day.id, 1);
    await completeReset(day.id, first);
    const second = await startReset(day.id, 5);

    const open = await getOpenReset(day.id);
    expect(open).toEqual({ eventId: second, intensity: 5 });
  });
});

describe("getOpenShiftDown — interrupted SHIFT DOWN reconstruction", () => {
  it("is undefined when no SHIFT DOWN has ever been started", async () => {
    const day = await startDay();
    expect(await getOpenShiftDown(day.id)).toBeUndefined();
  });

  it("finds a started-but-not-completed SHIFT DOWN and returns its original duration", async () => {
    const day = await startDay();
    const startedId = await startShiftDown(day.id, 25);

    const open = await getOpenShiftDown(day.id);
    expect(open).toEqual({ eventId: startedId, durationMinutes: 25 });
  });

  it("is undefined again once the SHIFT DOWN is completed", async () => {
    const day = await startDay();
    const startedId = await startShiftDown(day.id, 15);
    await completeShiftDown(day.id, startedId);

    expect(await getOpenShiftDown(day.id)).toBeUndefined();
  });
});

describe("open RESET/SHIFT DOWN survive an ended day correctly (scoped per day)", () => {
  it("a new day's query does not see a prior day's open RESET", async () => {
    const day1 = await startDay();
    await startReset(day1.id, 3); // left open
    await endDay(day1.id);

    const day2 = await startDay();
    expect(await getOpenReset(day2.id)).toBeUndefined();
    // The original day's open RESET is still findable by its own id, unaffected.
    expect(await getOpenReset(day1.id)).toBeDefined();
  });
});
