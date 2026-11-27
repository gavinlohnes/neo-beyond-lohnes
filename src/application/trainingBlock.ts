import { db } from "../persistence/db";
import { newId } from "./commands";
import { logIntentEvent } from "./intentCommands";
import { writeAtomically } from "./atomicWrite";
import { getBodyweightHistory } from "./bodyTrendQueries";
import { getCustomTemplates, resolveTemplateExercises } from "./customTemplateQueries";
import { getSchedulePattern } from "./queries";
import { getTrainingProgramme } from "./trainingProgramme";
import { getUndoneSetIds } from "./trainQueries";
import { saveRoutineEdit, undoRoutineEdit } from "./routineEditCommands";
import { getRoutineExerciseChoices } from "./routineEditQueries";
import { setWeekPlanDay, undoWeekPlanChange, type WeekPlanChange } from "./weekPlan";
import { getSameMuscleMove, muscleGroupOf } from "./workoutChanges";
import { getBlockState, lightWeekSessionIds } from "./trainingBlockState";
export { getBlockState, lightWeekSessionIds, isLightSession, type BlockState } from "./trainingBlockState";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { formatLocalDate, isOperatorSavedSchedule, scheduleWeekIndex } from "../engine/scheduledContext";
import { resolveWeekPlanDay } from "../engine/trainingProgrammeResolution";
import { buildExerciseHistories, deloadStall } from "../engine/stall";
import { buildBlockReview, estimatedOneRepMax, type BlockReview, type BlockSuggestion } from "../engine/blockReview";
import { applyRoutineEdit } from "../domain/workout/routineEdit";
import { WORKOUT_TEMPLATES, isWorkingSet, type ExercisePrescription, type PerformedSet } from "../domain/workout/types";
import { WEEK_PLAN_REST } from "../domain/workout/trainingProgramme";
import {
  blockLastDay,
  blockWeekOf,
  DEFAULT_BLOCK_SETTINGS,
  isLightWeek,
  lightSets,
  validateBlock,
  validateBlockSettings,
  type BlockSettings,
  type TrainingBlock,
  type TrainingBlockSetPayload,
} from "../domain/workout/trainingBlock";

/**
 * GRAYSON-BLOCK-CYCLE-001 (Gavin, 2026-11-25). A block he starts, its lighter last week, and the block review. Every
 * change is a TRAINING_BLOCK_SET event (latest wins) with UNDO. The review only suggests; ACCEPT saves through
 * ROUTINE-EDIT-001 or WEEK-PLAN-001 (each with UNDO), SKIP and no answer change nothing.
 */

const DAY_MS = 86_400_000;
const parseDate = (date: string) => { const [y, m, d] = date.split("-").map(Number); return new Date(y!, m! - 1, d!, 16, 30); };
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 16, 30);
const livedDate = (iso: string) => formatLocalDate(mostRecentBoundaryAtOrBefore(new Date(iso)));
const fail = (code: string, words: string) => new Error(`${code}: ${words}`);

async function write(block: TrainingBlock | null, settings: BlockSettings, reason: TrainingBlockSetPayload["reason"], undoesEventId?: string): Promise<string> {
  if (block) { const problem = validateBlock(block); if (problem) throw fail("BLOCK_INVALID", problem); }
  const problem = validateBlockSettings(settings);
  if (problem) throw fail("BLOCK_SETTINGS_INVALID", problem);
  return writeAtomically([], async () => {
    const commandId = newId();
    const payload: TrainingBlockSetPayload = { commandId, block, settings, reason, ...(undoesEventId ? { undoesEventId } : {}) };
    return logIntentEvent("TRAINING_BLOCK_SET", payload, "USER", commandId, {}, undoesEventId);
  });
}

/** The Monday a new block starts: today on a Monday, else the coming Monday (of his lived day). */
export function comingMonday(now: Date): string {
  const today = mostRecentBoundaryAtOrBefore(now);
  return formatLocalDate(addDays(today, (8 - today.getDay()) % 7));
}

