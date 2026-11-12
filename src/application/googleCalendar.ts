import { getCalendarExport } from "./calendarExportQueries";

const STORE = "beyond.googleCalendar";
const CACHE = "beyond.googleCalendar.events";
const API = "https://www.googleapis.com/calendar/v3";
/** FAMILY-CALENDAR-001: the separate calendar shared with family. The main sync must never write to it. */
const FAMILY_STORE = "beyond.googleCalendar.family";

export function readFamilyCalendarId(): string | null {
  try { return (JSON.parse(localStorage.getItem(FAMILY_STORE) ?? "null") as { calendarId?: string } | null)?.calendarId ?? null; } catch { return null; }
}
export function saveFamilyCalendarId(calendarId: string | null): void {
  try { if (calendarId) localStorage.setItem(FAMILY_STORE, JSON.stringify({ calendarId })); else localStorage.removeItem(FAMILY_STORE); } catch { /* storage blocked */ }
}

export const GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.calendars https://www.googleapis.com/auth/calendar.readonly";

export interface GoogleCalendarConnection {
  accessToken: string;
  expiresAt: number;
  calendarId: string | null;
  calendarName: string | null;
  includePlans: boolean;
  syncOnOpen: boolean;
  lastSyncAt: string | null;
}

export interface GoogleCalendarChoice { id: string; summary: string; primary?: boolean; accessRole?: string }
export interface GoogleCalendarEvent { id: string; title: string; start: string; end: string; allDay: boolean; calendar: "primary" }

const empty = (): GoogleCalendarConnection => ({ accessToken: "", expiresAt: 0, calendarId: null, calendarName: null, includePlans: false, syncOnOpen: false, lastSyncAt: null });

export function readGoogleCalendarConnection(): GoogleCalendarConnection {
  try {
    const value = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<GoogleCalendarConnection> | null;
    return value ? { ...empty(), ...value } : empty();
  } catch { return empty(); }
}

export function saveGoogleCalendarConnection(value: GoogleCalendarConnection): void {
  localStorage.setItem(STORE, JSON.stringify(value));
}

export function disconnectGoogleCalendar(): void {
  localStorage.removeItem(STORE);
  localStorage.removeItem(CACHE);
}

