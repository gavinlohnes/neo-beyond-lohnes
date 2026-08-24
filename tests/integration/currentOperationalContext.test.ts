import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  markWorkEnded,
  setWorkContext,
  startDay,
  startShiftDown,
  completeShiftDown,
  submitCheckIn,
} from "../../src/application/commands";
import { getLatestCheckIn, getScheduledContext } from "../../src/application/queries";
import { deriveCapacity } from "../../src/engine/capacity";
import { getCurrentOperationalContext } from "../../src/application/currentContextQueries";

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

describe("getCurrentOperationalContext — no active day", () => {
  it("returns a fully honest empty view: no activeDay, no capacity, no unresolved post-shift", async () => {
    const context = await getCurrentOperationalContext();
    expect(context.activeDay).toBeNull();
    expect(context.capacity).toBeNull();
    expect(context.hasUnresolvedPostShift).toBe(false);
    // Schedule prediction is still populated — it derives from configuration, not from an active day.
    expect(context.schedulePrediction).toBeDefined();
  });
});

describe("getCurrentOperationalContext — active day, no check-in", () => {
  it("reports capacity null rather than guessing", async () => {
    const day = await startDay();
    const context = await getCurrentOperationalContext();
    expect(context.activeDay).toEqual({ id: day.id, workContext: day.workContext });
    expect(context.capacity).toBeNull();
  });
});

describe("getCurrentOperationalContext — canonical latest-check-in selection", () => {
  it("selects the chronologically latest check-in for capacity, not primary-key/insertion order", async () => {
    const day = await startDay();
    // Alphabetically first id, but the true latest by recordedAt — RED.
    await db.checkIns.add({
      id: "aaa-newer-red",
      beyondDayId: day.id,
      recordedAt: "2026-08-24T12:00:00.000Z",
      seq: 2,
      energy: 1,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });
    // Alphabetically last id, but chronologically earlier — GREEN. A
    // primary-key-ordered "latest" query would incorrectly pick this one.
    await db.checkIns.add({
      id: "zzz-older-green",
      beyondDayId: day.id,
      recordedAt: "2026-08-24T10:00:00.000Z",
      seq: 1,
      energy: 3,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });

    const context = await getCurrentOperationalContext();
    expect(context.capacity).toBe("RED");
  });

  it("uses seq as a deterministic tie-break when two check-ins share an identical recordedAt", async () => {
    const day = await startDay();
    const sameInstant = "2026-08-24T12:00:00.000Z";
    // Alphabetically first id, higher seq — the true latest on a genuine tie — RED.
    await db.checkIns.add({
      id: "aaa-seq2-red",
      beyondDayId: day.id,
      recordedAt: sameInstant,
      seq: 2,
      energy: 1,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });
    // Alphabetically last id, lower seq — GREEN.
    await db.checkIns.add({
      id: "zzz-seq1-green",
      beyondDayId: day.id,
      recordedAt: sameInstant,
      seq: 1,
      energy: 3,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });

    const context = await getCurrentOperationalContext();
    expect(context.capacity).toBe("RED");
  });
});

describe("getCurrentOperationalContext — capacity matches the locked deriveCapacity() rule exactly", () => {
  it("matches deriveCapacity's own output for the same canonical check-in, for every capacity tier", async () => {
    const day = await startDay();

    await checkIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    let context = await getCurrentOperationalContext();
    let latest = await getLatestCheckIn(day.id);
    expect(context.capacity).toBe(deriveCapacity(latest!).capacity);
    expect(context.capacity).toBe("GREEN");

    await checkIn(day.id, { energy: 2, stress: 3, mood: 3, soreness: 0, alcoholUrge: 0 });
    context = await getCurrentOperationalContext();
    latest = await getLatestCheckIn(day.id);
    expect(context.capacity).toBe(deriveCapacity(latest!).capacity);
    expect(context.capacity).toBe("YELLOW");

    await checkIn(day.id, { energy: 1, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    context = await getCurrentOperationalContext();
    latest = await getLatestCheckIn(day.id);
    expect(context.capacity).toBe(deriveCapacity(latest!).capacity);
    expect(context.capacity).toBe("RED");
  });
});

describe("getCurrentOperationalContext — unresolved post-shift reuses the canonical query unchanged", () => {
  it("is true after WORK_PERIOD_ENDED and false once SHIFT_DOWN_COMPLETED clears it", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    await markWorkEnded(day.id);

    let context = await getCurrentOperationalContext();
    expect(context.hasUnresolvedPostShift).toBe(true);

    const shiftDownId = await startShiftDown(day.id, 10);
    await completeShiftDown(day.id, shiftDownId);

    context = await getCurrentOperationalContext();
    expect(context.hasUnresolvedPostShift).toBe(false);
  });
});

describe("getCurrentOperationalContext — one explicit `now` for every time-derived value", () => {
  it("assembledAt and schedulePrediction both derive from the exact same passed-in instant", async () => {
    const now = new Date("2026-08-19T20:00:00.000Z"); // a known Wednesday evening
    const context = await getCurrentOperationalContext(now);
    expect(context.assembledAt).toBe(now.toISOString());
    expect(context.schedulePrediction).toEqual(await getScheduledContext(now));
  });
});

describe("getCurrentOperationalContext — prediction stays structurally separate from confirmed work context", () => {
  it("never collapses an explicit workContext fact with the schedule's own prediction, even when they conflict", async () => {
    const day = await startDay();
    // Force an explicit fact that very likely conflicts with whatever the
    // default schedule predicts for "now" (OFF is the fact either way).
    await setWorkContext(day.id, "OFF", "MANUAL");

    const context = await getCurrentOperationalContext();
    expect(context.activeDay?.workContext).toBe("OFF");
    // The prediction is still reported in full, on its own terms — not
    // suppressed, overridden, or merged just because a fact disagrees with it.
    expect(context.schedulePrediction).toBeDefined();
    expect(context.schedulePrediction.phase).toBeDefined();
  });
});

describe("getCurrentOperationalContext — read-only and freshly recomposed", () => {
  it("performs no writes", async () => {
    const day = await startDay();
    await checkIn(day.id);
    const eventsBefore = await db.events.count();
    const checkInsBefore = await db.checkIns.count();

    await getCurrentOperationalContext();
    await getCurrentOperationalContext();

    expect(await db.events.count()).toBe(eventsBefore);
    expect(await db.checkIns.count()).toBe(checkInsBefore);
  });

  it("reflects newly changed state on every call rather than returning a stale/memoized result", async () => {
    const before = await getCurrentOperationalContext();
    expect(before.activeDay).toBeNull();

    const day = await startDay();
    const after = await getCurrentOperationalContext();
    expect(after.activeDay).toEqual({ id: day.id, workContext: day.workContext });
  });
});
