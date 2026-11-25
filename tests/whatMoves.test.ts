import { afterEach, describe, expect, it, vi } from "vitest";
import { logSleep, startDay, voidSleepLog } from "../src/application/commands";
import { createHabit, setHabitAnswer } from "../src/application/habitCommands";
import { compareCauses, getWhatMovesDays, MIN_DAYS_A_SIDE, whatMovesDayFacts, type WhatMovesDay } from "../src/application/whatMoves";
import type { HabitAnswer } from "../src/domain/habits";
import { livedDayBoundary } from "../src/engine/livedDaySeries";
import { mostRecentBoundaryAtOrBefore } from "../src/engine/dayRollover";

/**
 * GRAYSON-WHAT-MOVES-001: habits, training and work days against next-day sleep, energy and resting heart rate, by
 * the Try-experiment Welch interval, 5 days a side. Run under TZ=UTC and TZ=America/Chicago (the DST case is real in
 * Chicago, a plain day in UTC: both must join the right next day).
 */
afterEach(() => { vi.useRealTimers(); });

const NOW = new Date(2026, 10, 24, 12);
const current = mostRecentBoundaryAtOrBefore(NOW);
/** The lived day `back` days before the current one. */
const dayStart = (back: number) => livedDayBoundary(current, back).toISOString();
type Row = Parameters<typeof whatMovesDayFacts>[0][number];
const row = (back: number, extra: Partial<Row> = {}): Row => ({ start: dayStart(back), dayIds: [`d${back}`], context: "UNKNOWN", sessions: 0, ...extra });

/** A finished day `back` days ago with its next-day values. */
const day = (back: number, extra: Partial<WhatMovesDay> = {}, next: WhatMovesDay["next"] = {}): WhatMovesDay =>
  ({ start: dayStart(back), habits: {}, trained: false, context: "UNKNOWN", next, ...extra });
const habits = [{ id: "h1", name: "stretching" }];

describe("GRAYSON-WHAT-MOVES-001 the next-day join", () => {
  it("joins the next lived day across the November DST change, and a gap leaves next-day values missing", () => {
    // Oct 30 to Nov 3 2026: Chicago falls back on Sunday Nov 1, a 25-hour lived day.
    const base = mostRecentBoundaryAtOrBefore(new Date(2026, 10, 4, 12));
    const at = (back: number) => livedDayBoundary(base, back).toISOString();
    const rows: Row[] = [5, 4, 3, 2, 0].map((back) => ({ start: at(back), dayIds: [`x${back}`], context: "UNKNOWN", sessions: 0, sleepHours: 6 + back / 10, energy: back % 5 + 1 }));
    const facts = whatMovesDayFacts(rows, new Map());
    expect(facts.map((f) => f.next.sleepMinutes === undefined ? null : Math.round(f.next.sleepMinutes))).toEqual([384, 378, 372, null, null]);
    expect(facts[0]!.next.energy).toBe(5);
    // Day 2's next day (1) is missing: a gap, never the next one recorded.
    expect(facts[3]!.next).toEqual({});
  });

  it("UNRECORDED habit days sit on neither side, and the latest answer on the lived day wins", () => {
    const answers = new Map<string, Map<string, HabitAnswer>>([
      ["d3", new Map([["h1", "DONE"]])], ["d2", new Map([["h1", "UNRECORDED"]])], ["d1", new Map([["h1", "NOT_DONE"]])],
    ]);
    const facts = whatMovesDayFacts([row(3), row(2), row(1)], answers);
    expect(facts.map((f) => f.habits.h1 ?? null)).toEqual(["DONE", null, "NOT_DONE"]);
  });
});

