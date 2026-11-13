import { describe, expect, it } from "vitest";
import { derivePostRunReport, scheduledRunEndingYesterday } from "../src/application/postRunReport";
import { DEFAULT_SCHEDULE_PATTERN } from "../src/engine/scheduledContext";
import type { SchedulePattern } from "../src/domain/common/types";
import type { PictureRow } from "../src/application/wholePictureProjection";

/** LIFE-STATE-003: the run that just ended, from recorded days only, honest about thin data. */
const row = (date: string, context: PictureRow["context"], extra: Partial<PictureRow> = {}): PictureRow => ({
  start: new Date(`${date}T16:30:00`).toISOString(), dayIds: context === "UNKNOWN" ? [] : [`d-${date}`], context,
  weights: [], ambiguousSleep: false, sessions: 0, checkIn: undefined, checkInCount: 0, energy: undefined, stress: undefined,
  mood: undefined, soreness: undefined, alcoholUrge: undefined, resting: undefined, steps: undefined, measuredHours: 0, ...extra,
} as PictureRow);

describe("derivePostRunReport", () => {
  it("reports the newest run: shifts, sleep, energy and workouts, with how many days each rests on", () => {
    const r = derivePostRunReport([
      row("2026-11-16", "OFF"), row("2026-11-17", "OFF"),
      row("2026-11-18", "WORK", { sleepHours: 5.5, energy: 3 }), row("2026-11-19", "WORK", { sleepHours: 6.1, sessions: 1 }),
    ])!;
    expect(r.lines).toEqual([
      "2 recorded work days, Wed, Nov 18 – Thu, Nov 19.",
      "Main sleep averaged 5.8 h (logged on 2 of 2 shifts).",
      "Check-in energy averaged 3.0 of 5 (1 of 2 shifts).",
      "1 workout.",
    ]);
  });
  it("says plainly when little was recorded", () => {
    const r = derivePostRunReport([row("2026-11-18", "WORK"), row("2026-11-19", "WORK")])!;
    expect(r.lines.slice(1)).toEqual([
      "No main sleep was logged in this run.", "No check-ins in this run.", "No workouts recorded.",
      "Little was recorded in this run, so there isn't much to show. That's fine.",
    ]);
  });
  it("has nothing to report when the newest finished day wasn't a recorded work day", () => {
    expect(derivePostRunReport([row("2026-11-18", "WORK"), row("2026-11-19", "OFF")])).toBeNull();
    expect(derivePostRunReport([row("2026-11-19", "UNKNOWN")])).toBeNull();
    expect(derivePostRunReport([])).toBeNull();
  });
  it("never scores, judges or estimates", () => {
    const r = derivePostRunReport([row("2026-11-19", "WORK", { sleepHours: 4, energy: 1 })])!;
    for (const line of r.lines) expect(line).not.toMatch(/\b(should|must|poor|bad|good|great|score|streak|behind|failed|estimate)\b/i);
  });
  it("review of #496: with the schedule's run, an unrecorded shift doesn't split it, and the report says how many were recorded", () => {
    const rows = [row("2026-11-17", "OFF"), row("2026-11-18", "WORK", { sleepHours: 6 }), row("2026-11-19", "UNKNOWN"), row("2026-11-20", "WORK", { sleepHours: 5, energy: 2 })];
    const r = derivePostRunReport(rows, ["2026-11-18", "2026-11-19", "2026-11-20"])!;
    expect([r.shifts, r.recorded]).toEqual([3, 2]);
    expect(r.lines).toEqual([
      "3 shifts, Wed, Nov 18 – Fri, Nov 20 (2 recorded).",
      "Main sleep averaged 5.5 h (logged on 2 of 3 shifts).",
      "Check-in energy averaged 2.0 of 5 (1 of 3 shifts).",
      "No workouts recorded.",
    ]);
    // Without the schedule, the same gap is worded as what was recorded, never as a shorter run.
    expect(derivePostRunReport(rows)!.lines[0]).toBe("1 recorded work day, Fri, Nov 20.");
  });
});

describe("scheduledRunEndingYesterday on Gavin's 2-2-3 rotation", () => {
  const pattern: SchedulePattern = { ...DEFAULT_SCHEDULE_PATTERN, updatedAt: "2026-10-05T00:00:00.000Z" };
  it("is the scheduled shifts counting back from yesterday, before and after midnight", () => {
    expect(scheduledRunEndingYesterday(new Date(2026, 10, 20, 18), pattern)).toEqual(["2026-11-18", "2026-11-19"]);
    expect(scheduledRunEndingYesterday(new Date(2026, 10, 21, 9), pattern)).toEqual(["2026-11-18", "2026-11-19"]);
    expect(scheduledRunEndingYesterday(new Date(2026, 10, 21, 18), pattern)).toEqual([]); // yesterday was off
    expect(scheduledRunEndingYesterday(new Date(2026, 10, 20, 18), DEFAULT_SCHEDULE_PATTERN)).toBeNull(); // not saved
  });
});
