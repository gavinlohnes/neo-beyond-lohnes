import { db } from "../persistence/db";
import { DEFAULT_SCHEDULE_PATTERN } from "../engine/scheduledContext";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { EATING_HOURS_MAX, EATING_HOURS_MIN, eatingWindowSettingsSchema, parseEatingWindowSettings } from "../persistence/eatingWindowValidation";
import type { DomainEvent, EatingWindowDayKind, EatingWindowMarkVoidedPayload, EatingWindowMarkedPayload, EatingWindowSettings } from "../domain/common/types";
import { ensureActiveDay, logEvent, newId, placeInDay } from "./commands";
import { getMealEntries } from "./nutritionQueries";
import { logWindow } from "./logTimes";
import { getFoodDiary } from "./foodDiaryQueries";
import { getActiveDay } from "./queries";
import { getTodayPicture } from "./todayPicture";

export { EATING_HOURS_MAX, EATING_HOURS_MIN };

/**
 * GRAYSON C4.8a · Eating Window foundation (design GRAYSON-BEHAVIOR-FASTING-DESIGN-001, #601; build approved by Gavin
 * 2026-11-23: "Approve C4.8a"). A neutral, shift-aware time-restricted-eating programme: off until he turns it on,
 * one planned opening time per kind of lived day, and a window length he picks. He marks when he stops and starts
 * eating; nothing is inferred from meals in this slice. Completing a fast is never "success", there is no ladder of
 * levels, and the context lines are labelled as typical, never measured in him. It reads no targets and changes no
 * advice, targets or Engine input.
 */

/** The presets, named by fasting:eating hours. The duration is the name; none is a level above another. */
export const EATING_PRESETS: readonly { label: string; eatingHours: number }[] = [
  { label: "12:12", eatingHours: 12 }, { label: "14:10", eatingHours: 10 }, { label: "16:8", eatingHours: 8 }, { label: "18:6", eatingHours: 6 },
];
export const DEFAULT_EATING_HOURS = 10; // 14:10, the design's suggested first trial
export const DEFAULT_OPENS_AT: Record<EatingWindowDayKind, string> = { WORK: "14:00", RECOVERY: "14:00", OFF: "10:00" };
export const presetLabel = (eatingHours: number) => `${24 - eatingHours}:${eatingHours}`;

/** The safety check (design §5.8). Any "yes" routes to a clinician before an active plan; answers are never stored. */
export const SAFETY_QUESTIONS: readonly string[] = [
  "Do you have diabetes, or take medicine that lowers blood sugar?",
  "Do you take a medicine that has to be taken with food?",
  "Have you ever had an eating disorder or disordered eating?",
  "Have you had fainting spells or low blood sugar?",
];

/** Typical transitions by elapsed fasting time (design §5.6). Always labelled; never "unlocked" or a level. */
export const TYPICAL_LABEL = "Typical, not measured in you.";
export function typicalContext(elapsedMinutes: number): string {
  const h = elapsedMinutes / 60;
  if (h < 4) return "Digestion and absorption may still be active; meal size and makeup matter.";
  if (h < 12) return "You're generally moving toward a post-absorptive period. Exact timing varies.";
  if (h < 18) return "Use of stored energy and fat burning may be increasing. This is not a measurement.";
  return "This is a longer daily fast. BEYOND can't tell ketosis or extra benefit from time alone.";
}

export interface EatingMark { id: string; dayId: string | undefined; boundary: "CLOSED" | "OPENED"; at: string; seq?: number | undefined }
export type EatingWindowState =
  | { kind: "SKIPPED"; skipId: string }
  | { kind: "FASTING"; since: string; elapsedMinutes: number; opensAt: string | null; context: string; markId: string }
  | { kind: "OPEN"; since: string; leftMinutes: number; closesAt: string; markId: string }
  | { kind: "PLANNED"; opensAt: string; closesAt: string };

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Pure. The planned opening on a lived day: "HH:MM" at or after its 16:30 start falls on its first date, else its second. */
export function plannedOpening(livedStart: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const first = new Date(livedStart.getFullYear(), livedStart.getMonth(), livedStart.getDate(), h, m);
  return first.getTime() >= livedStart.getTime() ? first : new Date(livedStart.getFullYear(), livedStart.getMonth(), livedStart.getDate() + 1, h, m);
}

