import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deriveFamilyCalendar, familyCalendarIcs, FAMILY_CALENDAR_NAME, FAMILY_TITLES, readFamilyCalendarId, syncFamilyCalendar } from "../../src/application/familyCalendar";
import { saveGoogleCalendarConnection, readGoogleCalendarConnection, listGoogleCalendars, syncGoogleCalendar } from "../../src/application/googleCalendar";
import type { SleepRhythm } from "../../src/engine/sleepRhythm";
import type { SchedulePattern } from "../../src/domain/common/types";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/** BIG-IDEAS-001 item 8 (Protected: outward sharing). Exactly three kinds of event, with fixed titles, and nothing else. */
// Gavin's rotation from Mon Oct 26 (Week A): Mon, Tue work; Wed, Thu off; Fri–Sun work.
const pattern: SchedulePattern = { id: "current", anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6, createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z" };
const rhythm: SleepRhythm = { nights: [], groups: [{ kind: "WORK", nights: 5, start: 450, end: 855, midpoint: 0, spread: 0 }], offMinusWork: null, axisStart: 0 };
const now = new Date(2026, 9, 26, 9);
beforeEach(() => localStorage.clear());
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe("FAMILY CALENDAR: what she sees", () => {
  it("lists shifts, usual post-shift sleep and days off for 4 weeks, with fixed titles", () => {
    const events = deriveFamilyCalendar({ now, pattern, rhythm });
    expect(events.slice(0, 5)).toEqual([
      { id: "work-20261026", kind: "WORK", title: "Working", allDay: false, start: "2026-10-26T18:00:00", end: "2026-10-27T06:00:00" },
      { id: "sleep-20261026", kind: "SLEEP", title: "Asleep — please don't call (usual time)", allDay: false, start: "2026-10-27T07:30:00", end: "2026-10-27T14:15:00" },
      { id: "work-20261027", kind: "WORK", title: "Working", allDay: false, start: "2026-10-27T18:00:00", end: "2026-10-28T06:00:00" },
      // In date order: that day's all-day "Day off" sorts before the morning's sleep.
      { id: "off-20261028", kind: "DAY_OFF", title: "Day off", allDay: true, start: "2026-10-28", end: "2026-10-29" },
      { id: "sleep-20261027", kind: "SLEEP", title: "Asleep — please don't call (usual time)", allDay: false, start: "2026-10-28T07:30:00", end: "2026-10-28T14:15:00" },
    ]);
    // 28 lived days: each is a shift or a day off.
    expect(events.filter((e) => e.kind !== "SLEEP")).toHaveLength(28);
    expect(events.at(-1)!.start.slice(0, 10) <= "2026-11-23").toBe(true);
  });

  it("never carries anything but the approved fields and titles", () => {
    const events = deriveFamilyCalendar({ now, pattern, rhythm });
    for (const e of events) {
      expect(Object.keys(e).sort()).toEqual(["allDay", "end", "id", "kind", "start", "title"]);
      expect(e.title).toBe(FAMILY_TITLES[e.kind]);
    }
    const ics = familyCalendarIcs(events, now);
    const summaries = new Set(ics.split("\r\n").filter((l) => l.startsWith("SUMMARY:")).map((l) => l.slice(8)));
    expect([...summaries].sort()).toEqual(["Asleep — please don't call (usual time)", "Day off", "Working"]);
    expect(ics).toContain("DTSTART:20261026T180000\r\n");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261028\r\n");
    expect(ics).toContain(`X-WR-CALNAME:${FAMILY_CALENDAR_NAME}`);
    expect(ics).not.toMatch(/DESCRIPTION|LOCATION|ATTENDEE|ORGANIZER/);
  });

  it("review of #483: with day shifts, the day off before a run still shows, and each shift is dated by its start", () => {
    const days: SchedulePattern = { ...pattern, anchorMonday: "2026-11-09", weeks: [{ workdays: [2, 3, 4] }], shiftStartHour: 7, shiftEndHour: 19 };
    const events = deriveFamilyCalendar({ now: new Date(2026, 10, 9, 9), pattern: days, rhythm: null });
    expect(events.slice(0, 2)).toEqual([
      { id: "off-20261109", kind: "DAY_OFF", title: "Day off", allDay: true, start: "2026-11-09", end: "2026-11-10" },
      { id: "work-20261110", kind: "WORK", title: "Working", allDay: false, start: "2026-11-10T07:00:00", end: "2026-11-10T19:00:00" },
    ]);
    // Every calendar date in the window is a shift start or a day off.
    const dated = new Set(events.filter((e) => e.kind !== "SLEEP").map((e) => e.start.slice(0, 10)));
    expect(dated.size).toBe(28);
  });

  it("guesses no sleep without enough Garmin-timed nights, and shares nothing without a saved schedule", () => {
    expect(deriveFamilyCalendar({ now, pattern, rhythm: null }).some((e) => e.kind === "SLEEP")).toBe(false);
    expect(deriveFamilyCalendar({ now, pattern: DEFAULT_SCHEDULE_PATTERN, rhythm })).toEqual([]);
    // A shift already over isn't listed.
    expect(deriveFamilyCalendar({ now: new Date(2026, 9, 27, 7), pattern, rhythm })[0]!.id).toBe("sleep-20261026");
  });
});

type Call = { method: string; url: string; body?: unknown };
function stubGoogle(handler: (method: string, url: string) => Response | undefined): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ method, url, ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) });
    return handler(method, url) ?? new Response(JSON.stringify({ id: "x" }), { status: 200 });
  }));
  return calls;
}
const connect = () => saveGoogleCalendarConnection({ ...readGoogleCalendarConnection(), accessToken: "synthetic-token", expiresAt: Date.now() + 60_000, calendarId: "main1", calendarName: "BEYOND" });

