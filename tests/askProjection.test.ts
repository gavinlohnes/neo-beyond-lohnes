import { describe, expect, it } from "vitest";
import { askLastFlip, askWhatChanged, askWhenTrain, askWorkVsOff } from "../src/application/askProjection";
import type { PictureRow } from "../src/application/wholePictureProjection";

const start = (day: number) => new Date(2026, 8, day, 16, 30).toISOString();
const row = (day: number, context: PictureRow["context"], values: Partial<PictureRow> = {}) =>
  ({ start: start(day), dayIds: [`d${day}`], context, sessions: 0, ambiguousSleep: false, ...values } as unknown as PictureRow);
const work = (day: number, sleepHours: number, energy: number, values: Partial<PictureRow> = {}) => row(day, "WORK", { sleepHours, energy, ...values });
const off = (day: number, values: Partial<PictureRow> = {}) => row(day, "OFF", { sleepHours: 8, energy: 4, ...values });

// A cut run, two earlier runs, then the latest run: shorter sleep and lower energy.
const rows = [
  work(1, 3, 1), off(2), off(3, { sessions: 1, marks: { meals: [], water: [], workouts: [1200] } }),
  work(4, 7, 4), work(5, 6.5, 4), off(6), off(7, { sessions: 1, marks: { meals: [], water: [], workouts: [1260] } }),
  work(8, 7, 4), work(9, 6.5, 3), off(10, { napMinutes: 40, sleepWindow: { start: 420, end: 900 } }),
  work(11, 5, 2, { sleepWindow: { start: 930, end: 1230 } }), work(12, 5.5, 2, { sessions: 1, marks: { meals: [], water: [], workouts: [870] } }),
];

describe("LOOP step 1 — ASK", () => {
  it("what changed: the last work run against the same shifts in earlier, whole runs", () => {
    const answer = askWhatChanged(rows);
    expect(answer.status).toBe("NOT_YET"); // two earlier runs give 4 comparison days but only 2 latest-run days per measure
    const longer = [...rows, work(13, 5, 2)];
    const ready = askWhatChanged(longer);
    expect(ready.status).toBe("ANSWER");
    if (ready.status !== "ANSWER") return;
    // Latest run 11–13: sleep 5:10; same shifts 1–3 before (4,5,8,9; cut run 1 excluded): 6:45 → 95 min less.
    expect(ready.lines[0]!.text).toBe("Main sleep averaged 5:10 in your last work run — 95 min less than the same shifts in earlier runs (6:45).");
    expect(ready.lines[1]!.text).toBe("Check-in energy averaged 2.0, against 3.8 on the same shifts before.");
    expect(ready.lines[2]!.text).toBe("You trained on 1 of 3 shifts in that run.");
    expect(ready.lines[0]!.rows.map((r) => r.start)).toEqual([start(11), start(12), start(13)]);
  });

  it("last flip: the day before, with nap, and each shift against usual times", () => {
    const answer = askLastFlip(rows);
    expect(answer.status).toBe("ANSWER");
    if (answer.status !== "ANSWER") return;
    expect(answer.lines[0]!.text).toBe("The day before, you slept 23:30–07:30 and napped 40 min.");
    expect(answer.lines[1]!.text).toBe("Shift 1: main sleep 5:00, energy 2.");
    expect(answer.lines[1]!.rows.map((r) => r.start)).toEqual([start(11)]);
    expect(askLastFlip([off(1)])).toEqual({ status: "NOT_YET", need: "one recorded switch from days off into a work run" });
  });

  it("work days vs days off, with training shares", () => {
    const answer = askWorkVsOff(rows);
    expect(answer.status).toBe("ANSWER");
    if (answer.status !== "ANSWER") return;
    expect(answer.lines.map((l) => l.text)).toEqual([
      "Main sleep: 5:47 on work days, 8:00 on days off.",
      "Check-in energy: 2.9 on work days, 4.0 on days off.",
      "Trained on 1 of 7 work days and 2 of 5 days off.",
    ]);
  });

  it("when you train: most frequent place in the run and the usual start", () => {
    const answer = askWhenTrain(rows);
    expect(answer.status).toBe("ANSWER");
    if (answer.status !== "ANSWER") return;
    // The cut first run is left out of places, so day off 2 came round twice (Sep 3 and 7), trained both times.
    expect(answer.lines[0]!.text).toBe("Most often on day off 2: 2 of 2 times it came round.");
    expect(answer.lines[1]!.text).toBe("Usual start: about 12:30 (3 workouts with a start time).");
    expect(answer.lines[2]!.text).toBe("1 on work days, 2 on days off, in the last 12 days.");
    expect(askWhenTrain(rows.slice(0, 4))).toEqual({ status: "NOT_YET", need: "3 recorded workouts (1 so far)" });
  });
});
