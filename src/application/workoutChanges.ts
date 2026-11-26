import { db } from "../persistence/db";
import { logEvent, newId } from "./commands";
import { WORKOUT_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { getSessionRoutinePoint, resolveTemplateExercises } from "./customTemplateQueries";
import { getCustomExercises } from "./exerciseLibraryQueries";
import { getRoutineExerciseChoices, type RoutineExerciseChoice } from "./routineEditQueries";
import { getUndoneSetIds } from "./trainQueries";
import { parseWorkoutPlanChangedPayload } from "../persistence/workoutTemplateValidation";
import { EXERCISE_LIBRARY } from "../domain/workout/exerciseLibrary";
import { TEMPLATE_TO_LIBRARY_ID } from "../domain/workout/exerciseHowTo";
import { isWorkingSet, type ExercisePrescription, type PerformedSet, type WorkoutTemplateId } from "../domain/workout/types";
import type { WorkoutSession } from "../domain/common/types";
import { saveRoutineEdit, type RoutineEditResult } from "./routineEditCommands";
import { createCustomTemplate } from "./customTemplateCommands";
import { hasRememberedRest, restSecondsFor } from "./restMemory";
import {
  projectWorkoutPlan,
  routineToKeep,
  rankSwapSuggestions,
  sessionPlanChanges,
  type SwapCandidate,
  type SwapSuggestion,
  type WorkoutPlanChange,
  type WorkoutPlanChangedPayload,
  type WorkoutPlanState,
} from "../domain/workout/workoutChanges";

/**
 * GRAYSON-WORKOUT-CHANGES-001 (Gavin, 2026-11-25): add, swap and remove in a live workout. Today only: each change is a
 * WORKOUT_PLAN_CHANGED event under the session's lived day; the routine changes only on KEEP FOR NEXT TIME.
 */

const ADDED_SETS = 3;
const RECENT_EQUIPMENT_DAYS = 60;

async function planEvents() {
  return db.events.where("type").equals("WORKOUT_PLAN_CHANGED").toArray();
}

/** Today's plan for a strength workout, and the routine KEEP would save. RECOVERY has none. */
export async function getWorkoutPlan(session: Pick<WorkoutSession, "id" | "startedAt" | "templateId" | "sessionType">): Promise<WorkoutPlanState & { routineBase: ExercisePrescription[] }> {
  if (session.sessionType === "RECOVERY") return { today: [], routine: [], changes: 0, routineBase: [] };
  // GRAYSON-ONE-OFF-001: an empty workout has no routine; today's plan is what he added.
  if (!session.templateId) return { ...projectWorkoutPlan([], [], sessionPlanChanges(await planEvents(), session.id, parseWorkoutPlanChangedPayload)), routineBase: [] };
  const point = await getSessionRoutinePoint(session);
  const templateId = session.templateId as WorkoutTemplateId;
  const [routineBase, todayBase, events] = await Promise.all([
    resolveTemplateExercises(templateId, "STANDARD", point),
    resolveTemplateExercises(templateId, session.sessionType === "REDUCED" ? "REDUCED" : "STANDARD", point),
    planEvents(),
  ]);
  return { ...projectWorkoutPlan(todayBase, routineBase, sessionPlanChanges(events, session.id, parseWorkoutPlanChangedPayload)), routineBase };
}

async function liveSets(sessionId: string): Promise<PerformedSet[]> {
  const [sets, undone] = await Promise.all([db.performedSets.where("sessionId").equals(sessionId).toArray(), getUndoneSetIds()]);
  return (sets as unknown as PerformedSet[]).filter((s) => !undone.has(s.id));
}

const fail = (code: string, words: string) => new Error(`${code}: ${words}`);

async function change(sessionId: string, build: (plan: WorkoutPlanState, sets: PerformedSet[]) => WorkoutPlanChange): Promise<string> {
  return writeAtomically([...WORKOUT_WRITE_TABLES, "customWorkoutTemplates"], async () => {
    const session = await db.workoutSessions.get(sessionId);
    if (!session || session.status !== "ACTIVE") throw fail("WORKOUT_NOT_ACTIVE", "That workout has ended. Nothing changed.");
    if (session.sessionType === "RECOVERY") throw fail("WORKOUT_RECOVERY", "A recovery session has no exercises to change.");
    const plan = await getWorkoutPlan(session);
    const next = build(plan, await liveSets(sessionId));
    const commandId = newId();
    const payload: WorkoutPlanChangedPayload = { commandId, sessionId, change: next };
    return logEvent(session.beyondDayId, "WORKOUT_PLAN_CHANGED", payload, "USER", commandId);
  });
}

const doneSets = (sets: readonly PerformedSet[], exerciseId: string) => sets.filter((s) => s.exerciseId === exerciseId && isWorkingSet(s)).length;

/** A pick from ADD EXERCISE or SWAP, as a prescription: its own rep range and weight step, three sets. */
export function prescriptionFor(choice: Pick<RoutineExerciseChoice, "exerciseId" | "name" | "repRangeLow" | "repRangeHigh" | "incrementLbs">, sets = ADDED_SETS): ExercisePrescription {
  return { exerciseId: choice.exerciseId, name: choice.name, sets, repRangeLow: choice.repRangeLow, repRangeHigh: choice.repRangeHigh, incrementLbs: choice.incrementLbs };
}

export function addExerciseToSession(sessionId: string, choice: Parameters<typeof prescriptionFor>[0]): Promise<string> {
  return change(sessionId, (plan) => {
    if (plan.today.some((ex) => ex.exerciseId === choice.exerciseId)) throw fail("WORKOUT_CHANGE_DUPLICATE", `${choice.name} is already in this workout.`);
    return { kind: "ADD", exercise: prescriptionFor(choice) };
  });
}

/** The swapped-in exercise logs under its own id, so its own history carries on. Sets already done stay. */
export function swapExerciseInSession(sessionId: string, fromExerciseId: string, choice: Parameters<typeof prescriptionFor>[0]): Promise<string> {
  return change(sessionId, (plan, sets) => {
    const slot = plan.today.find((ex) => ex.exerciseId === fromExerciseId);
    if (!slot) throw fail("WORKOUT_CHANGE_GONE", "That exercise isn't in this workout any more. Nothing changed.");
    if (plan.today.some((ex) => ex.exerciseId === choice.exerciseId)) throw fail("WORKOUT_CHANGE_DUPLICATE", `${choice.name} is already in this workout.`);
    const kept = doneSets(sets, fromExerciseId);
    return { kind: "SWAP", fromExerciseId, exercise: prescriptionFor(choice, Math.max(1, slot.sets - kept)), keptSets: kept };
  });
}

/** Its unlogged sets leave today's plan; sets already logged stay. */
export function removeExerciseFromSession(sessionId: string, exerciseId: string): Promise<string> {
  return change(sessionId, (plan, sets) => {
    if (!plan.today.some((ex) => ex.exerciseId === exerciseId)) throw fail("WORKOUT_CHANGE_GONE", "That exercise isn't in this workout any more. Nothing changed.");
    if (plan.today.length === 1 && doneSets(sets, exerciseId) === 0) throw fail("WORKOUT_CHANGE_LAST", "That's the only exercise left. Add another first, or end the workout.");
    return { kind: "REMOVE", exerciseId, keptSets: doneSets(sets, exerciseId) };
  });
}

// ---- Suggestions ---------------------------------------------------------------------------------------------

const libraryById = new Map(EXERCISE_LIBRARY.map((ex) => [ex.id, ex]));
const libraryFor = (exerciseId: string) => libraryById.get(TEMPLATE_TO_LIBRARY_ID[exerciseId] ?? exerciseId);

/** Every move he could swap to: his own, A/B/C's own movements, then the library (no twins by name). */
async function swapCandidates(): Promise<SwapCandidate[]> {
  const [mine, choices] = await Promise.all([getCustomExercises(), getRoutineExerciseChoices()]);
  const own = new Map(mine.map((ex) => [ex.id, ex]));
  return choices.flatMap((c) => {
    const custom = own.get(c.exerciseId);
    const library = libraryFor(c.exerciseId);
    const muscleGroup = custom?.muscleGroup ?? library?.muscleGroup;
    const equipment = custom?.equipment ?? library?.equipment;
    return muscleGroup && equipment ? [{ exerciseId: c.exerciseId, name: c.name, muscleGroup, equipment, repRangeLow: c.repRangeLow, repRangeHigh: c.repRangeHigh, incrementLbs: c.incrementLbs, mine: c.mine }] : [];
  });
}

/** His most recent working set per exercise (any routine), skipping retracted ones. */
async function lastByExercise(): Promise<Map<string, { weight: number; reps: number; at: string }>> {
  const [sets, undone] = await Promise.all([db.performedSets.toArray() as unknown as Promise<PerformedSet[]>, getUndoneSetIds()]);
  const last = new Map<string, { weight: number; reps: number; at: string }>();
  for (const s of sets) {
    if (undone.has(s.id) || !isWorkingSet(s) || s.substitutedName) continue;
    const seen = last.get(s.exerciseId);
    if (!seen || s.recordedAt > seen.at) last.set(s.exerciseId, { weight: s.weight, reps: s.reps, at: s.recordedAt });
  }
  return last;
}

export interface SwapOptions { muscleGroup: string | null; suggestions: SwapSuggestion[] }

/** Three moves for the same muscle group, ranked by equipment he's used in the last 60 days, each with his last numbers. */
export async function getSwapSuggestions(sessionId: string, exerciseId: string, now = new Date()): Promise<SwapOptions> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session) return { muscleGroup: null, suggestions: [] };
  const [candidates, last, plan] = await Promise.all([swapCandidates(), lastByExercise(), getWorkoutPlan(session)]);
  const muscleGroup = candidates.find((c) => c.exerciseId === exerciseId)?.muscleGroup ?? libraryFor(exerciseId)?.muscleGroup ?? null;
  if (!muscleGroup) return { muscleGroup: null, suggestions: [] };
  const since = new Date(now.getTime() - RECENT_EQUIPMENT_DAYS * 86_400_000).toISOString();
  const equipmentOf = new Map(candidates.map((c) => [c.exerciseId, c.equipment]));
  const recentEquipment = new Set([...last].filter(([, l]) => l.at >= since).flatMap(([id]) => (equipmentOf.has(id) ? [equipmentOf.get(id)!] : [])));
  const inPlan = new Set(plan.today.map((ex) => ex.exerciseId));
  return { muscleGroup, suggestions: rankSwapSuggestions({ muscleGroup, candidates, exclude: inPlan, recentEquipment, lastByExercise: last }) };
}

