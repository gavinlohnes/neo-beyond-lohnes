import { getDaySummaries } from "./dayLedgerQueries";
import { getMealEntries } from "./nutritionQueries";
import { getProteinEntries } from "./queries";

/**
 * FOOD-SOURCES-001 (Gavin, 2026-11-15: "I approve food source as the next objective"): where your calories or protein
 * came from over recent finished lived days, from your own meal logs as they stand after corrections and deletions.
 * Read only: no judgement, no "bad foods", no suggestion to cut anything. A day with nothing logged is left out and
 * counted as such, never as zero.
 *
 * A source is a saved meal (by its id, so a renamed meal stays one source) or, for a meal typed by hand, its name
 * (trimmed, case ignored). Protein's quick logs are one source, "Protein (quick log)".
 */
export type SourceNutrient = "calories" | "protein";
export const TOP_SOURCES = 5;
export const QUICK_PROTEIN = "Protein (quick log)";
const DAY_MS = 86_400_000;

export interface SourceEntry { key: string; name: string; at: string; beyondDayId: string; value: number }
export interface FoodSource {
  key: string;
  /** The newest name it was logged under. */
  name: string;
  total: number;
  /** Times logged. */
  count: number;
  /** Share of the window's total, 0–1. */
  share: number;
  /** Each lived day it was logged on, newest first, with that day's amount from it. */
  days: { beyondDayId: string; at: string; value: number; count: number }[];
}
export interface FoodSources {
  nutrient: SourceNutrient;
  windowDays: number;
  /** Finished lived days in the window, and how many have something logged for this nutrient. */
  finishedDays: number;
  loggedDays: number;
  total: number;
  sources: FoodSource[];
  /** Everything past the top sources, together. */
  others: { sources: number; total: number; share: number };
  readAt: string;
}

/** Pure: group entries into sources, biggest first (ties by name), the top few named and the rest together. */
export function groupSources(entries: readonly SourceEntry[], top = TOP_SOURCES): { total: number; sources: FoodSource[]; others: FoodSources["others"] } {
  const total = entries.reduce((sum, e) => sum + e.value, 0);
  const groups = new Map<string, SourceEntry[]>();
  for (const e of entries) groups.set(e.key, [...(groups.get(e.key) ?? []), e]);
  const all = [...groups.entries()].map(([key, list]): FoodSource => {
    const newest = [...list].sort((a, b) => b.at.localeCompare(a.at));
    const byDay = new Map<string, FoodSource["days"][number]>();
    for (const e of newest) {
      const day = byDay.get(e.beyondDayId);
      if (day) { day.value += e.value; day.count += 1; } else byDay.set(e.beyondDayId, { beyondDayId: e.beyondDayId, at: e.at, value: e.value, count: 1 });
    }
    const sum = list.reduce((s, e) => s + e.value, 0);
    return { key, name: newest[0]!.name, total: sum, count: list.length, share: total > 0 ? sum / total : 0, days: [...byDay.values()] };
  }).filter((s) => s.total > 0).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const rest = all.slice(top);
  const restTotal = rest.reduce((s, x) => s + x.total, 0);
  return { total, sources: all.slice(0, top), others: { sources: rest.length, total: restTotal, share: total > 0 ? restTotal / total : 0 } };
}

const keyOf = (savedMealId: string | null, name: string) => (savedMealId ? `meal:${savedMealId}` : `name:${name.trim().toLowerCase()}`);

/** The last `windowDays` finished lived days (by their 16:30 start), today left out. */
export async function getFoodSources(nutrient: SourceNutrient, windowDays: number, now = new Date()): Promise<FoodSources> {
  const end = now.getTime(), start = end - windowDays * DAY_MS;
  // Finished: ended, or followed by a later lived day (an older day closed without its own end record).
  const all = (await getDaySummaries()).filter((d) => Date.parse(d.startedAt) <= end).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const days = all.filter((d, i) => (d.endedAt !== undefined || i < all.length - 1) && Date.parse(d.startedAt) > start);
  const perDay = await Promise.all(days.map(async (d) => {
    const meals = (await getMealEntries(d.beyondDayId)).map((m): SourceEntry => ({
      key: keyOf(m.savedMealId, m.name), name: m.name.trim(), at: m.at, beyondDayId: d.beyondDayId,
      value: nutrient === "calories" ? m.effectiveCalories : m.effectiveProteinG,
    }));
    const quick = nutrient === "protein" ? (await getProteinEntries(d.beyondDayId)).map((p): SourceEntry => ({
      key: "protein:quick", name: QUICK_PROTEIN, at: p.at, beyondDayId: d.beyondDayId, value: p.effectiveGrams,
    })) : [];
    return [...meals, ...quick];
  }));
  const grouped = groupSources(perDay.flat());
  return {
    nutrient, windowDays, finishedDays: days.length, loggedDays: perDay.filter((list) => list.length > 0).length,
    ...grouped, readAt: now.toISOString(),
  };
}
