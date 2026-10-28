import type { BeyondDay, SchedulePattern } from "../domain/common/types";
import type { PreparationState } from "../domain/preparation";
import { nextRolloverBoundaryAfter } from "../engine/dayRollover";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { getPreparation } from "./preparation";
import { getActiveDay, getSchedulePattern, getWorkPeriodEnded } from "./queries";
import { RUN_MEAN_FLOOR } from "./rotationProjection";
import { getWholePicture } from "./wholePictureQueries";
import type { PictureRow } from "./wholePictureProjection";

/**
 * SUIT-ALIVE S4 — the route (owner approval 2026-10-28, "go S4"; brief docs/agent/SUIT-ALIVE.md).
 * Tonight's points in the lived day (16:30 → 16:30), read-only and derived on read. Fixed points come
 * from your schedule and the rollover boundary; usual points (sleep, wake) are the median of your own
 * Garmin-timed days of the same kind, shown only with at least RUN_MEAN_FLOOR of them and always
 * marked as usual, never as orders. Food and bottle preparation rides on the shift point. Nothing is
 * stored, scheduled or sent: a callout is just the comms line's words for a point you passed within
 * CALLOUT_MINUTES, while the app is open.
 */
export type WaypointKind = "SHIFT_START" | "SHIFT_END" | "SLEEP" | "WAKE" | "DAY_END";

export interface Waypoint {
  kind: WaypointKind;
  at: string;
  /** Fixed by schedule or the boundary; false for a usual time from your history. */
  fixed: boolean;
  label: string;
  why: string;
  passed: boolean;
}

export interface CaveRoute {
  dayStart: string;
  dayEnd: string;
  dayKind: "WORK" | "OFF";
  waypoints: Waypoint[];
  /** Plain words for what the route can't show, e.g. a work day with no shift in the schedule. */
  notes: string[];
  /** Work-day preparation still unconfirmed. */
  prepPending: ("food" | "bottle")[];
}

export interface RouteInputs {
  day: Pick<BeyondDay, "startedAt" | "workContext">;
  pattern: SchedulePattern;
  rows: readonly PictureRow[];
  workEndedAt: string | null;
  prep: PreparationState | null;
  now: Date;
}

export const CALLOUT_MINUTES = 30;
const clock = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
const PREP_WORDS = { UNCONFIRMED: "not confirmed", READY: "ready", HOMEMADE: "homemade", FROZEN: "frozen", OTHER: "sorted", NOT_NEEDED: "not needed" } as const;

