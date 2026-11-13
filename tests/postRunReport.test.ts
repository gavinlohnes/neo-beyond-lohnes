import { describe, expect, it } from "vitest";
import { derivePostRunReport } from "../src/application/postRunReport";
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
      "2 shifts, Wed, Nov 18 – Thu, Nov 19.",
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
});