/** Pure. Which planned window a day kind gets. */
export const dayKindFor = (state: string | null | undefined): EatingWindowDayKind | null =>
  state === "WORK_RUN" ? "WORK" : state === "RECOVERY" ? "RECOVERY" : state === "FREE" || state === "FLIP" ? "OFF" : null;

/**
 * Pure. The card's state from his settings, today's kind, his own marks (newest wins, voids applied) and a skip.
 * Without a mark yet it shows the plan; after CLOSED it's a fast in progress; after OPENED the window is open.
 */
export function deriveEatingWindow(input: {
  now: Date; settings: EatingWindowSettings; kind: EatingWindowDayKind | null; dayStartedAt: string;
  marks: readonly EatingMark[]; skipId: string | null;
}): EatingWindowState | null {
  const { now, settings } = input;
  if (!settings.enabled || !input.kind) return null;
  if (input.skipId) return { kind: "SKIPPED", skipId: input.skipId };
  const livedStart = mostRecentBoundaryAtOrBefore(new Date(input.dayStartedAt));
  const opening = plannedOpening(livedStart, settings.opensAt[input.kind]);
  const hours = settings.eatingHours * 60 * 60_000;
  // Newest wins; two marks in the same instant fall back to record order.
  const last = [...input.marks].sort((a, b) => a.at.localeCompare(b.at) || (a.seq ?? 0) - (b.seq ?? 0)).at(-1);
  if (last?.boundary === "CLOSED") {
    const elapsed = Math.max(0, Math.round((now.getTime() - Date.parse(last.at)) / 60_000));
    const next = opening.getTime() > Date.parse(last.at) ? opening : null;
    return { kind: "FASTING", since: last.at, elapsedMinutes: elapsed, opensAt: next ? clock(next) : null, context: typicalContext(elapsed), markId: last.id };
  }
  if (last?.boundary === "OPENED" && now.getTime() - Date.parse(last.at) < 24 * 3_600_000) {
    const closes = new Date(Date.parse(last.at) + hours);
    return { kind: "OPEN", since: last.at, leftMinutes: Math.max(0, Math.round((closes.getTime() - now.getTime()) / 60_000)), closesAt: clock(closes), markId: last.id };
  }
  return { kind: "PLANNED", opensAt: clock(opening), closesAt: clock(new Date(opening.getTime() + hours)) };
}

/** Pure. His marks and today's skip from the raw events, with voids applied. */
export function readMarks(events: readonly DomainEvent[], dayId: string | null): { marks: EatingMark[]; skipId: string | null } {
  const voided = new Set(events.filter((e) => e.type === "EATING_WINDOW_MARK_VOIDED").map((e) => (e.payload as EatingWindowMarkVoidedPayload).voidsEventId));
  const marks = events.filter((e) => e.type === "EATING_WINDOW_MARKED" && !voided.has(e.id))
    .map((e) => ({ id: e.id, dayId: e.beyondDayId, boundary: (e.payload as EatingWindowMarkedPayload).boundary, at: e.occurredAt, seq: e.seq }));
  const skip = dayId ? events.filter((e) => e.type === "EATING_WINDOW_DAY_SKIPPED" && e.beyondDayId === dayId && !voided.has(e.id)).at(-1) : undefined;
  return { marks, skipId: skip?.id ?? null };
}

// ---- Settings (configuration on the "current" schedule row; no DomainEvent, like the caffeine cut-off) ----

export async function getEatingWindowSettings(): Promise<EatingWindowSettings | null> {
  return parseEatingWindowSettings((await db.schedulePatterns.get("current"))?.eatingWindowSettings);
}

