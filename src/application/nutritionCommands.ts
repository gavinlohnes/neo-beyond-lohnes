import { db } from "../persistence/db";
import { logEvent, newId } from "./commands";
import type { DomainEvent, MealLogCorrectedPayload, MealLoggedPayload, SavedMeal } from "../domain/common/types";
import {
  savedMealInputSchema,
  savedMealModifyInputSchema,
  type SavedMealInput,
  type SavedMealModifyInput,
} from "../persistence/nutritionValidation";

/**
 * NUTRITION-001 (Meal Memory, High-Risk Drop). A SavedMeal is a small,
 * directly-mutable reusable preset — same treatment as CaptureItem
 * (application/commands.ts's captureItem/resolveCaptureItem/
 * reopenCaptureItem): no DomainEvent trail for its own create/edit/
 * archive lifecycle, since nothing about "what presets exist" is itself
 * meaningful historical fact the way a logged meal is. What IS real
 * historical fact — a meal actually eaten, with its macros as they stood
 * at that moment — is produced only by logMeal/correctMealLog below,
 * which write real DomainEvents. This split is what makes "editing or
 * archiving a SavedMeal never rewrites past logs" true by construction:
 * past MEAL_LOGGED events hold their own copied values and never
 * re-read the SavedMeal record.
 */
function notFound(id: string): Error {
  return new Error(`SAVED_MEAL_NOT_FOUND: no saved meal with id ${id}.`);
}

export async function createSavedMeal(input: SavedMealInput): Promise<SavedMeal> {
  const parsed = savedMealInputSchema.parse(input);
  const meal: SavedMeal = {
    id: newId(),
    name: parsed.name,
    calories: parsed.calories,
    proteinG: parsed.proteinG,
    carbsG: parsed.carbsG,
    fatG: parsed.fatG,
    createdAt: new Date().toISOString(),
  };
  await db.savedMeals.add(meal);
  return meal;
}

/**
 * Edits the preset going forward only — every MEAL_LOGGED event already
 * written keeps the macro snapshot it was logged with, untouched. The
 * next time this SavedMeal is logged, it snapshots these new values.
 */
export async function updateSavedMeal(id: string, changes: SavedMealModifyInput): Promise<SavedMeal> {
  const parsed = savedMealModifyInputSchema.parse(changes);
  const existing = await db.savedMeals.get(id);
  if (!existing) throw notFound(id);
  const updated: SavedMeal = {
    ...existing,
    ...(parsed.name !== undefined ? { name: parsed.name } : {}),
    ...(parsed.calories !== undefined ? { calories: parsed.calories } : {}),
    ...(parsed.proteinG !== undefined ? { proteinG: parsed.proteinG } : {}),
    ...(parsed.carbsG !== undefined ? { carbsG: parsed.carbsG } : {}),
    ...(parsed.fatG !== undefined ? { fatG: parsed.fatG } : {}),
  };
  await db.savedMeals.put(updated);
  return updated;
}

/**
 * One-way "no longer offered" flag, not a delete — matching Mission's
 * archiveMission precedent. Every MEAL_LOGGED event referencing this
 * SavedMeal's id keeps working exactly as before (their own snapshot
 * values are all getMealEntries ever reads); this only removes the
 * preset from getSavedMeals' active list.
 */
export async function archiveSavedMeal(id: string): Promise<void> {
  const existing = await db.savedMeals.get(id);
  if (!existing) throw notFound(id);
  if (existing.archivedAt) return; // idempotent, matching archiveMission's precedent
  await db.savedMeals.update(id, { archivedAt: new Date().toISOString() });
}

/**
 * The one real historical fact this Drop adds: logging a SavedMeal
 * snapshots its CURRENT macros (passed in by the caller, who already has
 * the just-fetched SavedMeal in hand — same convention as logWater/
 * logProtein taking an already-known value directly rather than
 * re-deriving it) into an immutable MEAL_LOGGED event. Nothing about a
 * later SavedMeal edit/archive can change what this event says.
 */
export async function logMeal(
  beyondDayId: string,
  snapshot: { savedMealId: string; name: string; calories: number; proteinG: number; carbsG: number; fatG: number },
): Promise<string> {
  const correlationId = newId();
  return logEvent(
    beyondDayId,
    "MEAL_LOGGED",
    { commandId: correlationId, ...snapshot },
    "USER",
    correlationId,
  );
}

/**
 * Correction/supersession, not overwrite — same chain semantics as
 * correctWater/correctProtein/correctSleep/correctBodyweight
 * (application/commands.ts's correctSingleValueLog), generalized here by
 * hand for meal's four macro fields at once rather than one value,
 * since correctSingleValueLog is keyed to a single valueKey and this is
 * the one real multi-value correction in the app. targetEventId must be
 * the current HEAD of its correction chain — correcting a stale/already-
 * superseded entry is rejected, matching the proven water/protein
 * behavior exactly.
 */
export async function correctMealLog(
  beyondDayId: string,
  targetEventId: string,
  newValues: { calories: number; proteinG: number; carbsG: number; fatG: number },
): Promise<void> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const corrections = events.filter(
    (e): e is DomainEvent<MealLogCorrectedPayload> => e.type === "MEAL_LOG_CORRECTED",
  );
  const alreadySuperseded = corrections.some((c) => c.payload.supersedesEventId === targetEventId);
  if (alreadySuperseded) {
    throw new Error(
      "STALE_CORRECTION_TARGET: this entry has already been corrected — correct the latest value instead.",
    );
  }
  const target = events.find((e) => e.id === targetEventId);
  if (!target) {
    throw new Error("CORRECTION_TARGET_NOT_FOUND");
  }
  if (target.type !== "MEAL_LOGGED" && target.type !== "MEAL_LOG_CORRECTED") {
    throw new Error("CORRECTION_TARGET_INVALID_TYPE");
  }
  const currentValues =
    target.type === "MEAL_LOGGED"
      ? (target.payload as MealLoggedPayload)
      : (target.payload as MealLogCorrectedPayload);
  if (
    currentValues.calories === newValues.calories &&
    currentValues.proteinG === newValues.proteinG &&
    currentValues.carbsG === newValues.carbsG &&
    currentValues.fatG === newValues.fatG
  ) {
    throw new Error("NO_OP_CORRECTION: new values match the current effective values — no event created.");
  }
  const originalEventId =
    target.type === "MEAL_LOGGED" ? target.id : (target.payload as MealLogCorrectedPayload).originalEventId;

  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "MEAL_LOG_CORRECTED",
    { commandId: correlationId, originalEventId, supersedesEventId: targetEventId, ...newValues },
    "USER",
    correlationId,
    targetEventId,
  );
}
