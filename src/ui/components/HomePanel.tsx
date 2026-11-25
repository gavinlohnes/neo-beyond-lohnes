import "./section.css";
import { useEffect, useRef, useState } from "react";
import { addHomeItem, describeRepeat, getHomeView, HOME_PREFIX, REPEAT_UNITS, type HomeView, type RepeatUnit } from "../../application/homeCommands";
import { formatLocalDate } from "../../engine/scheduledContext";
import { captureCommitFeedback } from "../feel/feedback";
import { useSessionDraft } from "../sessionDrafts";
import { describeError } from "../errorMessage";
import { askAlfred } from "./AlfredSheet";
import { ReminderAlertLine } from "./ReminderAlertLine";
import { CommitmentQuickActions } from "../screens/today/CommitmentQuickActions";

/**
 * HOME-001: the house, from records BEYOND already keeps: "Home: " repeating commitments and the
 * facts you asked Alfred to keep. A view, not a maintenance tracker: no scores, no overdue alarms.
 */
const HOME_PRESETS: readonly { item: string; details: string; every: number; unit: RepeatUnit }[] = [
  { item: "Furnace filter", details: "Check the size on the old one.", every: 3, unit: "MONTHS" },
  { item: "Smoke alarms", details: "Press test on each one.", every: 1, unit: "MONTHS" },
  { item: "Smoke alarm batteries", details: "", every: 1, unit: "YEARS" },
  { item: "Gutters", details: "Clear leaves and check downspouts.", every: 6, unit: "MONTHS" },
  { item: "Water heater flush", details: "", every: 1, unit: "YEARS" },
  { item: "Fridge coils", details: "Vacuum behind or under the fridge.", every: 6, unit: "MONTHS" },
  { item: "Dryer vent", details: "Clear lint from the duct.", every: 1, unit: "YEARS" },
  { item: "Fire extinguisher", details: "Check the gauge is in the green.", every: 1, unit: "YEARS" },
  // GRAYSON-Q1 (campaign item C3.4): CO detectors and the dogs, same fill-the-form path.
  { item: "CO detectors", details: "Press test on each one.", every: 1, unit: "MONTHS" },
  { item: "Dog flea and tick", details: "Monthly dose for each dog.", every: 1, unit: "MONTHS" },
  { item: "Dog heartworm", details: "Monthly dose for each dog.", every: 1, unit: "MONTHS" },
  { item: "Vet checkup", details: "Yearly exam and vaccines.", every: 1, unit: "YEARS" },
  { item: "Dog food", details: "Reorder before the bag runs out.", every: 4, unit: "WEEKS" },
];
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
  const [remindAt, setRemindAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const sequence = useRef(0);
  useSessionDraft("home-add-item", [item, details, every, firstDue, remindAt].some((v) => v.length > 0));

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
      await addHomeItem({ item, details, ...(repeats ? { repeat: { every: Number(every), unit, firstDue }, ...(remindAt ? { remindAt } : {}) } : {}) });
      acknowledge("LIGHT");
      setSaved(`Saved: ${item.trim()}${repeats ? `, ${describeRepeat(Number(every), unit)} from ${shortDate(firstDue)}${remindAt ? `, alert at ${remindAt}` : ""}` : ""}.`);
      setItem(""); setDetails(""); setEvery(""); setFirstDue(""); setRemindAt("");
      await load();
    } catch (cause) {
      const m = cause instanceof Error ? cause.message : "";
      setError(m.startsWith("INVALID_") ? "Check the repeat, the next due date and the alert time. Nothing was saved." : describeError(cause, "That didn't save. Nothing changed."));
    } finally { setBusy(false); }
  }

  return <section aria-label="Home">
    <h2 className="tool-label">KEEP THE HOUSE RUNNING</h2>
    <p>Sizes, models and who to call, plus the jobs that come round. Repeating jobs are ordinary reminders titled “Home: …”, so you'll see them in the week ahead.</p>
    {readError && <div><p role="alert">{readError} Home is unavailable, not empty. Nothing changed.</p><button type="button" className="btn-secondary" onClick={() => void load()}>RETRY HOME</button></div>}
    {view && <>
      <h3 className="tool-label">COMING ROUND</h3>
      {view.due.length === 0 && <p className="meta">No repeating home jobs yet.</p>}
      {view.due.slice(0, 12).map(({ reminder, daysAway, lastDone, history, doneCount }) => <div key={reminder.id} className="understanding-item" data-home-job={reminder.title.slice(HOME_PREFIX.length)}>
        <p><strong>{reminder.title.slice(HOME_PREFIX.length)}</strong>{reminder.dueAt ? ` · ${shortDate(reminder.dueAt)}` : ""}{reminder.remindAt ? ` at ${reminder.remindAt}` : ""} · {when(daysAway)}</p>
        {reminder.description && <p className="understanding-words">{reminder.description}</p>}
        {/* GRAYSON-HOME-LASTDONE-001: when it was last done, with his note, and the past dates one tap away. */}
        <p className="meta" data-last-done>{lastDone ? <>Last done {shortDate(lastDone.on)}{lastDone.note ? ` · ${lastDone.note}` : ""}</> : "Not marked done in GRAYSON yet."}</p>
        {doneCount > 0 && <details className="home-history"><summary>Done {doneCount} {doneCount === 1 ? "time" : "times"}</summary>
          <ul>{history.map((d, i) => <li key={`${d.on}-${i}`} className="meta">{shortDate(d.on)}{d.note ? ` · ${d.note}` : ""}</li>)}</ul>
          {doneCount > history.length && <p className="meta">The {history.length} most recent.</p>}
        </details>}
        <CommitmentQuickActions obligation={reminder} today={formatLocalDate(new Date())} withNote showRelease={false} label={reminder.title.slice(HOME_PREFIX.length)} onChanged={() => load()} />
      </div>)}
      <h3 className="tool-label">WHAT BEYOND KNOWS ABOUT THE HOUSE</h3>
      {view.facts.length === 0 && <p className="meta">Nothing about the house yet.</p>}
      <ul>{view.facts.map((f) => <li key={f.id} className="understanding-words">{f.text}</li>)}</ul>
      <p className="meta">Change or forget these in MORE → MEMORY. Mark a job done here or in MISSIONS & OBLIGATIONS; the next one is created from its due date.</p>
      <button type="button" className="btn-secondary" onClick={() => askAlfred("Help me with the house. Use what I've told you about it and what's coming round, and tell me what you don't know.")}>ASK ALFRED</button>
    </>}
    <h3 className="tool-label">ADD SOMETHING</h3>
    {/* HOME-SCHEDULE-001 (APPS-PICKS-003 pick 29, after Centriq): common jobs fill the form; nothing saves until ADD. */}
    <details className="home-presets"><summary>Common house and dog jobs</summary>
      <div className="people-names">{HOME_PRESETS.map((preset) => <button type="button" key={preset.item} className="btn-secondary" disabled={busy} onClick={() => { setItem(preset.item); setDetails(preset.details); setEvery(String(preset.every)); setUnit(preset.unit); }}>{preset.item}</button>)}</div>
      <p className="meta">Fills in the form below. Choose the next due date, then SAVE.</p>
    </details>
    <label className="field">What<input className="input" value={item} maxLength={80} placeholder="Furnace filter" disabled={busy} onChange={(e) => setItem(e.target.value)} /></label>
    <label className="field">Details (optional)<input className="input" value={details} maxLength={200} placeholder="16x25x1, Home Depot" disabled={busy} onChange={(e) => setDetails(e.target.value)} /></label>
    <div className="intent-dates">
      <label className="field">Repeat every (optional)<input className="input" type="number" inputMode="numeric" min={1} max={60} value={every} disabled={busy} onChange={(e) => setEvery(e.target.value)} /></label>
      <label className="field">Unit<select className="input" value={unit} disabled={busy} onChange={(e) => setUnit(e.target.value as RepeatUnit)}>{REPEAT_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</select></label>
    </div>
    {repeats && <label className="field">Next due<input className="input" type="date" min={formatLocalDate(new Date())} value={firstDue} disabled={busy} onChange={(e) => setFirstDue(e.target.value)} /></label>}
    {/* GRAYSON-C3.4a: optional repeat alert time (REMIND-AT-001); the default time is not a delivery guarantee. */}
    {repeats && <label className="field">Alert time (optional)<input className="input" type="time" value={remindAt} disabled={busy} onChange={(e) => setRemindAt(e.target.value)} /></label>}
    {repeats && !remindAt && <p className="meta">No time set: default alert time 16:00 on the due day. Phone delivery depends on notification settings, quiet hours, the daily cap and the synced alert-plan window. Use SYNC GARMIN to refresh the phone’s plan.</p>}
    {repeats && firstDue && remindAt && <ReminderAlertLine dueAt={firstDue} remindAt={remindAt} title={`Home: ${item.trim()}`} />}
    <button type="button" className="btn-primary" disabled={busy || !canSave} onClick={() => void save()}>SAVE</button>
    {saved && <p role="status" className="meta">{saved}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
