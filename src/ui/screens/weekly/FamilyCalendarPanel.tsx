import { useEffect, useState } from "react";
import { FAMILY_CALENDAR_NAME, FAMILY_TITLES, FAMILY_WEEKS, familyCalendarIcs, getFamilyCalendar, readFamilyCalendarId, syncFamilyCalendar, type FamilyEvent } from "../../../application/familyCalendar";
import { readGoogleCalendarConnection } from "../../../application/googleCalendar";
import { deliverCalendar } from "./CalendarExportPanel";

/**
 * BIG-IDEAS-001 item 8 (Protected, Gavin approved the design 2026-11-12): a calendar for family with only three
 * kinds of event. The preview shows exactly what will be shared. Google sync waits for CONFIRM; the file is sent
 * only through your own share sheet.
 */
const when = (e: FamilyEvent) => {
  if (e.allDay) return new Date(`${e.start}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const s = new Date(e.start), t = new Date(e.end);
  const day = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const hm = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${day} ${hm(s)}–${hm(t)}`;
};

export function FamilyCalendarPanel({ now }: { now?: Date | undefined }) {
  const [events, setEvents] = useState<FamilyEvent[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let live = true; void getFamilyCalendar(now).then((e) => { if (live) setEvents(e); }, () => { if (live) setEvents([]); }); return () => { live = false; }; }, [now]);
  if (!events) return null;
  const connection = readGoogleCalendarConnection();
  const connected = Boolean(connection.accessToken && connection.expiresAt > Date.now());
  const counts = (Object.keys(FAMILY_TITLES) as (keyof typeof FAMILY_TITLES)[]).map((k) => [FAMILY_TITLES[k], events.filter((e) => e.kind === k).length] as const);
  const week = events.filter((e) => new Date(e.allDay ? `${e.start}T12:00:00` : e.start).getTime() < (now ?? new Date()).getTime() + 7 * 86_400_000);

  const send = async () => {
    setError(null); setStatus(null);
    const file = new File([familyCalendarIcs(events, now ?? new Date())], "beyond-family.ics", { type: "text/calendar" });
    const result = await deliverCalendar(file);
    setStatus(result === "Cancelled" ? "Not sent." : `${result} the family calendar file. A sent file can't be recalled.`);
  };
  const sync = async () => {
    setBusy(true); setError(null);
    try {
      const r = await syncFamilyCalendar(events, now ?? new Date());
      setStatus(`Synced ${r.written} events to “${FAMILY_CALENDAR_NAME}”${r.removed ? `; removed ${r.removed} that left the schedule` : ""}.`);
      setConfirming(false);
    } catch (e) { setError(e instanceof Error ? e.message : "The family calendar could not sync."); } finally { setBusy(false); }
  };

  return <section data-family-calendar aria-labelledby="family-calendar-heading" style={{ marginTop: 12 }}>
    <p id="family-calendar-heading" className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>SHARE WITH FAMILY</p>
    {events.length === 0 ? <p className="meta">Save your work schedule to share it.</p> : <>
      <p className="meta" style={{ margin: "2px 0 6px" }}>Only these three kinds of event, for the next {FAMILY_WEEKS} weeks. No health numbers, sleep amounts, notes, tags, plans, places or people.</p>
      <ul className="meta" style={{ margin: "0 0 6px", paddingLeft: 18 }}>{counts.map(([title, n]) => <li key={title}>“{title}” · {n}</li>)}</ul>
      {counts[1]![1] === 0 && <p className="meta">Sleep isn't shared yet: it needs 3 Garmin-timed work-day sleeps. BEYOND doesn't guess it.</p>}
      <details className="more-inspection"><summary>What she sees this week</summary>
        <ul className="meta" style={{ paddingLeft: 18 }}>{week.map((e) => <li key={e.id} data-family-event={e.kind}>{when(e)} · {e.title}</li>)}</ul>
      </details>
      <div className="button-row" style={{ marginTop: 6 }}>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void send()}>SEND AS A FILE (.ICS)</button>
        <button type="button" className="btn-secondary" disabled={busy || !connected} onClick={() => { setConfirming(true); setStatus(null); }}>SYNC TO GOOGLE</button>
      </div>
      {!connected && <p className="meta">To sync, connect Google Calendar above first.</p>}
      {confirming && <div role="group" aria-label="Confirm family sync" className="equipment-row" style={{ padding: "10px 12px", marginTop: 6 }}>
        <p className="meta" style={{ margin: 0 }}>Writes {events.length} events to your Google calendar “{FAMILY_CALENDAR_NAME}”{readFamilyCalendarId() ? "" : " (created now)"}. Only BEYOND's own family events are changed there. Nobody sees it until you share it.</p>
        <div className="button-row" style={{ marginTop: 6 }}>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void sync()}>{busy ? "SYNCING…" : "CONFIRM"}</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>CANCEL</button>
        </div>
      </div>}
      <p className="meta" style={{ marginTop: 6 }}>To share: in Google Calendar, open Settings → “{FAMILY_CALENDAR_NAME}” → Share with specific people, add her, and choose “See all event details”. Stop sharing there any time.</p>
    </>}
    {status && <p className="meta" role="status">{status}</p>}
    {error && <p className="meta" role="alert">{error}</p>}
  </section>;
}
