import { getSchedulePattern } from "./queries";
import { getUnresolvedObligations } from "./intentQueries";
import { getKeyMomentAlerts } from "./keyMomentAlerts";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import type { KeyMomentAlertSettings, KeyMomentKind } from "../domain/common/types";

/**
 * BRIDGE-MOMENTS-001 (owner go 2026-10-31, ideas 12 and 13): what BEYOND hands Health Bridge, so the phone can
 * speak at the key moments and show Alfred's brief on the home screen without BEYOND open. Read only; the Bridge
 * keeps nothing else. Moments come from the saved schedule.
 *
 * BRIDGE-NOTIFY-001 (Gavin, 2026-11-15; BEYOND-4.0 decision 5): the same four kinds, now held to the notification
 * contract. Per kind off switches and quiet hours drop a moment; quiet on the clock drops one that falls inside a
 * shift; then at most MAX_PER_DAY a lived day survive, chosen by KIND_PRIORITY. The plan covers HORIZON_DAYS so the
 * Bridge's background check can keep re-arming it between visits (see Health Bridge MomentAlerts / GarminCheckWorker).
 */
export interface BridgeMoment { at: number; kind: KeyMomentKind; title: string; text: string; go: string }
export interface BridgePlan { home: string; brief: string; moments: BridgeMoment[] }

const MIN = 60_000;
/** Decision 5: a hard cap of 3 notifications a day. A day is BEYOND's lived day (16:30 to 16:30), the day TODAY shows. */
export const MAX_PER_DAY = 3;
/** How far ahead the plan reaches: four weeks of the rotation, so alerts keep coming without another SYNC GARMIN. */
export const HORIZON_DAYS = 28;
/**
 * Which kinds win when a lived day has more than three: highest first, then the earlier moment.
 * Before the shift is the one that must not be missed; the end of the shift opens Alfred's debrief and the days-off
 * handover; a task due is a real commitment but also sits on TODAY; the wake prompt only asks for a sleep log.
 */
export const KIND_PRIORITY: readonly KeyMomentKind[] = ["BEFORE_SHIFT", "SHIFT_DONE", "TASK_DUE", "WAKE"];

function minutesOf(clock: string): number {
  const [h, m] = clock.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

/** Inside the owner's quiet hours (start inclusive, end exclusive; a window may cross midnight). */
export function inQuietHours(at: number, settings: KeyMomentAlertSettings): boolean {
  if (settings.quietFrom === null || settings.quietTo === null) return false;
  const d = new Date(at), t = d.getHours() * 60 + d.getMinutes();
  const from = minutesOf(settings.quietFrom), to = minutesOf(settings.quietTo);
  return from < to ? t >= from && t < to : t >= from || t < to;
}

/** Applies the notification contract: kinds off, quiet hours, quiet on the clock, then the daily cap. Pure. */
export function applyAlertContract(
  moments: BridgeMoment[],
  settings: KeyMomentAlertSettings,
  shifts: { start: Date; end: Date }[] = [],
): BridgeMoment[] {
  const onTheClock = (at: number) => shifts.some((s) => at > s.start.getTime() && at < s.end.getTime());
  const allowed = moments.filter((m) => !settings.off.includes(m.kind) && !inQuietHours(m.at, settings) && !onTheClock(m.at));
  const byDay = new Map<number, BridgeMoment[]>();
  for (const m of allowed) {
    const day = mostRecentBoundaryAtOrBefore(new Date(m.at)).getTime();
    byDay.set(day, [...(byDay.get(day) ?? []), m]);
  }
  const kept: BridgeMoment[] = [];
  for (const day of byDay.values()) {
    kept.push(...[...day].sort((a, b) => KIND_PRIORITY.indexOf(a.kind) - KIND_PRIORITY.indexOf(b.kind) || a.at - b.at).slice(0, MAX_PER_DAY));
  }
  return kept.sort((a, b) => a.at - b.at);
}

export async function buildBridgePlan(home: string, brief: string, now = new Date()): Promise<BridgePlan> {
  const [pattern, settings] = await Promise.all([getSchedulePattern(), getKeyMomentAlerts()]);
  const shiftOf = (d: number) => livedDayShiftWindow(new Date(now.getFullYear(), now.getMonth(), now.getDate() + d - 1, 16, 30), pattern);
  const shifts = new Map<number, { start: Date; end: Date; lastOfRun: boolean }>();
  for (let d = 0; d <= HORIZON_DAYS; d++) {
    const shift = shiftOf(d);
    if (shift) shifts.set(shift.start.getTime(), { ...shift, lastOfRun: shiftOf(d + 1) === null });
  }
  const moments: BridgeMoment[] = [];
  for (const { start, end, lastOfRun } of [...shifts.values()].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    moments.push(
      { at: start.getTime() - 180 * MIN, kind: "WAKE", title: "Up for the shift?", text: "Log your sleep; Alfred's brief is on TODAY.", go: "" },
      { at: start.getTime() - 30 * MIN, kind: "BEFORE_SHIFT", title: "Shift in 30 minutes", text: "Eat, water, and mark STARTED WORK when you're in.", go: "" },
      // BRIDGE-NOTIFY-001: the day-off moment rides on the existing end-of-shift kind, at the end of a run.
      lastOfRun
        ? { at: end.getTime(), kind: "SHIFT_DONE", title: "Shift's done", text: "Last shift of the run; days off start now. Tap to debrief with Alfred.", go: "?alfred=debrief" }
        : { at: end.getTime(), kind: "SHIFT_DONE", title: "Shift's done", text: "Tap to debrief with Alfred: say how it went.", go: "?alfred=debrief" },
    );
  }
  // BRIDGE-MOMENTS-002: open tasks due within the horizon reach the phone at 16:00 on their day, one moment a day.
  const tasks = await getUnresolvedObligations().catch(() => []);
  const due = new Map<number, string[]>();
  for (const t of tasks) {
    if (!t.dueAt || !/^\d{4}-\d{2}-\d{2}$/.test(t.dueAt)) continue;
    const [y, m, d] = t.dueAt.split("-").map(Number) as [number, number, number];
    const at = new Date(y, m - 1, d, 16, 0).getTime();
    if (at > now.getTime() && at - now.getTime() < (HORIZON_DAYS + 1) * 24 * 60 * MIN) due.set(at, [...(due.get(at) ?? []), t.title]);
  }
  for (const [at, titles] of due) {
    const text = titles.length === 1 ? titles[0]!.slice(0, 120) : `${titles[0]!.slice(0, 100)} + ${titles.length - 1} more`;
    moments.push({ at, kind: "TASK_DUE", title: "Due today", text, go: "" });
  }
  const future = moments.filter((m) => m.at > now.getTime());
  return { home, brief: brief.slice(0, 400), moments: applyAlertContract(future, settings, [...shifts.values()]) };
}

/** The SYNC GARMIN link, carrying the plan to the Bridge. */
export function helperSyncUrl(plan?: BridgePlan): string {
  return `intent://sync${plan ? `?plan=${encodeURIComponent(JSON.stringify(plan))}` : ""}#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end`;
}
