import { db } from "../persistence/db";
import { parseNutritionTargets } from "../persistence/nutritionTargetValidation";
import { deriveProteinTargetG, DEFAULT_NUTRITION_TARGETS } from "../engine/nutritionTargets";
import { getMostRecentBodyweight } from "./queries";
import type { NutritionTargets } from "../domain/common/types";
import { deriveDayCalorieTarget, type DayCalorieTarget } from "../engine/dayTarget";
import { deriveLifeState, getRecordedDayBefore, lifeStateInput } from "./lifeState";
import { dayKindFor } from "./eatingWindow";
import { getSchedulePattern } from "./queries";
import { getConfirmedExceptions } from "./scheduleExceptions";
import { getProgrammeView } from "./trainingProgrammeQueries";

/**
 * NUTRITION-003: the settings row's I/O boundary. Reads the single stored
 * row, validates it, and falls back to DEFAULT_NUTRITION_TARGETS if none
 * exists yet (matters only for in-memory/test databases opened without
 * going through the v11 upgrade) or if the stored row is malformed (e.g.
 * a hand-edited or corrupted imported backup) — "unknown is better than
 * false precision" beats surfacing a broken settings row or throwing.
 * Never writes. Mirrors application/queries.ts's getSchedulePattern.
 */
export async function getNutritionTargets(): Promise<NutritionTargets> {
  const raw = await db.nutritionTargets.get("current");
  if (!raw) return DEFAULT_NUTRITION_TARGETS;
  return parseNutritionTargets(raw) ?? DEFAULT_NUTRITION_TARGETS;
}

/**
 * The one place the rest of the app asks "what's my protein target right
 * now" — combines the stored multiplier with the most recently logged
 * bodyweight (application/queries.ts's getMostRecentBodyweight, not
 * day-scoped). Returns undefined, never a guessed number, when no
 * bodyweight has ever been logged.
 */
export async function getEffectiveProteinTargetG(): Promise<number | undefined> {
  const targets = await getNutritionTargets();
  const bodyweightLbs = await getMostRecentBodyweight();
  if (bodyweightLbs === undefined) return undefined;
  return deriveProteinTargetG(targets.proteinMultiplierGPerLb, bodyweightLbs);
}

/** The canonical calorie target reader for a lived day. Unknown placement safely returns the plain target. */
export async function getDayCalorieTarget(beyondDayId: string): Promise<DayCalorieTarget> {
  const day = await db.beyondDays.get(beyondDayId);
  if (!day) return deriveDayCalorieTarget(await getNutritionTargets(), null, false);
  return getCalorieTargetForDate(new Date(day.startedAt), day);
}

export async function getPlannedDayCalorieTarget(at: Date): Promise<DayCalorieTarget> {
  return getCalorieTargetForDate(at);
}

async function getCalorieTargetForDate(at: Date, day?: { id: string; workContext?: "WORK" | "OFF" | "UNKNOWN" }): Promise<DayCalorieTarget> {
  const [targets, schedule, exceptions] = await Promise.all([getNutritionTargets(), getSchedulePattern(), getConfirmedExceptions()]);
  if (!targets.dayTargets?.on) return deriveDayCalorieTarget(targets, null, false);
  const yesterday = await getRecordedDayBefore(at, 1);
  const recorded = day?.workContext === "WORK" || day?.workContext === "OFF" ? day.workContext : null;
  const state = deriveLifeState(lifeStateInput(at, schedule, recorded, yesterday, recorded ? "OPERATOR" : undefined,
    new Map([...exceptions].map(([date, exception]) => [date, exception.kind]))));
  const kind = dayKindFor(state?.state);
  if (!kind) return deriveDayCalorieTarget(targets, null, false);
  const [programme, sessions] = await Promise.all([
    getProgrammeView(at), day ? db.workoutSessions.where("beyondDayId").equals(day.id).toArray() : Promise.resolve([]),
  ]);
  const plannedLift = programme.planned.templateId !== null || programme.sequence?.nextMember !== null;
  const loggedLift = sessions.some((session) => session.status !== "ABANDONED");
  return deriveDayCalorieTarget(targets, kind, plannedLift || loggedLift);
}
