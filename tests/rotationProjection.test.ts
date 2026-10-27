import { describe, expect, it } from "vitest";
import { flipSummary, flips, groupRuns, nextDaysOff, nextForecastRun, runPositions } from "../src/application/rotationProjection";
import type { PictureRow } from "../src/application/wholePictureProjection";
import type { WeekAheadDay } from "../src/application/weekAheadQueries";

const row = (start: string, context: PictureRow["context"]) => ({ start, context, dayIds: [start] } as unknown as PictureRow);
const ahead = (date: string, work: "WORK" | "OFF"): WeekAheadDay => ({ date, work, shiftStartHour: null, suggestedTemplate: null, afterShift: false });

describe("ROTATION-001 — runs", () => {
  it("groups consecutive recorded contexts into runs, oldest first, with unknown days in their own run", () => {
    const runs = groupRuns([row("d1", "WORK"), row("d2", "WORK"), row("d3", "OFF"), row("d4", "UNKNOWN"), row("d5", "WORK")]);
    expect(runs.map((r) => [r.context, r.rows.map((x) => x.start)])).toEqual([
      ["WORK", ["d1", "d2"]], ["OFF", ["d3"]], ["UNKNOWN", ["d4"]], ["WORK", ["d5"]],
    ]);
    expect(groupRuns([])).toEqual([]);
  });

  it("finds the next predicted run after the one being lived, with its length", () => {
    const days = [ahead("2026-10-23", "WORK"), ahead("2026-10-24", "OFF"), ahead("2026-10-25", "OFF"), ahead("2026-10-26", "OFF"), ahead("2026-10-27", "WORK")];
    expect(nextForecastRun(days)).toEqual({ work: "OFF", from: "2026-10-24", days: 3 });
    expect(nextForecastRun([ahead("2026-10-23", "OFF"), ahead("2026-10-24", "WORK"), ahead("2026-10-25", "WORK")])).toEqual({ work: "WORK", from: "2026-10-24", days: 2 });
    expect(nextForecastRun([ahead("2026-10-23", "WORK")])).toBeNull();
    expect(nextForecastRun([])).toBeNull();
  });
});

const day = (start: string, context: PictureRow["context"], values: Partial<PictureRow> = {}) =>
  ({ start, context, dayIds: [start], sessions: 0, ambiguousSleep: false, ...values } as unknown as PictureRow);

describe("ROTATION-002 — run positions", () => {
  // Window opens inside a work run (w0), then two whole work runs and their days off.
  const rows = [
    day("w0", "WORK", { sleepHours: 3, energy: 1 }),
    day("o0", "OFF"),
    day("a1", "WORK", { sleepHours: 6, energy: 3, sleepWindow: { start: 900, end: 1260 } }), day("a2", "WORK", { sleepHours: 5, energy: 2, sessions: 1 }),
    day("x1", "OFF", { sleepHours: 9, energy: 4 }), day("x2", "OFF", { sessions: 1 }),
    day("b1", "WORK", { sleepHours: 7, energy: 4, sleepWindow: { start: 960, end: 1320 } }), day("b2", "WORK", { sleepHours: 4, energy: 2 }),
    day("y1", "OFF", { sleepHours: 8 }), day("y2", "OFF", { sessions: 1 }),
    day("u1", "UNKNOWN", { dayIds: [] } as Partial<PictureRow>),
    day("c1", "WORK", { sleepHours: 5, energy: 2, sleepWindow: { start: 870, end: 1200 } }),
  ];

  it("leaves out the run cut by the window, counts each place across runs and floors the means", () => {
    const places = runPositions(rows);
    expect(places.map((p) => `${p.context}:${p.position}:${p.rows.map((r) => r.start).join(",")}`)).toEqual([
      "WORK:1:a1,b1,c1", "WORK:2:a2,b2", "OFF:1:o0,x1,y1", "OFF:2:x2,y2",
    ]);
    const shift1 = places[0]!;
    expect(shift1.sleep).toEqual({ mean: 6, days: 3 });
    expect(shift1.energy).toEqual({ mean: 3, days: 3 });
    expect(shift1.timing).toEqual({ start: 900, end: 1260, days: 3 });
    // Two runs only: counts shown, no mean.
    expect(places[1]!.sleep).toEqual({ mean: undefined, days: 2 });
    expect(places[1]!.trained).toEqual({ days: 1, of: 2 });
    expect(places[3]!.trained).toEqual({ days: 2, of: 2 });
    // The cut first run (w0, 3 hours) never reaches shift 1.
    expect(shift1.rows.some((r) => r.start === "w0")).toBe(false);
  });

  it("keeps the first run whole when the window opens on an unknown stretch", () => {
    const places = runPositions([day("u", "UNKNOWN", { dayIds: [] } as Partial<PictureRow>), day("a", "WORK"), day("b", "WORK")]);
    expect(places.map((p) => `${p.context}:${p.position}`)).toEqual(["WORK:1", "WORK:2"]);
    expect(runPositions([])).toEqual([]);
  });

  it("forecasts the next days off, including a stretch already being lived", () => {
    expect(nextDaysOff([ahead("2026-10-27", "WORK"), ahead("2026-10-28", "OFF"), ahead("2026-10-29", "OFF"), ahead("2026-10-30", "WORK")]))
      .toEqual({ from: "2026-10-28", days: 2, now: false });
    expect(nextDaysOff([ahead("2026-10-27", "OFF"), ahead("2026-10-28", "WORK")])).toEqual({ from: "2026-10-27", days: 1, now: true });
    expect(nextDaysOff([ahead("2026-10-27", "WORK")])).toBeNull();
  });
});

