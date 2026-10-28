import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { logWater, markWorkEnded, markWorkStarted, setWorkContext, startDay } from "../../src/application/commands";
import { getWorkPeriodStarted } from "../../src/application/queries";
import { getCaveBrief } from "../../src/application/caveBrief";
import { getShiftChange, getWorkStart } from "../../src/application/shiftChange";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";

/** SHIFT-CHANGE-001: one tap for the real start; the brief and the end of the shift count from it. */
beforeEach(async () => { await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); });
afterEach(async () => { vi.useRealTimers(); await db.delete(); });

async function workDay() {
  vi.setSystemTime(new Date(2026, 9, 27, 16, 35));
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  return day;
}

describe("STARTED WORK", () => {
  it("records once, from the tap, and never after work has ended", async () => {
    const day = await workDay();
    vi.setSystemTime(new Date(2026, 9, 27, 17, 40));
    expect(await markWorkStarted(day.id)).toBe(true);
    vi.setSystemTime(new Date(2026, 9, 27, 17, 45));
    expect(await markWorkStarted(day.id)).toBe(false);
    expect((await getWorkPeriodStarted(day.id))?.occurredAt).toBe(new Date(2026, 9, 27, 17, 40).toISOString());
    const events = await db.events.where("beyondDayId").equals(day.id).filter((e) => e.type === "WORK_PERIOD_STARTED").toArray();
    expect(events).toHaveLength(1);
    expect(events[0]!.source).toBe("USER");
  });

  it("refuses a day off, and a start after the end", async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 16, 35));
    const off = await startDay(); await setWorkContext(off.id, "OFF", "MANUAL");
    await expect(markWorkStarted(off.id)).rejects.toThrow(/NOT_AN_ACTIVE_WORK_DAY/);
    await setWorkContext(off.id, "WORK", "MANUAL");
    vi.setSystemTime(new Date(2026, 9, 28, 5, 40)); await markWorkEnded(off.id);
    expect(await markWorkStarted(off.id)).toBe(false);
  });

  it("is offered around the start, then reads as on the clock; the brief and the end count from it", async () => {
    const day = await workDay();
    vi.setSystemTime(new Date(2026, 9, 27, 17, 30));
    expect(await getWorkStart()).toMatchObject({ dayId: day.id, startedAt: null });
    expect((await getCaveBrief())!.phase).toBe("BEFORE");
    vi.setSystemTime(new Date(2026, 9, 27, 17, 40)); await markWorkStarted(day.id);
    expect(await getWorkStart()).toMatchObject({ startedAt: new Date(2026, 9, 27, 17, 40).toISOString() });
    expect((await getCaveBrief())!.phase).toBe("ON");
    vi.setSystemTime(new Date(2026, 9, 27, 21)); await logWater(day.id, 30);
    vi.setSystemTime(new Date(2026, 9, 28, 5, 40)); await markWorkEnded(day.id);
    vi.setSystemTime(new Date(2026, 9, 28, 6, 30));
    const brief = (await getCaveBrief())!;
    expect(brief.aar!.find((r) => r.key === "SHIFT")!.actual).toBe("Started 17:40 · ended 05:40");
    expect(await getShiftChange()).toMatchObject({ phase: "SECURED", clock: "12:00" });
    expect(await getWorkStart()).toBeNull();
  });

  it("reads plainly in history", () => {
    expect(describeEvent({ type: "WORK_PERIOD_STARTED", payload: {} } as never)).toBe("Work marked started.");
  });
});
