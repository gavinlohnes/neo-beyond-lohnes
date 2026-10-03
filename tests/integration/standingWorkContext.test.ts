import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import {
  endDay,
  performDueDayRollover,
  setWorkContext,
  startDay,
  subscribeToDayRollover,
  updateSchedulePattern,
} from "../../src/application/commands";
import { getActiveDay, getWorkContextSource } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";
import type { BeyondDay } from "../../src/domain/common/types";

/**
 * DROP 0 — standing schedule + rollover refresh signal, end to end against
 * real commands/queries and fake-indexeddb. Oct 12 2026 is a Week A Monday
 * (work); Oct 14 is a Week A Wednesday (off).
 */
const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min, 0, 0);

async function saveOwnersSchedule() {
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
}

async function startDayAt(when: Date): Promise<BeyondDay> {
  vi.setSystemTime(when);
  return startDay();
}

async function workContextEvents(dayId: string) {
  return (await db.events.where("beyondDayId").equals(dayId).toArray())
    .filter((e) => e.type === "WORK_CONTEXT_SET")
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
}

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(10, 1, 12));
});

afterEach(async () => {
  vi.useRealTimers();
  db.close();
});

describe("a new day starts from a clear, saved schedule", () => {
  it("on a scheduled work day: WORK, recorded as SCHEDULE_STANDING by the system", async () => {
    await saveOwnersSchedule();
    const day = await startDayAt(at(10, 12, 16, 30));

    expect(day.workContext).toBe("WORK");
    expect((await getActiveDay())?.workContext).toBe("WORK");
    const [event] = await workContextEvents(day.id);
    expect(event?.source).toBe("SYSTEM");
    expect(event?.payload).toMatchObject({ workContext: "WORK", source: "SCHEDULE_STANDING" });
    expect(await getWorkContextSource(day.id)).toBe("SCHEDULE_STANDING");
    expect(describeEvent(event!)).toBe("Work context set to WORK (per your saved schedule).");
  });

  it("on a scheduled day off: OFF, same provenance", async () => {
    await saveOwnersSchedule();
    const day = await startDayAt(at(10, 14, 16, 30));
    expect(day.workContext).toBe("OFF");
    expect(await getWorkContextSource(day.id)).toBe("SCHEDULE_STANDING");
  });
});

describe("unclear: the day starts UNKNOWN and TODAY asks once", () => {
  it("when only the seeded default schedule exists", async () => {
    const day = await startDayAt(at(10, 12, 16, 30));
    expect(day.workContext).toBe("UNKNOWN");
    expect(await workContextEvents(day.id)).toHaveLength(0);
    expect(await getWorkContextSource(day.id)).toBeUndefined();
  });

  it("when the operator corrected the work context earlier in the same lived day", async () => {
    await saveOwnersSchedule();
    const first = await startDayAt(at(10, 12, 16, 30));
    vi.setSystemTime(at(10, 12, 17, 0));
    await setWorkContext(first.id, "OFF", "MANUAL");
    vi.setSystemTime(at(10, 12, 22, 0));
    await endDay(first.id);

    const second = await startDayAt(at(10, 12, 22, 5));
    expect(second.workContext).toBe("UNKNOWN");
    expect(await workContextEvents(second.id)).toHaveLength(0);
  });

  it("a correction on an earlier lived day does not make the next lived day unclear", async () => {
    await saveOwnersSchedule();
    const first = await startDayAt(at(10, 12, 16, 30));
    await setWorkContext(first.id, "OFF", "MANUAL");
    await endDay(first.id);

    const next = await startDayAt(at(10, 13, 16, 30)); // Tue, Week A — works
    expect(next.workContext).toBe("WORK");
  });
});

describe("a manual change always wins", () => {
  it("overrides SCHEDULE_STANDING for that day and shows in History", async () => {
    await saveOwnersSchedule();
    const day = await startDayAt(at(10, 12, 16, 30));
    vi.setSystemTime(at(10, 12, 16, 45));
    await setWorkContext(day.id, "OFF", "MANUAL");

    expect((await getActiveDay())?.workContext).toBe("OFF");
    expect(await getWorkContextSource(day.id)).toBe("MANUAL");
    const events = await workContextEvents(day.id);
    expect(events.map((e) => (e.payload as { source: string }).source)).toEqual(["SCHEDULE_STANDING", "MANUAL"]);
    expect(describeEvent(events[1]!)).toBe("Work context set to OFF (manual).");
  });
});

describe("the rollover creates the next day from the schedule and signals screens", () => {
  it("notifies subscribers once with the new day, which starts from the schedule", async () => {
    await saveOwnersSchedule();
    const old = await startDayAt(at(10, 14, 16, 30)); // Wed, Week A — off
    expect(old.workContext).toBe("OFF");

    const seen: BeyondDay[] = [];
    const unsubscribe = subscribeToDayRollover((d) => seen.push(d));
    vi.setSystemTime(at(10, 15, 16, 30));
    const rolled = await performDueDayRollover(at(10, 15, 16, 31)); // Thu, Week A — off
    vi.setSystemTime(at(10, 16, 16, 31));
    const rolledAgain = await performDueDayRollover(at(10, 16, 16, 31)); // Fri, Week A — works
    unsubscribe();
    await performDueDayRollover(at(10, 17, 16, 31)); // after unsubscribing: not seen

    expect(rolled?.workContext).toBe("OFF");
    expect(rolledAgain?.workContext).toBe("WORK");
    expect(seen.map((d) => d.id)).toEqual([rolled!.id, rolledAgain!.id]);
  });

  it("does not notify when no rollover is due", async () => {
    await saveOwnersSchedule();
    await startDayAt(at(10, 14, 16, 30));
    const listener = vi.fn();
    const unsubscribe = subscribeToDayRollover(listener);
    expect(await performDueDayRollover(at(10, 14, 20, 0))).toBeUndefined();
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
  });

  it("a listener that throws never breaks the rollover or other listeners", async () => {
    await startDayAt(at(10, 14, 16, 30));
    const good = vi.fn();
    const unsubBad = subscribeToDayRollover(() => {
      throw new Error("boom");
    });
    const unsubGood = subscribeToDayRollover(good);
    const rolled = await performDueDayRollover(at(10, 15, 16, 31));
    unsubBad();
    unsubGood();
    expect(rolled).toBeDefined();
    expect(good).toHaveBeenCalledTimes(1);
  });
});