/** Pure: the lived day's route. */
export function buildCaveRoute(input: RouteInputs): CaveRoute {
  const start = new Date(input.day.startedAt);
  const dayStart = new Date(start); dayStart.setHours(16, 30, 0, 0);
  if (dayStart > start) dayStart.setDate(dayStart.getDate() - 1);
  const dayEnd = nextRolloverBoundaryAfter(start);
  const scheduled = livedDayShiftWindow(start, input.pattern);
  const dayKind = input.day.workContext === "OFF" ? "OFF" : input.day.workContext === "WORK" || scheduled ? "WORK" : "OFF";
  const now = input.now.getTime();
  const points: Omit<Waypoint, "passed">[] = [], notes: string[] = [];

  if (dayKind === "WORK" && scheduled) {
    const prep = input.prep ? ` Food ${PREP_WORDS[input.prep.FOOD.value]}, bottle ${PREP_WORDS[input.prep.BOTTLE.value]}.` : "";
    points.push({ kind: "SHIFT_START", at: scheduled.start.toISOString(), fixed: true, label: "SHIFT", why: `From your schedule.${prep}` });
    const ended = input.workEndedAt ? ` You marked work ended at ${clock(new Date(input.workEndedAt))}.` : "";
    points.push({ kind: "SHIFT_END", at: scheduled.end.toISOString(), fixed: true, label: "SHIFT ENDS", why: `From your schedule. Then shift down.${ended}` });
  } else if (dayKind === "WORK") notes.push("A work day with no shift in your schedule, so the route has no shift times.");

  const timed = input.rows.filter((r) => r.context === dayKind && r.sleepWindow).map((r) => r.sleepWindow!);
  const kindWords = dayKind === "WORK" ? "work days" : "days off";
  if (timed.length >= RUN_MEAN_FLOOR) {
    const base = dayStart.getTime();
    for (const [kind, minutes] of [["SLEEP", median(timed.map((w) => w.start))], ["WAKE", median(timed.map((w) => w.end))]] as const) {
      const at = base + Math.round(minutes) * 60000;
      if (at >= dayEnd.getTime()) continue;
      points.push({ kind, at: new Date(at).toISOString(), fixed: false, label: kind === "SLEEP" ? "SLEEP" : "WAKE",
        why: `Your usual ${kind === "SLEEP" ? "sleep start" : "wake time"} on ${kindWords}, from ${timed.length} Garmin-timed days. Not an order.` });
    }
  } else notes.push(`Usual sleep and wake times appear after ${RUN_MEAN_FLOOR} Garmin-timed ${kindWords}; ${timed.length} so far.`);

  points.push({ kind: "DAY_END", at: dayEnd.toISOString(), fixed: true, label: "DAY ROLLS", why: "Your 16:30 boundary. A new lived day starts." });
  const waypoints = points.sort((a, b) => a.at.localeCompare(b.at)).map((p) => ({
    ...p, passed: Date.parse(p.at) <= now || (p.kind === "SHIFT_END" && !!input.workEndedAt),
  }));
  const prepPending = dayKind === "WORK" && input.prep ? (["FOOD", "BOTTLE"] as const).filter((i) => input.prep![i].value === "UNCONFIRMED").map((i) => i === "FOOD" ? "food" as const : "bottle" as const) : [];
  return { dayStart: dayStart.toISOString(), dayEnd: dayEnd.toISOString(), dayKind, waypoints, notes, prepPending };
}

export async function getCaveRoute(now: Date = new Date()): Promise<CaveRoute | null> {
  const day = await getActiveDay();
  if (!day) return null;
  const [pattern, picture, ended, prep] = await Promise.all([getSchedulePattern(), getWholePicture(now), getWorkPeriodEnded(day.id), getPreparation(day.id).catch(() => null)]);
  return buildCaveRoute({ day, pattern, rows: picture.rows, workEndedAt: ended?.occurredAt ?? null, prep, now });
}

/** The next points still ahead of you, at most `count`. */
export function nextWaypoints(route: CaveRoute, now: Date, count = 3): Waypoint[] {
  return route.waypoints.filter((w) => !w.passed && Date.parse(w.at) > now.getTime()).slice(0, count);
}

/** "in 40 min", "in 2:05". */
export function describeIn(at: string, now: Date): string {
  const m = Math.max(0, Math.round((Date.parse(at) - now.getTime()) / 60000));
  return m < 60 ? `in ${m} min` : `in ${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** The comms line's words for a point passed within CALLOUT_MINUTES, newest first; null when none. In-app only. */
export function routeCallout(route: CaveRoute, now: Date): string | null {
  const recent = route.waypoints
    .filter((w) => { const ago = now.getTime() - Date.parse(w.at); return ago >= 0 && ago <= CALLOUT_MINUTES * 60000; })
    .at(-1);
  if (!recent) return null;
  if (recent.kind === "SHIFT_START") {
    const pending = route.prepPending;
    return pending.length ? `On shift. ${pending.length === 2 ? "Food and bottle" : pending[0] === "food" ? "Food" : "Bottle"} not confirmed.` : "On shift.";
  }
  if (recent.kind === "SHIFT_END") return "Shift's done. Shift down when you're ready.";
  if (recent.kind === "SLEEP") return "Your usual sleep time. Your call.";
  if (recent.kind === "WAKE") return "Your usual wake time.";
  return null;
}
