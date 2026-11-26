import { db } from "../persistence/db";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { resolveProgrammeSlot } from "../engine/trainingProgrammeResolution";
import {
  DEFAULT_CALORIE_FLOOR, ZERO_ADJUST, averageGap, averageTarget, balanceOff, dayTarget, dayTargetLabel, describeParts,
  type DayTarget, type DayTargetAdjust, type DayTargetKind, type DayTargetSettings, type ProjectedDay,
} from "../engine/dayTarget";
import type { NutritionTargets } from "../domain/common/types";
import { dayKindFor } from "./eatingWindow";
import { deriveLifeState, lifeStateInput } from "./lifeState";
import { getSchedulePattern } from "./queries";
import { getConfirmedKinds } from "./scheduleExceptions";
import { getTrainingProgramme } from "./trainingProgramme";
import { getNutritionTargets } from "./nutritionTargetQueries";
import { saveNutritionTargets, type NutritionTargetsSave } from "./nutritionTargetCommands";

/**
 * GRAYSON-DAY-TARGETS-001 (Gavin, 2026-11-25): the one place a calorie target for a day is read. Every display of the
 * day's target (the food card, the BODY dashboard, the meal plan's day totals, Delta's TARGETS line, the weekly numbers)
 * asks this instead of reading `calorieTargetKcal`. Off (the default), it is exactly the plain target.
 *
 * The day's kind is named the way the eating window names it (`dayKindFor` on the lived day's life state, from what
 * was recorded, his confirmed schedule changes and the saved rotation), so the two never disagree. A lift day is a
 * strength workout his programme assigns that day, or one logged that day; a run alone isn't one.
 */
export interface DayCalorieTarget {
  /** The day's target, or undefined when he has no calorie target. */
  kcal: number | undefined;
  on: boolean;
  kind: DayTargetKind | null;
  lift: boolean;
  floorHeld: boolean;
  /** "Work night, lift day", or null when the plain target applies. */
  label: string | null;
  /** "Weekly target 1950 · work night +100 · lift day +150", or null when off. */
  why: string | null;
}


const livedStartOf = (d: Date) => mostRecentBoundaryAtOrBefore(d);
const addDays = (start: Date, n: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + n, 16, 30, 0, 0);

export function settingsOf(targets: NutritionTargets): DayTargetSettings | undefined {
  return targets.dayTargets ? { on: targets.dayTargets.on, adjustKcal: { ...targets.dayTargets.adjustKcal } } : undefined;
}
export const floorOf = (targets: NutritionTargets) => targets.calorieFloorKcal ?? DEFAULT_CALORIE_FLOOR;

function toDayCalorieTarget(t: DayTarget | null): DayCalorieTarget {
  if (!t) return { kcal: undefined, on: false, kind: null, lift: false, floorHeld: false, label: null, why: null };
  const kindLabel = dayTargetLabel(t);
  const label = kindLabel && t.floorHeld ? `${kindLabel} · held at your floor` : kindLabel;
  return { kcal: t.kcal, on: t.on, kind: t.kind, lift: t.lift, floorHeld: t.floorHeld, label, why: label ? describeParts(t) : null };
}

/** Kind and lift for each lived-day start, read together. Future days have no records, so the schedule names them. */
async function dayFacts(starts: readonly Date[]): Promise<ProjectedDay[]> {
  if (!starts.length) return [];
  const sorted = [...starts].sort((a, b) => a.getTime() - b.getTime());
  const from = addDays(sorted[0]!, -4), to = addDays(sorted.at(-1)!, 1);
  const [pattern, confirmed, revision, records] = await Promise.all([
    getSchedulePattern(), getConfirmedKinds().catch(() => new Map<string, "WORK" | "OFF">()), getTrainingProgramme().catch(() => null),
    db.beyondDays.where("startedAt").between(from.toISOString(), to.toISOString(), true, false).toArray(),
  ]);
  const recorded = new Map<number, "WORK" | "OFF">();
  for (const r of records) {
    const k = livedStartOf(new Date(r.startedAt)).getTime();
    if (r.workContext === "WORK") recorded.set(k, "WORK");
    else if (r.workContext === "OFF" && !recorded.has(k)) recorded.set(k, "OFF");
  }
  const dayIds = new Map<number, string[]>();
  for (const r of records) { const k = livedStartOf(new Date(r.startedAt)).getTime(); dayIds.set(k, [...(dayIds.get(k) ?? []), r.id]); }
  const allIds = [...dayIds.values()].flat();
  const sessions = allIds.length ? await db.workoutSessions.where("beyondDayId").anyOf(allIds).toArray() : [];
  const lifted = new Set(sessions.filter((s) => ["COMPLETED", "PARTIAL", "ACTIVE"].includes(s.status) && s.sessionType !== "RECOVERY").map((s) => s.beyondDayId));
  const saved = isOperatorSavedSchedule(pattern);
  const context = (d: Date): "WORK" | "OFF" | null =>
    recorded.get(d.getTime()) ?? confirmed.get(formatLocalDate(d)) ?? (saved ? scheduledWorkContextForLivedDay(d, pattern) : null);
  const programme = revision?.programme ?? null;
  const planned = (start: Date): boolean => {
    if (!programme || programme.mode === "SEQUENCE") return false;
    if (programme.mode === "ROTATION" && [0, 1, 2, 3].some((n) => context(addDays(start, -n)) === null)) return false;
    return !!resolveProgrammeSlot(programme, start, (d) => context(d)!).templateId;
  };
  return starts.map((start) => {
    const k = start.getTime();
    const prior = addDays(start, -1).getTime();
    const kind = dayKindFor(deriveLifeState(lifeStateInput(start, pattern, recorded.get(k) ?? null, recorded.get(prior) ?? null, undefined, confirmed))?.state);
    const lift = planned(start) || (dayIds.get(k) ?? []).some((id) => lifted.has(id));
    return { kind, lift };
  });
}

