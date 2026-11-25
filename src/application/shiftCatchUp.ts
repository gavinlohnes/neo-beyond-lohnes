import { db } from "../persistence/db";
import type { DomainEvent, MealLoggedPayload } from "../domain/common/types";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { getSchedulePattern, getHydrationEntries } from "./queries";
import { getMealEntries, getSavedMeals } from "./nutritionQueries";
import { logWindow } from "./logTimes";

/**
 * GRAYSON LOG-CATCHUP-001 (Gavin, 2026-11-23: "Then: 3, the post-shift catch-up"): after SHIFT DOWN on a work day,
 * one card asks "On shift, did you have:" and lists what he usually has on shift that isn't logged tonight. Each
 * ticked item is logged at the point in the shift he usually has it. Read only here; the writes are the existing
 * logMeal and logWater commands on tonight's day, inside its own lived day (LOG-TIME-001).
 */

/** How far back "usually" reaches, and how many of those shifts an item must appear in. */
export const CATCH_UP_LOOKBACK_DAYS = 28;
export const CATCH_UP_MIN_SHIFTS = 2;
export const CATCH_UP_MAX_MEALS = 5;

type Window = { start: Date; end: Date };
export interface ShiftSample {
  shift: Window;
  meals: { savedMealId: string; name: string; servings: number; at: string }[];
  water: { amountOz: number; at: string }[];
}
export type CatchUpItem =
  | { key: string; kind: "MEAL"; label: string; savedMealId: string; servings: number; times: string[] }
  | { key: string; kind: "WATER"; label: string; amountOz: number; times: string[] };

const inShift = (at: string, w: Window) => { const t = Date.parse(at); return t >= w.start.getTime() && t <= w.end.getTime(); };
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
const mode = (xs: number[]) => { const c = new Map<number, number>(); for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1); return [...c].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]![0]; };

export const waterLabel = (count: number, amountOz: number) => count === 1 ? `Water · ${amountOz} oz` : `Water · ${count} × ${amountOz} oz`;

/** Pure. The catch-up list: usual shift meals and water not yet logged tonight, each with when to place it. */
export function deriveCatchUp(past: readonly ShiftSample[], tonight: ShiftSample, now: Date, liveMealIds: ReadonlySet<string>,
  placeable?: { start: Date; end: Date }): CatchUpItem[] {
  const { start, end } = tonight.shift;
  // Placement stays inside the shift, before now and, when given, inside tonight's lived day (where the log goes).
  const earliest = Math.max(start.getTime(), placeable?.start.getTime() ?? -Infinity);
  const latest = Math.min(end.getTime(), now.getTime(), (placeable?.end.getTime() ?? Infinity) - 60_000);
  if (latest <= earliest) return [];
  const place = (offsetMin: number) => new Date(Math.min(Math.max(start.getTime() + offsetMin * 60_000, earliest), latest)).toISOString();
  const items: CatchUpItem[] = [];

  const meals = new Map<string, { name: string; shifts: number; offsets: number[]; servings: number[] }>();
  for (const s of past) {
    const seen = new Set<string>();
    for (const m of s.meals.filter((x) => inShift(x.at, s.shift)).sort((a, b) => a.at.localeCompare(b.at))) {
      if (seen.has(m.savedMealId)) continue;
      seen.add(m.savedMealId);
      const e = meals.get(m.savedMealId) ?? { name: m.name, shifts: 0, offsets: [], servings: [] };
      e.shifts += 1; e.offsets.push((Date.parse(m.at) - s.shift.start.getTime()) / 60_000); e.servings.push(m.servings);
      meals.set(m.savedMealId, e);
    }
  }
  const hadTonight = new Set(tonight.meals.filter((m) => inShift(m.at, tonight.shift)).map((m) => m.savedMealId));
  [...meals].filter(([id, e]) => e.shifts >= CATCH_UP_MIN_SHIFTS && liveMealIds.has(id) && !hadTonight.has(id))
    .sort((a, b) => b[1].shifts - a[1].shifts || median(a[1].offsets) - median(b[1].offsets))
    .slice(0, CATCH_UP_MAX_MEALS)
    .forEach(([id, e]) => {
      const servings = mode(e.servings);
      items.push({ key: `meal:${id}`, kind: "MEAL", label: servings === 1 ? e.name : `${e.name} × ${servings}`, savedMealId: id, servings, times: [place(median(e.offsets))] });
    });

  const waterShifts = past.map((s) => s.water.filter((w) => inShift(w.at, s.shift))).filter((w) => w.length > 0);
  if (waterShifts.length >= CATCH_UP_MIN_SHIFTS) {
    const amountOz = mode(waterShifts.flat().map((w) => w.amountOz));
    const usual = Math.round(median(waterShifts.map((w) => w.length)));
    const already = tonight.water.filter((w) => inShift(w.at, tonight.shift)).length;
    const slotMin = (end.getTime() - start.getTime()) / 60_000 / Math.max(usual, 1);
    const times = Array.from({ length: Math.max(usual - already, 0) }, (_, i) => place((already + i + 0.5) * slotMin));
    if (times.length > 0) items.push({ key: "water", kind: "WATER", label: waterLabel(times.length, amountOz), amountOz, times });
  }
  return items;
}

async function sample(dayId: string, shift: Window): Promise<ShiftSample> {
  const [meals, water, events] = await Promise.all([
    getMealEntries(dayId), getHydrationEntries(dayId),
    db.events.where("beyondDayId").equals(dayId).filter((e) => e.type === "MEAL_LOGGED").toArray(),
  ]);
  const servings = new Map((events as DomainEvent<MealLoggedPayload>[]).map((e) => [e.id, e.payload.servings ?? 1]));
  return {
    shift,
    meals: meals.filter((m) => m.savedMealId).map((m) => ({ savedMealId: m.savedMealId!, name: m.name, servings: servings.get(m.rootEventId) ?? 1, at: m.at })),
    water: water.filter((w) => w.effectiveAmountOz > 0).map((w) => ({ amountOz: w.effectiveAmountOz, at: w.at })),
  };
}

/** Read only. Tonight's catch-up for this day, or null when it isn't a shift day. */
export async function getShiftCatchUp(dayId: string, now: Date = new Date()): Promise<{ items: CatchUpItem[]; shift: Window } | null> {
  const [pattern, day] = await Promise.all([getSchedulePattern(), db.beyondDays.get(dayId)]);
  if (!day || day.workContext === "OFF") return null;
  const shift = livedDayShiftWindow(new Date(day.startedAt), pattern);
  if (!shift) return null;
  const since = new Date(now.getTime() - CATCH_UP_LOOKBACK_DAYS * 86_400_000).toISOString();
  const earlier = (await db.beyondDays.where("startedAt").aboveOrEqual(since).toArray()).filter((d) => d.id !== dayId && d.workContext !== "OFF");
  const past = (await Promise.all(earlier.map(async (d) => {
    const w = livedDayShiftWindow(new Date(d.startedAt), pattern);
    return w ? sample(d.id, w) : null;
  }))).filter((s): s is ShiftSample => s !== null);
  const [tonight, live] = await Promise.all([sample(dayId, shift), getSavedMeals()]);
  return { items: deriveCatchUp(past, tonight, now, new Set(live.map((m) => m.id)), logWindow(day.startedAt, day.createdAt)), shift };
}
