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
    expect(copy[2]!.lines).toEqual(["Leg Press: heaviest set unchanged since Tue, Sep 1"]);
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

  it("with nothing stalled and sleep at or above six hours, makes no call", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const d = await session(new Date(2026, 9, 12, 10), "machine-chest-press", 100);
    await logSleep(d.id, 360, "PRIMARY");
    const now = new Date(2026, 9, 14, 9);
    vi.setSystemTime(now);

    const report = await getReport(now);

    expect(report.items.find((i) => i.kind === "STALLED")).toBeUndefined();
    expect(report.items.find((i) => i.kind === "CALL")).toBeUndefined();
  });
});

describe("getReport review fixes", () => {
  it("mid-block (a work night) the block runs on to its true end, and 'next block' is the one after", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await session(new Date(2026, 9, 16, 10), "machine-chest-press", 100);
    const now = new Date(2026, 9, 17, 3); // Sat 0300, inside the Fri 16 – Sun 18 block
    vi.setSystemTime(now);
    expect(await getReportTiming(now)).toBe("BRIEFING");
    const copy = (await getReport(now)).items.map(describeReportItem);
    expect(copy[0]!.lines[0]).toMatch(/^This block \(Fri, Oct 16 – Sun, Oct 18, 3 shifts\)/);
    expect(copy.find((c) => c.heading === "What's coming")!.lines).toEqual(["Next block: Wed, Oct 21 – Thu, Oct 22 (2 shifts)"]);
  });

  it("what moved includes a clean-day milestone reached in the block", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { saveQuitHabit, logCleanDay } = await import("../../src/application/quitCommands");
    vi.setSystemTime(new Date(2026, 9, 6, 9));
    await saveQuitHabit({ name: "Drinking" });
    for (let d = 7; d <= 13; d++) {
      vi.setSystemTime(new Date(2026, 9, d, 9));
      const day = await startDay();
      await logCleanDay(day.id);
    }
    const now = new Date(2026, 9, 14, 9);
    vi.setSystemTime(now);
    const moved = (await getReport(now)).items.find((i) => i.kind === "MOVED");
    expect(moved && describeReportItem(moved).lines).toEqual(["7 clean days"]);
  });

  it("a rep-only PR doesn't count as the heaviest set moving; a 0 lb lift is never stalled", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await session(new Date(2026, 8, 1, 10), "leg-press", 200);
    vi.setSystemTime(new Date(2026, 8, 3, 10));
    const d = await startDay();
    const s = await startWorkout(d.id, "A", "STANDARD", { overrideConfirmed: true });
    await logSet(d.id, s.id, "leg-press", 1, 200, 15); // most reps at 200: a REPS record, not heavier
    await completeWorkout(d.id, s.id, "STANDARD", "COMPLETED", 45);
    await session(new Date(2026, 9, 12, 10), "leg-press", 200);
    await session(new Date(2026, 8, 1, 11), "pec-deck", 0);
    await session(new Date(2026, 9, 13, 10), "pec-deck", 0);
    const now = new Date(2026, 9, 14, 9);
    vi.setSystemTime(now);
    const stalled = (await getReport(now)).items.find((i) => i.kind === "STALLED");
    expect(stalled && describeReportItem(stalled).lines).toEqual(["Leg Press: heaviest set unchanged since Tue, Sep 1"]);
  });
});
