import { afterEach, describe, expect, it, vi } from "vitest";
import { startDay, submitCheckIn, updateSchedulePattern, performDueDayRollover } from "../../src/application/commands";
import { startWorkout } from "../../src/application/trainCommands";
import { getActiveDay, getLatestRecommendation } from "../../src/application/queries";
import { getModePin, setModePin, clearModePin } from "../../src/application/modePinQueries";
import { getSystemStatus } from "../../src/application/systemStatus";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { readBootPhase } from "../../src/ui/screens/today/bootMode";
import { db } from "../../src/persistence/db";

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
const key = (id: string) => `beyond:modePin:${id}`;
const snapshot = () => Promise.all(db.tables.map(async (table) => [table.name, await table.toArray()]));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("mode pin expiry — presentation only", () => {
  it("expires at 16:30 while the active workout retains its day, without changing any canonical record or guidance", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(at(12, 22));
    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
    await updateSchedulePattern(fields);
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 2, stress: 3, mood: 3, soreness: 2, alcoholUrge: 0 });
    const workout = await startWorkout(day.id, "A", "STANDARD");
    setModePin(day.id, "OFF");
    vi.setSystemTime(at(13, 16, 29));
    expect(getModePin(day.id)).toBe("OFF");
    expect(await readBootPhase()).toBe("OFF");
    const records = await snapshot();
    const guidance = await getLatestRecommendation(day.id);
    const status = await getSystemStatus(day, at(13, 16, 30));
    vi.setSystemTime(at(13, 16, 30));
    await performDueDayRollover();
    expect((await getActiveDay())?.id).toBe(day.id);
    expect(getModePin(day.id)).toBeNull();
    expect(await readBootPhase()).toBe("EXPECTED_POST_WORK");
    expect(await snapshot()).toEqual(records);
    expect(await getLatestRecommendation(day.id)).toEqual(guidance);
    expect(await getSystemStatus(day, at(13, 16, 30))).toEqual(status);
    expect((await db.workoutSessions.get(workout.id))?.status).toBe("ACTIVE");
    expect(localStorage.getItem(key(day.id))).toBeNull();
  });

  it("lets a fresh manual selection after expiry hold until the next boundary on the same retained day", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(at(12, 22));
    setModePin("retained-day", "OFF");
    vi.setSystemTime(at(13, 16, 30)); expect(getModePin("retained-day")).toBeNull();
    vi.setSystemTime(at(13, 16, 31)); setModePin("retained-day", "PRE_WORK");
    vi.setSystemTime(at(14, 16, 29)); expect(getModePin("retained-day")).toBe("PRE_WORK");
    vi.setSystemTime(at(14, 16, 30)); expect(getModePin("retained-day")).toBeNull();
  });

  it("preserves a phase-only pin from the current release until its recorded day's first boundary", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const startedAt = at(12, 22).toISOString();
    localStorage.setItem(key("legacy"), "OFF");
    vi.setSystemTime(at(13, 16, 29)); expect(getModePin("legacy", startedAt)).toBe("OFF");
    vi.setSystemTime(at(13, 16, 30)); expect(getModePin("legacy", startedAt)).toBeNull();
    expect(localStorage.getItem(key("legacy"))).toBeNull();
  });

  it("uses the caller's explicit clock for boot as well as the real UI clock", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(at(12, 22));
    const day = await startDay(); setModePin(day.id, "PRE_WORK");
    expect(await readBootPhase(at(13, 16, 30))).toBeNull();
    expect(getModePin(day.id, day.startedAt, at(13, 16, 30))).toBeNull();
  });

  for (const [month, day, hours] of [[2, 7, 23], [9, 31, 25]]) it(`expires at local 16:30 over a ${hours}-hour DST day`, () => {
    const previousTZ = process.env.TZ; process.env.TZ = "America/New_York";
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const start = new Date(2026, month!, day!, 16, 30);
      const boundary = new Date(2026, month!, day! + 1, 16, 30);
      expect((boundary.getTime() - start.getTime()) / 3_600_000).toBe(hours);
      vi.setSystemTime(start); setModePin("dst", "OFF");
      vi.setSystemTime(new Date(boundary.getTime() - 1)); expect(getModePin("dst")).toBe("OFF");
      vi.setSystemTime(boundary); expect(getModePin("dst")).toBeNull();
    } finally { if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ; }
  });

  it("ignores malformed pins and tolerates unavailable local storage", () => {
    for (const raw of ['{"phase":"OFF","pinnedAt":"invalid"}', '{"phase":"UNKNOWN","pinnedAt":0}', 'garbage', '{"phase":"OFF","pinnedAt":null}']) {
      localStorage.setItem(key("bad"), raw); expect(getModePin("bad")).toBeNull();
    }
    const read = vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    expect(getModePin("blocked")).toBeNull(); read.mockRestore();
    const write = vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    expect(() => setModePin("blocked", "OFF")).not.toThrow(); write.mockRestore();
    expect(getModePin("blocked")).toBeNull();
    const remove = vi.spyOn(localStorage, "removeItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    expect(() => clearModePin("blocked")).not.toThrow(); remove.mockRestore();
  });
});
