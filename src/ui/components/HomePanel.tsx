import { useEffect, useRef, useState } from "react";
import { addHomeItem, describeRepeat, getHomeView, HOME_PREFIX, REPEAT_UNITS, type HomeView, type RepeatUnit } from "../../application/homeCommands";
import { formatLocalDate } from "../../engine/scheduledContext";
import { captureCommitFeedback } from "../feel/feedback";
import { useSessionDraft } from "../sessionDrafts";
import { describeError } from "../errorMessage";
import { askAlfred } from "./AlfredSheet";

/**
 * HOME-001: the house, from records BEYOND already keeps: "Home: " repeating commitments and the
 * facts you asked Alfred to keep. A view, not a maintenance tracker: no scores, no overdue alarms.
 */
const UNIT_LABEL: Record<RepeatUnit, string> = { WEEKS: "weeks", MONTHS: "months", YEARS: "years" };
const when = (days: number | null) => days === null ? "no date" : days === 0 ? "today" : days === 1 ? "tomorrow" : days > 1 ? `in ${days} days` : "date passed, still open";
const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function HomePanel({ active }: { active: boolean }) {
  const [view, setView] = useState<HomeView | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [item, setItem] = useState("");
  const [details, setDetails] = useState("");
  const [every, setEvery] = useState("");
  const [unit, setUnit] = useState<RepeatUnit>("MONTHS");
  const [firstDue, setFirstDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const sequence = useRef(0);
  useSessionDraft("home-add-item", [item, details, every, firstDue].some((v) => v.length > 0));

  async function load() {
    const mine = ++sequence.current;
    try { const next = await getHomeView(); if (mine === sequence.current) { setView(next); setReadError(null); } }
    catch (cause) { if (mine === sequence.current) setReadError(describeError(cause, "Could not read home.")); }
  }
  useEffect(() => { if (active) void load(); }, [active]);

  const repeats = every.trim().length > 0;
  const canSave = item.trim() && (details.trim() || (repeats && firstDue));
  async function save() {
    if (busy || !canSave) return;
    setBusy(true); setError(null); setSaved(null);
    const acknowledge = captureCommitFeedback();
    try {
      await addHomeItem({ item, details, ...(repeats ? { repeat: { every: Number(every), unit, firstDue } } : {}) });
      acknowledge("LIGHT");
      setSaved(`Saved: ${item.trim()}${repeats ? `, ${describeRepeat(Number(every), unit)} from ${shortDate(firstDue)}` : ""}.`);
      setItem(""); setDetails(""); setEvery(""); setFirstDue("");
      await load();
    } catch (cause) {
      const m = cause instanceof Error ? cause.message : "";
      setError(m.startsWith("INVALID_") ? "Check the repeat and the next due date. Nothing was saved." : describeError(cause, "That didn't save. Nothing changed."));
    } finally { setBusy(false); }
  }

  return <section aria-label="Home">
    <h2 className="tool-label">KEEP THE HOUSE RUNNING</h2>
    <p>Sizes, models and who to call, plus the jobs that come round. Repeating jobs are ordinary reminders titled “Home: …”, so you'll see them in the week ahead.</p>
    {readError && <div><p role="alert">{readError} Home is unavailable, not empty. Nothing changed.</p><button type="button" className="btn-secondary" onClick={() => void load()}>RETRY HOME</button></div>}
    {view && <>
      <h3 className="tool-label">COMING ROUND</h3>
      {view.due.length === 0 && <p className="meta">No repeating home jobs yet.</p>}
      {view.due.slice(0, 12).map(({ reminder, daysAway }) => <div key={reminder.id} className="understanding-item">
        <p><strong>{reminder.title.slice(HOME_PREFIX.length)}</strong>{reminder.dueAt ? ` · ${shortDate(reminder.dueAt)}` : ""} · {when(daysAway)}</p>
        {reminder.description && <p className="understanding-words">{reminder.description}</p>}
      </div>)}
      <h3 className="tool-label">WHAT BEYOND KNOWS ABOUT THE HOUSE</h3>
      {view.facts.length === 0 && <p className="meta">Nothing about the house yet.</p>}
      <ul>{view.facts.map((f) => <li key={f.id} className="understanding-words">{f.text}</li>)}</ul>
      <p className="meta">Change or forget these in MORE → MEMORY. Mark a job done in MISSIONS & OBLIGATIONS; the next one is created for you.</p>
      <button type="button" className="btn-secondary" onClick={() => askAlfred("Help me with the house. Use what I've told you about it and what's coming round, and tell me what you don't know.")}>ASK ALFRED</button>
    </>}
    <h3 className="tool-label">ADD SOMETHING</h3>
    <label className="field">What<input className="input" value={item} maxLength={80} placeholder="Furnace filter" disabled={busy} onChange={(e) => setItem(e.target.value)} /></label>
    <label className="field">Details (optional)<input className="input" value={details} maxLength={200} placeholder="16x25x1, Home Depot" disabled={busy} onChange={(e) => setDetails(e.target.value)} /></label>
    <div className="intent-dates">
      <label className="field">Repeat every (optional)<input className="input" type="number" inputMode="numeric" min={1} max={60} value={every} disabled={busy} onChange={(e) => setEvery(e.target.value)} /></label>
      <label className="field">Unit<select className="input" value={unit} disabled={busy} onChange={(e) => setUnit(e.target.value as RepeatUnit)}>{REPEAT_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</select></label>
    </div>
    {repeats && <label className="field">Next due<input className="input" type="date" min={formatLocalDate(new Date())} value={firstDue} disabled={busy} onChange={(e) => setFirstDue(e.target.value)} /></label>}
    <button type="button" className="btn-primary" disabled={busy || !canSave} onClick={() => void save()}>SAVE</button>
    {saved && <p role="status" className="meta">{saved}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