/** The target for the lived day of a BEYOND day (or of now when none). */
export async function getDayCalorieTarget(beyondDayId?: string | null, now: Date = new Date()): Promise<DayCalorieTarget> {
  const day = beyondDayId ? await db.beyondDays.get(beyondDayId) : undefined;
  const start = livedStartOf(day ? new Date(day.startedAt) : now);
  return (await getDayCalorieTargetsFor([start]))[0]!;
}

/** The targets for these lived-day starts, in order. One read for all of them. */
export async function getDayCalorieTargetsFor(starts: readonly Date[]): Promise<DayCalorieTarget[]> {
  const targets = await getNutritionTargets();
  const base = targets.calorieTargetKcal;
  if (base === undefined) return starts.map(() => toDayCalorieTarget(null));
  const settings = settingsOf(targets);
  if (!settings?.on) return starts.map(() => toDayCalorieTarget(dayTarget(base, settings, null, false)));
  // If the day can't be read, the plain target stands rather than a guess.
  const facts = await dayFacts(starts).catch(() => starts.map((): ProjectedDay => ({ kind: null, lift: false })));
  return facts.map((f) => toDayCalorieTarget(dayTarget(base, settings, f.kind, f.lift, floorOf(targets))));
}

// ---- The two weeks, BALANCE, and his changes ----------------------------------------------------------------------

export interface TwoWeekLine { average: number; gap: number; base: number; balanceTo: number | null; days: number }

/** His saved two weeks from today's lived day: the average day target, the gap and what BALANCE would set. */
export async function getTwoWeekLine(settings: DayTargetSettings, now: Date = new Date()): Promise<TwoWeekLine | null> {
  const targets = await getNutritionTargets();
  const base = targets.calorieTargetKcal;
  if (base === undefined) return null;
  const today = livedStartOf(now);
  const days = await dayFacts(Array.from({ length: 14 }, (_, i) => addDays(today, i)));
  const floor = floorOf(targets);
  return { average: Math.round(averageTarget(days, base, settings, floor)), gap: averageGap(days, base, settings, floor), base,
    balanceTo: balanceOff(days, base, settings, floor), days: days.length };
}

export function describeTwoWeekLine(line: TwoWeekLine): string {
  if (line.gap === 0) return `Over two weeks: ${line.average} a day, your target.`;
  return `Over two weeks: ${Math.abs(line.gap)} ${line.gap > 0 ? "over" : "under"} your target.`;
}

/** His own change to the switch or an adjustment, with UNDO (the existing targets save). */
export async function saveDayTargets(on: boolean, adjustKcal: DayTargetAdjust): Promise<NutritionTargetsSave> {
  return saveNutritionTargets({ dayTargets: { on, adjustKcal } });
}

/** BALANCE: the day-off adjustment that brings the two weeks to his target, on his tap only, with UNDO. */
export async function balanceDayTargets(settings: DayTargetSettings, now: Date = new Date()): Promise<NutritionTargetsSave | null> {
  const line = await getTwoWeekLine(settings, now);
  if (!line || line.balanceTo === null || line.balanceTo === settings.adjustKcal.OFF) return null;
  return saveDayTargets(settings.on, { ...settings.adjustKcal, OFF: line.balanceTo });
}

export { ZERO_ADJUST };
