import { describe, expect, it } from "vitest";
import { runCuePayload, runCueSeconds, runCueUrl, RUN_CUE_MAX_CUES, RunCuePayloadTooLarge } from "../src/application/runCueBridge";
import { DEFAULT_RUN_CUE_PREFS, type RunCuePrefs } from "../src/application/runCuePrefs";
import type { RunningSession } from "../src/domain/common/types";
import { runningCueTimeline } from "../src/domain/workout/runningCues";
import { RUNNING_PLAN_FOUNDATION, runningSegmentsAt } from "../src/domain/workout/runningPlan";

/**
 * GRAYSON-TRAIN-RUN-CUES-001: the payload BEYOND hands Health Bridge carries every cue of RUN-001's timeline, at
 * RUN-001's times, in his words. Timestamps are absolute, so the cue times are the same in any time zone
 * (run under TZ=UTC and TZ=America/Chicago).
 */
const segments = runningSegmentsAt(RUNNING_PLAN_FOUNDATION, { week: 1, run: 1 })!;
const session = (over: Partial<RunningSession> = {}): RunningSession => ({
  id: "run-1", beyondDayId: "day-1", schemaVersion: 1, kind: "PLAN_RUN", planId: RUNNING_PLAN_FOUNDATION.planId, phase: "FOUNDATION",
  week: 1, run: 1, segments, status: "ACTIVE", startedAt: "2026-11-24T23:00:00.000Z", pausedMs: 0, completedSeconds: 0, ...over,
});
const prefs = (over: Partial<RunCuePrefs> = {}): RunCuePrefs => ({ ...DEFAULT_RUN_CUE_PREFS, words: {}, speak: {}, ...over });
const timeline = runningCueTimeline(segments);

describe("GRAYSON-TRAIN-RUN-CUES-001 run cue payload", () => {
  it("week 1 run 1 has every cue at RUN-001's times, with absolute timestamps", () => {
    const p = runCuePayload(session(), timeline, prefs());
    expect(p.v).toBe(1);
    expect(p.title).toBe("Running · Week 1, run 1");
    expect(p.startedAt).toBe(Date.UTC(2026, 10, 24, 23));
    expect(p.pausedAt).toBeUndefined();
    expect(p.cues.map((c) => [c.at, c.kind, c.text])).toEqual(timeline.map((c) => [c.atSecond, c.cue, c.text]));
    expect(p.cues[0]).toEqual({ at: 0, kind: "WARMUP", text: "Warm-up walk, 5 minutes", speak: true, buzz: false });
    expect(p.cues.filter((c) => c.buzz).every((c) => c.kind === "RUN" || c.kind === "WALK")).toBe(true);
    expect(p.cues.filter((c) => c.kind === "RUN" || c.kind === "WALK").every((c) => c.buzz)).toBe(true);
    expect(p.cues.at(-1)!.kind).toBe("FINISH");
    expect(p.cues.at(-1)!.at).toBe(timeline.at(-1)!.atSecond);
    expect(new Date(p.startedAt).toISOString()).toBe("2026-11-24T23:00:00.000Z");
  });

  it("his words replace the default and fill {minutes} and {seconds}; a blank override falls back", () => {
    const p = runCuePayload(session(), timeline, prefs({ words: { RUN: "Go! {minutes} min {seconds} s", WALK: "   ", HALFWAY: "Half done, {minutes} to go" } }));
    const run = p.cues.find((c) => c.kind === "RUN")!;
    expect(run.text).toBe("Go! 1 min 0 s");
    const walk = p.cues.find((c) => c.kind === "WALK")!;
    expect(walk.text).toBe("Walk for 1 minute 30 seconds");
    const halfway = p.cues.find((c) => c.kind === "HALFWAY")!;
    const finish = p.cues.find((c) => c.kind === "FINISH")!;
    expect(halfway.text).toBe(`Half done, ${Math.floor((finish.at - halfway.at) / 60)} to go`);
    const walkIndex = timeline.findIndex((c) => c.cue === "WALK");
    expect(runCueSeconds(timeline, walkIndex)).toBe(90);
  });

  it("a cue switched off, voice off or buzz off is carried as such", () => {
    const off = runCuePayload(session(), timeline, prefs({ speak: { HALFWAY: false } }));
    expect(off.cues.find((c) => c.kind === "HALFWAY")!.speak).toBe(false);
    expect(off.cues.find((c) => c.kind === "RUN")!.speak).toBe(true);
    expect(runCuePayload(session(), timeline, prefs({ voice: false })).cues.every((c) => !c.speak)).toBe(true);
    expect(runCuePayload(session(), timeline, prefs({ buzz: false })).cues.every((c) => !c.buzz)).toBe(true);
  });

  it("pause carries pausedAt, resume carries the new pausedMs", () => {
    const paused = runCuePayload(session({ pausedAt: "2026-11-24T23:05:20.000Z" }), timeline, prefs());
    expect(paused.pausedAt).toBe(Date.UTC(2026, 10, 24, 23, 5, 20));
    const resumed = runCuePayload(session({ pausedMs: 30_000 }), timeline, prefs());
    expect(resumed.pausedAt).toBeUndefined();
    expect(resumed.pausedMs).toBe(30_000);
  });

  it("the link has the helper's intent shape and round-trips through decodeURIComponent", () => {
    const p = runCuePayload(session(), timeline, prefs({ words: { RUN: "Go & don't stop #1 ?" } }));
    for (const op of ["start", "pause", "resume", "end"] as const) {
      const url = runCueUrl(op, p);
      expect(url.startsWith(`intent://run?op=${op}&p=`)).toBe(true);
      expect(url.endsWith("#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end")).toBe(true);
      const encoded = url.slice(`intent://run?op=${op}&p=`.length, url.indexOf("#Intent"));
      expect(JSON.parse(decodeURIComponent(encoded))).toEqual(p);
      expect(encoded).not.toMatch(/[#&?]/);
    }
  });

  it("refuses an oversize payload", () => {
    const p = runCuePayload(session(), timeline, prefs());
    expect(new TextEncoder().encode(JSON.stringify(p)).length).toBeLessThan(8 * 1024);
    const many = { ...p, cues: Array.from({ length: RUN_CUE_MAX_CUES + 1 }, (_, i) => ({ ...p.cues[0]!, at: i })) };
    expect(() => runCueUrl("start", many)).toThrow(RunCuePayloadTooLarge);
    const wordy = { ...p, cues: p.cues.map((c) => ({ ...c, text: "x".repeat(1200) })) };
    expect(() => runCueUrl("start", wordy)).toThrow(RunCuePayloadTooLarge);
  });
});
