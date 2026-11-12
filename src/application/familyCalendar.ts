import type { SchedulePattern } from "../domain/common/types";
import { formatLocalDate, isOperatorSavedSchedule, livedDayShiftWindow } from "../engine/scheduledContext";
import { deriveSleepRhythm, type SleepRhythm } from "../engine/sleepRhythm";
import { escapeCalendarText, foldCalendarLine } from "./calendarExport";
import { getDaySummaries } from "./dayLedgerQueries";
import { getImportedSleep } from "./externalSleepQueries";
import { FAMILY_CALENDAR_NAME, readFamilyCalendarId, readGoogleCalendarConnection, saveFamilyCalendarId, type GoogleCalendarConnection } from "./googleCalendar";
import { getSchedulePattern } from "./queries";

/**
 * BIG-IDEAS-001 item 8, the shared view for family (Protected: outward sharing). Gavin approved the privacy design
 * on 2026-11-12 ("Approve as described"). Exactly three kinds of event, for the next 4 weeks:
 *   - "Working", the saved schedule's shift times;
 *   - "Asleep — please don't call (usual time)", the usual post-shift main sleep, only with 3+ Garmin-timed work days;
 *   - "Day off", all day.
 * The titles are fixed, and no other text is ever written: no health numbers, sleep amounts, notes, tags, plans,
 * places or people. It goes to a separate Google calendar ("BEYOND — family") that Gavin shares, view-only, in
 * Google's own settings and can stop sharing there. Or it goes to an .ics file he sends himself. Nothing is written
 * until he confirms a preview. Never an Engine input.
 */
export type FamilyEventKind = "WORK" | "SLEEP" | "DAY_OFF";
export const FAMILY_TITLES: Record<FamilyEventKind, string> = {
  WORK: "Working",
  SLEEP: "Asleep — please don't call (usual time)",
  DAY_OFF: "Day off",
};
export { FAMILY_CALENDAR_NAME };
export const FAMILY_WEEKS = 4;

/** Times are local wall-clock ("YYYY-MM-DDTHH:MM:SS"), like the existing calendar export; all-day events are dates. */
export interface FamilyEvent { id: string; kind: FamilyEventKind; title: string; allDay: boolean; start: string; end: string }

const pad = (n: number) => String(n).padStart(2, "0");
const wall = (d: Date) => `${formatLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const livedStart = (now: Date, k: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, 16, 30);
function nextAtClock(from: Date, m: number): Date {
  const at = new Date(from.getFullYear(), from.getMonth(), from.getDate(), Math.floor(m / 60), m % 60);
  return at >= from ? at : new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, at.getHours(), at.getMinutes());
}

export function deriveFamilyCalendar(input: { now: Date; pattern: SchedulePattern; rhythm: SleepRhythm | null }): FamilyEvent[] {
  const { now, pattern, rhythm } = input;
  if (!isOperatorSavedSchedule(pattern)) return [];
  const work = rhythm?.groups.find((g) => g.kind === "WORK");
  // Every scheduled shift touching the window, once each (a shift can sit in two lived days' windows). From yesterday's
  // lived day, so the sleep after a shift that just ended still shows this morning.
  const shifts = new Map<number, { start: Date; end: Date }>();
  for (let k = -1; k <= FAMILY_WEEKS * 7; k++) {
    const w = livedDayShiftWindow(livedStart(now, k), pattern);
    if (w) shifts.set(w.start.getTime(), w);
  }
  const first = formatLocalDate(now), last = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + FAMILY_WEEKS * 7 - 1, 12));
  const events: FamilyEvent[] = [];
  const startDates = new Set<string>();
  for (const shift of [...shifts.values()].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const date = formatLocalDate(shift.start), stamp = date.replace(/-/g, "");
    startDates.add(date);
    if (shift.end > now && date <= last) events.push({ id: `work-${stamp}`, kind: "WORK", title: FAMILY_TITLES.WORK, allDay: false, start: wall(shift.start), end: wall(shift.end) });
    if (work) {
      const sleep = nextAtClock(shift.end, work.start), wake = nextAtClock(sleep, work.end);
      // Only a usual sleep that begins within 12 h of the shift's end is the sleep after this shift; a past one is left out.
      if (sleep.getTime() - shift.end.getTime() <= 12 * 3_600_000 && wake > now && formatLocalDate(sleep) <= last) {
        events.push({ id: `sleep-${stamp}`, kind: "SLEEP", title: FAMILY_TITLES.SLEEP, allDay: false, start: wall(sleep), end: wall(wake) });
      }
    }
  }
  // Review of #483: a day off is a calendar date on which no shift starts, so it is right for day shifts too.
  for (let k = 0; k < FAMILY_WEEKS * 7; k++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, 12), date = formatLocalDate(day);
    if (date < first || startDates.has(date)) continue;
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 12);
    events.push({ id: `off-${date.replace(/-/g, "")}`, kind: "DAY_OFF", title: FAMILY_TITLES.DAY_OFF, allDay: true, start: date, end: formatLocalDate(next) });
  }
  return events.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}

/** The same events as an .ics file: floating local times, the fixed titles, and nothing else. */
export function familyCalendarIcs(events: readonly FamilyEvent[], now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const value = (s: string) => s.replace(/[-:]/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BEYOND//Family Calendar//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escapeCalendarText(FAMILY_CALENDAR_NAME)}`];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@family.beyond.local`, `DTSTAMP:${stamp}`,
      e.allDay ? `DTSTART;VALUE=DATE:${value(e.start)}` : `DTSTART:${value(e.start)}`,
      e.allDay ? `DTEND;VALUE=DATE:${value(e.end)}` : `DTEND:${value(e.end)}`,
      `SUMMARY:${escapeCalendarText(e.title)}`, "TRANSP:OPAQUE", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldCalendarLine).join("\r\n") + "\r\n";
}

export async function getFamilyCalendar(now: Date = new Date()): Promise<FamilyEvent[]> {
  const [pattern, records, summaries] = await Promise.all([getSchedulePattern(), getImportedSleep(), getDaySummaries()]);
  return deriveFamilyCalendar({ now, pattern, rhythm: deriveSleepRhythm(records.map((r) => r.evidence), summaries, now) });
}

// ---- The separate Google calendar ----
export { readFamilyCalendarId };
const API = "https://www.googleapis.com/calendar/v3";
const OWNER = "BEYOND-FAMILY";

async function google<T>(path: string, connection: GoogleCalendarConnection, init?: RequestInit): Promise<T> {
  if (!connection.accessToken || connection.expiresAt <= Date.now()) throw new Error("Google Calendar connection expired. Connect again.");
  const response = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${connection.accessToken}`, "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw Object.assign(new Error(response.status === 401 ? "Google Calendar connection expired. Connect again." : `The family calendar could not sync (${response.status}).`), { status: response.status });
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

