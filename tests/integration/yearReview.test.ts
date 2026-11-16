import { describe, expect, it } from "vitest";
import { monthDays, type MonthDay } from "../../src/application/monthQueries";
import { deriveYearReview, type YearInput, type YearMonthInput } from "../../src/application/yearReview";
import type { DaySummary } from "../../src/engine/dayLedger";
import type { SleepRhythm } from "../../src/engine/sleepRhythm";
import type { Experiment } from "../../src/application/tryExperiment";

/** YEAR-REVIEW-001. Invented years only; local dates throughout, so it reads the same under UTC and America/Chicago. */
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
/** A month with `logged` days recorded from the 1st: work on odd days, `sleep` minutes, `protein` g, `workouts` on day 1. */
function month(y: number, m: number, logged: number, p: { sleep?: number; protein?: number; workouts?: number; rhythm?: number } = {}): YearMonthInput {
  const days: MonthDay[] = [];
  for (let d = new Date(y, m, 1); d.getMonth() === m; d.setDate(d.getDate() + 1)) {
    const n = d.getDate(), on = n <= logged;
    days.push({ date: iso(y, m, n), dayId: on ? `d${m}-${n}` : undefined, work: on ? (n % 2 ? "WORK" : "OFF") : undefined,
      sleepMinutes: on ? p.sleep : undefined, proteinG: on ? p.protein : undefined, workouts: on && n === 1 ? (p.workouts ?? 0) : 0, urges: 0, clean: false });
  }
  const rhythm: SleepRhythm | null = p.rhythm === undefined ? null
    : { nights: [], groups: [{ kind: "WORK", nights: 5, start: p.rhythm - 200, end: p.rhythm + 200, midpoint: p.rhythm, spread: 20 }], offMinusWork: null, axisStart: 0 };
  return { month: m, days, rhythm };
}
const year = (y: number, now: Date, months: YearMonthInput[], extra: Partial<YearInput> = {}): YearInput => {
  const all = Array.from({ length: 12 }, (_, m) => months.find((x) => x.month === m) ?? month(y, m, 0));
  return { year: y, now, months: all, energy: new Map(), notes: [], people: [], experiments: [], ...extra };
};
const lines = (r: ReturnType<typeof deriveYearReview>, id: string) => r.cards.find((c) => c.id === id)?.lines;