describe("ROTATION-003 — flips", () => {
  const off = (start: string, values: Partial<PictureRow> = {}) => day(start, "OFF", values);
  const work = (start: string, values: Partial<PictureRow> = {}) => day(start, "WORK", values);
  const timed = (start: number) => ({ sleepWindow: { start, end: start + 300 } });

  it("finds flips both ways from recorded context, and an unknown day breaks a flip", () => {
    const found = flips([off("o1"), work("w1"), work("w2"), work("w3"), off("x1"), off("x2"), day("u", "UNKNOWN", { dayIds: [] } as Partial<PictureRow>), work("v1")]);
    expect(found.map((f) => [f.kind, f.before.start, f.after.map((r) => r.start).join(",")])).toEqual([
      ["INTO_WORK", "o1", "w1,w2"], ["OUT_OF_WORK", "w3", "x1,x2"],
    ]);
  });

  it("gives median times only with three timed days, and compares naps only with three flips each way", () => {
    const into = (n: number, nap: number | undefined, sleepHours: number, energy: number) =>
      [off(`o${n}`, { napMinutes: nap, ...timed(420 + n) }), work(`a${n}`, { sleepHours, energy, ...timed(900 + n) }), work(`b${n}`, { sleepHours, energy }), off(`p${n}`)];
    const rows = [1, 2, 3].flatMap((n) => into(n, 60, 6, 4)).concat([4, 5].flatMap((n) => into(n, undefined, 5, 3)));
    const summary = flipSummary(flips(rows), "INTO_WORK");
    expect(summary.flips).toHaveLength(5);
    expect(summary.before).toEqual({ start: 423, end: 723, days: 5 });
    expect(summary.first).toEqual({ start: 903, end: 1203, days: 5 });
    expect(summary.second).toBeUndefined();
    expect(summary.naps).toEqual({ napped: 3, none: 2 });
    expect(summary.comparison).toBeUndefined();
    const more = flipSummary(flips(rows.concat(into(6, undefined, 5, 3))), "INTO_WORK");
    expect(more.comparison).toEqual({
      napped: { flips: 3, sleep: { mean: 6, days: 6 }, energy: { mean: 4, days: 6 } },
      none: { flips: 3, sleep: { mean: 5, days: 6 }, energy: { mean: 3, days: 6 } },
    });
    expect(flipSummary(flips(rows), "OUT_OF_WORK").comparison).toBeUndefined();
  });
});
