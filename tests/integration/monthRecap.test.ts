import { describe, expect, it } from "vitest";
import { deriveMonthRecap, type RecapInput } from "../../src/application/monthRecap";
import type { MonthDay } from "../../src/application/monthQueries";
import type { Experiment } from "../../src/application/tryExperiment";
import type { SleepRhythm } from "../../src/engine/sleepRhythm";

/** BIG-IDEAS-001 item 6. Invented months only. */
const day = (n: number, p: Partial<MonthDay> = {}): MonthDay => ({ date: `2026-10-${String(n).padStart(2, "0")}`, dayId: `d${n}`, work: "OFF", workouts: 0, urges: 0, clean: false, sleepMinutes: 420, ...p });
const rhythm = (midpoint: number, nights = 6): SleepRhythm => ({ nights: [], groups: [{ kind: "WORK", nights, start: 450, end: 855, midpoint, spread: 20 }], offMinusWork: null, axisStart: 0 });
const base: RecapInput = {
  year: 2026, month: 9, now: new Date(2026, 10, 5),
  days: [
    day(1, { work: "WORK" }), day(2, { work: "WORK", workouts: 1 }), day(3), day(4, { workouts: 2 }),
    day(5, { work: "WORK" }), day(6, { work: "WORK" }), day(7, { work: "WORK" }), day(8, { dayId: undefined, work: undefined, sleepMinutes: undefined }),
  ],
  energy: new Map([["d1", 2], ["d2", 3], ["d5", 4], ["d6", 4], ["d7", 3]]),
  notes: [
    { dayId: "d3", text: "Walk with [[Sam]] #goodtalk #nap" },
    { dayId: "d4", text: "[[Sam]] again, and [[Dr Lee]] #goodtalk" },
    { dayId: "d6", text: "#nap after shift. [[Weekly plan]]" },
  ],
  people: ["Sam", "Dr Lee"],
  experiments: [
    { what: "No coffee after midnight", days: 14, entry: { status: "REVIEWED", reviewedAt: "2026-10-20T10:00:00.000Z", outcome: "Fell asleep faster", lesson: "Keep it" } } as unknown as Experiment,
    { what: "Older one", days: 7, entry: { status: "REVIEWED", reviewedAt: "2026-09-02T10:00:00.000Z", outcome: "x" } } as unknown as Experiment,
  ],
  rhythm: rhythm(660), previousRhythm: rhythm(620),
};

describe("YOUR MONTH IN BEYOND", () => {
  it("tells the month from records, card by card, each saying what it counts", () => {
    const r = deriveMonthRecap(base);
    expect(r.title).toBe("October 2026");
    expect(r.cards.map((c) => c.id)).toEqual(["MONTH", "BEST_RUN", "SLEEP", "TRAINING", "TAGS", "PEOPLE", "EXPERIMENTS"]);
    const card = (id: string) => r.cards.find((c) => c.id === id)!.lines;
    expect(card("MONTH")[0]).toMatch(/^You recorded 7 days/);
    expect(card("BEST_RUN")).toEqual(["Oct 5–Oct 7: 3 shifts. Check-in energy averaged 3.7 of 5 (3 days).", "The highest of 2 runs with at least 2 check-ins."]);
    expect(card("SLEEP")).toEqual(["On work days your main sleep usually ran 07:30–14:15 (6 Garmin-timed nights).", "Its middle was 40 minutes later than the month before (6 nights)."]);
    expect(card("TRAINING")).toEqual(["3 workouts on 2 days, 1 of them days off."]);
    expect(card("TAGS")).toEqual(["#goodtalk: 2 days", "#nap: 2 days"]);
    // Only names you keep in People count; [[Weekly plan]] is a page, not a person. Days, not mentions.
    expect(card("PEOPLE")).toEqual(["[[Sam]]: 2 days", "[[Dr Lee]]: 1 day"]);
    expect(card("EXPERIMENTS")).toEqual(["No coffee after midnight (14 days): Fell asleep faster. Lesson: Keep it"]);
  });

  it("leaves out what it can't support, and says when nothing was recorded", () => {
    const thin = deriveMonthRecap({ ...base, energy: new Map([["d1", 3]]), notes: [], people: [], experiments: [], rhythm: null, previousRhythm: null, days: base.days.map((d) => ({ ...d, workouts: 0 })) });
    expect(thin.cards.map((c) => c.id)).toEqual(["MONTH"]);
    const same = deriveMonthRecap({ ...base, previousRhythm: rhythm(655) });
    expect(same.cards.find((c) => c.id === "SLEEP")!.lines[1]).toBe("About the same as the month before (6 nights).");
    const empty = deriveMonthRecap({ ...base, days: [day(1, { dayId: undefined })] });
    expect(empty.cards).toEqual([{ id: "MONTH", title: "October 2026", lines: ["Nothing was recorded this month."] }]);
  });
});
