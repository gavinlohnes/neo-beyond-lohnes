import { afterEach, describe, expect, it, vi } from "vitest";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getAllRecords } from "../../src/application/personalRecordQueries";
import { getStrengthCurve, getTrainingGrid } from "../../src/application/viewQueries";
import { formatLocalDate } from "../../src/engine/scheduledContext";

/** VIEWS-001: the strength curve marks PRs by the RECORDS rule; the grid covers 84 days ending today. */

afterEach(() => {
  vi.useRealTimers();
});

async function session(at: Date, weight: number, type: "STANDARD" | "RECOVERY" = "STANDARD", finish = true) {
  vi.setSystemTime(at);
  const day = await startDay();
  const s = await startWorkout(day.id, type === "RECOVERY" ? null : "A", type, { overrideConfirmed: true });
  if (type !== "RECOVERY") {
    await logSet(day.id, s.id, "machine-chest-press", 1, weight, 10);
    await logSet(day.id, s.id, "machine-chest-press", 2, weight - 10, 10);
  }
  if (finish) await completeWorkout(day.id, s.id, type, "COMPLETED", type === "RECOVERY" ? 20 : 45);
  return s;
}

describe("VIEWS-001", () => {
  it("one point per finished session (its heaviest set), PR sessions marked as RECORDS marks them", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await session(new Date(2026, 8, 1, 10), 100);
    await session(new Date(2026, 8, 3, 10), 110);
    await session(new Date(2026, 8, 5, 10), 105);
    await session(new Date(2026, 8, 7, 10), 120, "STANDARD", false); // unfinished: left out
    const curve = await getStrengthCurve("machine-chest-press");
    expect(curve.map((p) => p.topWeight)).toEqual([100, 110, 105]);
    const records = (await getAllRecords()).filter((r) => r.exerciseId === "machine-chest-press");
    expect(curve.filter((p) => p.pr).map((p) => p.sessionId).sort()).toEqual([...new Set(records.map((r) => r.sessionId))].sort());
    expect(curve[1]!.pr).toBe(true);
    expect(await getStrengthCurve("leg-press")).toEqual([]);
  });

  it("a set done as a substitute movement isn't this lift's (the RECORDS rule)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await session(new Date(2026, 8, 1, 10), 100);
    vi.setSystemTime(new Date(2026, 8, 3, 10));
    const day = await startDay();
    const sub = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    await logSet(day.id, sub.id, "machine-chest-press", 1, 200, 10, "Dumbbell Press");
    await completeWorkout(day.id, sub.id, "STANDARD", "COMPLETED", 45);
    await session(new Date(2026, 8, 5, 10), 105);
    const curve = await getStrengthCurve("machine-chest-press");
    expect(curve.map((p) => [p.topWeight, p.pr])).toEqual([
      [100, false],
      [105, true],
    ]);
  });

  it("the grid is 84 days ending today: strength, recovery, or none", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const today = new Date(2026, 9, 14, 12);
    await session(new Date(2026, 9, 14, 9), 100);
    await session(new Date(2026, 9, 12, 9), 100, "RECOVERY");
    await session(new Date(2026, 6, 1, 9), 100); // older than 12 weeks
    vi.setSystemTime(today);
    const grid = await getTrainingGrid(today);
    expect(grid).toHaveLength(84);
    expect(grid[83]).toEqual({ date: formatLocalDate(today), kind: "STRENGTH" });
    expect(grid[81]!.kind).toBe("RECOVERY");
    expect(grid.filter((d) => d.kind !== "NONE")).toHaveLength(2);
    expect(grid[0]!.date).toBe(formatLocalDate(new Date(2026, 6, 23)));
  });
});
