import { db } from "../persistence/db";
import { parseStretchRoutinesPayload } from "../persistence/stretchRoutineValidation";
import { readStretchSuggestSettings, type StretchSuggestSettings } from "../persistence/stretchSuggestPreference";
import { STARTER_ORDER, STARTER_ROUTINES, stretchRoutineProblem, type StarterRoutineId, type StretchRoutine } from "../domain/workout/stretchLibrary";
import { formatLocalDate, isOperatorSavedSchedule, livedDayShiftWindow, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { deriveSleepRhythm } from "../engine/sleepRhythm";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { writeAtomically } from "./atomicWrite";
import { logIntentEvent } from "./intentCommands";
import { newId } from "./commands";
import { getActiveDay, getSchedulePattern, getWorkPeriodEnded } from "./queries";
import { getImportedSleep } from "./externalSleepQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getConfirmedKinds } from "./scheduleExceptions";

export { readStretchSuggestSettings, writeStretchSuggestSettings, DEFAULT_STRETCH_SUGGEST, type StretchSuggestSettings } from "../persistence/stretchSuggestPreference";

/**
 * GRAYSON-HOME-STRETCH-001 slice B (Gavin, 2026-11-26): his stretch routines. The whole list rides on one global
 * STRETCH_ROUTINES_SET event (like TRAIN_PROGRAM_SET), so it's in backups and the export; the newest valid one wins.
 * With none, the three starters. He can edit, delete and add; RESET brings a starter back as it shipped.
 */
export interface StretchRoutineList { id: string | null; routines: StretchRoutine[] }

const starters = (): StretchRoutine[] => STARTER_ORDER.map((k) => structuredClone(STARTER_ROUTINES[k]));
const byOrder = (a: { seq?: number; recordedAt: string }, b: { seq?: number; recordedAt: string }) => (a.seq ?? 0) - (b.seq ?? 0) || a.recordedAt.localeCompare(b.recordedAt);

export async function getStretchRoutines(): Promise<StretchRoutineList> {
  const events = (await db.events.where("type").equals("STRETCH_ROUTINES_SET").toArray()).sort(byOrder);
  for (let i = events.length - 1; i >= 0; i--) {
    const parsed = parseStretchRoutinesPayload(events[i]!.payload);
    if (parsed) return { id: events[i]!.id, routines: parsed.routines };
  }
  return { id: null, routines: starters() };
}

/** Save the whole list; refused if it changed since he opened it, or if any routine isn't valid. */
export async function saveStretchRoutines(routines: readonly StretchRoutine[], expectedPreviousId: string | null): Promise<StretchRoutineList> {
  for (const r of routines) {
    const problem = stretchRoutineProblem(r);
    if (problem) throw new Error(`${r.name.trim() || "A routine"}: ${problem}`);
  }
  if (new Set(routines.map((r) => r.id)).size !== routines.length) throw new Error("Two routines share an id. Reopen and try again.");
  return writeAtomically([], async () => {
    const current = await getStretchRoutines();
    if (current.id !== expectedPreviousId) throw new Error("Your stretch routines changed. Look again before saving.");
    const commandId = newId();
    const clean = routines.map((r) => ({ id: r.id, name: r.name.trim(), steps: r.steps.map((s) => ({ ...s })), ...(r.starter ? { starter: r.starter } : {}) }));
    const id = await logIntentEvent("STRETCH_ROUTINES_SET", { commandId, previousId: current.id, routines: clean }, "USER", commandId, {}, current.id ?? undefined);
    return { id, routines: clean };
  });
}

export const newStretchRoutineId = () => `own-${newId()}`;

/** One routine saved (added, or replacing the one with its id). */
export async function saveStretchRoutine(routine: StretchRoutine, expectedPreviousId: string | null): Promise<StretchRoutineList> {
  const { routines } = await getStretchRoutines();
  const i = routines.findIndex((r) => r.id === routine.id);
  const next = i < 0 ? [...routines, routine] : routines.map((r, j) => (j === i ? routine : r));
  return saveStretchRoutines(next, expectedPreviousId);
}

export async function deleteStretchRoutine(id: string, expectedPreviousId: string | null): Promise<StretchRoutineList> {
  const { routines } = await getStretchRoutines();
  return saveStretchRoutines(routines.filter((r) => r.id !== id), expectedPreviousId);
}

/** RESET: the starter as it shipped, in its place (or back at the end if he deleted it). */
export async function resetStarterRoutine(starter: StarterRoutineId, expectedPreviousId: string | null): Promise<StretchRoutineList> {
  const { routines } = await getStretchRoutines();
  const fresh = structuredClone(STARTER_ROUTINES[starter]);
  const i = routines.findIndex((r) => r.starter === starter);
  return saveStretchRoutines(i < 0 ? [...routines, fresh] : routines.map((r, j) => (j === i ? fresh : r)), expectedPreviousId);
}

// ---- Fits the hour --------------------------------------------------------------------------------------------

export interface StretchSuggestion { routine: StretchRoutine; why: string }

const HOUR = 3_600_000;
const clock = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
function nextAtClock(from: Date, minutes: number): Date {
  const at = new Date(from.getFullYear(), from.getMonth(), from.getDate(), Math.floor(minutes / 60), minutes % 60);
  return at.getTime() >= from.getTime() ? at : new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, at.getHours(), at.getMinutes());
}

