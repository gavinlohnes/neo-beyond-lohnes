import { describe, expect, it } from "vitest";
import type { DaySummary } from "../../src/engine/dayLedger";
import {
  BASELINE_ORDER,
  MIN_BASELINE_DAYS,
  MIN_PERIOD_DAYS,
  projectPersonalBaselines,
  type PersonalBaseline,
} from "../../src/engine/personalBaselines";

/**
 * FOUNDATION-A-F1: personal baselines. "Now" is Mon Oct 12 2026 09:00, so the
 * period is the lived days 1–7 back and the baseline 8–63 back.
 */
const NOW = new Date(2026, 9, 12, 9, 0);
const start = (back: number) => new Date(2026, 9, 11 - back, 16, 30, 0, 0).toISOString();

let n = 0;
function summary(back: number, kind: "WORK" | "OFF" | "UNKNOWN", partial: Partial<DaySummary> = {}): DaySummary {
  const livedDayStart = start(back);
  return {
    beyondDayId: `d${++n}`,
    startedAt: livedDayStart,
    livedDayStart,
    work: { declared: kind, scheduled: "OFF" },
    sleep: {},
    workouts: [],
    urges: [],
    cleanDay: false,
    burden: { manualEntries: 0, corrections: 0, trainingSets: 0 },
    ...partial,
  };
}

const sleep = (back: number, kind: "WORK" | "OFF" | "UNKNOWN", minutes: number) => summary(back, kind, { sleep: { primaryMinutes: minutes } });

/** `count` baseline days of a kind (8, 10, 12… lived days back), values from `values` in turn. */
function baselineSleep(kind: "WORK" | "OFF", count: number, values: number[], firstBack = 8): DaySummary[] {
  return Array.from({ length: count }, (_, i) => sleep(firstBack + i * 2, kind, values[i % values.length]!));
}

function reading(all: PersonalBaseline[], measure: string, dayKind: string): PersonalBaseline {
  return all.find((b) => b.measure === measure && b.dayKind === dayKind)!;
}

