import { readCachedGoogleEvents, readGoogleCalendarConnection, type GoogleCalendarEvent } from "./googleCalendar";

/**
 * CONNECTED-001 slice 3: Google Calendar events from the last sync, beside tasks. Read-only: it never
 * books, moves or writes anything, and it reads only the local cache the existing sync keeps.
 */
export interface CalendarWithDay { connected: boolean; lastSyncAt: string | null; events: GoogleCalendarEvent[] }

const localDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const at = new Date(value);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
};

export function readCalendarWithDay(): CalendarWithDay {
  if (typeof localStorage === "undefined") return { connected: false, lastSyncAt: null, events: [] };
  const connection = readGoogleCalendarConnection();
  return { connected: Boolean(connection.accessToken), lastSyncAt: connection.lastSyncAt, events: readCachedGoogleEvents() };
}

/** Events on `date`, or after `date` through `through` (local calendar dates, the same as task lists). */
export function eventsInWindow(events: readonly GoogleCalendarEvent[], date: string, through?: string): GoogleCalendarEvent[] {
  return events.filter((event) => {
    const day = localDate(event.start);
    return through === undefined ? day === date : day > date && day <= through;
  }).sort((a, b) => a.start.localeCompare(b.start));
}
