// Domain layer must not import React, Dexie, or UI code.
import type { DomainEvent } from "../common/types";
import type { ExercisePrescription } from "./types";

/**
 * GRAYSON-WORKOUT-CHANGES-001 (Gavin, 2026-11-25): ADD EXERCISE, SWAP and REMOVE on the live workout, then one
 * question at the end: keep these changes for next time?
 *
 * Each change is a `WORKOUT_PLAN_CHANGED` event under the session's lived day (USER). Today's plan is the routine as
 * the workout started, with every change applied in order. Nothing changes the routine until he taps KEEP FOR NEXT
 * TIME, which saves through ROUTINE-EDIT-001's command.
 */
export type WorkoutPlanChange =
  | { kind: "ADD"; exercise: ExercisePrescription }
  /** `keptSets`: sets of the old exercise already done today, which stay today (0: it leaves today's plan). */
  | { kind: "SWAP"; fromExerciseId: string; exercise: ExercisePrescription; keptSets: number }
  | { kind: "REMOVE"; exerciseId: string; keptSets: number };

export interface WorkoutPlanChangedPayload {
  commandId: string;
  sessionId: string;
  change: WorkoutPlanChange;
}

export interface WorkoutPlanState {
  /** What today's workout prescribes now. */
  today: ExercisePrescription[];
  /** The routine with the same changes (exercises removed or swapped away are gone), in plan order. */
  routine: ExercisePrescription[];
  changes: number;
}

const byOrder = (a: DomainEvent, b: DomainEvent) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER) || a.recordedAt.localeCompare(b.recordedAt);

export function sessionPlanChanges(events: readonly DomainEvent[], sessionId: string, parse: (payload: unknown) => WorkoutPlanChangedPayload | null): WorkoutPlanChange[] {
  return events
    .filter((event) => event.type === "WORKOUT_PLAN_CHANGED" && event.source === "USER")
    .sort(byOrder)
    .flatMap((event) => {
      const payload = parse(event.payload);
      return payload && payload.sessionId === sessionId ? [payload.change] : [];
    });
}

/**
 * Pure: today's plan and the routine KEEP would save. `todayBase` is the workout's prescription as it started (REDUCED
 * already sliced); `routineBase` is the full routine as it started. A swap takes the slot (in both); an exercise with
 * sets already done stays today at the sets done, and leaves the routine.
 */
export function projectWorkoutPlan(todayBase: readonly ExercisePrescription[], routineBase: readonly ExercisePrescription[], changes: readonly WorkoutPlanChange[]): WorkoutPlanState {
  let today = todayBase.map((ex) => ({ ...ex }));
  let routine = routineBase.map((ex) => ({ ...ex }));
  for (const change of changes) {
    if (change.kind === "ADD") {
      if (!today.some((ex) => ex.exerciseId === change.exercise.exerciseId)) today.push({ ...change.exercise });
      if (!routine.some((ex) => ex.exerciseId === change.exercise.exerciseId)) routine.push({ ...change.exercise });
    } else if (change.kind === "SWAP") {
      today = swapIn(today, change.fromExerciseId, change.exercise, change.keptSets);
      routine = swapIn(routine, change.fromExerciseId, change.exercise, 0, true);
    } else {
      today = today.flatMap((ex) => (ex.exerciseId !== change.exerciseId ? [ex] : change.keptSets > 0 ? [{ ...ex, sets: change.keptSets, supersetWithNext: undefined }] : []));
      routine = routine.filter((ex) => ex.exerciseId !== change.exerciseId);
    }
  }
  return { today: tidy(today), routine: tidy(routine), changes: changes.length };
}

function swapIn(list: ExercisePrescription[], fromId: string, exercise: ExercisePrescription, keptSets: number, routine = false): ExercisePrescription[] {
  const index = list.findIndex((ex) => ex.exerciseId === fromId);
  if (index < 0 || list.some((ex) => ex.exerciseId === exercise.exerciseId)) return list;
  const slot = list[index]!;
  // In the routine the new exercise keeps the slot's own sets and rest (a REDUCED day's two sets aren't the routine's).
  const incoming: ExercisePrescription = { ...exercise, ...(routine ? { sets: slot.sets } : {}),
    ...(slot.restSeconds !== undefined ? { restSeconds: slot.restSeconds } : {}), ...(slot.supersetWithNext ? { supersetWithNext: true } : {}) };
  const next = [...list];
  if (keptSets > 0) next.splice(index, 1, { ...slot, sets: keptSets, supersetWithNext: undefined }, incoming);
  else next.splice(index, 1, incoming);
  return next;
}

function tidy(list: ExercisePrescription[]): ExercisePrescription[] {
  return list.map((ex, i) => {
    const { supersetWithNext, ...rest } = ex;
    return supersetWithNext && i < list.length - 1 ? { ...rest, supersetWithNext: true } : rest;
  });
}

/**
 * The routine KEEP FOR NEXT TIME saves: the exercises done, in the order done (first working set), then the ones not
 * done, in plan order. Null when nothing differs from the routine as it started (no question at the end).
 */
export function routineToKeep(routineBase: readonly ExercisePrescription[], state: WorkoutPlanState, sets: readonly { exerciseId: string; recordedAt: string; seq?: number; skipped?: boolean; setKind?: string }[]): ExercisePrescription[] | null {
  // First working set per exercise, by time then event sequence (sets logged in the same millisecond keep their order).
  const first = new Map<string, number>();
  const ordered = sets.filter((set) => !set.skipped && set.setKind !== "WARMUP")
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || (a.seq ?? 0) - (b.seq ?? 0));
  ordered.forEach((set, i) => { if (!first.has(set.exerciseId)) first.set(set.exerciseId, i); });
  const done = state.routine.filter((ex) => first.has(ex.exerciseId)).sort((a, b) => first.get(a.exerciseId)! - first.get(b.exerciseId)!);
  const kept = tidy([...done, ...state.routine.filter((ex) => !first.has(ex.exerciseId))]);
  if (kept.length === 0) return null;
  return JSON.stringify(kept) === JSON.stringify(tidy(routineBase.map((ex) => ({ ...ex })))) ? null : kept;
}

/** One swap suggestion: same muscle, with his last numbers when he has them. */
export interface SwapCandidate {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  repRangeLow: number;
  repRangeHigh: number;
  incrementLbs: number;
  mine: boolean;
}
export interface SwapSuggestion extends SwapCandidate {
  last: { weight: number; reps: number; at: string } | null;
}

/**
 * Pure ranker: three moves for the same muscle group, not already in today's plan. Ranked by equipment he has logged
 * working sets with in the last 60 days, then by how recently he did the move itself, then his own before the
 * library, then name.
 */
export function rankSwapSuggestions(input: {
  muscleGroup: string;
  candidates: readonly SwapCandidate[];
  exclude: ReadonlySet<string>;
  recentEquipment: ReadonlySet<string>;
  lastByExercise: ReadonlyMap<string, { weight: number; reps: number; at: string }>;
  limit?: number;
}): SwapSuggestion[] {
  return input.candidates
    .filter((c) => c.muscleGroup === input.muscleGroup && !input.exclude.has(c.exerciseId))
    .map((c) => ({ ...c, last: input.lastByExercise.get(c.exerciseId) ?? null }))
    .sort((a, b) => Number(input.recentEquipment.has(b.equipment)) - Number(input.recentEquipment.has(a.equipment))
      || (b.last?.at ?? "").localeCompare(a.last?.at ?? "")
      || Number(b.mine) - Number(a.mine)
      || a.name.localeCompare(b.name))
    .slice(0, input.limit ?? 3);
}
