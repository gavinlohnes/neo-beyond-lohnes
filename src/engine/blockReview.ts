import type { BlockSettings } from "../domain/workout/trainingBlock";

/**
 * GRAYSON-BLOCK-CYCLE-001: the block review, pure. Inputs are already-judged facts (sessions, main lifts, deloadStall's
 * stalls, the weekly weight average, focus sets); output is at most five lines and at most three suggestions from fixed
 * rules, ranked: stalls, sessions, keep, focus. Nothing here applies a change. Evidence floor (TRAIN Intelligence §7):
 * a stall is deloadStall's four sessions without a record; sessions are judged over the whole block; one poor session
 * never produces a suggestion.
 */
export interface BlockReviewInput {
  settings: BlockSettings;
  focus: readonly string[];
  /** Planned is null without a week plan (the sessions rule then doesn't apply). */
  sessions: { done: number; planned: number | null; skippedByWeekday: Readonly<Record<string, number>>; weeksRun: number };
  mainLifts: readonly { routineName: string; name: string; start: number | null; end: number | null }[];
  stalls: readonly { routineId: string; routineName: string; exerciseId: string; name: string; swapTo: { exerciseId: string; name: string } | null }[];
  weight: { start: number; end: number } | null;
  focusSets: readonly { area: string; setsPerWeek: number; firstExercise: { routineId: string; exerciseId: string; name: string } | null }[];
}

export type BlockSuggestion =
  | { id: string; kind: "SWAP"; routineId: string; exerciseId: string; to: { exerciseId: string; name: string }; text: string; why: string }
  | { id: string; kind: "DROP"; exerciseId: string; percent: number; text: string; why: string }
  | { id: string; kind: "FEWER_DAYS"; weekday: string; text: string; why: string }
  | { id: string; kind: "KEEP"; text: string; why: string }
  | { id: string; kind: "ADD_SET"; routineId: string; exerciseId: string; text: string; why: string };

export interface BlockReview { lines: { kind: "SESSIONS" | "LIFTS" | "STALLS" | "WEIGHT" | "FOCUS"; text: string }[]; suggestions: BlockSuggestion[] }

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const lb = (n: number) => `${Math.round(n * 10) / 10} lb`;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const sets = (n: number) => { const v = Math.round(n * 10) / 10; return `${v} direct ${v === 1 ? "set" : "sets"}`; };

export function buildBlockReview(input: BlockReviewInput): BlockReview {
  const lines: BlockReview["lines"] = [];
  const { done, planned } = input.sessions;
  lines.push({ kind: "SESSIONS", text: planned !== null && planned > 0 ? `Sessions: ${done} of ${planned} planned (${pct(done / planned)}).` : `Sessions: ${done} done.` });
  const lifts = input.mainLifts.filter((l) => l.start !== null && l.end !== null);
  if (lifts.length) lines.push({ kind: "LIFTS", text: `Main lifts (estimated 1RM): ${lifts.map((l) => `${l.name} ${l.start} → ${l.end} lb`).join("; ")}.` });
  lines.push({ kind: "STALLS", text: input.stalls.length ? `Stalls: ${input.stalls.map((s) => s.name).join(", ")} (4 sessions without a record).` : "Stalls: none." });
  if (input.weight) lines.push({ kind: "WEIGHT", text: `Trend weight: ${lb(input.weight.start)} → ${lb(input.weight.end)}.` });
  const ranged = input.focusSets.filter((f) => input.settings.focusRanges[f.area]);
  if (input.focus.length) lines.push({ kind: "FOCUS", text: `Focus: ${input.focusSets.map((f) => { const r = input.settings.focusRanges[f.area]; return `${f.area} ${sets(f.setsPerWeek)} a week${r ? ` (range ${r[0]}–${r[1]})` : ""}`; }).join("; ")}.` });

  const suggestions: BlockSuggestion[] = [];
  for (const s of input.stalls) {
    suggestions.push(s.swapTo
      ? { id: `SWAP:${s.routineId}:${s.exerciseId}`, kind: "SWAP", routineId: s.routineId, exerciseId: s.exerciseId, to: s.swapTo, text: `Swap ${s.name} for ${s.swapTo.name} in ${s.routineName}.`, why: `${s.name}: 4 sessions without a record.` }
      : { id: `DROP:${s.exerciseId}`, kind: "DROP", exerciseId: s.exerciseId, percent: input.settings.weightDropPercent, text: `Start ${s.name} ${input.settings.weightDropPercent}% lighter next block.`, why: `${s.name}: 4 sessions without a record, and no same-muscle move to swap to.` });
  }
  if (planned !== null && planned > 0 && done / planned < input.settings.sessionsShare) {
    const most = Object.entries(input.sessions.skippedByWeekday).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0];
    // Evidence floor (§7; review of #746): at least two weeks run, and the same day skipped at least twice.
    if (most && most[1] >= 2 && input.sessions.weeksRun >= 2) suggestions.push({ id: `FEWER:${most[0]}`, kind: "FEWER_DAYS", weekday: most[0],
      text: `One fewer planned day a week: make ${WEEKDAYS[Number(most[0])]} a rest day.`, why: `${done} of ${planned} planned sessions (${pct(done / planned)}, under ${pct(input.settings.sessionsShare)}); ${WEEKDAYS[Number(most[0])]} was skipped most (${most[1]}).` });
  }
  const focusAdds: BlockSuggestion[] = [];
  for (const f of ranged) {
    const [lo] = input.settings.focusRanges[f.area]!;
    if (f.setsPerWeek < lo && f.firstExercise) focusAdds.push({ id: `ADD:${f.firstExercise.routineId}:${f.firstExercise.exerciseId}`, kind: "ADD_SET", routineId: f.firstExercise.routineId, exerciseId: f.firstExercise.exerciseId,
      text: `Add one set to ${f.firstExercise.name}.`, why: `${f.area}: ${sets(f.setsPerWeek)} a week, under its starting range of ${lo}.` });
  }
  // KEEP only when nothing else would change a routine (never "keep as they are" beside "add a set").
  const rising = lifts.length > 0 && lifts.every((l) => l.end! > l.start!);
  const onPlan = planned === null || planned === 0 || done / planned >= input.settings.sessionsShare;
  if (rising && onPlan && suggestions.length === 0 && focusAdds.length === 0) suggestions.push({ id: "KEEP", kind: "KEEP", text: "Keep your routines as they are for the next block.", why: `Every main lift rose${planned ? `, and ${done} of ${planned} sessions were done` : ""}.` });
  suggestions.push(...focusAdds);
  return { lines: lines.slice(0, 5), suggestions: suggestions.slice(0, 3) };
}

/** Epley, as TRAIN's e1RM (plates.ts): only sets of 1–12 reps; an estimate for orientation. */
export function estimatedOneRepMax(weight: number, reps: number): number | null {
  if (!(weight > 0) || !Number.isInteger(reps) || reps < 1 || reps > 12) return null;
  return reps === 1 ? weight : Math.round(weight * (1 + reps / 30));
}