/** ADD EXERCISE: the three he did most recently (not already in today's plan), then everything, his own first. */
export async function getAddChoices(sessionId: string): Promise<{ recent: RoutineExerciseChoice[]; all: RoutineExerciseChoice[] }> {
  const session = await db.workoutSessions.get(sessionId);
  const [all, last, plan] = await Promise.all([getRoutineExerciseChoices(), lastByExercise(), session ? getWorkoutPlan(session) : null]);
  const inPlan = new Set(plan?.today.map((ex) => ex.exerciseId) ?? []);
  const open = all.filter((c) => !inPlan.has(c.exerciseId));
  const recent = open.filter((c) => last.has(c.exerciseId)).sort((a, b) => last.get(b.exerciseId)!.at.localeCompare(last.get(a.exerciseId)!.at)).slice(0, 3);
  return { recent, all: open };
}

/** "Last: 135 lb × 10" for a pick with history, any routine. */
export async function getLastNumbers(): Promise<Map<string, { weight: number; reps: number; at: string }>> {
  return lastByExercise();
}

// ---- The question at the end --------------------------------------------------------------------------------------

/**
 * What KEEP FOR NEXT TIME would save for a finished workout: the routine with today's adds, swaps and removals, in the
 * order done. Null when nothing differs (no question is asked).
 */
