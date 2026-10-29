import { getCaveBrief, type CaveBrief } from "./caveBrief";
import { getActiveDay, getHydrationEntries, getProteinEntries, getWorkPeriodEnded, getWorkPeriodStarted } from "./queries";
import { getMealEntries } from "./nutritionQueries";
import { describeIn, getCaveRoute, type CaveRoute } from "./caveRoute";

/**
 * SHIFT-CHANGE-001 (owner go 2026-10-28, 04:18 on shift: "Am."): the moment the suit gives the end of a
 * shift, once. LANDING for the last 45 minutes: a T-minus to the end, what is still open, and the
 * landing plan. SECURED from the end (or work marked ended) for 3 hours: time on the clock, the
 * after-action, the landing plan and at most one signal. Read from the BRIEF and ROUTE already
 * computed; nothing is scored, stored or sent to the Engine.
 */
export const LANDING_MINUTES = 45;
/** PREFLIGHT: how long before the scheduled start the suit gives the shift the whole screen. */
export const PREFLIGHT_MINUTES = 90;
export const SECURED_HOURS = 3;
export const REAL_END_SLACK_HOURS = 2;

export interface ShiftChangeRow { key: string; label: string; value: string; tone: "ON" | "OFF" | "NONE" }
export interface ShiftChange {
  /** Once per shift and phase: the dismissal key. */
  key: string;
  phase: "PREFLIGHT" | "LANDING" | "SECURED";
  /** The lived day it belongs to (STARTED WORK writes to it). */
  dayId: string;
  /** Shift end, ISO. */
  end: string;
  /** PREFLIGHT and LANDING: "T–00:42" to the start or the end. SECURED: hours on the clock, "12:00". */
  clock: string;
  rows: ShiftChangeRow[];
  /** "Usual sleep 07:40–13:10 · lights out in 1:35", or why there is none yet. */
  plan: string;
  /** The one thing that is off, in plain words; null when nothing is. */
  signal: string | null;
  /** The shift on one line: its span and every water and food log inside it, ISO. */
  line: { start: string; end: string; water: string[]; food: string[] } | null;
}

export interface ShiftMarks { water: readonly string[]; food: readonly string[] }

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dur = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

/** Pure: the shift-change moment for this instant, or null outside its windows. */
const TO_DO: Record<string, string> = { CHECK_IN: "check in", FUEL: "eat", HYDRATION: "drink water", PACK_FOOD: "pack food", PACK_BOTTLE: "fill your bottle", HANDOFF: "read the handoff note" };
/** PREFLIGHT's one line: what's left before the shift, or that you're set. */
export function describeStillToDo(brief: CaveBrief): string {
  const left = brief.items.filter((i) => i.key !== "SLEEP" && i.state !== "GO" && i.state !== "ADVISORY" && TO_DO[i.key]).map((i) => TO_DO[i.key]!);
  if (!left.length) return "You're set.";
  const list = left.length > 1 ? `${left.slice(0, -1).join(", ")} and ${left.at(-1)}` : left[0]!;
  return `Still to do: ${list}.`;
}