export function readCachedGoogleEvents(): GoogleCalendarEvent[] {
  try { const value = JSON.parse(localStorage.getItem(CACHE) ?? "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

export function nextGoogleCalendarEvent(now = new Date()): GoogleCalendarEvent | null {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return readCachedGoogleEvents().filter((event) => event.allDay ? event.end > today : new Date(event.end).getTime() > now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;
}

function auth(connection: GoogleCalendarConnection) {
  if (!connection.accessToken || connection.expiresAt <= Date.now()) throw new Error("Google Calendar connection expired. Connect again.");
  return { Authorization: `Bearer ${connection.accessToken}`, "Content-Type": "application/json" };
}

async function google<T>(path: string, connection: GoogleCalendarConnection, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { ...auth(connection), ...init?.headers } });
  if (!response.ok) throw new Error(response.status === 401 ? "Google Calendar connection expired. Connect again." : `Google Calendar could not sync (${response.status}).`);
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function listGoogleCalendars(connection = readGoogleCalendarConnection()): Promise<GoogleCalendarChoice[]> {
  const result = await google<{ items?: GoogleCalendarChoice[] }>("/users/me/calendarList?minAccessRole=writer", connection);
  // Review of #483: the family calendar is never offered here, so the main export can't be written to it.
  const family = readFamilyCalendarId();
  return (result.items ?? []).filter((item) => item.id && item.summary && item.id !== family);
}

export async function createBeyondCalendar(connection = readGoogleCalendarConnection()): Promise<GoogleCalendarChoice> {
  return google<GoogleCalendarChoice>("/calendars", connection, { method: "POST", body: JSON.stringify({ summary: "BEYOND", description: "Scheduled shifts and selected task dates from BEYOND." }) });
}

function unfold(ics: string): string[] { return ics.replace(/\r\n /g, "").split("\r\n"); }
type Outbound = { id: string; summary: string; start: Record<string, string>; end: Record<string, string> };
export function calendarExportToGoogleEvents(ics: string): Outbound[] {
  const result: Outbound[] = [];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  let block: string[] | null = null;
  for (const line of unfold(ics)) {
    if (line === "BEGIN:VEVENT") block = [];
    else if (line === "END:VEVENT" && block) {
      const take = (prefix: string) => block!.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? "";
      const uid = take("UID:").replace(/@beyond\.local$/, "");
      const summary = take("SUMMARY:").replace(/\\([\\;,])/g, "$1").replace(/\\n/g, "\n");
      const allDay = block.some((entry) => entry.startsWith("DTSTART;VALUE=DATE:"));
      const startValue = take(allDay ? "DTSTART;VALUE=DATE:" : "DTSTART:");
      const endValue = take(allDay ? "DTEND;VALUE=DATE:" : "DTEND:");
      const date = (value: string) => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
      const dateTime = (value: string) => `${date(value)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`;
      result.push({ id: uid, summary, start: allDay ? { date: date(startValue) } : { dateTime: dateTime(startValue), timeZone }, end: allDay ? { date: date(endValue) } : { dateTime: dateTime(endValue), timeZone } });
      block = null;
    } else if (block) block.push(line);
  }
  return result;
}

async function syncOutbound(connection: GoogleCalendarConnection, now: Date): Promise<number> {
  if (!connection.calendarId) throw new Error("Choose or create a BEYOND calendar first.");
  if (connection.calendarId === readFamilyCalendarId()) throw new Error("That's the family calendar. Choose another calendar for BEYOND's own sync.");
  const projection = await getCalendarExport({ weeks: 8, includePlans: connection.includePlans }, now);
  const events = calendarExportToGoogleEvents(projection.contents);
  const calendar = encodeURIComponent(connection.calendarId);
  const prior = await google<{ items?: Array<{ id: string; extendedProperties?: { private?: { beyondId?: string } } }> }>(`/calendars/${calendar}/events?privateExtendedProperty=beyondOwner%3DBEYOND&maxResults=2500`, connection);
  const byBeyondId = new Map((prior.items ?? []).map((event) => [event.extendedProperties?.private?.beyondId, event.id]));
  for (const event of events) {
    const body = JSON.stringify({ summary: event.summary, start: event.start, end: event.end, extendedProperties: { private: { beyondOwner: "BEYOND", beyondId: event.id } } });
    const found = byBeyondId.get(event.id);
    await google(`/calendars/${calendar}/events${found ? `/${encodeURIComponent(found)}` : ""}`, connection, { method: found ? "PUT" : "POST", body });
  }
  return events.length;
}

async function readPrimary(connection: GoogleCalendarConnection, now: Date): Promise<GoogleCalendarEvent[]> {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const through = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8).toISOString();
  const result = await google<{ items?: Array<{ id: string; summary?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string }; status?: string }> }>(`/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(from)}&timeMax=${encodeURIComponent(through)}`, connection);
  return (result.items ?? []).filter((event) => event.status !== "cancelled" && event.id && event.start && event.end).map((event) => ({
    id: event.id, title: event.summary?.trim() || "Busy", start: event.start!.dateTime ?? event.start!.date!, end: event.end!.dateTime ?? event.end!.date!, allDay: Boolean(event.start!.date), calendar: "primary",
  }));
}

export async function syncGoogleCalendar(now = new Date()): Promise<{ written: number; events: GoogleCalendarEvent[] }> {
  const connection = readGoogleCalendarConnection();
  const [written, events] = await Promise.all([syncOutbound(connection, now), readPrimary(connection, now)]);
  localStorage.setItem(CACHE, JSON.stringify(events));
  saveGoogleCalendarConnection({ ...connection, lastSyncAt: new Date().toISOString() });
  return { written, events };
}

