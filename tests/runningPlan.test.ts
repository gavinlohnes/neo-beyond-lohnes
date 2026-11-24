import { describe, expect, it } from "vitest";
import {
  nextRunningPosition,
  RUNNING_PLAN_FOUNDATION,
  runningTotalSeconds,
  validateRunningSegments,
} from "../src/domain/workout/runningPlan";
import { currentSegment } from "../src/domain/workout/runningCues";

/** GRAYSON-TRAIN-RUN-001: the plan transcribed from the NHS Couch to 5K page (read 2026-11-24). */
const PAGE_TOTAL_MINUTES: number[][] = [
  [28.5, 28.5, 28.5],
  [29, 29, 29],
  [25, 25, 25],
  [31.5, 31.5, 31.5],
  [31, 31, 30],
  [34, 33, 35],
  [35, 35, 35],
  [38, 38, 38],
  [40, 40, 40],
];

describe("GRAYSON-TRAIN-RUN-001 plan data", () => {
  it("has 9 weeks × 3 runs and every total matches the NHS page", () => {
    expect(RUNNING_PLAN_FOUNDATION.weeks).toHaveLength(9);
    RUNNING_PLAN_FOUNDATION.weeks.forEach((runs, w) => {
      expect(runs).toHaveLength(3);
      runs.forEach((segments, r) => expect(runningTotalSeconds(segments), `week ${w + 1} run ${r + 1}`).toBe(PAGE_TOTAL_MINUTES[w]![r]! * 60));
    });
  });

  it("starts every run with a 5-minute warm-up walk and ends with a 5-minute cool-down walk", () => {
    for (const segments of RUNNING_PLAN_FOUNDATION.weeks.flat()) {
      expect(segments[0]).toEqual({ kind: "WARMUP", seconds: 300 });
      expect(segments.at(-1)).toEqual({ kind: "COOLDOWN", seconds: 300 });
      expect(segments.slice(1, -1).every((s) => s.kind === "RUN" || s.kind === "WALK")).toBe(true);
      expect(validateRunningSegments(segments)).toBeNull();
    }
  });

  it("differs by run in weeks 5 and 6 only", () => {
    RUNNING_PLAN_FOUNDATION.weeks.forEach((runs, w) => {
      const same = runs.every((r) => JSON.stringify(r) === JSON.stringify(runs[0]));
      expect(same, `week ${w + 1}`).toBe(w !== 4 && w !== 5);
    });
    expect(RUNNING_PLAN_FOUNDATION.weeks[4]![2]!.slice(1, -1)).toEqual([{ kind: "RUN", seconds: 1200 }]);
  });

  it("walks the plan in order and ends after week 9 run 3", () => {
    expect(nextRunningPosition(RUNNING_PLAN_FOUNDATION, { week: 1, run: 3 })).toEqual({ week: 2, run: 1 });
    expect(nextRunningPosition(RUNNING_PLAN_FOUNDATION, { week: 9, run: 3 })).toBeNull();
  });

  it("finds the segment at every boundary", () => {
    const segments = RUNNING_PLAN_FOUNDATION.weeks[0]![0]!;
    expect(currentSegment(segments, 0)).toMatchObject({ index: 0, remaining: 300 });
    let at = 0;
    segments.forEach((segment, index) => {
      expect(currentSegment(segments, at), `start of ${index}`).toMatchObject({ index, startsAt: at, remaining: segment.seconds });
      expect(currentSegment(segments, at + segment.seconds - 1), `last second of ${index}`).toMatchObject({ index, remaining: 1 });
      at += segment.seconds;
    });
    expect(currentSegment(segments, at - 1)).toMatchObject({ index: segments.length - 1, remaining: 1 });
    expect(currentSegment(segments, at)).toBeNull();
    expect(currentSegment(segments, at + 500)).toBeNull();
  });

  it("refuses a run with no running interval, a segment under 5 s or over 90 min", () => {
    expect(validateRunningSegments([{ kind: "WARMUP", seconds: 300 }, { kind: "WALK", seconds: 60 }])).toBe("A run needs at least one running interval.");
    expect(validateRunningSegments([{ kind: "RUN", seconds: 4 }])).toBe("Each interval needs at least 5 seconds.");
    expect(validateRunningSegments([{ kind: "RUN", seconds: 90 * 60 + 5 }])).toBe("An interval can be at most 90 minutes.");
    expect(validateRunningSegments([])).toBe("A run needs at least one running interval.");
  });
});
