import { db } from "../persistence/db";
import { correctProtein, correctWater, retimeLog, voidProteinLog, voidWaterLog } from "./commands";
import { getHydrationEntries, getProteinEntries } from "./queries";
import { correctMealLog, voidMealLog } from "./nutritionCommands";
import { getMealEntries } from "./nutritionQueries";

/**
 * TIMELINE-EDIT-001 (Gavin, 2026-11-15: "I also can't edit what time I ate my meals… It would be nice to make edits and
 * corrections to it"; "Approved."): one logged meal, water or protein entry as it stands now, and the three fixes the
 * app already had: move its time (LOG-TIME-001's LOG_RETIMED), correct its amount (the correction chains), or remove it
 * (the VOIDED facts). Nothing new is stored: every fix is the existing append-only fact, so HISTORY keeps the original.
 */
export type LogKind = "MEAL" | "WATER" | "PROTEIN";
export interface DayLogEntry {
  kind: LogKind;
  beyondDayId: string;
  dayStartedAt: string;
  rootEventId: string;
  /** The current head of its correction chain: what an amount correction must name. */
  headEventId: string;
  at: string;
  name: string;
  calories?: number; proteinG?: number; carbsG?: number; fatG?: number;
  oz?: number;
  grams?: number;
}

/** Every meal, water and protein log of a lived day, after corrections and removals, in time order. */
export async function getDayLogEntries(beyondDayId: string): Promise<DayLogEntry[]> {
  const day = await db.beyondDays.get(beyondDayId);
  if (!day) return [];
  const [meals, water, protein] = await Promise.all([getMealEntries(beyondDayId), getHydrationEntries(beyondDayId), getProteinEntries(beyondDayId)]);
  const base = { beyondDayId, dayStartedAt: day.startedAt };
  return [
    ...meals.map((m): DayLogEntry => ({ ...base, kind: "MEAL", rootEventId: m.rootEventId, headEventId: m.headEventId, at: m.at, name: m.name,
      calories: m.effectiveCalories, proteinG: m.effectiveProteinG, carbsG: m.effectiveCarbsG, fatG: m.effectiveFatG })),
    ...water.map((w): DayLogEntry => ({ ...base, kind: "WATER", rootEventId: w.rootEventId, headEventId: w.headEventId, at: w.at, name: "Water", oz: w.effectiveAmountOz })),
    ...protein.map((p): DayLogEntry => ({ ...base, kind: "PROTEIN", rootEventId: p.rootEventId, headEventId: p.headEventId, at: p.at, name: "Protein", grams: p.effectiveGrams })),
  ].sort((a, b) => a.at.localeCompare(b.at));
}

export async function getDayLogEntry(beyondDayId: string, rootEventId: string): Promise<DayLogEntry | null> {
  return (await getDayLogEntries(beyondDayId)).find((e) => e.rootEventId === rootEventId) ?? null;
}

/** Move it to when it really happened, inside its lived day. False when nothing changed. */
export async function moveLogEntry(entry: DayLogEntry, at: string): Promise<boolean> {
  return retimeLog(entry.beyondDayId, entry.rootEventId, at);
}

/** Correct its amount through its own correction chain (re-read first, so a stale head is never named). */
export async function correctLogEntry(entry: DayLogEntry, values: { calories?: number; proteinG?: number; carbsG?: number; fatG?: number; oz?: number; grams?: number }): Promise<void> {
  const current = await getDayLogEntry(entry.beyondDayId, entry.rootEventId);
  if (!current) throw new Error("LOG_NOT_FOUND: this entry was removed or can't be found.");
  if (current.kind === "MEAL") {
    await correctMealLog(current.beyondDayId, current.headEventId, {
      calories: values.calories ?? current.calories!, proteinG: values.proteinG ?? current.proteinG!,
      carbsG: values.carbsG ?? current.carbsG!, fatG: values.fatG ?? current.fatG!,
    });
  } else if (current.kind === "WATER") await correctWater(current.beyondDayId, current.headEventId, values.oz ?? current.oz!);
  else await correctProtein(current.beyondDayId, current.headEventId, values.grams ?? current.grams!);
}

/** Remove it (the existing VOIDED fact; HISTORY keeps both). False if it was already removed. */
export async function removeLogEntry(entry: DayLogEntry): Promise<boolean> {
  if (entry.kind === "MEAL") return voidMealLog(entry.beyondDayId, entry.rootEventId);
  if (entry.kind === "WATER") return voidWaterLog(entry.beyondDayId, entry.rootEventId);
  return voidProteinLog(entry.beyondDayId, entry.rootEventId);
}
