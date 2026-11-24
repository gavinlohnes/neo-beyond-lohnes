import type { RunningSegment, RunningSegmentKind } from "./runningPlan";
import { runningTotalSeconds } from "./runningPlan";

/**
 * GRAYSON-TRAIN-RUN-001: the one timing contract for a running session. B1's screen renders and buzzes from this
 * list; B3 (Health Bridge) hands the same list to the phone to speak, so no second timing model exists. Pure: the
 * caller supplies elapsed seconds, computed from absolute timestamps (startedAt + pausedMs), never from a timer.
 */

export type RunningCueKind = "WARMUP" | "RUN" | "WALK" | "HALFWAY" | "COOLDOWN" | "FINISH";
export interface RunningCue { atSecond: number; cue: RunningCueKind; text: string }

/** "1 minute", "1 minute 30 seconds", "45 seconds", "5 minutes". */
export function describeRunningDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const min = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const sec = rest === 1 ? "1 second" : `${rest} seconds`;
  if (minutes === 0) return sec;
  return rest === 0 ? min : `${min} ${sec}`;
}

export function describeRunningSegment(segment: RunningSegment): string {
  const length = describeRunningDuration(segment.seconds);
  switch (segment.kind) {
    case "WARMUP": return `Warm-up walk, ${length}`;
    case "COOLDOWN": return `Cool-down walk, ${length}`;
    case "RUN": return `Run for ${length}`;
    case "WALK": return `Walk for ${length}`;
  }
}

const SEGMENT_CUE: Record<RunningSegmentKind, RunningCueKind> = { WARMUP: "WARMUP", RUN: "RUN", WALK: "WALK", COOLDOWN: "COOLDOWN" };

/**
 * One cue at the start of every segment, one HALFWAY at the midpoint of the main set (after the warm-up, before
 * the cool-down — never inside the warm-up), and FINISH at the end. Ordered by time; a HALFWAY that lands on a
 * segment change comes after that segment's cue.
 */
export function runningCueTimeline(segments: readonly RunningSegment[]): RunningCue[] {
  const cues: RunningCue[] = [];
  let at = 0;
  for (const segment of segments) {
    cues.push({ atSecond: at, cue: SEGMENT_CUE[segment.kind], text: describeRunningSegment(segment) });
    at += segment.seconds;
  }
  const total = runningTotalSeconds(segments);
  const leading = segments.findIndex((s) => s.kind !== "WARMUP");
  let mainStart = 0;
  for (let i = 0; i < (leading < 0 ? segments.length : leading); i += 1) mainStart += segments[i]!.seconds;
  let mainEnd = total;
  for (let i = segments.length - 1; i >= 0 && segments[i]!.kind === "COOLDOWN"; i -= 1) mainEnd -= segments[i]!.seconds;
  if (mainEnd > mainStart) {
    const halfway = mainStart + Math.floor((mainEnd - mainStart) / 2);
    const index = cues.findIndex((c) => c.atSecond > halfway);
    cues.splice(index < 0 ? cues.length : index, 0, { atSecond: halfway, cue: "HALFWAY", text: "Halfway" });
  }
  cues.push({ atSecond: total, cue: "FINISH", text: "Finished. That's the run done." });
  return cues;
}

export interface RunningSegmentPosition {
  index: number;
  segment: RunningSegment;
  startsAt: number;
  endsAt: number;
  /** Seconds left in this segment. */
  remaining: number;
}

/** The segment running at `elapsedSeconds`; a segment owns [startsAt, endsAt). Null at or past the end. */
export function currentSegment(segments: readonly RunningSegment[], elapsedSeconds: number): RunningSegmentPosition | null {
  const elapsed = Math.max(0, elapsedSeconds);
  let startsAt = 0;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const endsAt = startsAt + segment.seconds;
    if (elapsed < endsAt) return { index, segment, startsAt, endsAt, remaining: endsAt - elapsed };
    startsAt = endsAt;
  }
  return null;
}
