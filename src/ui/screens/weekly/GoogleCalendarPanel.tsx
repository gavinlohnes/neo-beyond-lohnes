import { useEffect, useState } from "react";
import {
  GOOGLE_CALENDAR_SCOPES, createBeyondCalendar, disconnectGoogleCalendar, listGoogleCalendars,
  readGoogleCalendarConnection, saveGoogleCalendarConnection, syncGoogleCalendar,
  type GoogleCalendarChoice, type GoogleCalendarConnection,
} from "../../../application/googleCalendar";

type TokenResponse = { access_token?: string; expires_in?: number; error?: string };
interface GoogleOAuth {
  initTokenClient(input: { client_id: string; scope: string; callback: (response: TokenResponse) => void }): { requestAccessToken(): void };
  revoke(token: string, done: () => void): void;
}
type GoogleWindow = Window & { google?: { accounts?: { oauth2?: GoogleOAuth } } };
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID?.trim() ?? "";

async function loadIdentity(): Promise<void> {
  const win = window as GoogleWindow;
  if (win.google?.accounts?.oauth2) return;
  await new Promise<void>((resolve, reject) => {
    const prior = document.querySelector<HTMLScriptElement>('script[data-beyond-google-identity]');
    if (prior) { prior.addEventListener("load", () => resolve(), { once: true }); prior.addEventListener("error", () => reject(new Error("Google sign-in could not load.")), { once: true }); return; }
    const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.dataset.beyondGoogleIdentity = "true";
    script.onload = () => resolve(); script.onerror = () => reject(new Error("Google sign-in could not load.")); document.head.append(script);
  });
}

export function GoogleCalendarPanel({ now, onEventsChanged }: { now?: Date | undefined; onEventsChanged: () => void }) {
  const [connection, setConnection] = useState<GoogleCalendarConnection>(() => readGoogleCalendarConnection());
  const [choices, setChoices] = useState<GoogleCalendarChoice[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const connected = Boolean(connection.accessToken && connection.expiresAt > Date.now());

  async function refreshChoices(next = readGoogleCalendarConnection()) {
    const calendars = await listGoogleCalendars(next); setChoices(calendars);
  }
  useEffect(() => { if (connected) void refreshChoices().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!connected || !connection.syncOnOpen || !connection.calendarId) return;
    void runSync();
  }, []); // explicit device preference; once per panel open

  async function connect() {
    if (!CLIENT_ID) { setError("Google Calendar isn't configured in this build. Add the optional client ID, then rebuild."); return; }
    setBusy(true); setError(null);
    try {
      await loadIdentity();
      const oauth = (window as GoogleWindow).google!.accounts!.oauth2!;
      await new Promise<void>((resolve, reject) => oauth.initTokenClient({ client_id: CLIENT_ID, scope: GOOGLE_CALENDAR_SCOPES, callback: (response) => {
        if (!response.access_token) { reject(new Error(response.error || "Google sign-in was cancelled.")); return; }
        const next = { ...connection, accessToken: response.access_token, expiresAt: Date.now() + Math.max(60, response.expires_in ?? 3600) * 1000 };
        saveGoogleCalendarConnection(next); setConnection(next); refreshChoices(next).then(resolve, reject);
      } }).requestAccessToken());
      setStatus("Connected. Choose an existing calendar or create BEYOND.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Google sign-in failed."); }
    finally { setBusy(false); }
  }
  function update(patch: Partial<GoogleCalendarConnection>) { const next = { ...connection, ...patch }; saveGoogleCalendarConnection(next); setConnection(next); }
  async function createCalendar() { setBusy(true); setError(null); try { const calendar = await createBeyondCalendar(); update({ calendarId: calendar.id, calendarName: calendar.summary }); await refreshChoices(); setStatus("BEYOND calendar created and selected."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Calendar could not be created."); } finally { setBusy(false); } }
  async function runSync() { setBusy(true); setError(null); setStatus(null); try { const result = await syncGoogleCalendar(now); setConnection(readGoogleCalendarConnection()); onEventsChanged(); setStatus(`Synced ${result.written} BEYOND events. Read ${result.events.length} primary-calendar events.`); } catch (reason) { setError(reason instanceof Error ? reason.message : "Calendar could not sync."); } finally { setBusy(false); } }
  function disconnect() { const token = connection.accessToken; const done = () => { disconnectGoogleCalendar(); setConnection(readGoogleCalendarConnection()); setChoices([]); onEventsChanged(); setStatus("Disconnected. The phone-local token and event cache were removed."); }; const oauth = (window as GoogleWindow).google?.accounts?.oauth2; if (token && oauth) oauth.revoke(token, done); else done(); }

  return <section aria-label="Google Calendar sync" className="equipment-row" style={{ marginTop: 12 }}>
    <h2 className="eyebrow">GOOGLE CALENDAR</h2>
    <p className="meta">Optional browser-only connection. Google events stay read-only context; they never become BEYOND records or recommendation inputs. Tokens stay on this phone and are never backed up.</p>
    {!connected ? <button type="button" className="btn-secondary" disabled={busy} onClick={() => void connect()}>{busy ? "CONNECTING…" : "CONNECT GOOGLE"}</button> : <>
      <label className="meta" style={{ display: "grid", gap: 4 }}>BEYOND writes to<select className="input" aria-label="BEYOND Google calendar" value={connection.calendarId ?? ""} disabled={busy} onChange={(event) => { const choice = choices.find((item) => item.id === event.target.value); update({ calendarId: choice?.id ?? null, calendarName: choice?.summary ?? null }); }}><option value="">Choose a calendar</option>{choices.map((item) => <option key={item.id} value={item.id}>{item.summary}</option>)}</select></label>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => void createCalendar()}>CREATE BEYOND CALENDAR</button>
      <label className="meta"><input type="checkbox" checked={connection.includePlans} onChange={(event) => update({ includePlans: event.target.checked })} /> Include planned/due task titles</label>
      <label className="meta"><input type="checkbox" checked={connection.syncOnOpen} onChange={(event) => update({ syncOnOpen: event.target.checked })} /> Sync when Week Ahead opens</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button type="button" className="btn-secondary" disabled={busy || !connection.calendarId} onClick={() => void runSync()}>{busy ? "SYNCING…" : "SYNC NOW"}</button><button type="button" className="btn-secondary" disabled={busy} onClick={disconnect}>DISCONNECT</button></div>
      {connection.lastSyncAt && <p className="meta">Last synced {new Date(connection.lastSyncAt).toLocaleString()}.</p>}
    </>}
    {status && <p role="status" className="meta">{status}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}

