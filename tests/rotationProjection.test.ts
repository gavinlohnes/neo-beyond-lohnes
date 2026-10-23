import { describe, expect, it } from "vitest";
import { groupRuns, nextForecastRun } from "../src/application/rotationProjection";
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