/** START A BLOCK: 5 weeks, no focus, lighter last week, by default. */
export async function startBlock(input: { weeks?: number; focus?: string[]; lightLastWeek?: boolean } = {}, now = new Date()): Promise<string> {
  const { settings } = await getBlockState();
  return write({ startDate: comingMonday(now), weeks: input.weeks ?? 5, focus: input.focus ?? [], lightLastWeek: input.lightLastWeek ?? true }, settings, "START");
}

/** Change the running block's length, focus or light week. */
export async function changeBlock(patch: Partial<Pick<TrainingBlock, "weeks" | "focus" | "lightLastWeek">>): Promise<string> {
  const { block, settings } = await getBlockState();
  if (!block) throw fail("BLOCK_NONE", "There's no block running.");
  return write({ ...block, ...patch }, settings, "CHANGE");
}

/** End the block early (it ends after today). */
export async function endBlock(now = new Date()): Promise<string> {
  const { block, settings } = await getBlockState();
  if (!block) throw fail("BLOCK_NONE", "There's no block running.");
  return write({ ...block, endedOn: formatLocalDate(mostRecentBoundaryAtOrBefore(now)) }, settings, "END");
}

/** NORMAL THIS WEEK: full sets again this light week. */
export async function setNormalThisWeek(now = new Date()): Promise<string> {
  const { block, settings } = await getBlockState();
  const week = block ? blockWeekOf(block, mostRecentBoundaryAtOrBefore(now)) : null;
  if (!block || week === null) throw fail("BLOCK_NONE", "There's no block this week.");
  return write({ ...block, normalWeeks: [...new Set([...(block.normalWeeks ?? []), week])] }, settings, "NORMAL_WEEK");
}

export async function saveBlockSettings(settings: BlockSettings): Promise<string> {
  const { block } = await getBlockState();
  return write(block, settings, "SETTINGS");
}
export function resetBlockSettings(): Promise<string> { return saveBlockSettings(structuredClone(DEFAULT_BLOCK_SETTINGS)); }

/** NEXT BLOCK: the same settings, starting the Monday after this one ends; review drops carry over. */
export async function nextBlock(now = new Date()): Promise<string> {
  const { block, settings } = await getBlockState();
  if (!block) throw fail("BLOCK_NONE", "There's no block to follow.");
  const start = block.endedOn ? comingMonday(addDays(parseDate(block.endedOn), 1)) : formatLocalDate(addDays(blockLastDay(block), 1));
  const startDate = start < comingMonday(now) ? comingMonday(now) : start;
  return write({ startDate, weeks: block.weeks, focus: block.focus, lightLastWeek: block.lightLastWeek, ...(block.weightDrops ? { weightDrops: block.weightDrops } : {}) }, settings, "NEXT");
}

/** UNDO the newest block change: back to what was there before it. */
export async function undoBlockChange(eventId: string): Promise<string> {
  const { history, latestEventId } = await getBlockState();
  if (latestEventId !== eventId) throw fail("BLOCK_UNDO_STALE", "Your block has changed since. Change it directly instead.");
  const index = history.findIndex((h) => h.eventId === eventId);
  const before = index > 0 ? history[index - 1]!.payload : null;
  return write(before?.block ?? null, before?.settings ?? DEFAULT_BLOCK_SETTINGS, "UNDO", eventId);
}

// ---- What TRAIN shows ----------------------------------------------------------------------------------------------

export interface BlockView {
  block: TrainingBlock | null;
  settings: BlockSettings;
  /** "Block · week 3 of 5", or null outside a block (before it starts it says when). */
  line: string | null;
  week: number | null;
  lightToday: boolean;
  /** The review is open from the block's last day (or the day he ended it). */
  reviewReady: boolean;
  latestEventId: string | null;
}

export async function getBlockView(now = new Date()): Promise<BlockView> {
  const state = await getBlockState();
  const today = mostRecentBoundaryAtOrBefore(now);
  const { block } = state;
  if (!block) return { block: null, settings: state.settings, line: null, week: null, lightToday: false, reviewReady: false, latestEventId: state.latestEventId };
  const week = blockWeekOf(block, today);
  const todayKey = formatLocalDate(today);
  const last = block.endedOn ?? formatLocalDate(blockLastDay(block));
  const line = week !== null ? `Block · week ${week} of ${block.weeks}${isLightWeek(block, today) ? " · light week" : ""}`
    : todayKey < block.startDate ? `Block starts ${parseDate(block.startDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}` : "Block finished";
  return { block, settings: state.settings, line, week, lightToday: isLightWeek(block, today), reviewReady: todayKey >= last, latestEventId: state.latestEventId };
}

