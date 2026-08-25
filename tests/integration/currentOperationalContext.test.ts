import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  markWorkEnded,
  setWorkContext,
  startDay,
  startShiftDown,
  completeShiftDown,
} from "../../src/application/commands";
import { getScheduledContext } from "../../src/application/queries";
import { getCurrentOperationalContext } from "../../src/application/currentContextQueries";

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getCurrentOperationalContext — no active day", () => {
  it("returns a fully honest empty view: workContext null, no unresolved post-shift", async () => {
    const context = await getCurrentOperationalContext(null);
    expect(context.workContext).toBeNull();
    expect(context.hasUnresolvedPostShift).toBe(false);
    // Schedule prediction is still populated — it derives from configuration, not from an active day.
    expect(context.schedulePrediction).toBeDefined();
  });
});

describe("getCurrentOperationalContext — day identity is caller-supplied, never independently re-fetched", () => {
  it("returns exactly the passed-in workContext, not a value independently re-read from Dexie", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");

    // Deliberately pass a workContext that disagrees with what's actually
    // stored — if this function re-fetched the day itself, it would
    // return "WORK" (the real stored value) instead of the passed-in "OFF".
    const context = await getCurrentOperationalContext({ id: day.id, workContext: "OFF" });
    expect(context.workContext).toBe("OFF");
  });
});

describe("getCurrentOperationalContext — unresolved post-shift reuses the canonical query unchanged", () => {
  it("is true after WORK_PERIOD_ENDED and false once SHIFT_DOWN_COMPLETED clears it", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    await markWorkEnded(day.id);

    let context = await getCurrentOperationalContext({ id: day.id, workContext: "WORK" });
    expect(context.hasUnresolvedPostShift).toBe(true);

    const shiftDownId = await startShiftDown(day.id, 10);
    await completeShiftDown(day.id, shiftDownId);

    context = await getCurrentOperationalContext({ id: day.id, workContext: "WORK" });
    expect(context.hasUnresolvedPostShift).toBe(false);
  });

  it("is false when there is no active day, without querying anything", async () => {
    const context = await getCurrentOperationalContext(null);
    expect(context.hasUnresolvedPostShift).toBe(false);
  });
});

describe("getCurrentOperationalContext — schedule prediction uses the exact explicit `now` passed in", () => {
  it("matches getScheduledContext(now) for the same instant", async () => {
    const now = new Date("2026-08-19T20:00:00.000Z"); // a known Wednesday evening
    const context = await getCurrentOperationalContext(null, now);
    expect(context.schedulePrediction).toEqual(await getScheduledContext(now));
  });
});

describe("getCurrentOperationalContext — prediction stays structurally separate from confirmed work context", () => {
  it("never collapses an explicit workContext fact with the schedule's own prediction, even when they disagree", async () => {
    // Against DEFAULT_SCHEDULE_PATTERN (no pattern stored in the test db):
    // Tue 2026-08-18 falls in Week A ([Mon,Tue,Fri,Sat,Sun]), so this
    // instant lands inside that day's 18:00-06:00 shift — the schedule
    // predicts SCHEDULED_SHIFT — while the explicit recorded fact is OFF.
    // Constructed as local time (not a UTC ISO string), matching
    // deriveScheduledContext's own local-calendar-date arithmetic, so this
    // is unambiguous regardless of the machine's timezone.
    const now = new Date(2026, 7, 18, 20, 0, 0, 0);
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL"); // explicit fact directly conflicts with the prediction

    const context = await getCurrentOperationalContext({ id: day.id, workContext: "OFF" }, now);
    const expectedPrediction = await getScheduledContext(now);

    expect(context.workContext).toBe("OFF");
    expect(expectedPrediction.phase).toBe("SCHEDULED_SHIFT");
    // Both are present, unmerged, and disagree — exactly as they should.
    expect(context.schedulePrediction).toEqual(expectedPrediction);
  });
});

describe("getCurrentOperationalContext — read-only and freshly recomposed", () => {
  it("performs no writes", async () => {
    const day = await startDay();
    const eventsBefore = await db.events.count();
    const daysBefore = await db.beyondDays.count();

    await getCurrentOperationalContext({ id: day.id, workContext: day.workContext });
    await getCurrentOperationalContext({ id: day.id, workContext: day.workContext });

    expect(await db.events.count()).toBe(eventsBefore);
    expect(await db.beyondDays.count()).toBe(daysBefore);
  });

  it("reflects a changed input on every call rather than returning a stale/memoized result", async () => {
    const before = await getCurrentOperationalContext(null);
    expect(before.workContext).toBeNull();

    const day = await startDay();
    const after = await getCurrentOperationalContext({ id: day.id, workContext: day.workContext });
    expect(after.workContext).toBe(day.workContext);
  });
});
