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

    const status = await getSystemStatus(new Date(2026, 9, 4, 9));
    expect(describeSystemStatus(status)).toBe("AMBER · 5h sleep, 3 hard sessions in 4 days");
    // Read only: nothing written, the Engine's recommendation unchanged.
    expect(await db.recommendations.toArray()).toEqual(before);
    expect(recommendation.kind).toBe((await db.recommendations.get(recommendation.id))!.kind);
  });
});