export function buildShiftChange(brief: CaveBrief | null, route: CaveRoute | null, now: Date, marks: ShiftMarks = { water: [], food: [] }): ShiftChange | null {
  if (!brief?.shift || !route) return null;
  // A tap within 2 hours of the scheduled end is the real end; a later one is a late record, not a longer shift.
  const scheduledEnd = Date.parse(brief.shift.end), marked = brief.endedAt ? Date.parse(brief.endedAt) : NaN;
  const t = now.getTime(), start = Date.parse(brief.startedAt ?? brief.shift.start);
  const sleepItem = brief.items.find((i) => i.key === "SLEEP" && i.state === "ADVISORY");
  const signal = sleepItem ? `Sleep before this shift: ${sleepItem.detail}` : null;

  // PREFLIGHT (owner go 2026-10-28, "go preflight"): the 90 minutes before the scheduled start, until
  // STARTED WORK. Every system polled GO or HOLD; the verdict in plain words.
  if (brief.phase === "BEFORE") {
    const s0 = Date.parse(brief.shift.start);
    if (t >= s0 || s0 - t > PREFLIGHT_MINUTES * 60_000) return null;
    const m = Math.max(0, Math.round((s0 - t) / 60000));
    // OWNER-GO-001 (Gavin: "Go"): one line of what's still to do, in plain words, instead of six
    // HOLD rows and a verdict that repeated them. The cave's BRIEF keeps the full system list.
    return { key: `${brief.dayId}:PREFLIGHT`, phase: "PREFLIGHT", dayId: brief.dayId, end: brief.shift.start, clock: `T–${dur(m).padStart(5, "0")}`, rows: [], plan: describeStillToDo(brief), signal, line: null };
  }
  const end = Number.isFinite(marked) && marked <= scheduledEnd + REAL_END_SLACK_HOURS * 3600_000 ? marked : scheduledEnd;
  const ended = brief.phase === "AFTER";
  const phase = ended ? (t - end <= SECURED_HOURS * 3600_000 ? "SECURED" : null)
    : brief.phase === "ON" && end - t <= LANDING_MINUTES * 60_000 ? "LANDING" : null;
  if (!phase) return null;

  const lineEnd = Math.min(t, end);
  const inside = (list: readonly string[]) => list.filter((at) => { const x = Date.parse(at); return x >= start && x <= lineEnd; }).sort();
  const line = { start: new Date(start).toISOString(), end: new Date(phase === "LANDING" ? end : lineEnd).toISOString(), water: inside(marks.water), food: inside(marks.food) };
  const sleep = route.waypoints.find((w) => w.kind === "SLEEP" && !w.passed);
  const wake = route.waypoints.find((w) => w.kind === "WAKE");
  const plan = sleep ? `Usual sleep ${hhmm(sleep.at)}${wake ? `–${hhmm(wake.at)}` : ""} · lights out ${describeIn(sleep.at, now)}.`
    : "Your usual sleep time shows after 3 Garmin-timed work days.";
  if (phase === "LANDING") {
    const m = Math.max(0, Math.round((end - t) / 60000));
    // Only what can still be done before the end: fuel, water and the handoff note. Packing is for the next shift.
    const rows = brief.items.filter((i) => (i.state === "LATE" || i.state === "HOLD" || i.state === "ADVISORY") && (i.key === "FUEL" || i.key === "HYDRATION" || i.key === "HANDOFF"))
      .map((i) => ({ key: i.key, label: i.system, value: i.detail, tone: "NONE" as const }));
    return { key: `${brief.dayId}:LANDING`, phase, dayId: brief.dayId, end: new Date(end).toISOString(), clock: `T–${dur(m).padStart(5, "0")}`, rows, plan, signal, line };
  }
  const rows = (brief.aar ?? []).filter((r) => r.key !== "SHIFT" && r.key !== "SLEEP")
    .map((r) => ({ key: r.key, label: r.label, value: r.actual, tone: r.verdict === "OFF_PLAN" ? "OFF" as const : r.verdict === "ON_PLAN" ? "ON" as const : "NONE" as const }));
  const worked = Math.max(0, Math.round((Math.min(t, end) - start) / 60000));
  return { key: `${brief.dayId}:SECURED`, phase, dayId: brief.dayId, end: new Date(end).toISOString(), clock: dur(worked), rows, plan, signal, line };
}

export async function getShiftChange(now: Date = new Date()): Promise<ShiftChange | null> {
  const [brief, route] = await Promise.all([getCaveBrief(now), getCaveRoute(now)]);
  if (!brief?.shift) return null;
  const [water, meals, protein] = await Promise.all([getHydrationEntries(brief.dayId), getMealEntries(brief.dayId), getProteinEntries(brief.dayId)]);
  return buildShiftChange(brief, route, now, { water: water.map((w) => w.at), food: [...meals.map((m) => m.at), ...protein.map((p) => p.at)] });
}

/** How long around the scheduled start TODAY offers the one-tap STARTED WORK. */
export const START_OFFER_BEFORE_HOURS = 3;
export const START_OFFER_AFTER_HOURS = 2;
/** FIELD-REHEARSAL-002: how long before the scheduled end TODAY offers the one-tap WORK ENDED. */
export const END_OFFER_BEFORE_HOURS = 2;

export interface WorkStart { dayId: string; shiftStart: string; shiftEnd: string; startedAt: string | null; offerEnd: boolean }

/**
 * Pure: what TODAY's shift line offers at this instant: STARTED WORK around the start, ON THE CLOCK once
 * tapped, and WORK ENDED from 2 hours before the scheduled end until work is marked ended.
 */
export function workStartOffer(route: CaveRoute | null, dayId: string | null, started: string | null, ended: boolean, now: Date): WorkStart | null {
  if (!route || !dayId || ended || route.dayKind !== "WORK") return null;
  const start = route.waypoints.find((w) => w.kind === "SHIFT_START"), end = route.waypoints.find((w) => w.kind === "SHIFT_END");
  if (!start || !end) return null;
  const s = Date.parse(start.at), e = Date.parse(end.at), t = now.getTime();
  const offerEnd = t >= e - END_OFFER_BEFORE_HOURS * 3600_000;
  const aroundStart = t >= s - START_OFFER_BEFORE_HOURS * 3600_000 && t <= s + START_OFFER_AFTER_HOURS * 3600_000;
  if (!offerEnd && !aroundStart) return null;
  return { dayId, shiftStart: start.at, shiftEnd: end.at, startedAt: started, offerEnd };
}

export async function getWorkStart(now: Date = new Date()): Promise<WorkStart | null> {
  const [route, day] = await Promise.all([getCaveRoute(now), getActiveDay()]);
  if (!day) return null;
  const [started, ended] = await Promise.all([getWorkPeriodStarted(day.id), getWorkPeriodEnded(day.id)]);
  return workStartOffer(route, day.id, started?.occurredAt ?? null, !!ended, now);
}
