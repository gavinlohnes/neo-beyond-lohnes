import { STRETCH_BY_ID, type StretchRoutine } from "./stretchLibrary";

/**
 * GRAYSON-HOME-STRETCH-001 slice B: the one timing contract for a stretch routine, beside runningCues.ts. The player
 * renders and buzzes from it, and Health Bridge speaks the same cues, so there's no second timing model. Pure: the
 * caller supplies elapsed seconds worked out from absolute timestamps (start, paused time, skips), never a running
 * timer, so a locked screen doesn't drift.
 */
export type StretchSide = "LEFT" | "RIGHT";
export interface StretchHold {
  index: number;
  stepIndex: number;
  stretchId: string;
  name: string;
  side: StretchSide | null;
  round: number;
  startsAt: number;
  seconds: number;
}
export type StretchCueKind = "START" | "SWITCH" | "AGAIN" | "NEXT" | "LAST" | "DONE";
export interface StretchCue { atSecond: number; kind: StretchCueKind; text: string }

/** Every hold in order. `extra` adds seconds to a hold by index (+15 s). */
export function stretchHolds(routine: Pick<StretchRoutine, "steps">, extra: Readonly<Record<number, number>> = {}): StretchHold[] {
  const holds: StretchHold[] = [];
  let at = 0;
  routine.steps.forEach((step, stepIndex) => {
    const stretch = STRETCH_BY_ID.get(step.stretchId);
    if (!stretch) return;
    const sides: (StretchSide | null)[] = step.bothSides && stretch.oneSided ? ["LEFT", "RIGHT"] : [null];
    for (let round = 1; round <= step.rounds; round++) {
      for (const side of sides) {
        const index = holds.length;
        const seconds = step.holdSeconds + Math.max(0, extra[index] ?? 0);
        holds.push({ index, stepIndex, stretchId: stretch.id, name: stretch.name, side, round, startsAt: at, seconds });
        at += seconds;
      }
    }
  });
  return holds;
}

export const stretchTotalSeconds = (holds: readonly StretchHold[]): number => {
  const last = holds.at(-1);
  return last ? last.startsAt + last.seconds : 0;
};

const sideWord = (side: StretchSide | null) => (side === "LEFT" ? ", left side" : side === "RIGHT" ? ", right side" : "");

/**
 * A cue at every hold change: the first hold names the stretch; the other side says "Switch sides"; the same stretch
 * again says "Again"; a new stretch says "Next: …", or "Last one: …" for the last stretch; the end says "Done".
 */
export function stretchCueTimeline(holds: readonly StretchHold[]): StretchCue[] {
  if (!holds.length) return [];
  const lastStep = holds.at(-1)!.stepIndex;
  const cues: StretchCue[] = holds.map((hold, i): StretchCue => {
    const before = holds[i - 1];
    if (!before) return { atSecond: 0, kind: "START", text: `${hold.name}${sideWord(hold.side)}` };
    if (before.stepIndex === hold.stepIndex) {
      return hold.side && hold.side !== before.side ? { atSecond: hold.startsAt, kind: "SWITCH", text: "Switch sides" } : { atSecond: hold.startsAt, kind: "AGAIN", text: "Again" };
    }
    return hold.stepIndex === lastStep
      ? { atSecond: hold.startsAt, kind: "LAST", text: `Last one: ${hold.name.toLowerCase()}` }
      : { atSecond: hold.startsAt, kind: "NEXT", text: `Next: ${hold.name.toLowerCase()}` };
  });
  cues.push({ atSecond: stretchTotalSeconds(holds), kind: "DONE", text: "Done" });
  return cues;
}

export interface StretchPosition { hold: StretchHold; remaining: number; next: StretchHold | null }

/** The hold at `elapsed`; a hold owns [startsAt, startsAt + seconds). Null at or past the end. */
export function stretchPosition(holds: readonly StretchHold[], elapsed: number): StretchPosition | null {
  const e = Math.max(0, elapsed);
  const i = holds.findIndex((h) => e < h.startsAt + h.seconds);
  if (i < 0) return null;
  const hold = holds[i]!;
  return { hold, remaining: hold.startsAt + hold.seconds - e, next: holds[i + 1] ?? null };
}

/** Cues crossed going from `from` (exclusive) to `to` (inclusive), for the buzz and on-screen line; the start cue at 0 counts once. */
export function stretchCuesBetween(cues: readonly StretchCue[], from: number, to: number): StretchCue[] {
  return cues.filter((c) => (from < 0 ? c.atSecond >= 0 : c.atSecond > from) && c.atSecond <= to);
}

/**
 * The player's clock: absolute start, paused time and pauses, plus `shift` (seconds jumped by SKIP) and `extra`
 * (+15 s per hold). Elapsed seconds come from these alone.
 */
export interface StretchClock { startedAt: number; pausedMs: number; pausedAt: number | null; shift: number; extra: Record<number, number> }

export const startStretchClock = (nowMs: number): StretchClock => ({ startedAt: nowMs, pausedMs: 0, pausedAt: null, shift: 0, extra: {} });

export function stretchElapsed(clock: StretchClock, nowMs: number): number {
  return ((clock.pausedAt ?? nowMs) - clock.startedAt - clock.pausedMs) / 1000 + clock.shift;
}

export function pauseStretch(clock: StretchClock, nowMs: number): StretchClock {
  return clock.pausedAt !== null ? clock : { ...clock, pausedAt: nowMs };
}

export function resumeStretch(clock: StretchClock, nowMs: number): StretchClock {
  return clock.pausedAt === null ? clock : { ...clock, pausedMs: clock.pausedMs + (nowMs - clock.pausedAt), pausedAt: null };
}

/** SKIP: jump to the start of the next hold (or the end). */
export function skipStretch(clock: StretchClock, routine: Pick<StretchRoutine, "steps">, nowMs: number): StretchClock {
  const at = stretchPosition(stretchHolds(routine, clock.extra), stretchElapsed(clock, nowMs));
  return at ? { ...clock, shift: clock.shift + at.remaining } : clock;
}

/** +15 s: the hold he's on lasts 15 seconds longer. */
export function extendStretch(clock: StretchClock, routine: Pick<StretchRoutine, "steps">, nowMs: number, seconds = 15): StretchClock {
  const at = stretchPosition(stretchHolds(routine, clock.extra), stretchElapsed(clock, nowMs));
  return at ? { ...clock, extra: { ...clock.extra, [at.hold.index]: (clock.extra[at.hold.index] ?? 0) + seconds } } : clock;
}
