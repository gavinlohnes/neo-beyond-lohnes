// Domain layer must not import React, Dexie, or UI code.
import type { DomainEvent } from "../common/types";
import { EXERCISE_LIBRARY } from "./exerciseLibrary";
import { WORKOUT_TEMPLATES, type ExercisePrescription } from "./types";

/**
 * GRAYSON-ROUTINE-EDIT-001 (Gavin, 2026-11-25: "I should be able to edit and tweak or correct everything in this
 * app."). One routine editor for every routine, the built-in A, B and C included.
 *
 * - A, B and C: the code's `WORKOUT_TEMPLATES` never change. An edit is a `ROUTINE_EDITED` override event and the
 *   latest one wins; RESET TO ORIGINAL writes the code's version back as a new event. Exercise ids are kept, so history
 *   and progression stay continuous.
 * - His own routines: the record changes in place, as before, and the same event keeps the version it replaced, so
 *   UNDO and "back to as first saved" work.
 */

export const ROUTINE_SETS_MIN = 1;
export const ROUTINE_SETS_MAX = 10;
export const ROUTINE_REPS_MIN = 1;
export const ROUTINE_REPS_MAX = 50;
/** The rest memory's own bounds (application/restMemory.ts). */
export const ROUTINE_REST_MIN_SECONDS = 15;
export const ROUTINE_REST_MAX_SECONDS = 600;
export const ROUTINE_EXERCISES_MAX = 30;

export interface RoutineVersion {
  /** His own routines only; A, B and C keep their letter. */
  name?: string;
  exercises: ExercisePrescription[];
}

export interface RoutineEditedPayload {
  commandId: string;
  templateId: string;
  /** The routine from this event on. */
  exercises: ExercisePrescription[];
  name?: string;
  /** What it was just before, so UNDO and a reset never guess. */
  previous: RoutineVersion;
  reason: "EDIT" | "RESET" | "UNDO";
  /** On an UNDO, the edit it takes back. */
  undoesEventId?: string;
}

export const isBuiltInRoutine = (templateId: string): boolean => Object.hasOwn(WORKOUT_TEMPLATES, templateId);

/** The code's own version of A, B or C. */
export function originalBuiltInExercises(templateId: string): ExercisePrescription[] | null {
  return isBuiltInRoutine(templateId) ? structuredClone(WORKOUT_TEMPLATES[templateId]!.exercises) : null;
}

/** Plain words, or null when the routine can be saved. */
export function validateRoutineExercises(exercises: readonly ExercisePrescription[]): string | null {
  if (exercises.length === 0) return "A routine needs at least one exercise.";
  if (exercises.length > ROUTINE_EXERCISES_MAX) return `A routine can hold at most ${ROUTINE_EXERCISES_MAX} exercises.`;
  const ids = new Set<string>();
  for (const ex of exercises) {
    if (!ex.exerciseId || !ex.name.trim()) return "Every exercise needs a name.";
    if (ids.has(ex.exerciseId)) return `${ex.name} is in this routine twice.`;
    ids.add(ex.exerciseId);
    if (!Number.isInteger(ex.sets) || ex.sets < ROUTINE_SETS_MIN || ex.sets > ROUTINE_SETS_MAX) return `${ex.name}: sets go from ${ROUTINE_SETS_MIN} to ${ROUTINE_SETS_MAX}.`;
    for (const reps of [ex.repRangeLow, ex.repRangeHigh]) {
      if (!Number.isInteger(reps) || reps < ROUTINE_REPS_MIN || reps > ROUTINE_REPS_MAX) return `${ex.name}: reps go from ${ROUTINE_REPS_MIN} to ${ROUTINE_REPS_MAX}.`;
    }
    if (ex.repRangeLow > ex.repRangeHigh) return `${ex.name}: the low end of the rep range can't be above the high end.`;
    if (ex.restSeconds !== undefined && (!Number.isInteger(ex.restSeconds) || ex.restSeconds < ROUTINE_REST_MIN_SECONDS || ex.restSeconds > ROUTINE_REST_MAX_SECONDS)) {
      return `${ex.name}: rest goes from 0:15 to 10:00.`;
    }
    if (!Number.isFinite(ex.incrementLbs) || ex.incrementLbs < 0) return `${ex.name}: the weight step is missing.`;
  }
  return null;
}