describe("projectPersonalBaselines", () => {
  it("one reading per measure and kind, in display order", () => {
    const all = projectPersonalBaselines([], NOW);
    expect(all.map((b) => [b.measure, b.dayKind])).toEqual(BASELINE_ORDER);
    expect(all.every((b) => b.kind === "LEARNING")).toBe(true);
  });

  it("keeps work days and days off apart in both directions", () => {
    const history = [
      ...baselineSleep("WORK", 12, [340, 350, 360, 370, 380]),
      ...baselineSleep("OFF", 12, [460, 470, 480, 490, 500], 9),
      sleep(1, "WORK", 300),
      sleep(3, "WORK", 310),
      sleep(2, "OFF", 480),
      sleep(4, "OFF", 470),
    ];
    const all = projectPersonalBaselines(history, NOW);
    const workSleep = reading(all, "MAIN_SLEEP", "WORK");
    const offSleep = reading(all, "MAIN_SLEEP", "OFF");
    expect(workSleep).toMatchObject({ kind: "COMPARED", verdict: "BELOW", periodDays: 2, baselineDays: 12 });
    expect(offSleep).toMatchObject({ kind: "COMPARED", verdict: "INSIDE", periodDays: 2, baselineDays: 12 });
    if (workSleep.kind !== "COMPARED" || offSleep.kind !== "COMPARED") throw new Error("expected comparisons");
    expect(workSleep.high).toBeLessThan(400);
    expect(offSleep.low).toBeGreaterThan(440);
  });

  it("says it's still learning below the floor, with progress, and shows no range", () => {
    const nine = projectPersonalBaselines([...baselineSleep("WORK", MIN_BASELINE_DAYS - 1, [360]), sleep(1, "WORK", 360), sleep(2, "WORK", 360)], NOW);
    expect(reading(nine, "MAIN_SLEEP", "WORK")).toEqual({ kind: "LEARNING", measure: "MAIN_SLEEP", dayKind: "WORK", have: 9, need: 10 });
    const ten = projectPersonalBaselines([...baselineSleep("WORK", MIN_BASELINE_DAYS, [360]), sleep(1, "WORK", 360), sleep(2, "WORK", 360)], NOW);
    expect(reading(ten, "MAIN_SLEEP", "WORK").kind).toBe("COMPARED");
  });

  it("with a usual range but too few days this week, it compares nothing", () => {
    const all = projectPersonalBaselines([...baselineSleep("WORK", 12, [360]), sleep(1, "WORK", 200)], NOW);
    expect(MIN_PERIOD_DAYS).toBe(2);
    expect(reading(all, "MAIN_SLEEP", "WORK")).toMatchObject({ kind: "NOT_THIS_WEEK", periodDays: 1, baselineDays: 12 });
  });

  it("days with nothing logged are missing, not zeros, and UNKNOWN days count for neither kind", () => {
    const history = [
      ...baselineSleep("WORK", 9, [360]),
      summary(30, "WORK"), // worked, slept unlogged
      summary(32, "WORK"),
      sleep(34, "UNKNOWN", 360),
      sleep(36, "UNKNOWN", 360),
    ];
    expect(reading(projectPersonalBaselines(history, NOW), "MAIN_SLEEP", "WORK")).toMatchObject({ kind: "LEARNING", have: 9 });
    expect(reading(projectPersonalBaselines(history, NOW), "MAIN_SLEEP", "OFF")).toMatchObject({ kind: "LEARNING", have: 0 });
  });

  it("the week being judged is never part of its own usual, and the lived day in progress is never judged", () => {
    const base = baselineSleep("WORK", 12, [340, 350, 360, 370, 380]);
    const calm = projectPersonalBaselines([...base, sleep(1, "WORK", 360), sleep(2, "WORK", 360)], NOW);
    const extreme = projectPersonalBaselines([...base, sleep(1, "WORK", 900), sleep(2, "WORK", 900), sleep(0, "WORK", 10)], NOW);
    const a = reading(calm, "MAIN_SLEEP", "WORK");
    const b = reading(extreme, "MAIN_SLEEP", "WORK");
    if (a.kind !== "COMPARED" || b.kind !== "COMPARED") throw new Error("expected comparisons");
    expect([b.low, b.high]).toEqual([a.low, a.high]);
    expect(b).toMatchObject({ period: 900, periodDays: 2, verdict: "ABOVE" });
  });

  it("an outlier night barely moves the usual range", () => {
    const steady = [330, 340, 345, 350, 355, 360, 365, 370, 375, 380, 390];
    const without = reading(projectPersonalBaselines([...baselineSleep("WORK", 11, steady), sleep(1, "WORK", 360), sleep(2, "WORK", 360)], NOW), "MAIN_SLEEP", "WORK");
    const withOutlier = reading(
      projectPersonalBaselines([...baselineSleep("WORK", 11, steady), sleep(40, "WORK", 840), sleep(1, "WORK", 360), sleep(2, "WORK", 360)], NOW),
      "MAIN_SLEEP",
      "WORK",
    );
    if (without.kind !== "COMPARED" || withOutlier.kind !== "COMPARED") throw new Error("expected comparisons");
    expect(withOutlier.high - without.high).toBeLessThanOrEqual(10);
    expect(withOutlier.verdict).toBe("INSIDE");
  });

  it("a near-constant habit gets the minimum width, so one small difference isn't 'below'", () => {
    const history = [...Array.from({ length: 12 }, (_, i) => summary(8 + i * 2, "WORK", { waterOz: 64, entryCounts: { water: 3, food: 0 } }))];
    const period = [62, 66].map((oz, i) => summary(1 + i, "WORK", { waterOz: oz, entryCounts: { water: 2, food: 0 } }));
    const water = reading(projectPersonalBaselines([...history, ...period], NOW), "WATER", "WORK");
    expect(water).toMatchObject({ kind: "COMPARED", low: 60, high: 68, period: 64, verdict: "INSIDE" });
  });

  it("judges on the same rounded numbers the screen shows", () => {
    // Baseline P25 is 352.5 min → shown low rounds down to 350; a week at 351 shows as 350, which is inside.
    const history = [...baselineSleep("WORK", 12, [340, 350, 355, 360, 370, 380]), sleep(1, "WORK", 351), sleep(2, "WORK", 351)];
    const r = reading(projectPersonalBaselines(history, NOW), "MAIN_SLEEP", "WORK");
    if (r.kind !== "COMPARED") throw new Error("expected a comparison");
    expect(r.low % 5).toBe(0);
    expect(r.period % 5).toBe(0);
    expect(r.verdict).toBe(r.period < r.low ? "BELOW" : r.period > r.high ? "ABOVE" : "INSIDE");
  });

  it("water and protein count only really-logged days", () => {
    const water = (back: number, oz: number, entries: number) => summary(back, "OFF", { waterOz: oz, entryCounts: { water: entries, food: 0 } });
    const history = [
      ...Array.from({ length: 10 }, (_, i) => water(9 + i * 2, 64, 3)),
      water(40, 8, 1), // a lone small entry: doesn't count
      water(42, 48, 1), // one big bottle: counts
      water(2, 48, 1),
      water(4, 60, 2),
    ];
    expect(reading(projectPersonalBaselines(history, NOW), "WATER", "OFF")).toMatchObject({ kind: "COMPARED", baselineDays: 11, periodDays: 2 });
    const protein = [
      ...Array.from({ length: 12 }, (_, i) => summary(8 + i * 2, "WORK", { proteinG: 140, entryCounts: { water: 0, food: 1 } })),
    ];
    expect(reading(projectPersonalBaselines(protein, NOW), "PROTEIN", "WORK")).toMatchObject({ kind: "LEARNING", have: 0 });
  });

  it("is deterministic: same history in any order gives the same readings", () => {
    const history = [...baselineSleep("WORK", 12, [340, 360, 380]), sleep(1, "WORK", 300), sleep(3, "WORK", 320)];
    const once = projectPersonalBaselines(history, NOW);
    expect(projectPersonalBaselines([...history].reverse(), NOW)).toEqual(once);
    expect(projectPersonalBaselines(history, NOW)).toEqual(once);
  });
});
