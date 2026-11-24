import { getSchedulePattern } from "./queries";
import { getUnresolvedObligations } from "./intentQueries";
import { getKeyMomentAlerts } from "./keyMomentAlerts";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { dayKindFor, getEatingWindowSettings, plannedOpening } from "./eatingWindow";
import { deriveLifeState, lifeStateInput } from "./lifeState";
import { getConfirmedKinds } from "./scheduleExceptions";
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
 * GRAYSON-WINDOW-ALERT-001: the eating window opening comes last, so it never pushes out an alert he already gets;
 * on a day with three others it waits (TODAY's Eating Window card and the logging nudge still cover it).
 */
export const KIND_PRIORITY: readonly KeyMomentKind[] = ["BEFORE_SHIFT", "SHIFT_DONE", "TASK_DUE", "WAKE", "WINDOW_OPEN"];

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

/** REMIND-AT-001: a 24-hour HH:MM clock time (the shape a reminder time is stored in). */
export const isClockTime = (v: string | undefined): v is string => !!v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

interface PlanTask { id: string; title: string; dueAt?: string | undefined; remindAt?: string | undefined }

/** REMIND-AT-001: the local instant of a task's alert: its reminder time on the due date, else 16:00 that day. */
export function taskAlertAt(dueAt: string, remindAt?: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) return null;
  const [y, m, d] = dueAt.split("-").map(Number) as [number, number, number];
  const [h, min] = isClockTime(remindAt) ? remindAt.split(":").map(Number) as [number, number] : [16, 0];
  return new Date(y, m - 1, d, h, min).getTime();
}

/** Every candidate moment for the horizon (before the contract), with the shifts it was built from. */
async function planCandidates(now: Date, tasks: PlanTask[]) {
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
  // REMIND-AT-001: a task with a reminder time alerts at that time instead, still as TASK_DUE (same switch, quiet hours,
  // priority and cap). Tasks at the same minute share one moment, so a moment's time and kind stay unique.
  const due = new Map<number, { titles: string[]; timed: boolean }>();
  for (const t of tasks) {
    const at = t.dueAt ? taskAlertAt(t.dueAt, t.remindAt) : null;
    if (at === null) continue;
    if (at > now.getTime() && at - now.getTime() < (HORIZON_DAYS + 1) * 24 * 60 * MIN) {
      const slot = due.get(at) ?? { titles: [], timed: true };
      due.set(at, { titles: [...slot.titles, t.title], timed: slot.timed && !!t.remindAt });
    }
  }
  for (const [at, { titles, timed }] of due) {
    const text = titles.length === 1 ? titles[0]!.slice(0, 120) : `${titles[0]!.slice(0, 100)} + ${titles.length - 1} more`;
    moments.push({ at, kind: "TASK_DUE", title: timed ? "Reminder" : "Due today", text, go: "" });
  }
  moments.push(...await windowMoments(now, pattern));
  return { settings, shifts: [...shifts.values()], moments: moments.filter((m) => m.at > now.getTime()) };
}

const clock12 = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * GRAYSON-WINDOW-ALERT-001 (Gavin, 2026-11-24: "I don't want it to be annoying and pester me"): with the Eating Window
 * on, one moment per lived day in the horizon at that day kind's opening, the kind named from the saved rotation and
 * his confirmed schedule changes the way TODAY names it (WORK_RUN → WORK, RECOVERY, FREE or FLIP → OFF). A day whose
 * kind can't be named gets none. The tap opens Delta ready for the first meal. Planned ahead: a SKIP TODAY or an early
 * OPENED mark reaches the phone only at the next SYNC GARMIN, when the plan is rebuilt.
 */
async function windowMoments(now: Date, pattern: Awaited<ReturnType<typeof getSchedulePattern>>): Promise<BridgeMoment[]> {
  const settings = await getEatingWindowSettings().catch(() => null);
  if (!settings?.enabled) return [];
  const confirmed = await getConfirmedKinds().catch(() => new Map<string, "WORK" | "OFF">());
  const out: BridgeMoment[] = [];
  for (let d = 0; d <= HORIZON_DAYS; d++) {
    const livedStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d - 1, 16, 30);
    const kind = dayKindFor(deriveLifeState(lifeStateInput(livedStart, pattern, null, null, undefined, confirmed))?.state);
    if (!kind) continue;
    const opens = plannedOpening(livedStart, settings.opensAt[kind]);
    const closes = new Date(opens.getTime() + settings.eatingHours * 3_600_000);
    out.push({ at: opens.getTime(), kind: "WINDOW_OPEN", title: "Eating window open", text: `Your window is open until ${clock12(closes)}. Tap to tell Delta your first meal.`, go: "?alfred=meal" });
  }
  return out;
}

