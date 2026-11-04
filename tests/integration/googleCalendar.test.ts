import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import "../../src/persistence/backup";
import {
  calendarExportToGoogleEvents, disconnectGoogleCalendar, readCachedGoogleEvents,
  readGoogleCalendarConnection, saveGoogleCalendarConnection, nextGoogleCalendarEvent,
} from "../../src/application/googleCalendar";

beforeEach(async () => { localStorage.clear(); await db.delete(); await db.open(); });

describe("GCAL-SYNC-001 privacy and mapping", () => {
  it("maps only the existing privacy-safe export fields", () => {
    const events = calendarExportToGoogleEvents([
      "BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:shift-20261104@beyond.local",
      "DTSTART:20261104T180000", "DTEND:20261105T060000", "SUMMARY:Scheduled shift", "END:VEVENT",
      "BEGIN:VEVENT", "UID:task-synthetic-due@beyond.local", "DTSTART;VALUE=DATE:20261106",
      "DTEND;VALUE=DATE:20261107", "SUMMARY:Synthetic task · Due", "END:VEVENT", "END:VCALENDAR", "",
    ].join("\r\n"));
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ id: "shift-20261104", summary: "Scheduled shift", start: { dateTime: "2026-11-04T18:00:00" } });
    expect(events[1]).toEqual({ id: "task-synthetic-due", summary: "Synthetic task · Due", start: { date: "2026-11-06" }, end: { date: "2026-11-07" } });
    expect(JSON.stringify(events)).not.toMatch(/note|health|money|memory/i);
  });

  it("keeps connection material outside Dexie backups and removes it on disconnect", async () => {
    saveGoogleCalendarConnection({ accessToken: "synthetic-secret-token", expiresAt: Date.now() + 60_000, calendarId: "synthetic-calendar", calendarName: "BEYOND", includePlans: true, syncOnOpen: true, lastSyncAt: null });
    localStorage.setItem("beyond.googleCalendar.events", JSON.stringify([{ id: "g1", title: "Synthetic appointment", start: "2026-11-04", end: "2026-11-05", allDay: true, calendar: "primary" }]));
    const backup = await db.export();
    expect(await backup.text()).not.toContain("synthetic-secret-token");
    expect(await backup.text()).not.toContain("Synthetic appointment");
    expect(readGoogleCalendarConnection().calendarId).toBe("synthetic-calendar");
    expect(readCachedGoogleEvents()).toHaveLength(1);
    expect(nextGoogleCalendarEvent(new Date(2026, 10, 4, 12))?.title).toBe("Synthetic appointment");
    disconnectGoogleCalendar();
    expect(readGoogleCalendarConnection().accessToken).toBe("");
    expect(readCachedGoogleEvents()).toEqual([]);
  });
});

