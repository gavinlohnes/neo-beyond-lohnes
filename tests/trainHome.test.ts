import { describe, expect, it } from "vitest";
import { trainingWeeks } from "../src/application/trainHome";
import { describeDayContext } from "../src/application/dayContext";
import { describeLastSessionLine } from "../src/ui/screens/train/trainCopy";
import type { BeyondDay } from "../src/domain/common/types";

/** VISUAL-FOUNDATION-002: TRAIN's weekly numbers and the command bar's shared day context. */
const at = (y: number, m: number, d: number, h = 18, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const NOW = new Date(2026, 10, 14, 18, 0); // Saturday 14 Nov 2026

describe("trainingWeeks", () => {
  it("counts finished sessions with working sets by lived-day week, oldest first, this week last", () => {
    const weeks = trainingWeeks([
      { status: "COMPLETED", startedAt: at(2026, 11, 11), workingSetCount: 4 },  // Wednesday this week
      { status: "PARTIAL", startedAt: at(2026, 11, 13), workingSetCount: 2 },    // Friday this week
      { status: "COMPLETED", startedAt: at(2026, 11, 6), workingSetCount: 5 },   // last week
      { status: "ABANDONED", startedAt: at(2026, 11, 12), workingSetCount: 3 },  // not finished training
      { status: "COMPLETED", startedAt: at(2026, 11, 12), workingSetCount: 0 },  // no sets: not training
      { status: "COMPLETED", startedAt: at(2026, 9, 1), workingSetCount: 9 },    // older than eight weeks
    ], NOW);
    expect(weeks).toHaveLength(8);
    expect(weeks.at(-1)).toEqual({ sessions: 2, sets: 6 });
    expect(weeks.at(-2)).toEqual({ sessions: 1, sets: 5 });
    expect(weeks.slice(0, -2).every((w) => w.sessions === 0 && w.sets === 0)).toBe(true);
  });

  it("a workout at 01:00 Monday, before the 16:30 boundary, belongs to Sunday's lived day and last week", () => {
    const weeks = trainingWeeks([{ status: "COMPLETED", startedAt: at(2026, 11, 9, 1, 0), workingSetCount: 3 }], new Date(2026, 10, 10, 18, 0));
    expect(weeks.at(-1)).toEqual({ sessions: 0, sets: 0 });
    expect(weeks.at(-2)).toEqual({ sessions: 1, sets: 3 });
  });
});

describe("describeDayContext", () => {
  const day = (workContext: BeyondDay["workContext"]) => ({ id: "d", startedAt: at(2026, 11, 14, 16, 30), workContext } as BeyondDay);
  it("reads the record first and never guesses", () => {
    expect(describeDayContext(null, null)).toEqual({ text: "No day started", basis: null });
    expect(describeDayContext(day("OFF"), null)).toEqual({ text: "Day off", basis: "recorded" });
    expect(describeDayContext(day("WORK"), null)).toEqual({ text: "Work day", basis: "recorded" });
    expect(describeDayContext(day("UNKNOWN"), null)).toEqual({ text: "Work or off not set", basis: null });
  });
});

describe("describeLastSessionLine", () => {
  it("names the template, REDUCED, the real status, the duration and the date, without repeating the count", () => {
    expect(describeLastSessionLine({ templateId: "A", sessionType: "REDUCED", status: "PARTIAL", workingSetCount: 3, durationMinutes: 40, startedAt: at(2026, 11, 13) }, []))
      .toBe("Template A · REDUCED · Partial · 40 min · Fri, Nov 13");
    expect(describeLastSessionLine({ templateId: "custom-1", sessionType: "STANDARD", status: "COMPLETED", workingSetCount: 3, durationMinutes: null }, [{ id: "custom-1", name: "Push day" } as never]))
      .toBe("Push day · Completed");
  });
});