/** The light week's prescription for today: same exercises and weights, fewer sets. Never the saved routine. */
export function applyLightWeek(exercises: readonly ExercisePrescription[], settings: BlockSettings): ExercisePrescription[] {
  return exercises.map((ex) => ({ ...ex, sets: lightSets(ex.sets, settings.lightFraction) }));
}

// ---- The review ----------------------------------------------------------------------------------------------------

const TRICEPS = /tricep|pressdown|skull|dip|extension/i;
const TRAPS = /shrug|face pull|upright row|reverse pec|rear delt|row/i;
/** Does an exercise count as direct work for a focus area? Triceps and traps by name, the rest by muscle group. */
function countsFor(area: string, name: string, group: string | null): boolean {
  if (area === "Triceps") return group === "Arms" && TRICEPS.test(name);
  if (area === "Traps") return TRAPS.test(name);
  if (area === "Legs") return group === "Legs" || group === "Glutes";
  return group === area;
}

export interface BlockReviewView extends BlockReview { block: TrainingBlock; through: string }

export async function getBlockReview(now = new Date()): Promise<BlockReviewView | null> {
  const { block, settings } = await getBlockState();
  if (!block) return null;
  const today = mostRecentBoundaryAtOrBefore(now);
  const start = parseDate(block.startDate);
  const lastPlanned = blockLastDay(block);
  const end = new Date(Math.min(today.getTime(), (block.endedOn ? parseDate(block.endedOn) : lastPlanned).getTime()));
  const inBlock = (iso: string) => { const d = livedDate(iso); return d >= block.startDate && d <= formatLocalDate(end); };

  const [sessions, rawSets, undone, light, custom, programme, schedule, weights] = await Promise.all([
    db.workoutSessions.toArray(), db.performedSets.toArray() as unknown as Promise<PerformedSet[]>, getUndoneSetIds(), lightWeekSessionIds(),
    getCustomTemplates({ includeArchived: true }), getTrainingProgramme(), getSchedulePattern(), getBodyweightHistory(),
  ]);
  const sets = rawSets.filter((s) => !undone.has(s.id) && isWorkingSet(s) && !s.substitutedName);
  const finished = sessions.filter((s) => (s.status === "COMPLETED" || s.status === "PARTIAL") && s.sessionType !== "RECOVERY");
  const worked = new Set(sets.map((s) => s.sessionId));
  const done = finished.filter((s) => inBlock(s.startedAt) && worked.has(s.id));
  const doneDates = new Set(done.map((s) => livedDate(s.startedAt)));

  // Planned days from his week plan (none without one).
  let planned: number | null = null;
  const skippedByWeekday: Record<string, number> = {};
  if (programme.programme?.mode === "WEEK_PLAN") {
    planned = 0;
    const saved = isOperatorSavedSchedule(schedule);
    for (let day = start; day.getTime() <= end.getTime(); day = addDays(day, 1)) {
      const value = resolveWeekPlanDay(programme.programme, day, saved ? scheduleWeekIndex(day, schedule) : 0).value;
      if (value === WEEK_PLAN_REST) continue;
      planned++;
      if (!doneDates.has(formatLocalDate(day))) skippedByWeekday[String(day.getDay())] = (skippedByWeekday[String(day.getDay())] ?? 0) + 1;
    }
  }

  // Routines he trained in the block, and their first exercise (the main lift).
  const routineIds = [...new Set(done.map((s) => s.templateId).filter((id): id is string => !!id))];
  const routineName = (id: string) => (Object.hasOwn(WORKOUT_TEMPLATES, id) ? `Workout ${id}` : custom.find((t) => t.id === id)?.name ?? "A routine");
  const routines = await Promise.all(routineIds.map(async (id) => ({ id, name: routineName(id), exercises: await resolveTemplateExercises(id, "STANDARD") })));
  const firstWeekEnd = addDays(start, 7);
  const lastWeekStart = addDays(end, -6);
  const best = (exerciseId: string, from: Date, to: Date) => {
    let top: number | null = null;
    for (const s of sets) {
      if (s.exerciseId !== exerciseId) continue;
      const t = new Date(s.recordedAt).getTime();
      if (t < from.getTime() - DAY_MS || t > to.getTime() + DAY_MS) continue;
      const e = estimatedOneRepMax(s.weight, s.reps);
      if (e !== null && (top === null || e > top)) top = e;
    }
    return top;
  };
  const mainLifts = routines.flatMap((r) => r.exercises[0] ? [{ routineName: r.name, name: r.exercises[0].name,
    start: best(r.exercises[0].exerciseId, start, firstWeekEnd), end: best(r.exercises[0].exerciseId, lastWeekStart, end) }] : []);

  // Stalls: deloadStall on every exercise of those routines (light-week sessions left out).
  const histories = buildExerciseHistories(finished.filter((s) => !light.has(s.id)).map((s) => ({ sessionId: s.id, startedAt: s.startedAt })), sets);
  const stalls: Parameters<typeof buildBlockReview>[0]["stalls"][number][] = [];
  for (const r of routines) for (const ex of r.exercises) {
    const history = histories.get(ex.exerciseId);
    if (!history || !deloadStall(history, now) || stalls.some((s) => s.exerciseId === ex.exerciseId)) continue;
    const move = await getSameMuscleMove(ex.exerciseId, new Set(r.exercises.map((e) => e.exerciseId)), now);
    stalls.push({ routineId: r.id, routineName: r.name, exerciseId: ex.exerciseId, name: ex.name, swapTo: move ? { exerciseId: move.exerciseId, name: move.name } : null });
  }

  // Trend weight: the average of each week's weigh-ins (as weeklyQueries does), only with both weeks logged.
  const avg = (from: Date, to: Date) => { const w = weights.filter((x) => { const t = new Date(x.recordedAt).getTime(); return t >= from.getTime() - DAY_MS && t <= to.getTime() + DAY_MS; }).map((x) => x.weightLbs); return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null; };
  const wStart = avg(start, firstWeekEnd);
  const wEnd = avg(lastWeekStart, end);
  const weight = wStart !== null && wEnd !== null ? { start: wStart, end: wEnd } : null;

  // Focus: direct working sets a week for each area, and the first exercise that counts for it.
  const weeksElapsed = Math.max(1, Math.ceil((end.getTime() - start.getTime() + DAY_MS) / (7 * DAY_MS)));
  const doneIds = new Set(done.map((s) => s.id));
  const groupCache = new Map<string, string | null>();
  const group = async (id: string) => { if (!groupCache.has(id)) groupCache.set(id, await muscleGroupOf(id)); return groupCache.get(id)!; };
  const names = new Map(routines.flatMap((r) => r.exercises.map((e) => [e.exerciseId, e.name] as const)));
  const focusSets = await Promise.all(block.focus.map(async (area) => {
    let count = 0;
    for (const s of sets) if (doneIds.has(s.sessionId) && countsFor(area, names.get(s.exerciseId) ?? "", await group(s.exerciseId))) count++;
    let first: { routineId: string; exerciseId: string; name: string } | null = null;
    for (const r of routines) for (const ex of r.exercises) if (!first && countsFor(area, ex.name, await group(ex.exerciseId))) first = { routineId: r.id, exerciseId: ex.exerciseId, name: ex.name };
    return { area, setsPerWeek: count / weeksElapsed, firstExercise: first };
  }));

  const review = buildBlockReview({ settings, focus: block.focus, sessions: { done: done.length, planned, skippedByWeekday }, mainLifts, stalls, weight, focusSets });
  return { ...review, block, through: formatLocalDate(end) };
}