describe("FAMILY CALENDAR: Google sync", () => {
  it("creates its own calendar once, writes only approved fields, and reads and removes only its own upcoming events", async () => {
    connect();
    const calls = stubGoogle((method, url) => {
      if (method === "POST" && url.endsWith("/calendars")) return new Response(JSON.stringify({ id: "fam1" }), { status: 200 });
      if (method === "GET") return new Response(JSON.stringify({ items: [
        { id: "g-gone", extendedProperties: { private: { beyondId: "work-20261030" } } },
        { id: "g-keep", extendedProperties: { private: { beyondId: "off-20261028" } } },
      ] }), { status: 200 });
      if (method === "DELETE") return new Response(null, { status: 204 });
      return undefined;
    });
    const events = deriveFamilyCalendar({ now, pattern, rhythm }).filter((e) => e.id !== "work-20261030");
    const result = await syncFamilyCalendar(events, now);
    expect(result).toEqual({ written: events.length, removed: 1, calendarId: "fam1" });
    expect(readFamilyCalendarId()).toBe("fam1");
    expect(calls[0]).toMatchObject({ method: "POST", body: { summary: FAMILY_CALENDAR_NAME } });
    // Review of #483: only events that haven't ended yet are read, so a finished event (today's shift, last week's
    // sleep) is never deleted. Google's timeMin filters by end time.
    expect(calls[1]!.url).toContain("privateExtendedProperty=beyondOwner%3DBEYOND-FAMILY");
    expect(calls[1]!.url).toContain(`timeMin=${encodeURIComponent(now.toISOString())}`);
    expect(calls.filter((c) => c.method === "DELETE").map((c) => c.url)).toEqual([expect.stringMatching(/\/events\/g-gone$/)]);
    expect(calls.find((c) => c.method === "PUT")!.url).toMatch(/\/events\/g-keep$/);
    for (const c of calls.filter((c) => c.method === "PUT" || (c.method === "POST" && c.url.includes("/events")))) {
      expect(Object.keys(c.body as object).sort()).toEqual(["end", "extendedProperties", "start", "summary", "transparency"]);
      expect(Object.values(FAMILY_TITLES)).toContain((c.body as { summary: string }).summary);
    }
    calls.length = 0;
    await syncFamilyCalendar(events, now);
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/calendars"))).toBe(false);
  });

  it("starts a fresh family calendar if the old one was deleted in Google", async () => {
    connect();
    let created = 0, deleted = false;
    const calls = stubGoogle((method, url) => {
      if (method === "POST" && url.endsWith("/calendars")) return new Response(JSON.stringify({ id: `fam${++created}` }), { status: 200 });
      if (method === "GET" && deleted && url.includes("/calendars/fam1/")) return new Response("{}", { status: 404 });
      if (method === "GET") return new Response(JSON.stringify({ items: [] }), { status: 200 });
      return undefined;
    });
    await syncFamilyCalendar([], now);
    expect(readFamilyCalendarId()).toBe("fam1");
    deleted = true; // Gavin deletes "BEYOND — family" in Google Calendar.
    expect(await syncFamilyCalendar([], now)).toMatchObject({ calendarId: "fam2" });
    expect(readFamilyCalendarId()).toBe("fam2");
    expect(calls.filter((c) => c.method === "POST" && c.url.endsWith("/calendars"))).toHaveLength(2);
  });

  it("review of #483: BEYOND's own sync can never be pointed at the family calendar", async () => {
    connect();
    stubGoogle((method, url) => {
      if (method === "POST" && url.endsWith("/calendars")) return new Response(JSON.stringify({ id: "fam1" }), { status: 200 });
      if (url.includes("/users/me/calendarList")) return new Response(JSON.stringify({ items: [{ id: "main1", summary: "BEYOND" }, { id: "fam1", summary: FAMILY_CALENDAR_NAME }] }), { status: 200 });
      if (method === "GET") return new Response(JSON.stringify({ items: [] }), { status: 200 });
      return undefined;
    });
    await syncFamilyCalendar([], now);
    expect((await listGoogleCalendars()).map((c) => c.id)).toEqual(["main1"]);
    saveGoogleCalendarConnection({ ...readGoogleCalendarConnection(), calendarId: "fam1" });
    await expect(syncGoogleCalendar(now)).rejects.toThrow("That's the family calendar");
  });
});