export interface StretchSuggestInput {
  now: Date;
  settings: StretchSuggestSettings;
  /** When his last shift ended (recorded, else scheduled), if one has. */
  shiftEndedAt: Date | null;
  /** His usual sleep start next, from his own sleep rhythm for this kind of day. */
  sleepStartsAt: Date | null;
  /** When his last strength workout finished. */
  liftedAt: Date | null;
}

/**
 * Pure: within N hours after a shift ends, After shift; within N hours before his usual sleep, Before sleep; within N
 * hours after a finished workout, After lifting. When more than one fits, the one whose time is nearest now. Says why.
 */
export function pickStretchSuggestion(input: StretchSuggestInput): { starter: StarterRoutineId; why: string } | null {
  const { now, settings } = input;
  if (!settings.on) return null;
  const t = now.getTime();
  const options: { starter: StarterRoutineId; distance: number; why: string }[] = [];
  if (input.shiftEndedAt && t >= input.shiftEndedAt.getTime() && t - input.shiftEndedAt.getTime() <= settings.afterShiftHours * HOUR) {
    options.push({ starter: "AFTER_SHIFT", distance: t - input.shiftEndedAt.getTime(), why: `Your shift ended at ${clock(input.shiftEndedAt)}.` });
  }
  if (input.sleepStartsAt && input.sleepStartsAt.getTime() >= t && input.sleepStartsAt.getTime() - t <= settings.beforeSleepHours * HOUR) {
    options.push({ starter: "BEFORE_SLEEP", distance: input.sleepStartsAt.getTime() - t, why: `You usually sleep at ${clock(input.sleepStartsAt)}.` });
  }
  if (input.liftedAt && t >= input.liftedAt.getTime() && t - input.liftedAt.getTime() <= settings.afterLiftingHours * HOUR) {
    options.push({ starter: "AFTER_LIFTING", distance: t - input.liftedAt.getTime(), why: `You finished lifting at ${clock(input.liftedAt)}.` });
  }
  options.sort((a, b) => a.distance - b.distance);
  return options[0] ? { starter: options[0].starter, why: options[0].why } : null;
}

/** TRAIN's suggestion, read from the shift, sleep and workout times the app already has. Null: just the list. */
export async function getStretchSuggestion(now: Date = new Date()): Promise<StretchSuggestion | null> {
  const settings = readStretchSuggestSettings();
  if (!settings.on) return null;
  const [{ routines }, pattern, confirmed, day, sleeps, summaries, sessions] = await Promise.all([
    getStretchRoutines(), getSchedulePattern(), getConfirmedKinds().catch(() => new Map<string, "WORK" | "OFF">()), getActiveDay(),
    getImportedSleep().catch(() => []), getDaySummaries().catch(() => []), db.workoutSessions.toArray(),
  ]);

  // The last shift's end: recorded MARK WORK ENDED on the active day, else the schedule's end for this lived day or
  // the one before (not on a day confirmed off).
  let shiftEndedAt: Date | null = null;
  const ended = day ? await getWorkPeriodEnded(day.id).catch(() => undefined) : undefined;
  if (ended) shiftEndedAt = new Date(ended.occurredAt);
  else if (isOperatorSavedSchedule(pattern)) {
    const today = mostRecentBoundaryAtOrBefore(now);
    for (const offset of [0, -1]) {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 16, 30);
      if (confirmed.get(formatLocalDate(start)) === "OFF") continue;
      const w = livedDayShiftWindow(start, pattern);
      if (w && w.end.getTime() <= now.getTime()) { shiftEndedAt = w.end; break; }
    }
  }

  // His usual sleep start for this kind of day, from his own Garmin rhythm.
  const kind: "WORK" | "OFF" | null = day?.workContext === "WORK" || day?.workContext === "OFF" ? day.workContext
    : isOperatorSavedSchedule(pattern) ? scheduledWorkContextForLivedDay(mostRecentBoundaryAtOrBefore(now), pattern) : null;
  const rhythm = deriveSleepRhythm(sleeps.map((r) => r.evidence), summaries, now);
  const group = kind ? rhythm.groups.find((g) => g.kind === kind) : undefined;
  const sleepStartsAt = group ? nextAtClock(now, group.start) : null;

  const lifted = sessions
    .filter((s) => s.sessionType !== "RECOVERY" && (s.status === "COMPLETED" || s.status === "PARTIAL") && s.endedAt)
    .map((s) => Date.parse(s.endedAt!)).filter((t) => t <= now.getTime()).sort((a, b) => b - a)[0];

  const pick = pickStretchSuggestion({ now, settings, shiftEndedAt, sleepStartsAt, liftedAt: lifted ? new Date(lifted) : null });
  if (!pick) return null;
  const routine = routines.find((r) => r.starter === pick.starter);
  return routine ? { routine, why: pick.why } : null;
}