/**
 * Write the events to the family calendar, creating it the first time (and again if it was deleted in Google). Only
 * events this feature wrote (tagged BEYOND-FAMILY) and that haven't ended yet are read, changed or removed: past
 * ones stay as history, and anything else in that calendar is left alone. Upcoming events that left the schedule are
 * deleted, so she never sees a stale shift.
 */
export async function syncFamilyCalendar(events: readonly FamilyEvent[], now: Date = new Date(), connection: GoogleCalendarConnection = readGoogleCalendarConnection()): Promise<{ written: number; removed: number; calendarId: string; created: "NEW" | "RECREATED" | null }> {
  const create = async () => {
    const created = await google<{ id: string }>("/calendars", connection, { method: "POST", body: JSON.stringify({ summary: FAMILY_CALENDAR_NAME, description: "Shifts, usual sleep and days off, shared from BEYOND. Nothing else." }) });
    saveFamilyCalendarId(created.id); return created.id;
  };
  let created: "NEW" | "RECREATED" | null = null;
  // Review of #484: after a reinstall the stored id is gone, but the calendar she already sees may still exist. Find it
  // by name (one he owns) before making another.
  const existing = async () => {
    const list = await google<{ items?: Array<{ id: string; summary?: string; accessRole?: string }> }>("/users/me/calendarList?minAccessRole=owner", connection);
    const found = (list.items ?? []).find((c) => c.summary === FAMILY_CALENDAR_NAME);
    if (found) saveFamilyCalendarId(found.id);
    return found?.id ?? null;
  };
  let calendarId = readFamilyCalendarId() ?? await existing() ?? (created = "NEW", await create());
  // Google's timeMin keeps events that end after it: exactly the ones that haven't happened yet.
  const list = (id: string) => google<{ items?: Array<{ id: string; extendedProperties?: { private?: { beyondId?: string } } }> }>(
    `/calendars/${encodeURIComponent(id)}/events?privateExtendedProperty=beyondOwner%3D${OWNER}&timeMin=${encodeURIComponent(now.toISOString())}&maxResults=2500`, connection);
  let prior;
  try { prior = await list(calendarId); }
  catch (e) {
    // Deleted in Google: start a fresh family calendar rather than failing every sync.
    if ((e as { status?: number }).status !== 404) throw e;
    saveFamilyCalendarId(null); calendarId = await create(); created = "RECREATED"; prior = await list(calendarId);
  }
  const calendar = encodeURIComponent(calendarId);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const byId = new Map((prior.items ?? []).flatMap((e) => (e.extendedProperties?.private?.beyondId ? [[e.extendedProperties.private.beyondId, e.id] as const] : [])));
  for (const e of events) {
    const when = (v: string) => (e.allDay ? { date: v } : { dateTime: v, timeZone });
    const body = JSON.stringify({ summary: e.title, start: when(e.start), end: when(e.end), transparency: "opaque", extendedProperties: { private: { beyondOwner: OWNER, beyondId: e.id } } });
    const found = byId.get(e.id);
    await google(`/calendars/${calendar}/events${found ? `/${encodeURIComponent(found)}` : ""}`, connection, { method: found ? "PUT" : "POST", body });
  }
  const keep = new Set(events.map((e) => e.id));
  let removed = 0;
  for (const [beyondId, googleId] of byId) {
    if (keep.has(beyondId)) continue;
    await google(`/calendars/${calendar}/events/${encodeURIComponent(googleId)}`, connection, { method: "DELETE" });
    removed++;
  }
  return { written: events.length, removed, calendarId, created };
}

/** Forget the family calendar on this phone. Stopping sharing, or deleting the calendar, happens in Google Calendar. */
export function forgetFamilyCalendar(): void { saveFamilyCalendarId(null); }
