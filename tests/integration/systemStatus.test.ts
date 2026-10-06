import { afterEach, describe, expect, it, vi } from "vitest";
import { logSleep, startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, startWorkout } from "../../src/application/trainCommands";
import { deriveSystemStatus, getSystemStatus } from "../../src/application/systemStatus";
import { describeSystemStatus } from "../../src/ui/screens/today/statusCopy";
import { db } from "../../src/persistence/db";

/** STATUS-001: GREEN / AMBER / RED from sleep, check-in and load; facts only; never touches the Engine. */

afterEach(() => {
  vi.useRealTimers();
});

const GREEN_CHECKIN = { capacity: "GREEN" as const, reasonCodes: ["no severe or constrained condition"] };

describe("deriveSystemStatus", () => {
  it("the brief's example: AMBER · 5h sleep, 3 hard sessions in 4 days", () => {
    const s = deriveSystemStatus({ mainSleepMinutes: 300, checkIn: GREEN_CHECKIN, hardSessions: 3 });
    expect(describeSystemStatus(s)).toBe("AMBER · 5h sleep, 3 hard sessions in 4 days");
  });

  it("RED on a RED check-in or under 4h sleep, naming only those facts", () => {
    expect(describeSystemStatus(deriveSystemStatus({ mainSleepMinutes: 210, checkIn: GREEN_CHECKIN, hardSessions: 4 }))).toBe(
      "RED · 3h 30m sleep",
    );
    expect(
      describeSystemStatus(
        deriveSystemStatus({ mainSleepMinutes: 480, checkIn: { capacity: "RED", reasonCodes: ["stress == 5"] }, hardSessions: 0 }),
      ),
    ).toBe("RED · stress is very high");
  });

  it("AMBER on a YELLOW check-in, under 6h sleep, or 3+ hard sessions in 4 days", () => {
    expect(deriveSystemStatus({ mainSleepMinutes: 359, checkIn: null, hardSessions: 0 }).level).toBe("AMBER");
    expect(deriveSystemStatus({ mainSleepMinutes: 360, checkIn: null, hardSessions: 2 }).level).toBe("GREEN");
    expect(deriveSystemStatus({ mainSleepMinutes: null, checkIn: { capacity: "YELLOW", reasonCodes: ["energy <= 2"] }, hardSessions: 0 }).level).toBe(
      "AMBER",
    );
  });

  it("GREEN lists what it rests on; no data is NO READ, never GREEN", () => {
    expect(describeSystemStatus(deriveSystemStatus({ mainSleepMinutes: 420, checkIn: GREEN_CHECKIN, hardSessions: 1 }))).toBe(
      "GREEN · 7h sleep, check-in clear, 1 hard session in 4 days",
    );
    expect(describeSystemStatus(deriveSystemStatus({ mainSleepMinutes: null, checkIn: null, hardSessions: 5 }))).toBe(
      "NO READ · log sleep or check in",
    );
  });
});

describe("getSystemStatus", () => {
  it("reads the day's main sleep and check-in, counts finished non-recovery sessions in 4 days, and changes no recommendation", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    for (const d of [1, 2, 3]) {
      vi.setSystemTime(new Date(2026, 9, d, 10));
      const day = await startDay();
      const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
      await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED", 45);
    }
    vi.setSystemTime(new Date(2026, 9, 3, 12));
    const recovery = await startWorkout((await db.beyondDays.toArray()).at(-1)!.id, null, "RECOVERY", { overrideConfirmed: true });
    await completeWorkout(recovery.beyondDayId, recovery.id, "RECOVERY", "COMPLETED", 20);

    vi.setSystemTime(new Date(2026, 9, 4, 9));
    const day = await startDay();
    await logSleep(day.id, 300, "PRIMARY");
    await logSleep(day.id, 30, "SUPPLEMENTAL");
    const { recommendation } = await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const before = await db.recommendations.toArray();

    const eventsBefore = await db.events.count();

    const status = await getSystemStatus(undefined, new Date(2026, 9, 4, 9));
    expect(describeSystemStatus(status)).toBe("AMBER · 5h sleep, 3 hard sessions in 4 days");
    // Read only: nothing written; the stored recommendation is the Engine's own, unchanged.
    expect(await db.recommendations.toArray()).toEqual(before);
    expect(await db.events.count()).toBe(eventsBefore);
    expect(before.map((r) => r.id)).toContain(recommendation.id);
  });
});

describe("getSystemStatus edges", () => {
  const GREEN_VALUES = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;

  it("falls back to the day before's main sleep only while it is fresh (36 h)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 9));
    const old = await startDay();
    await logSleep(old.id, 210, "PRIMARY");
    vi.setSystemTime(new Date(2026, 9, 1, 20));
    const today = await startDay();
    await submitCheckIn(today.id, GREEN_VALUES);
    // 11 h later: last night's 3h30m still reads.
    expect(describeSystemStatus(await getSystemStatus(undefined, new Date(2026, 9, 1, 20)))).toBe("RED · 3h 30m sleep");
    // 35 days later, with no newer sleep: it no longer colors today.
    expect(describeSystemStatus(await getSystemStatus(undefined, new Date(2026, 10, 5, 9)))).toBe(
      "GREEN · check-in clear, 0 hard sessions in 4 days",
    );
  });

  it("an undone sleep isn't read; recovery, abandoned, unfinished and future sessions aren't hard sessions", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 3, 9));
    const day = await startDay();
    const sleepId = await logSleep(day.id, 200, "PRIMARY");
    const { voidSleepLog } = await import("../../src/application/commands");
    await voidSleepLog(day.id, sleepId);
    const rec = await startWorkout(day.id, null, "RECOVERY", { overrideConfirmed: true });
    await completeWorkout(day.id, rec.id, "RECOVERY", "COMPLETED", 20);
    const { abandonWorkout } = await import("../../src/application/trainCommands");
    const gone = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    await abandonWorkout(day.id, gone.id, "STANDARD");
    await startWorkout(day.id, "B", "STANDARD", { overrideConfirmed: true }); // still active
    await submitCheckIn(day.id, GREEN_VALUES);
    const status = await getSystemStatus(undefined, new Date(2026, 9, 3, 10));
    expect(describeSystemStatus(status)).toBe("GREEN · check-in clear, 0 hard sessions in 4 days");
  });

  it("the 4-day window: a session started exactly 4 days ago counts, a minute earlier doesn't", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = new Date(2026, 9, 10, 12, 0);
    for (const at of [new Date(2026, 9, 6, 11, 59), new Date(2026, 9, 6, 12, 0), new Date(2026, 9, 8, 12), new Date(2026, 9, 9, 12)]) {
      vi.setSystemTime(at);
      const d = await startDay();
      const s = await startWorkout(d.id, "A", "STANDARD", { overrideConfirmed: true });
      await completeWorkout(d.id, s.id, "STANDARD", "COMPLETED", 45);
    }
    vi.setSystemTime(now);
    const today = await startDay();
    await submitCheckIn(today.id, GREEN_VALUES);
    expect(describeSystemStatus(await getSystemStatus(undefined, now))).toBe("AMBER · 3 hard sessions in 4 days");
  });
});