export type RoutineEditOp =
  | { kind: "MOVE"; index: number; by: -1 | 1 }
  | { kind: "REMOVE"; index: number }
  | { kind: "SWAP"; index: number; with: Pick<ExercisePrescription, "exerciseId" | "name" | "repRangeLow" | "repRangeHigh" | "incrementLbs"> }
  | { kind: "ADD"; exercise: Pick<ExercisePrescription, "exerciseId" | "name" | "repRangeLow" | "repRangeHigh" | "incrementLbs">; sets?: number }
  | { kind: "SET"; index: number; change: Partial<Pick<ExercisePrescription, "sets" | "repRangeLow" | "repRangeHigh" | "restSeconds" | "supersetWithNext">> };

const DEFAULT_ADDED_SETS = 3;

/**
 * Pure: the routine after one change in the editor. A move keeps the exercise's own sets, reps and rest. A swap keeps
 * the slot's sets and rest but takes the new exercise's id, name, rep range and weight step, so it never inherits the
 * old exercise's history. The last exercise can't be "superset with next".
 */
export function applyRoutineEdit(exercises: readonly ExercisePrescription[], op: RoutineEditOp): ExercisePrescription[] {
  const next = exercises.map((ex) => ({ ...ex }));
  const at = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= next.length) throw new Error("ROUTINE_EDIT_INDEX: That exercise isn't in the routine.");
    return next[index]!;
  };
  switch (op.kind) {
    case "MOVE": {
      at(op.index);
      const to = op.index + op.by;
      if (to < 0 || to >= next.length) return tidy(next);
      [next[op.index], next[to]] = [next[to]!, next[op.index]!];
      break;
    }
    case "REMOVE":
      at(op.index);
      next.splice(op.index, 1);
      break;
    case "SWAP": {
      const slot = at(op.index);
      if (next.some((ex, i) => i !== op.index && ex.exerciseId === op.with.exerciseId)) throw new Error(`ROUTINE_EDIT_DUPLICATE: ${op.with.name} is already in this routine.`);
      next[op.index] = {
        exerciseId: op.with.exerciseId, name: op.with.name, sets: slot.sets,
        repRangeLow: op.with.repRangeLow, repRangeHigh: op.with.repRangeHigh, incrementLbs: op.with.incrementLbs,
        ...(slot.restSeconds !== undefined ? { restSeconds: slot.restSeconds } : {}),
        ...(slot.supersetWithNext ? { supersetWithNext: true } : {}),
      };
      break;
    }
    case "ADD":
      if (next.some((ex) => ex.exerciseId === op.exercise.exerciseId)) throw new Error(`ROUTINE_EDIT_DUPLICATE: ${op.exercise.name} is already in this routine.`);
      next.push({ exerciseId: op.exercise.exerciseId, name: op.exercise.name, sets: op.sets ?? DEFAULT_ADDED_SETS,
        repRangeLow: op.exercise.repRangeLow, repRangeHigh: op.exercise.repRangeHigh, incrementLbs: op.exercise.incrementLbs });
      break;
    case "SET": {
      const slot = at(op.index);
      const { restSeconds, supersetWithNext, ...numbers } = op.change;
      Object.assign(slot, numbers);
      if ("restSeconds" in op.change) {
        if (restSeconds === undefined) delete slot.restSeconds; else slot.restSeconds = restSeconds;
      }
      if ("supersetWithNext" in op.change) {
        if (supersetWithNext) slot.supersetWithNext = true; else delete slot.supersetWithNext;
      }
      break;
    }
  }
  return tidy(next);
}