/** Saves his settings. Turning it on needs a completed safety check (`safetyCheckedAt`). Never touches the schedule. */
export async function saveEatingWindowSettings(next: Omit<EatingWindowSettings, "setAt">, now = new Date()): Promise<EatingWindowSettings> {
  const settings = eatingWindowSettingsSchema.parse({ ...next, setAt: now.toISOString() });
  return db.transaction("rw", db.schedulePatterns, async () => {
    const existing = await db.schedulePatterns.get("current");
    await db.schedulePatterns.put({ ...(existing ?? DEFAULT_SCHEDULE_PATTERN), eatingWindowSettings: settings });
    return settings;
  });
}

// ---- His marks (day-scoped events on the active lived day) ----

/**
 * CLOSED: he's stopped eating (a fast starts). OPENED: he's started eating. Returns the event id for UNDO.
 * C4.8b: `at` places the mark at a logged meal's time (his tap on "END FAST AT 02:10" or "FAST FROM 21:40"), inside
 * today's lived day and never ahead of now.
 */
export async function markEatingWindow(boundary: "CLOSED" | "OPENED", at?: string, now: Date = new Date()): Promise<string> {
  const day = await ensureActiveDay();
  let occurredAt: string | undefined;
  if (at !== undefined) {
    occurredAt = await placeInDay(day.id, at);
    if (Date.parse(occurredAt) > now.getTime()) throw new Error("EATING_MARK_AHEAD: a fast can't start or end later than now.");
  }
  const commandId = newId();
  const payload: EatingWindowMarkedPayload = { commandId, boundary };
  return logEvent(day.id, "EATING_WINDOW_MARKED", payload, "USER", commandId, undefined, occurredAt);
}
export async function skipEatingWindowToday(): Promise<string> {
  const day = await ensureActiveDay();
  const commandId = newId();
  return logEvent(day.id, "EATING_WINDOW_DAY_SKIPPED", { commandId }, "USER", commandId);
}
/** UNDO of a mark or a skip: an additive void; the original stays in history. */
export async function voidEatingWindowEvent(eventId: string): Promise<void> {
  const original = await db.events.get(eventId);
  if (!original?.beyondDayId || (original.type !== "EATING_WINDOW_MARKED" && original.type !== "EATING_WINDOW_DAY_SKIPPED")) throw new Error("EATING_WINDOW_NOT_FOUND");
  const commandId = newId();
  const payload: EatingWindowMarkVoidedPayload = { commandId, voidsEventId: eventId };
  await logEvent(original.beyondDayId, "EATING_WINDOW_MARK_VOIDED", payload, "USER", commandId, eventId);
}

/**
 * GRAYSON C4.8b (Gavin, 2026-11-23: "7 + 8 as C4.8b"): the window reacts to what he logs, as an offer only.
 * - FASTING and a meal is logged after the fast began: "END FAST AT <meal time>?".
 * - OPEN with an hour or less left (or past), or no marks today and the planned window is over: "FAST FROM <last
 *   meal>?", from the last meal logged in the window.
 * A meal never moves a boundary by itself (design §5.4: a meal may suggest, never prove). He can dismiss an offer.
 */
export type MealPrompt = { kind: "END_AT" | "START_FROM"; at: string; name: string; mealId: string };
export const LAST_MEAL_OFFER_MINUTES = 60;
export interface LoggedMeal { at: string; name: string; rootEventId: string }

