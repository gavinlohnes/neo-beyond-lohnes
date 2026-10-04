import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DaySummary } from "../../src/engine/dayLedger";
import {
  MEASURES,
  finishedLivedDays,
  groupLivedDays,
  inLivedDayWindow,
  livedDayBoundary,
  quantile,
  series,
} from "../../src/engine/livedDaySeries";

/**
 * FOUNDATION-A-F1: the lived-day series primitive. Mon Oct 12 2026 09:00
 * local is "now", so the lived day in progress began Sun Oct 11 16:30.
 */
const NOW = new Date(2026, 9, 12, 9, 0);
const start = (back: number) => new Date(2026, 9, 11 - back, 16, 30, 0, 0).toISOString();

function summary(id: string, livedDayStart: string, partial: Partial<DaySummary> = {}): DaySummary {
  return {
    beyondDayId: id,
    startedAt: livedDayStart,
    livedDayStart,
    work: { declared: "OFF", scheduled: "OFF" },
    sleep: {},
    workouts: [],
    urges: [],
    cleanDay: false,
    burden: { manualEntries: 0, corrections: 0, trainingSets: 0 },
    ...partial,
  };
}

const work = { declared: "WORK", scheduled: "WORK" } as const;
const unknown = { declared: "UNKNOWN", scheduled: "WORK" } as const;

describe("groupLivedDays", () => {
  it("keys lived days by their 16:30 start and takes the kind from the declared context, never the schedule", () => {
    const days = groupLivedDays([
      summary("a", start(1), { work }),
      summary("b", start(2)),
      summary("c", start(3), { work: unknown }),
    ]);
    expect(days.get(start(1))!.kind).toBe("WORK");
    expect(days.get(start(2))!.kind).toBe("OFF");
    expect(days.get(start(3))!.kind).toBe("UNKNOWN");
  });

  it("combines two BeyondDays in one lived day: WORK if either is, and both records kept", () => {
    const days = groupLivedDays([summary("a", start(1)), summary("b", start(1), { work })]);
    expect(days.size).toBe(1);
    expect(days.get(start(1))!.kind).toBe("WORK");
    expect(days.get(start(1))!.records.map((r) => r.beyondDayId)).toEqual(["a", "b"]);
  });
});

describe("finishedLivedDays", () => {
  it("never includes the lived day in progress, and back-to-back windows never overlap", () => {
    const period = finishedLivedDays(NOW, 0, 7);
    const baseline = finishedLivedDays(NOW, 7, 56);
    expect(period.to.toISOString()).toBe(start(0));
    expect(inLivedDayWindow(start(0), period)).toBe(false);
    expect(inLivedDayWindow(start(1), period)).toBe(true);
    expect(inLivedDayWindow(start(7), period)).toBe(true);
    expect(inLivedDayWindow(start(8), period)).toBe(false);
    expect(baseline.to.getTime()).toBe(period.from.getTime());
    expect(inLivedDayWindow(start(8), baseline)).toBe(true);
    expect(inLivedDayWindow(start(63), baseline)).toBe(true);
    expect(inLivedDayWindow(start(64), baseline)).toBe(false);
  });

  it("keeps every boundary at 16:30 local, across a daylight-saving change", () => {
    const later = new Date(2026, 10, 20, 9, 0);
    for (const back of [0, 7, 30, 63]) {
      const b = livedDayBoundary(new Date(2026, 10, 19, 16, 30), back);
      expect([b.getHours(), b.getMinutes()]).toEqual([16, 30]);
    }
    const w = finishedLivedDays(later, 7, 56);
    expect([w.from.getHours(), w.from.getMinutes()]).toEqual([16, 30]);
  });
});

describe("measures — a day counts only when it was really logged", () => {
  const day = (partial: Partial<DaySummary>, extra: Partial<DaySummary>[] = []) =>
    groupLivedDays([summary("a", start(1), partial), ...extra.map((p, i) => summary(`x${i}`, start(1), p))]).get(start(1))!;

  it("main sleep: any main-sleep log counts; split sleep adds up; naps don't count", () => {
    expect(MEASURES.MAIN_SLEEP.read(day({ sleep: { primaryMinutes: 300 } }, [{ sleep: { primaryMinutes: 90 } }]))).toBe(390);
    expect(MEASURES.MAIN_SLEEP.read(day({ sleep: { napMinutes: 40 } }))).toBeUndefined();
  });

  it("water: 2+ entries, or one entry of 40 oz or more; a lone small entry doesn't count", () => {
    expect(MEASURES.WATER.read(day({ waterOz: 8, entryCounts: { water: 1, food: 0 } }))).toBeUndefined();
    expect(MEASURES.WATER.read(day({ waterOz: 39, entryCounts: { water: 1, food: 0 } }))).toBeUndefined();
    expect(MEASURES.WATER.read(day({ waterOz: 40, entryCounts: { water: 1, food: 0 } }))).toBe(40);
    expect(MEASURES.WATER.read(day({ waterOz: 16, entryCounts: { water: 2, food: 0 } }))).toBe(16);
    expect(MEASURES.WATER.read(day({}))).toBeUndefined();
  });

  it("protein: 2+ food entries; one logged meal isn't a day's eating", () => {
    expect(MEASURES.PROTEIN.read(day({ proteinG: 45, entryCounts: { water: 0, food: 1 } }))).toBeUndefined();
    expect(MEASURES.PROTEIN.read(day({ proteinG: 95, entryCounts: { water: 0, food: 2 } }))).toBe(95);
  });
});

describe("series", () => {
  it("returns only qualifying days of the asked kind in the window, oldest first — never a zero for a gap", () => {
    const days = groupLivedDays([
      summary("w1", start(3), { work, sleep: { primaryMinutes: 330 } }),
      summary("w2", start(1), { work, sleep: { primaryMinutes: 360 } }),
      summary("w3", start(2), { work }), // worked, no sleep logged
      summary("o1", start(4), { sleep: { primaryMinutes: 480 } }),
      summary("u1", start(5), { work: unknown, sleep: { primaryMinutes: 200 } }),
      summary("now", start(0), { work, sleep: { primaryMinutes: 100 } }), // in progress
    ]);
    const window = finishedLivedDays(NOW, 0, 7);
    expect(series(days, MEASURES.MAIN_SLEEP, window, "WORK").map((p) => p.value)).toEqual([330, 360]);
    expect(series(days, MEASURES.MAIN_SLEEP, window, "OFF").map((p) => p.value)).toEqual([480]);
    expect(series(days, MEASURES.MAIN_SLEEP, window).map((p) => p.value)).toEqual([200, 480, 330, 360]);
  });
});

describe("quantile", () => {
  it("interpolates between order statistics, by hand", () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4], 0.75)).toBe(3.25);
    expect(quantile([7], 0.25)).toBe(7);
    expect(quantile([10, 20, 30, 40, 50], 0.5)).toBe(30);
  });
});

describe("boundaries", () => {
  it("the Engine's decision code imports neither lived-day module", () => {
    const evaluate = readFileSync("src/engine/evaluate.ts", "utf8");
    expect(evaluate).not.toMatch(/livedDaySeries|personalBaselines/);
    const capacity = readFileSync("src/engine/capacity.ts", "utf8");
    expect(capacity).not.toMatch(/livedDaySeries|personalBaselines/);
  });
});
