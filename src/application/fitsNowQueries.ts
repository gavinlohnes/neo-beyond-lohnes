import { db } from "../persistence/db";
import { readFitsNowOn, writeFitsNowOn } from "../persistence/fitsNowPreference";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { fitsNow, type FitsNow, type FitsNowInput } from "../engine/fitsNow";
import type { EatingWindowDayKind } from "../domain/common/types";
import type { MealLoggedPayload } from "../domain/common/types";
import { activeVoidedIds } from "../domain/logVoids";
import { getDayCalorieTarget, getEffectiveProteinTargetG } from "./nutritionTargetQueries";
import { getSavedMeals, getTotalMealCalories } from "./nutritionQueries";
import { getActiveDay, getDayProteinTotalG, getSchedulePattern } from "./queries";
import { dayKindFor, getEatingWindowView, plannedOpening } from "./eatingWindow";
import { getTodayPicture } from "./todayPicture";
import { deriveLifeState, lifeStateInput } from "./lifeState";
import { getConfirmedKinds } from "./scheduleExceptions";
import { lighterFoodFor } from "../persistence/lighterNightPreference";

export { readFitsNowOn, writeFitsNowOn };

/**
 * GRAYSON-FITS-NOW-001 (Gavin, 2026-11-26): read only. Today's target comes through the one day-target query
 * (getDayCalorieTarget, the plain target when targets by kind of day are off), never its own copy. Null when Fits now
 * is off, there's no active day, or the engine says it shouldn't show.
 */
const LOOKBACK_DAYS = 28;
const DAY = 86_400_000;

/** How often each saved meal was logged on lived days of this kind over the last 28 days (voided logs left out). */
export async function usesOnKind(kind: EatingWindowDayKind | null, now: Date): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!kind) return counts;
  const today = mostRecentBoundaryAtOrBefore(now);
  const from = new Date(today.getTime() - LOOKBACK_DAYS * DAY - 2 * 3_600_000);
  const [pattern, confirmed, records, logged, voids] = await Promise.all([
    getSchedulePattern(), getConfirmedKinds().catch(() => new Map<string, "WORK" | "OFF">()),
    db.beyondDays.where("startedAt").between(from.toISOString(), now.toISOString(), true, true).toArray(),
    db.events.where("type").equals("MEAL_LOGGED").toArray(),
    db.events.where("type").anyOf(["MEAL_LOG_VOIDED", "LOG_VOID_UNDONE"]).toArray(),
  ]);
  const voided = activeVoidedIds(voids, "MEAL_LOG_VOIDED");
  const recorded = new Map<number, "WORK" | "OFF">();
  for (const r of records) {
    const k = mostRecentBoundaryAtOrBefore(new Date(r.startedAt)).getTime();
    if (r.workContext === "WORK") recorded.set(k, "WORK");
    else if (r.workContext === "OFF" && !recorded.has(k)) recorded.set(k, "OFF");
  }
  const kindOfDay = new Map<string, EatingWindowDayKind | null>();
  for (const r of records) {
    const start = mostRecentBoundaryAtOrBefore(new Date(r.startedAt));
    if (start.getTime() >= today.getTime()) continue; // earlier days only
    const prior = mostRecentBoundaryAtOrBefore(new Date(start.getTime() - 3_600_000)).getTime();
    kindOfDay.set(r.id, dayKindFor(deriveLifeState(lifeStateInput(start, pattern, recorded.get(start.getTime()) ?? null, recorded.get(prior) ?? null, undefined, confirmed))?.state));
  }
  for (const e of logged) {
    const id = (e.payload as MealLoggedPayload).savedMealId;
    if (!id || voided.has(e.id) || !e.beyondDayId || kindOfDay.get(e.beyondDayId) !== kind) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export async function getFitsNow(now: Date = new Date()): Promise<FitsNow | null> {
  if (!readFitsNowOn()) return null;
  const day = await getActiveDay();
  if (!day) return null;
  const [target, eaten, protein, proteinTarget, meals, windowView] = await Promise.all([
    getDayCalorieTarget(day.id), getTotalMealCalories(day.id), getDayProteinTotalG(day.id), getEffectiveProteinTargetG(),
    getSavedMeals(), getEatingWindowView(now).catch(() => null),
  ]);
  if (target.kcal === undefined) return null;
  // The day's kind exactly as the eating window reads it (#737 review B1): the same today-picture life state, with
  // yesterday's recorded kind and the lived-day read time, so a first day off after a picked-up shift is RECOVERY here too.
  const kind = dayKindFor((await getTodayPicture(now).catch(() => null))?.now?.state);
  const state = windowView?.state;
  // Closed: fasting, an opened window past its close, or (#737 review N1) a planned window whose planned close has passed.
  const plannedClosed = state?.kind === "PLANNED" && windowView && kind
    ? now.getTime() >= plannedOpening(mostRecentBoundaryAtOrBefore(new Date(day.startedAt)), windowView.settings.opensAt[kind]).getTime() + windowView.settings.eatingHours * 3_600_000
    : false;
  const window: FitsNowInput["window"] = !state ? null
    : state.kind === "FASTING" || (state.kind === "OPEN" && state.leftMinutes <= 0) || plannedClosed ? { state: "CLOSED" }
    : state.kind === "OPEN" ? { state: "OPEN", leftMinutes: state.leftMinutes } : null;
  return fitsNow({
    targetKcal: target.kcal, eatenKcal: eaten, proteinTargetG: proteinTarget, proteinG: protein,
    meals: meals.map((m) => ({ id: m.id, name: m.name, calories: m.calories, proteinG: m.proteinG })),
    usesOnThisKind: await usesOnKind(kind, now), window,
    // GRAYSON-LIGHTER-NIGHT-001: his work-night usuals first, tonight only, when he took the lighter night's food part.
    ...(lighterFoodFor(day.id) ? { usualsFirst: await usesOnKind("WORK", now) } : {}),
  });
}