describe("YOUR YEAR IN BEYOND", () => {
  it("says so when nothing was recorded, and counts no months", () => {
    const r = deriveYearReview(year(2026, new Date(2026, 10, 15), []));
    expect(r.title).toBe("2026, so far");
    expect(r.counted).toBe(0);
    expect(r.cards).toEqual([{ id: "MONTH", title: "2026, so far", lines: ["Nothing was recorded this year."] }]);
    expect(r.months.filter((m) => m.status === "AHEAD").map((m) => m.name)).toEqual(["December"]);
  });

  it("only thin months: nothing added up, each one named", () => {
    const r = deriveYearReview(year(2026, new Date(2026, 10, 15), [month(2026, 2, 3, { sleep: 400 })]));
    expect(r.counted).toBe(0);
    expect(lines(r, "MONTH")).toEqual(["No month had at least 7 logged days yet, so there is nothing to add up.", "Too little to count: March (3 days)."]);
  });

  it("a partial year: thin months left out of every figure, highs, lows and a trend from the counted months", () => {
    const r = deriveYearReview(year(2026, new Date(2026, 5, 15), [
      month(2026, 0, 10, { sleep: 400, protein: 120, workouts: 2, rhythm: 300 }),
      month(2026, 1, 3, { sleep: 600, protein: 300, workouts: 9, rhythm: 900 }), // thin: must not show anywhere
      month(2026, 2, 10, { sleep: 420, protein: 130, workouts: 4, rhythm: 320 }),
      month(2026, 4, 10, { sleep: 450, protein: 140, workouts: 3, rhythm: 360 }),
      month(2026, 5, 8, { sleep: 480, protein: 150, workouts: 5, rhythm: 400 }),
    ], {
      notes: [{ dayId: "d0-1", text: "#nap with [[Sam]]" }, { dayId: "d2-2", text: "#nap" }, { dayId: "d1-1", text: "#thin [[Sam]]" }],
      people: ["Sam"],
      experiments: [
        { what: "Earlier dinner", days: 14, entry: { status: "REVIEWED", reviewedAt: new Date(2026, 2, 20, 9).toISOString(), outcome: "Slept longer" } } as unknown as Experiment,
        { what: "In a thin month", days: 7, entry: { status: "REVIEWED", reviewedAt: new Date(2026, 1, 2, 9).toISOString(), outcome: "x" } } as unknown as Experiment,
      ],
    }));
    expect(r.title).toBe("2026, so far");
    expect(r.counted).toBe(4);
    expect(r.months.map((m) => m.status)).toEqual(["COUNTED", "THIN", "COUNTED", "EMPTY", "COUNTED", "COUNTED", "AHEAD", "AHEAD", "AHEAD", "AHEAD", "AHEAD", "AHEAD"]);
    expect(r.cards.map((c) => c.id)).toEqual(["MONTH", "SLEEP", "TRAINING", "TAGS", "PEOPLE", "EXPERIMENTS"]);
    expect(lines(r, "MONTH")).toEqual([
      "Counted 4 months of 6: 38 logged days (19 work days, 19 days off).",
      "Left out, too little logged (under 7 days): February (3 days).",
      "Sleep, on 38 logged days: 7h 15m on average.",
      "Highest month: Jun (8h 00m). Lowest: Jan (6h 40m).",
      "Trend: sleep higher in the last 2 of these months against the first 2 (6h 50m → 7h 45m).",
      "Protein, on 38 logged days: 134 g on average.",
      "Highest month: Jun (150 g). Lowest: Jan (120 g).",
      "Trend: protein higher in the last 2 of these months against the first 2 (125 g → 145 g).",
    ]);
    expect(lines(r, "SLEEP")).toEqual([
      "Work-day main sleep was timed in 4 months (20 Garmin-timed nights).",
      "Its middle was latest in Jun (06:40) and earliest in Jan (05:00).",
      "Trend: its middle moved 70 minutes later, the last 2 timed months against the first 2.",
    ]);
    expect(lines(r, "TRAINING")).toEqual([
      "14 workouts on 4 days; 3.5 a month across 4 counted months.",
      "Highest month: Jun (5). Lowest: Jan (2).",
      "Trend: workouts a month about the same, the last 2 of these months against the first 2 (3 → 4).",
    ]);
    expect(lines(r, "TAGS")).toEqual(["#nap: 2 days, in 2 months"]);
    expect(lines(r, "PEOPLE")).toEqual(["[[Sam]]: 1 day, in 1 month"]);
    expect(lines(r, "EXPERIMENTS")).toEqual(["Earlier dinner (14 days): Slept longer"]);
  });

  it("fewer than four months: highs and lows but no trend; one month: no highs or lows", () => {
    const two = deriveYearReview(year(2025, new Date(2026, 0, 3), [month(2025, 9, 9, { sleep: 400 }), month(2025, 10, 9, { sleep: 430 })]));
    expect(two.title).toBe("2025");
    expect(two.months.some((m) => m.status === "AHEAD")).toBe(false);
    expect(lines(two, "MONTH")).toContain("No trend from 2 months; it needs 4.");
    const one = deriveYearReview(year(2025, new Date(2026, 0, 3), [month(2025, 9, 9, { sleep: 400 })]));
    expect(lines(one, "MONTH")!.some((l) => l.startsWith("Highest"))).toBe(false);
  });

  it("year boundary: a lived day belongs to the local calendar day it starts on, as MONTH reads it", () => {
    const summary = (start: Date, id: string) => ({ beyondDayId: id, livedDayStart: start.toISOString(), sleep: { primaryMinutes: 420 }, work: { declared: "WORK" }, workouts: [], urges: [], cleanDay: false }) as unknown as DaySummary;
    const summaries = [summary(new Date(2025, 11, 31, 23, 30), "eve"), summary(new Date(2026, 0, 1, 0, 30), "new")];
    expect(monthDays(summaries, 2025, 11).filter((d) => d.dayId).map((d) => [d.date, d.dayId])).toEqual([["2025-12-31", "eve"]]);
    expect(monthDays(summaries, 2026, 0).filter((d) => d.dayId).map((d) => [d.date, d.dayId])).toEqual([["2026-01-01", "new"]]);
    // An experiment closed just after local midnight on New Year's Day is next year's.
    const exp = { what: "New year", days: 7, entry: { status: "REVIEWED", reviewedAt: new Date(2026, 0, 1, 0, 30).toISOString(), outcome: "ok" } } as unknown as Experiment;
    const in2026 = deriveYearReview(year(2026, new Date(2026, 1, 10), [month(2026, 0, 9)], { experiments: [exp] }));
    const in2025 = deriveYearReview(year(2025, new Date(2026, 1, 10), [month(2025, 11, 9)], { experiments: [exp] }));
    expect(lines(in2026, "EXPERIMENTS")).toEqual(["New year (7 days): ok"]);
    expect(lines(in2025, "EXPERIMENTS")).toBeUndefined();
  });
});
