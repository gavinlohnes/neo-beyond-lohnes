import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, logSleep, startDay } from "../../src/application/commands";
import { getActiveDay, shouldSuggestEndDay, getLatestSleepMinutes } from "../../src/application/queries";

/**
 * BeyondDay lifecycle (Context & Safety Decisions, 2026-08-19): ends via
 * explicit END DAY action only; the Engine suggests ending right after
 * primary sleep is logged; auto-close on next-day-start is a fallback
 * only; calendar midnight is explicitly rejected as the boundary; END DAY
 * closes silently, no recap. workContext scheduling is explicitly out of
 * scope here — see the completion report.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("explicit END DAY", () => {
  it("marks the day ENDED and logs a DAY_ENDED fact with an explicit reason", async () => {
    const day = await startDay();
    await endDay(day.id);

    const updated = await db.beyondDays.get(day.id);
    expect(updated!.status).toBe("ENDED");

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const ended = events.find((e) => e.type === "DAY_ENDED");
    expect(ended).toBeDefined();
    expect((ended!.payload as { reason: string }).reason).toBe("EXPLICIT_END_DAY");
    expect(ended!.source).toBe("USER");
  });

  it("an ended day no longer shows as the active day", async () => {
    const day = await startDay();
    await endDay(day.id);
    expect(await getActiveDay()).toBeUndefined();
  });

  it("closes without generating any other event (no recap)", async () => {
    const day = await startDay();
    const before = await db.events.where("beyondDayId").equals(day.id).count();
    await endDay(day.id);
    const after = await db.events.where("beyondDayId").equals(day.id).count();
    expect(after).toBe(before + 1);
  });
});

describe("sleep-triggered END DAY suggestion", () => {
  it("does not suggest ending before sleep is logged", async () => {
    const day = await startDay();
    expect(await shouldSuggestEndDay(day.id)).toBe(false);
  });

  it("suggests ending right after primary sleep is logged", async () => {
    const day = await startDay();
    await logSleep(day.id, 420);
    expect(await shouldSuggestEndDay(day.id)).toBe(true);
    expect(await getLatestSleepMinutes(day.id)).toBe(420);
  });

  it("stops suggesting once the day has actually ended", async () => {
    const day = await startDay();
    await logSleep(day.id, 420);
    await endDay(day.id);
    expect(await shouldSuggestEndDay(day.id)).toBe(false);
  });

  it("sleep logging records duration and defaults to PRIMARY kind, as a plain event fact (no target, no dedicated table)", async () => {
    const day = await startDay();
    await logSleep(day.id, 390);
    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const logged = events.find((e) => e.type === "SLEEP_LOGGED");
    expect(logged).toBeDefined();
    expect((logged!.payload as { durationMinutes: number }).durationMinutes).toBe(390);
    expect((logged!.payload as { kind: string }).kind).toBe("PRIMARY");
  });

  /**
   * Sleep/Day-Ownership Model DECISION (2026-08-19): a SUPPLEMENTAL (nap)
   * log must never suggest ending the day — that's the whole point of
   * the kind field (e.g. a pre-shift nap shouldn't suggest ending a day
   * that's really still going through an overnight shift).
   */
  it("does NOT suggest ending after a SUPPLEMENTAL (nap) sleep log", async () => {
    const day = await startDay();
    await logSleep(day.id, 45, "SUPPLEMENTAL");
    expect(await shouldSuggestEndDay(day.id)).toBe(false);
  });

  it("suggests ending once a PRIMARY sleep log follows a SUPPLEMENTAL one", async () => {
    const day = await startDay();
    await logSleep(day.id, 45, "SUPPLEMENTAL");
    expect(await shouldSuggestEndDay(day.id)).toBe(false);
    await logSleep(day.id, 420, "PRIMARY");
    expect(await shouldSuggestEndDay(day.id)).toBe(true);
  });

  it("treats a pre-decision event with no kind field at all as PRIMARY, not reinterpreted", async () => {
    const day = await startDay();
    // Simulates a real historical SLEEP_LOGGED event logged before the
    // Sleep/Day-Ownership Model DECISION existed — no `kind` field.
    await db.events.add({
      id: "legacy-sleep-event",
      type: "SLEEP_LOGGED",
      beyondDayId: day.id,
      occurredAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      payload: { commandId: "legacy", durationMinutes: 400 },
      source: "USER",
      correlationId: "legacy",
    });
    expect(await shouldSuggestEndDay(day.id)).toBe(true);
  });
});

describe("auto-close as fallback when a new day starts while one is active", () => {
  it("auto-closes the prior ACTIVE day with a distinct reason when startDay is called again", async () => {
    const first = await startDay();
    const second = await startDay();

    expect(first.id).not.toBe(second.id);

    const firstUpdated = await db.beyondDays.get(first.id);
    expect(firstUpdated!.status).toBe("ENDED");

    const firstEvents = await db.events.where("beyondDayId").equals(first.id).toArray();
    const ended = firstEvents.find((e) => e.type === "DAY_ENDED");
    expect((ended!.payload as { reason: string }).reason).toBe("AUTO_CLOSED_ON_NEW_DAY_START");
    expect(ended!.source).toBe("SYSTEM");

    const active = await getActiveDay();
    expect(active!.id).toBe(second.id);
  });

  it("does not auto-close anything when the prior day was already explicitly ended (the normal path)", async () => {
    const first = await startDay();
    await endDay(first.id);
    const firstEventsBefore = await db.events.where("beyondDayId").equals(first.id).count();

    await startDay();

    const firstEventsAfter = await db.events.where("beyondDayId").equals(first.id).count();
    expect(firstEventsAfter).toBe(firstEventsBefore);
  });
});