export async function buildBridgePlan(home: string, brief: string, now = new Date()): Promise<BridgePlan> {
  const tasks = await getUnresolvedObligations().catch(() => []);
  const { settings, shifts, moments } = await planCandidates(now, tasks);
  return { home, brief: brief.slice(0, 400), moments: applyAlertContract(moments, settings, shifts) };
}

/**
 * REMIND-AT-001: whether a reminder time will actually reach the phone, said when it is set, never silently dropped.
 * Runs the same contract as the plan, with this task in it (replacing its saved copy when `obligationId` is given).
 * True as of now: a shift or an earlier task added later can still take the day's slot.
 */
export type ReminderAlert =
  | { state: "ALERTS"; at: number }
  | { state: "LATER"; at: number }
  | { state: "SILENT"; at: number | null; reason: "PAST" | "KIND_OFF" | "QUIET_HOURS" | "ON_THE_CLOCK" | "CAP_FULL" };

export async function reminderAlert(input: { dueAt: string; remindAt: string; title?: string; obligationId?: string }, now = new Date()): Promise<ReminderAlert> {
  const at = taskAlertAt(input.dueAt, input.remindAt);
  if (at === null || at <= now.getTime()) return { state: "SILENT", at, reason: "PAST" };
  const saved = (await getUnresolvedObligations().catch(() => [])).filter((t) => t.id !== input.obligationId);
  const self: PlanTask = { id: input.obligationId ?? "new", title: input.title ?? "Reminder", dueAt: input.dueAt, remindAt: input.remindAt };
  const { settings, shifts, moments } = await planCandidates(now, [...saved, self]);
  if (settings.off.includes("TASK_DUE")) return { state: "SILENT", at, reason: "KIND_OFF" };
  if (inQuietHours(at, settings)) return { state: "SILENT", at, reason: "QUIET_HOURS" };
  const onTheClock = (t: number, list: { start: Date; end: Date }[]) => list.some((s) => t > s.start.getTime() && t < s.end.getTime());
  if (onTheClock(at, shifts)) return { state: "SILENT", at, reason: "ON_THE_CLOCK" };
  if (at - now.getTime() >= (HORIZON_DAYS + 1) * 24 * 60 * MIN) return { state: "LATER", at };
  const kept = applyAlertContract(moments, settings, shifts);
  return kept.some((m) => m.at === at && m.kind === "TASK_DUE") ? { state: "ALERTS", at } : { state: "SILENT", at, reason: "CAP_FULL" };
}

function clockOf(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function dayOf(at: number): string {
  return new Date(at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** REMIND-AT-001: the one line every place that sets a reminder time shows. */
export function describeReminderAlert(alert: ReminderAlert, settings?: KeyMomentAlertSettings): string {
  const when = alert.at === null ? "" : `${clockOf(alert.at)} on ${dayOf(alert.at)}`;
  switch (alert.state) {
    case "ALERTS": return `Alerts at ${when}. Your phone gets it at the next SYNC GARMIN.`;
    case "LATER": return `Set for ${when}. It's over four weeks away, so it reaches your phone at a SYNC GARMIN within four weeks of it; the 3-a-day cap and quiet hours still apply.`;
    case "SILENT":
      switch (alert.reason) {
        case "PAST": return "Won't alert: that time has already passed.";
        case "KIND_OFF": return "Won't alert: task alerts are off (MORE → Work Schedule → KEY-MOMENT ALERTS).";
        case "QUIET_HOURS": return `Won't alert: ${clockOf(alert.at!)} is in your quiet hours${settings?.quietFrom && settings.quietTo ? ` (${settings.quietFrom} to ${settings.quietTo})` : ""}.`;
        case "ON_THE_CLOCK": return `Won't alert: ${clockOf(alert.at!)} falls during a shift of your standing rotation.`;
        case "CAP_FULL": {
          // The cap counts BEYOND's lived day (16:30 to 16:30), so name that day, not the calendar date.
          const from = mostRecentBoundaryAtOrBefore(new Date(alert.at!)).getTime();
          return `Won't alert: the day from ${clockOf(from)} ${dayOf(from)} already has 3 alerts that come first (shift alerts, then earlier tasks).`;
        }
      }
  }
}

/** REMIND-AT-001: the status line, ready for the screen. */
export async function reminderAlertLine(input: { dueAt: string; remindAt: string; title?: string; obligationId?: string }, now = new Date()): Promise<string> {
  const [alert, settings] = await Promise.all([reminderAlert(input, now), getKeyMomentAlerts()]);
  return describeReminderAlert(alert, settings);
}

/** The SYNC GARMIN link, carrying the plan to the Bridge. */
export function helperSyncUrl(plan?: BridgePlan): string {
  return `intent://sync${plan ? `?plan=${encodeURIComponent(JSON.stringify(plan))}` : ""}#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end`;
}
