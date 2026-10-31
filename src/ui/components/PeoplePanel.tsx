import { useEffect, useRef, useState } from "react";
import { addPersonDate, describeMonthDay, getPeopleView, OCCASIONS, type PeopleView } from "../../application/peopleCommands";
import { captureCommitFeedback } from "../feel/feedback";
import { useSessionDraft } from "../sessionDrafts";
import { describeError } from "../errorMessage";
import { askAlfred } from "./AlfredSheet";

/**
 * RELATIONSHIPS-001: the people who matter, from records BEYOND already keeps — yearly dates as
 * ordinary repeating commitments, and the facts you asked Alfred to keep. A view, not a contacts app.
 * Nothing here nudges, counts or scores; a date simply shows when it's coming.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const when = (days: number) => days === 0 ? "today" : days === 1 ? "tomorrow" : days > 1 ? `in ${days} days` : `${-days} ${days === -1 ? "day" : "days"} ago, still open`;
const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function PeoplePanel({ active }: { active: boolean }) {
  const [view, setView] = useState<PeopleView | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [person, setPerson] = useState("");
  const [occasion, setOccasion] = useState<string>("Birthday");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const sequence = useRef(0);
  useSessionDraft("people-add-date", [person, month, day, note].some((v) => v.length > 0));

  async function load() {
    const mine = ++sequence.current;
    try { const next = await getPeopleView(); if (mine === sequence.current) { setView(next); setReadError(null); } }
    catch (cause) { if (mine === sequence.current) setReadError(describeError(cause, "Could not read people.")); }
  }
  useEffect(() => { if (active) void load(); }, [active]);

  async function save() {
    if (busy || !person.trim() || !month || !day) return;
    setBusy(true); setError(null); setSaved(null);
    const acknowledge = captureCommitFeedback();
    try {
      await addPersonDate({ person, occasion, month: Number(month), day: Number(day), ...(note.trim() ? { note } : {}) });
      acknowledge("LIGHT");
      setSaved(`Saved: ${person.trim()}'s ${occasion.toLowerCase()}, ${describeMonthDay(Number(month), Number(day))}. It repeats every year.`);
      setPerson(""); setMonth(""); setDay(""); setNote("");
      await load();
    } catch (cause) {
      const m = cause instanceof Error ? cause.message : "";
      setError(m.startsWith("INVALID_DATE") ? "That date doesn't exist. Nothing was saved." : describeError(cause, "That didn't save. Nothing changed."));
    } finally { setBusy(false); }
  }

  return <section aria-label="People">
    <h2 className="tool-label">THE PEOPLE WHO MATTER</h2>
    <p>Their dates come round every year as ordinary reminders, and you'll see them in the week ahead. Keep only what helps.</p>
    {readError && <div><p role="alert">{readError} People are unavailable, not empty. Nothing changed.</p><button type="button" className="btn-secondary" onClick={() => void load()}>RETRY PEOPLE</button></div>}
    {view && <>
      <h3 className="tool-label">COMING UP</h3>
      {view.upcoming.length === 0 && <p className="meta">No yearly dates yet.</p>}
      {view.upcoming.slice(0, 12).map(({ reminder, daysAway }) => <div key={reminder.id} className="understanding-item">
        <p><strong>{reminder.title}</strong> · {shortDate(reminder.dueAt!)} · {when(daysAway)}</p>
        {reminder.description && <p className="understanding-words">{reminder.description}</p>}
        <button type="button" className="btn-secondary" onClick={() => askAlfred(`Help me plan for ${reminder.title} on ${shortDate(reminder.dueAt!)}. Use what I've told you about them and my schedule, and offer a few ideas I can choose from.`)}>ASK ALFRED</button>
      </div>)}
      <h3 className="tool-label">WHAT YOU'VE TOLD ALFRED</h3>
      {view.facts.length === 0 && <p className="meta">Nothing about people yet.</p>}
      <ul>{view.facts.map((f) => <li key={f.id} className="understanding-words">{f.text}</li>)}</ul>
      <p className="meta">Change or forget these in MORE → MEMORY.</p>
    </>}
    <h3 className="tool-label">ADD A DATE</h3>
    <label className="field">Who<input className="input" value={person} maxLength={80} disabled={busy} onChange={(e) => setPerson(e.target.value)} /></label>
    <label className="field">What<select className="input" value={occasion} disabled={busy} onChange={(e) => setOccasion(e.target.value)}>{OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
    <div className="intent-dates">
      <label className="field">Month<select className="input" value={month} disabled={busy} onChange={(e) => setMonth(e.target.value)}><option value="">Choose</option>{MONTHS.map((m, n) => <option key={m} value={n + 1}>{m}</option>)}</select></label>
      <label className="field">Day<input className="input" type="number" inputMode="numeric" min={1} max={31} value={day} disabled={busy} onChange={(e) => setDay(e.target.value)} /></label>
    </div>
    <label className="field">Note (optional)<input className="input" value={note} maxLength={200} placeholder="Gift idea, what they like" disabled={busy} onChange={(e) => setNote(e.target.value)} /></label>
    <button type="button" className="btn-primary" disabled={busy || !person.trim() || !month || !day} onClick={() => void save()}>SAVE DATE</button>
    {saved && <p role="status" className="meta">{saved}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
