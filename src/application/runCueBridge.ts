import type { RunningSession } from "../domain/common/types";
import type { RunningCue, RunningCueKind } from "../domain/workout/runningCues";
import { runCueSpeaks, type RunCuePrefs } from "./runCuePrefs";

/**
 * GRAYSON-TRAIN-RUN-CUES-001 (Gavin, 2026-11-24): what BEYOND hands Health Bridge so it can speak and buzz the run
 * with the phone locked. The payload carries everything (each cue's time, his words, whether to speak or buzz), so the
 * Bridge holds no wording of its own and BEYOND stays the one source of truth. Times are absolute epoch milliseconds
 * (`startedAt`, `pausedAt`) plus `pausedMs`, the same sum RUN-001's runningElapsedSeconds() uses, so both apps agree.
 */

export type RunCueOp = "start" | "pause" | "resume" | "end";

export interface RunCuePayloadCue { at: number; kind: RunningCueKind; text: string; speak: boolean; buzz: boolean }

export interface RunCuePayload {
  v: 1;
  id: string;
  title: string;
  startedAt: number;
  pausedMs: number;
  pausedAt?: number;
  cues: RunCuePayloadCue[];
}

/** Size guard: a full Couch to 5K run is well under both. */
export const RUN_CUE_MAX_BYTES = 8 * 1024;
export const RUN_CUE_MAX_CUES = 200;

export class RunCuePayloadTooLarge extends Error {
  constructor() { super("This run has too many cues to hand to Health Bridge. Cues stay on this screen."); }
}

/**
 * The length a cue's `{minutes}` and `{seconds}` stand for: for a warm-up, run, walk or cool-down, that interval's
 * length; for HALFWAY, the time left in the run; for FINISH, the whole run.
 */
export function runCueSeconds(timeline: readonly RunningCue[], index: number): number {
  const cue = timeline[index]!;
  const finish = timeline.find((c) => c.cue === "FINISH")?.atSecond ?? cue.atSecond;
  if (cue.cue === "FINISH") return finish;
  if (cue.cue === "HALFWAY") return finish - cue.atSecond;
  const next = timeline.slice(index + 1).find((c) => c.cue !== "HALFWAY");
  return (next?.atSecond ?? finish) - cue.atSecond;
}

/** His words with `{minutes}` and `{seconds}` filled in: 90 seconds is 1 and 30. */
export function fillRunCueWords(words: string, seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return words.replaceAll("{minutes}", String(Math.floor(s / 60))).replaceAll("{seconds}", String(s % 60));
}

/** The line he'll hear: his own words if he set some, otherwise the timeline's. A blank override falls back. */
export function runCueText(prefs: RunCuePrefs, kind: RunningCueKind, defaultText: string, seconds: number): string {
  const own = prefs.words[kind]?.trim();
  return own ? fillRunCueWords(own, seconds) : defaultText;
}

const BUZZ_KINDS: ReadonlySet<RunningCueKind> = new Set(["RUN", "WALK"]);

export function runCuePayload(session: RunningSession, timeline: readonly RunningCue[], prefs: RunCuePrefs): RunCuePayload {
  const cues = timeline.map((c, i): RunCuePayloadCue => ({
    at: c.atSecond,
    kind: c.cue,
    text: runCueText(prefs, c.cue, c.text, runCueSeconds(timeline, i)),
    speak: prefs.voice && runCueSpeaks(prefs, c.cue),
    buzz: prefs.buzz && BUZZ_KINDS.has(c.cue),
  }));
  return {
    v: 1,
    id: session.id,
    title: `Running · Week ${session.week}, run ${session.run}`,
    startedAt: Date.parse(session.startedAt),
    pausedMs: session.pausedMs,
    ...(session.pausedAt ? { pausedAt: Date.parse(session.pausedAt) } : {}),
    cues,
  };
}

/** The link that hands one op to Health Bridge, the same shape as helperSyncUrl(). Refuses an oversize payload. */
export function runCueUrl(op: RunCueOp, payload: RunCuePayload): string {
  const json = JSON.stringify(payload);
  if (payload.cues.length > RUN_CUE_MAX_CUES || new TextEncoder().encode(json).length > RUN_CUE_MAX_BYTES) throw new RunCuePayloadTooLarge();
  return `intent://run?op=${op}&p=${encodeURIComponent(json)}#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end`;
}
