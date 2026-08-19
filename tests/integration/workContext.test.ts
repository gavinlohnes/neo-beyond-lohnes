import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { setWorkContext, startDay } from "../../src/application/commands";
import { getActiveDay, getScheduledContext } from "../../src/application/queries";

/**
 * WORK SCHEDULE / CONTEXT (Decision Register, 2026-08-19 authority
 * reconciliation). Hard boundary: PREDICTION IS NOT FACT. Schedule/time
 * may suggest context; it must never create actual historical work facts
 * without explicit confirmation. Manual corrections/overrides beat
 * generated schedule context.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getScheduledContext — zero silent work-history creation", () => {
  it("merely deriving/reading a schedule suggestion never touches BeyondDay or the event log", async () => {
    const day = await startDay();
    const before = await db.beyondDays.get(day.id);
    const eventsBefore = await db.events.where("beyondDayId").equals(day.id).count();

    // Call it many times, as the UI would on every render.
    getScheduledContext(new Date(2026, 7, 21, 19, 0));
    getScheduledContext(new Date(2026, 7, 22, 8, 0));
    getScheduledContext();

    const after = await db.beyondDays.get(day.id);
    const eventsAfter = await db.events.where("beyondDayId").equals(day.id).count();
    expect(after).toEqual(before);
    expect(eventsAfter).toBe(eventsBefore);
  });
});

describe("setWorkContext — the only path that actually changes workContext", () => {
  it("a fresh day starts with UNKNOWN workContext, unaffected by any schedule prediction", async () => {
    const day = await startDay();
    expect(day.workContext).toBe("UNKNOWN");
  });

  it("explicit confirmation sets workContext and logs a WORK_CONTEXT_SET fact with its source", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "SCHEDULE_SUGGESTION_ACCEPTED");

    const updated = await db.beyondDays.get(day.id);
    expect(updated!.workContext).toBe("WORK");

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const set = events.find((e) => e.type === "WORK_CONTEXT_SET");
    expect(set).toBeDefined();
    expect((set!.payload as { workContext: string; source: string }).source).toBe(
      "SCHEDULE_SUGGESTION_ACCEPTED",
    );
  });

  it("a manual value always wins, even directly against what the schedule would suggest", async () => {
    const day = await startDay();
    // The schedule may suggest WORK here; the user manually says OFF anyway.
    await setWorkContext(day.id, "OFF", "MANUAL");

    const updated = await db.beyondDays.get(day.id);
    expect(updated!.workContext).toBe("OFF");
    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const set = events.find((e) => e.type === "WORK_CONTEXT_SET");
    expect((set!.payload as { source: string }).source).toBe("MANUAL");
  });

  it("a later manual correction overrides an earlier schedule-accepted value", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "SCHEDULE_SUGGESTION_ACCEPTED");
    await setWorkContext(day.id, "OFF", "MANUAL");

    expect((await db.beyondDays.get(day.id))!.workContext).toBe("OFF");
    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(events.filter((e) => e.type === "WORK_CONTEXT_SET")).toHaveLength(2);
  });

  it("does not affect getActiveDay's other fields", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    const active = await getActiveDay();
    expect(active!.id).toBe(day.id);
    expect(active!.status).toBe("ACTIVE");
  });
});
