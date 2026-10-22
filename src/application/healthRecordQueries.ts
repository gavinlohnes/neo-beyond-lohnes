import { db } from "../persistence/db";
import type { BeyondDay, HydrationEntry, WorkoutSession } from "../domain/common/types";
import { getBodyweightEntries, getHydrationEntries, getProteinEntries, getSleepEntries, type BodyweightEntry, type ProteinEntry, type SleepEntry } from "./queries";
import { getMealEntries, type NutritionEntry } from "./nutritionQueries";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { livedDayBoundary } from "../engine/livedDaySeries";
import type { InsightMetric, InsightPoint } from "./bodyInsightsQueries";

export type HealthRecord =
  | { kind: "WATER"; entry: HydrationEntry }
  | { kind: "SLEEP"; entry: SleepEntry }
  | { kind: "WEIGHT"; entry: BodyweightEntry }
  | { kind: "PROTEIN"; entry: ProteinEntry }
  | { kind: "MEAL"; entry: NutritionEntry };
export interface HealthSource { beyondDayId: string; record: HealthRecord }
export interface HealthDay {
  start: string;
  end: string;
  days: BeyondDay[];
  context: "WORK" | "OFF" | "UNKNOWN";
  records: HealthSource[];
}
export interface HealthHistoryDestination { dayId: string; eventId?: string }
export interface HealthEvidenceRequest { key: number; metric: InsightMetric; dayId?: string }
export interface HealthSources { records: HealthSource[]; workouts: WorkoutSession[]; days: BeyondDay[] }

/** Date navigation only: local calendar arithmetic preserves 16:30 through DST. */
export function healthDayStart(now = new Date()): string { return mostRecentBoundaryAtOrBefore(now).toISOString(); }
export function offsetHealthDay(start: string, offset: number): string { return livedDayBoundary(new Date(start), -offset).toISOString(); }

async function readSources(dayId: string): Promise<HealthSource[]> {
  const [water, sleep, weight, protein, meals] = await Promise.all([
    getHydrationEntries(dayId), getSleepEntries(dayId), getBodyweightEntries(dayId), getProteinEntries(dayId), getMealEntries(dayId),
  ]);
  const records: HealthRecord[] = [
    ...water.map((entry): HealthRecord => ({ kind: "WATER", entry })),
    ...sleep.map((entry): HealthRecord => ({ kind: "SLEEP", entry })),
    ...weight.map((entry): HealthRecord => ({ kind: "WEIGHT", entry })),
    ...protein.map((entry): HealthRecord => ({ kind: "PROTEIN", entry })),
    ...meals.map((entry): HealthRecord => ({ kind: "MEAL", entry })),
  ];
  return records.map((record) => ({ beyondDayId: dayId, record }));
}
function sortSources(records: HealthSource[]) {
  // Stable sort retains each canonical query's time/seq order for same-time entries.
  // A UUID is identity, never evidence that one weigh-in happened after another.
  return records.sort((a, b) => a.record.entry.recordedAt.localeCompare(b.record.entry.recordedAt));
}

/** One selected lived window, including early-ended/restarted segments. Never starts or writes a day. */
export async function getHealthDay(start: string): Promise<HealthDay> {
  const end = offsetHealthDay(start, 1);
  return db.transaction("r", [db.beyondDays, db.events], async () => {
    const days = (await db.beyondDays.toArray()).filter((day) => healthDayStart(new Date(day.startedAt)) === start)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
    const records = sortSources((await Promise.all(days.map((day) => readSources(day.id)))).flat());
    const context = days.some((day) => day.workContext === "WORK") ? "WORK" : days.some((day) => day.workContext === "OFF") ? "OFF" : "UNKNOWN";
    return { start, end, days, context, records };
  });
}

/** Exact recorded ownership, not a date/value match. An observation may be a whole day or one root. */
export async function getHealthSources(point: InsightPoint, metric: InsightMetric): Promise<HealthSources> {
  const source = point.source;
  if (!source) throw new Error("The source of this observation is unavailable.");
  return db.transaction("r", [db.beyondDays, db.events, db.workoutSessions], async () => {
    const day = await db.beyondDays.get(source.beyondDayId);
    if (!day) throw new Error("The recorded day is no longer available. Reopen progress to refresh.");
    const records = (await readSources(day.id)).filter(({ record }) => {
      if (source.rootEventId && record.entry.rootEventId !== source.rootEventId) return false;
      switch (metric) {
        case "water": return record.kind === "WATER";
        case "calories": return record.kind === "MEAL";
        case "protein": return record.kind === "PROTEIN" || record.kind === "MEAL";
        case "sleep": return record.kind === "SLEEP" && (Boolean(source.rootEventId) || record.entry.kind === "PRIMARY");
        case "weight": return record.kind === "WEIGHT";
        case "workouts": return false;
      }
    });
    const workouts = metric === "workouts" ? (await db.workoutSessions.where("beyondDayId").equals(day.id).toArray()).filter((session) => session.status === "COMPLETED" || session.status === "PARTIAL") : [];
    return { records: sortSources(records), workouts, days: [day] };
  });
}

/** Explicit source-day lookup for the existing manual correction forms. */
export async function getRecordedHealthDay(dayId: string): Promise<BeyondDay | undefined> {
  return db.beyondDays.get(dayId);
}
