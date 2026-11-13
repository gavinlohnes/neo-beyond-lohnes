import type { BeyondDay } from "../domain/common/types";
import { db } from "../persistence/db";
import { getFoodDiary } from "./foodDiaryQueries";
import { getMeasuredSnapshot } from "./measuredQueries";
import { getHydrationEntries, getLatestCheckIn, getWorkPeriodEnded, getWorkPeriodStarted } from "./queries";

/**
 * DAY-MAP-001 (Gavin, 2026-11-13: "massive improvements… top tier"). The day-timeline pattern of Oura, Whoop and Rise,
 * on BEYOND's own lived day: what has already happened since 16:30 is drawn on TODAY's 16:30 → 16:30 bar, where the
 * schedule's phases already are, so the night reads as one picture. Recorded only: Garmin's main sleep, meals, water,
 * the check-in, the work marks and workouts. Read only, never an Engine input, no advice and nothing inferred.
 */
export type MapMarkKind = "SLEEP" | "WORK" | "WORKOUT" | "MEAL" | "WATER" | "CHECK_IN";
export interface MapMark { kind: MapMarkKind; at: string; until?: string; label: string }
export interface MapInput {
  sleep: { start: string; end: string } | null;
  meals: { at: string; name: string }[];
  water: { at: string; oz: number }[];
  checkIn: string | null;
  work: { start: string | null; end: string | null };
  workouts: { start: string; end: string | null }[];
}
export interface PlacedMark extends MapMark { from: number; to: number | null }

const DAY = 24 * 3_600_000;
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const hm = (ms: number) => `${Math.floor(ms / 3_600_000)}h ${String(Math.round((ms % 3_600_000) / 60_000)).padStart(2, "0")}m`;

/** The recorded marks of one lived day, in time order. Spans still open (work, a workout) run to now. */
export function deriveMapMarks(input: MapInput, now: Date): MapMark[] {
  const marks: MapMark[] = [];
  if (input.sleep) marks.push({ kind: "SLEEP", at: input.sleep.start, until: input.sleep.end, label: `Sleep ${hhmm(input.sleep.start)}–${hhmm(input.sleep.end)} (Garmin, ${hm(Date.parse(input.sleep.end) - Date.parse(input.sleep.start))})` });
  if (input.work.start) marks.push({ kind: "WORK", at: input.work.start, until: input.work.end ?? now.toISOString(), label: input.work.end ? `Worked ${hhmm(input.work.start)}–${hhmm(input.work.end)}` : `At work since ${hhmm(input.work.start)}` });
  for (const w of input.workouts) marks.push({ kind: "WORKOUT", at: w.start, until: w.end ?? now.toISOString(), label: w.end ? `Workout ${hhmm(w.start)}–${hhmm(w.end)}` : `Workout since ${hhmm(w.start)}` });
  for (const m of input.meals) marks.push({ kind: "MEAL", at: m.at, label: `${m.name} at ${hhmm(m.at)}` });
  for (const w of input.water) marks.push({ kind: "WATER", at: w.at, label: `Water ${Math.round(w.oz)} oz at ${hhmm(w.at)}` });
  if (input.checkIn) marks.push({ kind: "CHECK_IN", at: input.checkIn, label: `Checked in at ${hhmm(input.checkIn)}` });
  return marks.sort((a, b) => a.at.localeCompare(b.at));
}

/** Where each mark sits on the lived day's bar (0 = 16:30, 1 = 16:30 next day); marks outside it are left out. */
export function placeMarks(marks: readonly MapMark[], dayStart: Date): PlacedMark[] {
  const start = dayStart.getTime();
  const frac = (iso: string) => (Date.parse(iso) - start) / DAY;
  return marks.flatMap((m) => {
    const from = frac(m.at), to = m.until ? frac(m.until) : null;
    if (to === null ? from < 0 || from > 1 : to < 0 || from > 1) return [];
    return [{ ...m, from: Math.max(0, from), to: to === null ? null : Math.min(1, to) }];
  });
}

/** One plain sentence of what's on the map, for screen readers and Alfred. */
export function describeMap(marks: readonly MapMark[]): string {
  if (!marks.length) return "Nothing recorded on this lived day yet.";
  return `Recorded since the day started: ${marks.map((m) => m.label).join("; ")}.`;
}

/** Read only: the recorded inputs of a lived day, from the existing queries. */
export async function getLivedDayMap(day: BeyondDay, now: Date = new Date()): Promise<MapMark[]> {
  const [diary, water, checkIn, started, ended, workouts, measured] = await Promise.all([
    getFoodDiary(day.id), getHydrationEntries(day.id), getLatestCheckIn(day.id), getWorkPeriodStarted(day.id), getWorkPeriodEnded(day.id),
    db.workoutSessions.where("beyondDayId").equals(day.id).toArray(), getMeasuredSnapshot(now.getTime()).catch(() => null),
  ]);
  return deriveMapMarks({
    sleep: measured?.lastNight ? { start: measured.lastNight.startTime, end: measured.lastNight.endTime } : null,
    meals: diary.entries.map((e) => ({ at: e.at, name: e.name })),
    water: water.map((w) => ({ at: w.at, oz: w.effectiveAmountOz })).filter((w) => w.oz > 0),
    checkIn: checkIn?.recordedAt ?? null,
    work: { start: started?.occurredAt ?? null, end: ended?.occurredAt ?? null },
    workouts: workouts.filter((w) => w.status !== "ABANDONED").map((w) => ({ start: w.startedAt, end: w.endedAt ?? null })),
  }, now);
}
