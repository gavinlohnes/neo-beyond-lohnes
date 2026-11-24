import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildBridgePlan, KIND_PRIORITY, type BridgeMoment } from "../src/application/bridgePlan";
import { saveEatingWindowSettings } from "../src/application/eatingWindow";
import { setKeyMomentAlerts } from "../src/application/keyMomentAlerts";
import { updateSchedulePattern } from "../src/application/commands";
import { getSchedulePattern } from "../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN, livedDayShiftWindow } from "../src/engine/scheduledContext";
import { mostRecentBoundaryAtOrBefore } from "../src/engine/dayRollover";
import { db } from "../src/persistence/db";

/**
 * GRAYSON-WINDOW-ALERT-001: with the Eating Window on, one "Eating window open" moment per lived day at that day
 * kind's opening, lowest priority, under the same contract. Run in TZ=UTC and TZ=America/Chicago. Invented settings.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const at = (d: number, h: number, m = 0, month = 10) => new Date(2026, month, d, h, m);
const HOME = "https://example.test/beyond/";
const window = (over: Partial<{ eatingHours: number; opensAt: { WORK: string; RECOVERY: string; OFF: string } }> = {}) =>
  ({ enabled: true, eatingHours: 10, opensAt: { WORK: "13:00", RECOVERY: "12:00", OFF: "14:00" }, safetyCheckedAt: at(14, 15).toISOString(), ...over });
const opens = (plan: { moments: BridgeMoment[] }) => plan.moments.filter((m) => m.kind === "WINDOW_OPEN");
const others = (plan: { moments: BridgeMoment[] }) => plan.moments.filter((m) => m.kind !== "WINDOW_OPEN").map((m) => `${m.at}|${m.kind}`);
const livedOf = (t: number) => mostRecentBoundaryAtOrBefore(new Date(t)).getTime();
const NOW = at(14, 16, 31);

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  await updateSchedulePattern(ROTATION);
});
afterEach(() => { vi.useRealTimers(); db.close(); });

/** The rotation's own answer: a work day, the first day off after one, or another day off. */
async function kindOf(livedStart: Date): Promise<"WORK" | "RECOVERY" | "OFF"> {
  const pattern = await getSchedulePattern();
  const prev = new Date(livedStart.getFullYear(), livedStart.getMonth(), livedStart.getDate() - 1, 16, 30);
  return livedDayShiftWindow(livedStart, pattern) ? "WORK" : livedDayShiftWindow(prev, pattern) ? "RECOVERY" : "OFF";
}

describe("GRAYSON-WINDOW-ALERT-001 · window moments", () => {
  it("none while the Eating Window is off", async () => {
    expect(opens(await buildBridgePlan(HOME, "", NOW))).toEqual([]);
    await saveEatingWindowSettings({ ...window(), enabled: false }, NOW);
    expect(opens(await buildBridgePlan(HOME, "", NOW))).toEqual([]);
  });

  it("when on: at most one per lived day, at that day kind's opening (before 16:30 → the lived day's second date)", async () => {
    await saveEatingWindowSettings(window(), NOW);
    const moments = opens(await buildBridgePlan(HOME, "", NOW));
    expect(moments.length).toBeGreaterThan(10);
    const days = moments.map((m) => livedOf(m.at));
    expect(new Set(days).size).toBe(days.length);
    for (const m of moments) {
      const start = new Date(livedOf(m.at));
      const kind = await kindOf(start);
      const [h] = window().opensAt[kind].split(":").map(Number) as [number];
      expect(new Date(m.at).getHours(), new Date(m.at).toString()).toBe(h);
      expect(new Date(m.at).getDate()).toBe(new Date(start.getTime() + 86_400_000).getDate());
      expect(m).toMatchObject({ title: "Eating window open", go: "?alfred=meal" });
    }
    // Every kind that appears in the horizon gets its own time: at least one OFF day here.
    expect(moments.some((m) => new Date(m.at).getHours() === 14)).toBe(true);
  });

  it("the text names the close: opening + eating hours", async () => {
    await saveEatingWindowSettings(window(), NOW);
    const off = opens(await buildBridgePlan(HOME, "", NOW)).find((m) => new Date(m.at).getHours() === 14)!;
    expect(off.text).toBe("Your window is open until 12:00 AM. Tap to tell Delta your first meal.");
  });

  it("its own switch, quiet hours and a shift each drop it", async () => {
    await saveEatingWindowSettings(window(), NOW);
    expect(opens(await buildBridgePlan(HOME, "", NOW)).length).toBeGreaterThan(0);
    await setKeyMomentAlerts({ off: ["WINDOW_OPEN"], quietFrom: null, quietTo: null });
    expect(opens(await buildBridgePlan(HOME, "", NOW))).toEqual([]);
    await setKeyMomentAlerts({ off: [], quietFrom: "11:00", quietTo: "15:00" });
    expect(opens(await buildBridgePlan(HOME, "", NOW))).toEqual([]);
    // A work-day opening inside the shift (20:00 on an 18:00–06:00 night) is dropped; the others stay.
    await setKeyMomentAlerts({ off: [], quietFrom: null, quietTo: null });
    await saveEatingWindowSettings(window({ opensAt: { WORK: "20:00", RECOVERY: "12:00", OFF: "14:00" } }), NOW);
    const pattern = await getSchedulePattern();
    const kept = opens(await buildBridgePlan(HOME, "", NOW));
    expect(kept.some((m) => livedDayShiftWindow(new Date(livedOf(m.at)), pattern))).toBe(false);
    expect(kept.length).toBeGreaterThan(0);
  });

  it("lowest priority: a work day with BEFORE_SHIFT, SHIFT_DONE and WAKE keeps those and drops it; other kinds are unchanged", async () => {
    expect(KIND_PRIORITY).toEqual(["BEFORE_SHIFT", "SHIFT_DONE", "TASK_DUE", "WAKE", "WINDOW_OPEN"]);
    const before = await buildBridgePlan(HOME, "", NOW);
    await saveEatingWindowSettings(window(), NOW);
    const after = await buildBridgePlan(HOME, "", NOW);
    expect(others(after)).toEqual(others(before));
    const full = new Map<number, number>();
    for (const m of before.moments) full.set(livedOf(m.at), (full.get(livedOf(m.at)) ?? 0) + 1);
    const fullDays = [...full].filter(([, n]) => n === 3).map(([d]) => d);
    expect(fullDays.length).toBeGreaterThan(0);
    for (const m of opens(after)) expect(fullDays).not.toContain(livedOf(m.at));
    // And it does fire on his rotation: days off and recovery days have room.
    expect(opens(after).length).toBeGreaterThan(0);
  });

  it("across the November DST change, openings stay on the wall clock", async () => {
    const oct = at(20, 12, 0, 9);
    vi.setSystemTime(oct);
    await saveEatingWindowSettings(window(), oct);
    const moments = opens(await buildBridgePlan(HOME, "", oct));
    const around = moments.filter((m) => m.at > at(30, 0, 0, 9).getTime() && m.at < at(4, 0).getTime());
    expect(around.length).toBeGreaterThan(0);
    for (const m of around) expect(new Date(m.at).getMinutes()).toBe(0);
    for (const m of around) expect([12, 13, 14]).toContain(new Date(m.at).getHours());
  });
});