// ---- ACCEPT ------------------------------------------------------------------------------------------------------

export type AcceptUndo = { kind: "ROUTINE"; eventId: string } | { kind: "WEEK"; changes: WeekPlanChange[] } | { kind: "BLOCK"; eventId: string } | { kind: "NONE" };

/** ACCEPT one suggestion: saves through the routine or week commands. KEEP changes nothing. */
export async function acceptBlockSuggestion(s: BlockSuggestion, now = new Date()): Promise<AcceptUndo> {
  if (s.kind === "KEEP") return { kind: "NONE" };
  if (s.kind === "SWAP" || s.kind === "ADD_SET") {
    const exercises = await resolveTemplateExercises(s.routineId, "STANDARD");
    const index = exercises.findIndex((e) => e.exerciseId === s.exerciseId);
    if (index < 0) throw fail("BLOCK_SUGGESTION_STALE", "That routine has changed since. Nothing changed.");
    let next: ExercisePrescription[];
    if (s.kind === "SWAP") {
      const to = (await getRoutineExerciseChoices()).find((c) => c.exerciseId === s.to.exerciseId);
      if (!to) throw fail("BLOCK_SUGGESTION_STALE", `${s.to.name} isn't available any more. Nothing changed.`);
      next = applyRoutineEdit(exercises, { kind: "SWAP", index, with: { exerciseId: to.exerciseId, name: to.name, repRangeLow: to.repRangeLow, repRangeHigh: to.repRangeHigh, incrementLbs: to.incrementLbs } });
    } else {
      next = applyRoutineEdit(exercises, { kind: "SET", index, change: { sets: Math.min(10, exercises[index]!.sets + 1) } });
    }
    return { kind: "ROUTINE", eventId: (await saveRoutineEdit(s.routineId, { exercises: next })).eventId };
  }
  if (s.kind === "FEWER_DAYS") {
    // Rest on that weekday in every week of his plan (one EVERY WEEK change per week of the cycle).
    const programme = await getTrainingProgramme();
    if (programme.programme?.mode !== "WEEK_PLAN") throw fail("BLOCK_SUGGESTION_STALE", "Your week plan has changed since. Nothing changed.");
    const changes: WeekPlanChange[] = [];
    const today = mostRecentBoundaryAtOrBefore(now);
    const first = addDays(today, (Number(s.weekday) - today.getDay() + 7) % 7 || 7);
    for (let w = 0; w < programme.programme.weeks.length; w++) changes.push(await setWeekPlanDay(formatLocalDate(addDays(first, 7 * w)), WEEK_PLAN_REST, "EVERY_WEEK", now));
    return { kind: "WEEK", changes };
  }
  // DROP: start that lift lighter in this block until he logs it.
  const { block, settings } = await getBlockState();
  if (!block) throw fail("BLOCK_NONE", "There's no block.");
  return { kind: "BLOCK", eventId: await write({ ...block, weightDrops: { ...(block.weightDrops ?? {}), [s.exerciseId]: s.percent } }, settings, "CHANGE") };
}

export async function undoBlockSuggestion(undo: AcceptUndo): Promise<void> {
  if (undo.kind === "ROUTINE") await undoRoutineEdit(undo.eventId);
  else if (undo.kind === "WEEK") for (const change of [...undo.changes].reverse()) await undoWeekPlanChange(change);
  else if (undo.kind === "BLOCK") await undoBlockChange(undo.eventId);
}

/** A lift's pre-fill weight in this block after an accepted DROP, until he logs it in the block. */
export async function blockStartWeight(exerciseId: string, lastWeight: number, incrementLbs: number, now = new Date()): Promise<number | null> {
  const { block } = await getBlockState();
  const percent = block?.weightDrops?.[exerciseId];
  if (!block || !percent || blockWeekOf(block, mostRecentBoundaryAtOrBefore(now)) === null) return null;
  const logged = ((await db.performedSets.where("exerciseId").equals(exerciseId).toArray()) as unknown as PerformedSet[]).some((s) => livedDate(s.recordedAt) >= block.startDate);
  if (logged) return null;
  const step = incrementLbs > 0 ? incrementLbs : 5;
  return Math.max(0, Math.floor((lastWeight * (1 - percent / 100)) / step) * step);
}