function tidy(exercises: ExercisePrescription[]): ExercisePrescription[] {
  const last = exercises.at(-1);
  if (last?.supersetWithNext) delete last.supersetWithNext;
  return exercises;
}

export function sameRoutine(a: RoutineVersion, b: RoutineVersion): boolean {
  return JSON.stringify(a.exercises) === JSON.stringify(b.exercises) && (a.name ?? null) === (b.name ?? null);
}

const byOrder = (a: DomainEvent, b: DomainEvent) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER) || a.recordedAt.localeCompare(b.recordedAt);

/** One usable edit, in causal order. `parse` rejects a malformed payload (application passes the zod schema). */
export interface RoutineEditEntry {
  eventId: string;
  seq: number | null;
  recordedAt: string;
  payload: RoutineEditedPayload;
}

export function routineEditEntries(events: readonly DomainEvent[], parse: (payload: unknown) => RoutineEditedPayload | null): RoutineEditEntry[] {
  return events
    .filter((event) => event.type === "ROUTINE_EDITED" && event.source === "USER")
    .sort(byOrder)
    .flatMap((event) => {
      const payload = parse(event.payload);
      return payload ? [{ eventId: event.id, seq: event.seq ?? null, recordedAt: event.recordedAt, payload }] : [];
    });
}

/** True when the edit happened at or after a point (an event's seq, else its recorded time). */
const atOrAfter = (entry: RoutineEditEntry, point: { seq?: number | undefined; at: string }) =>
  entry.seq !== null && point.seq !== undefined ? entry.seq > point.seq : entry.recordedAt >= point.at;

/**
 * The exercises of A, B or C in force, or in force at a point (a workout's start), with the edit that set them.
 * No usable override means the code's version.
 */
export function builtInRoutineAt(templateId: string, entries: readonly RoutineEditEntry[], before?: { seq?: number | undefined; at: string }): { exercises: ExercisePrescription[]; latest: RoutineEditEntry | null } {
  const original = originalBuiltInExercises(templateId);
  if (!original) throw new Error(`UNKNOWN_BUILT_IN_TEMPLATE: "${templateId}" is not one of the fixed A/B/C templates.`);
  let latest: RoutineEditEntry | null = null;
  for (const entry of entries) {
    if (entry.payload.templateId !== templateId) continue;
    if (before && atOrAfter(entry, before)) break;
    latest = entry;
  }
  return { exercises: latest ? structuredClone(latest.payload.exercises) : original, latest };
}

/**
 * His own routine as it was at a point: the version the first edit after that point replaced, else the record as it
 * is now. An edit saved during a workout applies from the next one.
 */
export function customRoutineAt(templateId: string, current: RoutineVersion, entries: readonly RoutineEditEntry[], at: { seq?: number | undefined; at: string }): RoutineVersion {
  const after = entries.find((entry) => entry.payload.templateId === templateId && atOrAfter(entry, at));
  return after ? structuredClone(after.payload.previous) : current;
}

/** The newest edit of one routine (the one UNDO takes back), and the version first saved. */
export function routineEditState(templateId: string, entries: readonly RoutineEditEntry[]): { latest: RoutineEditEntry | null; firstSaved: RoutineVersion | null } {
  const mine = entries.filter((entry) => entry.payload.templateId === templateId);
  return { latest: mine.at(-1) ?? null, firstSaved: mine[0] ? structuredClone(mine[0].payload.previous) : null };
}

/** Names for every fixed exercise id that can be in a routine: A, B and C, then the bundled library. */
export function fixedExerciseNames(): Map<string, string> {
  const names = new Map<string, string>();
  for (const ex of EXERCISE_LIBRARY) names.set(ex.id, ex.name);
  for (const template of Object.values(WORKOUT_TEMPLATES)) for (const ex of template.exercises) names.set(ex.exerciseId, ex.name);
  return names;
}