describe("GRAYSON-WHAT-MOVES-001 comparisons", () => {
  const planted = (withMinutes: number, withoutMinutes: number, spread: number, n = 8): WhatMovesDay[] => Array.from({ length: n * 2 }, (_, i) => {
    const did = i % 2 === 0;
    return day(i + 1, { habits: { h1: did ? "DONE" : "NOT_DONE" } }, { sleepMinutes: (did ? withMinutes : withoutMinutes) + ((i * 7) % 5 - 2) * spread });
  });

  it("fewer than 5 a side shows no line", () => {
    const four = planted(480, 420, 1, MIN_DAYS_A_SIDE - 1);
    const r = compareCauses(four, { now: NOW, window: 90, habits });
    expect([...r.clear, ...r.same, ...r.unsure].filter((l) => l.cause.id === "habit:h1")).toEqual([]);
  });

  it("a planted hour with low spread reads clear; equal means read the same; noisy data can't tell yet", () => {
    const clear = compareCauses(planted(480, 420, 2), { now: NOW, window: 90, habits });
    expect(clear.clear.find((l) => l.id === "habit:h1|SLEEP")).toMatchObject({ verdict: "up", nWith: 8, nWithout: 8 });
    expect(Math.abs(clear.clear[0]!.diff - 60)).toBeLessThan(3);
    const same = compareCauses(planted(450, 450, 2), { now: NOW, window: 90, habits });
    expect(same.same.find((l) => l.id === "habit:h1|SLEEP")?.verdict).toBe("same");
    const noisy = compareCauses(planted(470, 450, 60), { now: NOW, window: 90, habits });
    expect(noisy.unsure.find((l) => l.id === "habit:h1|SLEEP")?.verdict).toBe("unsure");
  });

  it("work against off uses only known contexts", () => {
    const days = Array.from({ length: 18 }, (_, i) => day(i + 1, { context: i < 6 ? "WORK" : i < 12 ? "OFF" : "UNKNOWN" }, { energy: i < 6 ? 2 : i < 12 ? 4 : 1 }));
    const line = compareCauses(days, { now: NOW, window: 90, habits: [] }).clear.find((l) => l.id === "work|ENERGY");
    expect(line).toMatchObject({ nWith: 6, nWithout: 6, verdict: "down" });
  });

  it("90, 180 and All change the days counted; the current lived day is never a cause day", () => {
    const days = [0, 10, 100, 200, 400].map((back) => day(back));
    expect(compareCauses(days, { now: NOW, window: 90, habits }).days).toBe(1);
    expect(compareCauses(days, { now: NOW, window: 180, habits }).days).toBe(2);
    expect(compareCauses(days, { now: NOW, window: "ALL", habits }).days).toBe(4);
  });

  it("a hidden line drops out of the lists and is kept apart", () => {
    const r = compareCauses(planted(480, 420, 2), { now: NOW, window: 90, habits, hidden: ["habit:h1|SLEEP"] });
    expect(r.clear.some((l) => l.id === "habit:h1|SLEEP")).toBe(false);
    expect(r.hidden.map((l) => l.id)).toEqual(["habit:h1|SLEEP"]);
  });
});

describe("GRAYSON-WHAT-MOVES-001 read from the records", () => {
  it("removed logs stay out, habit answers land on their lived day, and the window reads finished days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const habit = await createHabit({ name: "Stretching", kind: "ANY_DAY" });
    const base = mostRecentBoundaryAtOrBefore(new Date(2026, 10, 20, 12));
    const ids: string[] = [];
    for (let back = 3; back >= 0; back -= 1) {
      vi.setSystemTime(new Date(livedDayBoundary(base, back).getTime() + 2 * 3600_000));
      const d = await startDay();
      ids.push(d.id);
      await setHabitAnswer(habit.id, back % 2 ? "DONE" : "NOT_DONE", d.id);
    }
    const sleeps = [await logSleep(ids[1]!, 420), await logSleep(ids[2]!, 480)];
    await voidSleepLog(ids[2]!, sleeps[1]!);
    const now = new Date(livedDayBoundary(base, 0).getTime() + 5 * 3600_000);
    vi.setSystemTime(now);
    const { days, habits: active } = await getWhatMovesDays(now, 90);
    expect(active.map((h) => h.name)).toEqual(["Stretching"]);
    const first = days.find((d) => d.start === livedDayBoundary(base, 3).toISOString())!;
    expect(first.habits[habit.id]).toBe("DONE");
    expect(first.next.sleepMinutes).toBe(420);
    const second = days.find((d) => d.start === livedDayBoundary(base, 2).toISOString())!;
    expect(second.habits[habit.id]).toBe("NOT_DONE");
    expect(second.next.sleepMinutes).toBeUndefined();
  });
});
