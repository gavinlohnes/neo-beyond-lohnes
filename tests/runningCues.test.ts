import { describe, expect, it } from "vitest";
import { RUNNING_PLAN_FOUNDATION } from "../src/domain/workout/runningPlan";
import { runningCueTimeline } from "../src/domain/workout/runningCues";

/** GRAYSON-TRAIN-RUN-001: the cue timeline is the one timing contract B3 will speak from. */
describe("GRAYSON-TRAIN-RUN-001 cue timeline", () => {
  it("cues week 1 run 1", () => {
    const cues = runningCueTimeline(RUNNING_PLAN_FOUNDATION.weeks[0]![0]!);
    expect(cues.slice(0, 4)).toEqual([
      { atSecond: 0, cue: "WARMUP", text: "Warm-up walk, 5 minutes" },
      { atSecond: 300, cue: "RUN", text: "Run for 1 minute" },
      { atSecond: 360, cue: "WALK", text: "Walk for 1 minute 30 seconds" },
      { atSecond: 450, cue: "RUN", text: "Run for 1 minute" },
    ]);
    // Main set is 300 s to 1410 s; halfway at 855 s, inside the 4th walk (780–870).
    expect(cues.filter((c) => c.cue === "HALFWAY")).toEqual([{ atSecond: 855, cue: "HALFWAY", text: "Halfway" }]);
    expect(cues.at(-2)).toEqual({ atSecond: 1410, cue: "COOLDOWN", text: "Cool-down walk, 5 minutes" });
    expect(cues.at(-1)).toEqual({ atSecond: 1710, cue: "FINISH", text: "Finished. That's the run done." });
    expect(cues.map((c) => c.atSecond)).toEqual([...cues.map((c) => c.atSecond)].sort((a, b) => a - b));
  });

  it("cues week 5 run 3 (20 minutes running)", () => {
    expect(runningCueTimeline(RUNNING_PLAN_FOUNDATION.weeks[4]![2]!)).toEqual([
      { atSecond: 0, cue: "WARMUP", text: "Warm-up walk, 5 minutes" },
      { atSecond: 300, cue: "RUN", text: "Run for 20 minutes" },
      { atSecond: 900, cue: "HALFWAY", text: "Halfway" },
      { atSecond: 1500, cue: "COOLDOWN", text: "Cool-down walk, 5 minutes" },
      { atSecond: 1800, cue: "FINISH", text: "Finished. That's the run done." },
    ]);
  });

  it("has HALFWAY once, FINISH at the end and nothing inside the warm-up but its start, on all 27 runs", () => {
    for (const segments of RUNNING_PLAN_FOUNDATION.weeks.flat()) {
      const cues = runningCueTimeline(segments);
      expect(cues.filter((c) => c.cue === "HALFWAY")).toHaveLength(1);
      expect(cues.filter((c) => c.cue === "FINISH")).toHaveLength(1);
      expect(cues.at(-1)!.cue).toBe("FINISH");
      expect(cues.filter((c) => c.atSecond > 0 && c.atSecond < 300)).toEqual([]);
    }
  });
});
