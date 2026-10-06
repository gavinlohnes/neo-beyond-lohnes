import { afterEach, describe, expect, it, vi } from "vitest";
import { logSleep, startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { deriveReportTiming, getReport, getReportTiming } from "../../src/application/reportQueries";
import { describeReportItem } from "../../src/ui/screens/report/reportCopy";
import { db } from "../../src/persistence/db";

/**
 * REPORT-001. The default schedule (DEFAULT_SCHEDULE_PATTERN) works Mon Oct 12 and Tue Oct 13
 * 2026 (a block), is off Wed 14 / Thu 15, works Fri 16 – Sun 18; the block before is Wed Oct 7 –
 * Thu Oct 8.
 */

afterEach(() => {
  vi.useRealTimers();
});

async function session(at: Date, exerciseId: string, weight: number) {
  vi.setSystemTime(at);
  const day = await startDay();
  const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, s.id, exerciseId, 1, weight, 10);
  await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED", 45);
  return day;
}

describe("deriveReportTiming", () => {
  const workOn = (d: Date) => [1, 2].includes(d.getDay()); // Mon/Tue
  it("BRIEFING on a work night 0200–0459 only", () => {
    expect(deriveReportTiming(new Date(2026, 9, 13, 2, 0), workOn, null)).toBe("BRIEFING"); // Mon night
    expect(deriveReportTiming(new Date(2026, 9, 13, 4, 59), workOn, null)).toBe("BRIEFING");
    expect(deriveReportTiming(new Date(2026, 9, 13, 5, 0), workOn, null)).toBe(null);
    expect(deriveReportTiming(new Date(2026, 9, 13, 1, 59), workOn, null)).toBe(null);
    expect(deriveReportTiming(new Date(2026, 9, 12, 3, 0), workOn, null)).toBe(null); // Sun night: off
    expect(deriveReportTiming(new Date(2026, 9, 13, 15, 0), workOn, null)).toBe(null); // Tue afternoon: a work day
  });

  it("AFTER_ACTION on the first day off after a block, not the second", () => {
    expect(deriveReportTiming(new Date(2026, 9, 14, 9), workOn, null)).toBe("AFTER_ACTION"); // Wed
    expect(deriveReportTiming(new Date(2026, 9, 15, 9), workOn, null)).toBe(null); // Thu
    expect(deriveReportTiming(new Date(2026, 9, 13, 9), workOn, null)).toBe(null); // Tue: a work day
    // Last night declared WORK (the active day still holding it at 9am) doesn't hide it.
    expect(deriveReportTiming(new Date(2026, 9, 14, 9), workOn, "WORK")).toBe("AFTER_ACTION");
    // A night declared OFF wasn't worked: no line.
    expect(deriveReportTiming(new Date(2026, 9, 14, 9), workOn, "OFF")).toBe(null);
    expect(deriveReportTiming(new Date(2026, 9, 13, 3), workOn, "OFF")).toBe(null);
  });
});

describe("getReport", () => {
  it("five items at most: this block vs last, what moved, what stalled, what's coming, one call", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await session(new Date(2026, 8, 1, 10), "leg-press", 200); // first leg press: 6 weeks back
    await session(new Date(2026, 9, 7, 10), "machine-chest-press", 100); // last block
    const d1 = await session(new Date(2026, 9, 12, 10), "machine-chest-press", 110); // this block: a PR
    await logSleep(d1.id, 300, "PRIMARY");
    await session(new Date(2026, 9, 13, 10), "leg-press", 200); // this block: leg press, no PR since Sep 1

    const now = new Date(2026, 9, 14, 9);
    vi.setSystemTime(now);
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    expect(await getReportTiming(now)).toBe("AFTER_ACTION");

    const before = await db.events.count();
    const report = await getReport(now);
    expect(await db.events.count()).toBe(before); // read only
    expect(report.items.map((i) => i.kind)).toEqual(["BLOCK", "MOVED", "STALLED", "COMING", "CALL"]);
    const copy = report.items.map(describeReportItem);
    expect(copy[0]!.lines[0]).toBe("This block (Mon, Oct 12 – Tue, Oct 13, 2 shifts): 2 sessions, 2 sets, avg sleep 5h");
    expect(copy[0]!.lines[1]).toBe("Last block (Wed, Oct 7 – Thu, Oct 8): 1 session, 1 set");
    expect(copy[1]!.lines).toEqual(["1 PR: Machine Chest Press 110 lb × 10"]);
    expect(copy[2]!.lines).toEqual(["Leg Press: no PR since Tue, Sep 1"]);
    expect(copy[3]!.lines).toEqual(["Next block: Fri, Oct 16 – Sun, Oct 18 (3 shifts)"]);
    expect(copy[4]!.lines).toEqual(["Consider a lighter week on Leg Press."]);
    // Deterministic: the same data and time give the same report.
    expect(await getReport(now)).toEqual(report);
  });

  it("with nothing stalled, low sleep gives the sleep call; with neither, no call", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const d = await session(new Date(2026, 9, 12, 10), "machine-chest-press", 100);
    await logSleep(d.id, 300, "PRIMARY");
    const now = new Date(2026, 9, 14, 9);
    vi.setSystemTime(now);
    const report = await getReport(now);
    const call = report.items.find((i) => i.kind === "CALL");
    expect(call && describeReportItem(call).lines).toEqual(["Consider protecting sleep before the next block."]);
    expect(report.items.find((i) => i.kind === "STALLED")).toBeUndefined();
  });
});