export async function getChangesToKeep(sessionId: string): Promise<ExercisePrescription[] | null> {
  const session = await db.workoutSessions.get(sessionId);
  // A one-off has no routine to keep changes in; it offers SAVE AS ROUTINE instead.
  if (!session || session.sessionType === "RECOVERY" || !session.templateId) return null;
  const plan = await getWorkoutPlan(session);
  return routineToKeep(plan.routineBase, plan, await liveSets(sessionId));
}

/** KEEP FOR NEXT TIME: saves through ROUTINE-EDIT-001's command (UNDO there; the programme stays in step). */
export async function keepWorkoutChanges(sessionId: string): Promise<RoutineEditResult> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session || session.status === "ACTIVE") throw fail("WORKOUT_NOT_FINISHED", "Finish the workout first.");
  const exercises = await getChangesToKeep(sessionId);
  if (!exercises) throw fail("ROUTINE_NO_CHANGE", "Nothing changed.");
  return saveRoutineEdit(session.templateId!, { exercises });
}

// ---- GRAYSON-ONE-OFF-001: an empty workout saved as a routine -------------------------------------------------------

/** "Arms · Nov 25": the main muscle groups (by sets done, at most two), then the day it was done. */
export function oneOffRoutineName(groups: readonly string[], startedAt: string): string {
  const date = new Date(startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return groups.length ? `${groups.slice(0, 2).join(" & ")} · ${date}` : `Workout · ${date}`;
}

export interface OneOffRoutineDraft { name: string; exercises: ExercisePrescription[] }

/**
 * What SAVE AS ROUTINE would save for a finished one-off: each exercise he did, in the order done, with the working
 * sets he did, its rep range, and his remembered rest. Null when nothing was logged.
 */
export async function getOneOffRoutineDraft(sessionId: string): Promise<OneOffRoutineDraft | null> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session || session.templateId || session.sessionType === "RECOVERY") return null;
  const [plan, sets, candidates] = await Promise.all([getWorkoutPlan(session), liveSets(sessionId), swapCandidates()]);
  const working = sets.filter((s) => isWorkingSet(s) && !s.substitutedName)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || (a.seq ?? 0) - (b.seq ?? 0));
  const order: string[] = [];
  const count = new Map<string, number>();
  for (const s of working) { if (!count.has(s.exerciseId)) order.push(s.exerciseId); count.set(s.exerciseId, (count.get(s.exerciseId) ?? 0) + 1); }
  const exercises = order.flatMap((id) => {
    const ex = plan.today.find((e) => e.exerciseId === id);
    if (!ex) return [];
    const rest = hasRememberedRest(id) ? restSecondsFor(id) : undefined;
    const { supersetWithNext: _s, restSeconds: _r, ...rest_ } = ex;
    return [{ ...rest_, sets: Math.min(10, count.get(id)!), ...(rest !== undefined ? { restSeconds: rest } : {}) }];
  });
  if (!exercises.length) return null;
  const groupSets = new Map<string, number>();
  for (const ex of exercises) {
    const group = candidates.find((c) => c.exerciseId === ex.exerciseId)?.muscleGroup;
    if (group) groupSets.set(group, (groupSets.get(group) ?? 0) + ex.sets);
  }
  const groups = [...groupSets].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
  return { name: oneOffRoutineName(groups, session.startedAt), exercises };
}

/** SAVE AS ROUTINE: a new routine of his own (not added to his programme). UNDO archives it. */
export async function saveSessionAsRoutine(sessionId: string, name: string): Promise<{ templateId: string }> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session || session.status === "ACTIVE") throw fail("WORKOUT_NOT_FINISHED", "Finish the workout first.");
  if (session.templateId) throw fail("ONE_OFF_HAS_ROUTINE", "This workout already has a routine. Change it with EDIT instead.");
  const draft = await getOneOffRoutineDraft(sessionId);
  if (!draft) throw fail("ONE_OFF_EMPTY", "Nothing was logged, so there's nothing to save.");
  const template = await createCustomTemplate({ name: name.trim() || draft.name, exercises: draft.exercises });
  return { templateId: template.id };
}