/** Pure. The one offer, if any. `plannedClose` is the planned end of today's window (for the PLANNED case). */
export function deriveMealPrompt(state: EatingWindowState, meals: readonly LoggedMeal[], now: Date, plannedClose: Date | null, dismissed: ReadonlySet<string>,
  placeable?: { start: Date; end: Date }): MealPrompt | null {
  const t = (m: LoggedMeal) => Date.parse(m.at);
  // Only a time the mark can take: not ahead of now and, when given, inside today's lived day (where marks are placed),
  // so the card never offers a boundary its button would be refused.
  const fits = (m: LoggedMeal) => t(m) <= now.getTime() && (!placeable || (t(m) >= placeable.start.getTime() && t(m) < placeable.end.getTime()));
  const sorted = [...meals].filter(fits).sort((a, b) => t(a) - t(b));
  const offer = (kind: MealPrompt["kind"], m: LoggedMeal | undefined): MealPrompt | null =>
    m && !dismissed.has(`${kind}:${m.rootEventId}`) ? { kind, at: m.at, name: m.name, mealId: m.rootEventId } : null;
  if (state.kind === "FASTING") return offer("END_AT", sorted.find((m) => t(m) > Date.parse(state.since)));
  if (state.kind === "OPEN" && state.leftMinutes <= LAST_MEAL_OFFER_MINUTES) return offer("START_FROM", sorted.filter((m) => t(m) >= Date.parse(state.since)).at(-1));
  if (state.kind === "PLANNED" && plannedClose && now.getTime() >= plannedClose.getTime()) return offer("START_FROM", sorted.at(-1));
  return null;
}

/** C4.8b · 8: protein against the window, as plain facts. Null without a target. */
export interface WindowFuel { proteinG: number; targetG: number; leftG: number }
export const windowFuelLine = (fuel: WindowFuel, state: EatingWindowState): string | null =>
  state.kind !== "OPEN" ? null
    : fuel.leftG <= 0 ? `Protein ${fuel.proteinG} / ${fuel.targetG} g. Target met.`
    : `Protein ${fuel.proteinG} / ${fuel.targetG} g · ${fuel.leftG} g left${state.leftMinutes > 0 ? ` with ${Math.floor(state.leftMinutes / 60)}:${String(state.leftMinutes % 60).padStart(2, "0")} of window` : " and the planned window is up"}.`;

/** Read only. What TODAY's card shows, or null when it's off, not set up, or today's kind is unknown. */
export async function getEatingWindowView(now: Date = new Date(), dismissed: ReadonlySet<string> = new Set()): Promise<EatingWindowView | null> {
  const settings = await getEatingWindowSettings();
  if (!settings?.enabled) return null;
  const day = await getActiveDay();
  if (!day) return null;
  const [picture, events] = await Promise.all([
    getTodayPicture(now).catch(() => null),
    db.events.where("type").anyOf(["EATING_WINDOW_MARKED", "EATING_WINDOW_DAY_SKIPPED", "EATING_WINDOW_MARK_VOIDED"]).toArray(),
  ]);
  const { marks, skipId } = readMarks(events, day.id);
  const kind = dayKindFor(picture?.now?.state);
  const state = deriveEatingWindow({ now, settings, kind, dayStartedAt: day.startedAt, marks, skipId });
  if (!state) return null;
  // The fast may have begun on yesterday's day, so its meals are read from that day too.
  const mealDays = new Set([day.id]);
  if (state.kind === "FASTING") { const from = marks.find((m) => m.id === state.markId)?.dayId; if (from) mealDays.add(from); }
  const [meals, diary] = await Promise.all([
    Promise.all([...mealDays].map((id) => getMealEntries(id).catch(() => []))).then((all) => all.flat()),
    getFoodDiary(day.id).catch(() => null),
  ]);
  const plannedClose = kind ? new Date(plannedOpening(mostRecentBoundaryAtOrBefore(new Date(day.startedAt)), settings.opensAt[kind]).getTime() + settings.eatingHours * 3_600_000) : null;
  const prompt = deriveMealPrompt(state, meals.map((m) => ({ at: m.at, name: m.name, rootEventId: m.rootEventId })), now, plannedClose, dismissed,
    logWindow(day.startedAt, day.createdAt));
  const target = diary?.proteinTargetG;
  const fuel = diary && target !== undefined
    ? { proteinG: Math.round(diary.proteinG), targetG: Math.round(target), leftG: Math.max(0, Math.round(target - diary.proteinG)) } : null;
  return { settings, state, prompt, fuel };
}
export interface EatingWindowView { settings: EatingWindowSettings; state: EatingWindowState; prompt: MealPrompt | null; fuel: WindowFuel | null }
