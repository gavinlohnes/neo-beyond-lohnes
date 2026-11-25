/**
 * GRAYSON-TRAIN-GUIDED-001 (Gavin, 2026-11-23: "Let's get it" to TRAIN finish 2; design GRAYSON_TRAIN_INTELLIGENCE §6,
 * the Delta Training Intervention Rule): Delta stays quiet when a set goes as planned. It speaks once, briefly, only
 * when the set just recorded is clear evidence for a different load on the next set, and the operator decides.
 * Accepting only fills in the next set's weight; nothing is written until that set is logged. No proposal on
 * bodyweight (HOME) work, warm-ups, the last set, or a lift with no load step. Pure.
 */

export interface SetEvidence {
  exerciseName: string;
  range: { low: number; high: number };
  incrementLbs: number;
  weight: number;
  reps: number;
  repsInReserve?: number | undefined;
  warmup: boolean;
  bodyweightForm: boolean;
  /** The next working set of this exercise that isn't logged yet, or null when this was the last. */
  nextSetNumber: number | null;
}
export interface SetProposal {
  direction: "UP" | "DOWN";
  nextSetNumber: number;
  from: number;
  to: number;
  /** One short line shown with the proposal. */
  line: string;
  /** WHY?: the evidence, the step, and that it's his call. */
  why: string[];
}

/** Beat the top of the range by this many reps (or hit it with this much in reserve) before Delta proposes more load. */
export const UP_MARGIN_REPS = 2;
export const UP_RESERVE_REPS = 3;
/** Fall short of the bottom by this many reps before Delta proposes less. */
export const DOWN_MARGIN_REPS = 2;

export function deriveSetProposal(e: SetEvidence): SetProposal | null {
  if (e.warmup || e.bodyweightForm || e.nextSetNumber === null || !(e.weight > 0) || !(e.incrementLbs > 0)) return null;
  const evidence = `Set logged: ${e.weight} lb × ${e.reps}${e.repsInReserve !== undefined ? ` with ${e.repsInReserve} in reserve` : ""}. The plan is ${e.range.low}–${e.range.high} reps.`;
  const step = `${e.incrementLbs} lb is this exercise's load step.`;
  const choice = `It changes set ${e.nextSetNumber} only, and only if you use it. Your logged sets stay as they are.`;
  const cleared = e.reps >= e.range.high + UP_MARGIN_REPS || (e.reps >= e.range.high && (e.repsInReserve ?? 0) >= UP_RESERVE_REPS);
  if (cleared) {
    const to = e.weight + e.incrementLbs;
    return { direction: "UP", nextSetNumber: e.nextSetNumber, from: e.weight, to,
      line: e.reps >= e.range.high + UP_MARGIN_REPS ? `${e.reps} reps cleared the top of ${e.range.low}–${e.range.high}. Set ${e.nextSetNumber} at ${to} lb?` : `Top of the range with ${e.repsInReserve} in reserve. Set ${e.nextSetNumber} at ${to} lb?`,
      why: [evidence, step, choice] };
  }
  if (e.reps <= e.range.low - DOWN_MARGIN_REPS) {
    const to = e.weight - e.incrementLbs;
    if (to <= 0) return null; // never propose an empty bar of 0 lb
    return { direction: "DOWN", nextSetNumber: e.nextSetNumber, from: e.weight, to,
      line: `${e.reps} reps is short of ${e.range.low}–${e.range.high}. Set ${e.nextSetNumber} at ${to} lb to stay in range?`,
      why: [evidence, step, choice] };
  }
  return null;
}

/** What Delta noticed this workout, for the one review at the end. Kept in memory only; never stored. */
export type GuidanceNote =
  | { kind: "PROPOSAL"; exerciseName: string; line: string; choice: "USED" | "KEPT" }
  | { kind: "STOPPED"; exerciseName: string; skipped: number }
  | { kind: "NOTED"; exerciseName: string };

export function reviewLines(notes: readonly GuidanceNote[]): string[] {
  const check = "If pain was sharp or doesn't ease, get it checked before training it again.";
  return notes.map((n) => n.kind === "STOPPED"
    ? `${n.exerciseName}: stopped${n.skipped ? `, ${n.skipped} ${n.skipped === 1 ? "set" : "sets"} skipped` : ""}. ${check}`
    : n.kind === "NOTED" ? `${n.exerciseName}: pain or a problem noted; its sets were left open. ${check}`
    : `${n.exerciseName}: ${n.line.replace(/\?$/, "")}. You ${n.choice === "USED" ? "used it" : "kept your weight"}.`);
}
