import { useEffect, useId, useRef, useState } from "react";
import {
  getWeekPlanView,
  moveWeekPlanDay,
  setWeekPlanDay,
  undoWeekPlanChange,
  startWeekPlan,
  type WeekPlanChange,
  type WeekPlanDayView,
  type WeekPlanView,
} from "../../../application/weekPlan";
import { feedback } from "../../feel/feedback";
import { describeError } from "../../errorMessage";
import "./routineEditor.css";
import "./weekPlan.css";

/**
 * GRAYSON-WEEK-PLAN-001 (Gavin, 2026-11-25): THIS WEEK and NEXT WEEK on his saved Week A and Week B. Tap a day to
 * change it: JUST THIS DAY or EVERY WEEK A (B), or MOVE TO another day. Every change has UNDO. The first time, his
 * current setup is laid on the week to look at before USE THIS WEEK; today stays as TRAIN plans it now.
 */
const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function WeekPlan({ onChanged, onClose }: { onChanged: () => Promise<void> | void; onClose: () => void }) {
  const [view, setView] = useState<WeekPlanView | null>(null);
  const [editing, setEditing] = useState<WeekPlanDayView | null>(null);
  const [saved, setSaved] = useState<{ text: string; change: WeekPlanChange | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<string | null>(null);
  const id = useId();
  const reload = async () => setView(await getWeekPlanView());
  useEffect(() => { void reload().catch((e) => setError(describeError(e, "Your week is unavailable. Please retry."))); }, []);
  // Focus goes back to the day he changed once the save has finished (a busy, disabled button can't take focus).
  useEffect(() => {
    if (editing || busy || !view) return;
    if (returnFocus.current) document.getElementById(returnFocus.current)?.focus(); else headingRef.current?.focus();
    returnFocus.current = null;
  }, [editing, busy, view]);

  const act = async (text: string, fn: () => Promise<WeekPlanChange | null>) => {
    setBusy(true); setError(null);
    try { const change = await fn(); feedback("MEDIUM"); setSaved({ text, change }); setEditing(null); await reload(); await onChanged(); }
    catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); }
    finally { setBusy(false); }
  };
  const dayId = (date: string) => `${id}-day-${date}`;

  if (view && editing) return <DayEditor view={view} day={editing} busy={busy} error={error}
    onCancel={() => { setError(null); setEditing(null); }}
    onSet={(value, scope, name) => void act(scope === "DAY" ? `${editing.weekday} ${shortDate(editing.date)}: ${name}, just this day.` : `${name} on every ${editing.weekday}${view!.weeks.find((w) => w.days.some((d) => d.date === editing.date))?.letter ? ` in Week ${view!.weeks.find((w) => w.days.some((d) => d.date === editing.date))!.letter}` : ""}.`,
      () => setWeekPlanDay(editing.date, value, scope))}
    onMove={(to) => void act(`${editing.name} moved to ${to.weekday}. ${editing.weekday} is Rest.`, () => moveWeekPlanDay(editing.date, to.date))} />;

  return <section className="card week-plan" aria-labelledby={`${id}-title`} data-week-plan>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">Your week</h3>
    {view && !view.scheduleSaved && <p className="meta">Save your work schedule (MORE · Work Schedule) to see Week A and Week B. Until then this is a plain Monday to Sunday week.</p>}
    {view?.draft && <div className="week-plan__draft" role="group" aria-label="Your week from what you have now">
      <p className="card-body">{view.draft.from}</p>
      <p className="card-body">Today stays {view.weeks.flatMap((w) => w.days).find((d) => d.today)?.name ?? "as it is"}. Your week starts tomorrow.</p>
      <p className="meta">Nothing is saved until you choose. Your current setup stays restorable from MY PROGRAMME.</p>
      <div className="routine-list__acts">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void act("Your week is saved.", () => startWeekPlan(view.draft!.plan, view.revisionId))}>USE THIS WEEK</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>KEEP MY CURRENT SETUP</button>
      </div>
    </div>}
    {saved && <p className="routine-saved" role="status">{saved.text}{" "}
      {saved.change && <button type="button" className="btn-secondary routine-inline" disabled={busy}
        onClick={() => void act("Undone.", async () => { await undoWeekPlanChange(saved.change!); return null; })}>UNDO</button>}</p>}
    {error && <p className="meta meta--error" role="alert">{error}</p>}
    {!view ? <p className="meta">Reading your week…</p> : view.weeks.map((week) => (
      <div key={week.title} className="week-plan__week" role="group" aria-label={`${week.title}${week.letter ? `, Week ${week.letter}` : ""}`}>
        <p className="section-label">{week.title}{week.letter ? ` · WEEK ${week.letter}` : ""}</p>
        <ul className="week-plan__days">
          {week.days.map((day) => <li key={day.date}>
            <button type="button" id={dayId(day.date)} className="week-plan__day" data-today={day.today || undefined} data-rest={day.value === "REST" || undefined}
              disabled={busy || !view.plan || day.past}
              aria-label={`${day.weekday} ${shortDate(day.date)}${day.today ? ", today" : ""}${day.work === "WORK" ? ", work day" : ""}: ${day.name}${day.source === "OVERRIDE" ? ", just this day" : ""}${view.plan && !day.past ? ". Change" : ""}`}
              onClick={() => { returnFocus.current = dayId(day.date); setSaved(null); setEditing(day); }}>
              <span className="week-plan__when">{day.weekday.slice(0, 3)} {shortDate(day.date)}{day.today && <b> · TODAY</b>}</span>
              <span className="week-plan__work">{day.work === "WORK" ? "WORK" : day.work === "OFF" ? "OFF" : ""}</span>
              <span className="week-plan__what">{day.name}{day.source === "OVERRIDE" && <span className="meta"> · this day</span>}</span>
            </button>
          </li>)}
        </ul>
      </div>))}
    <div className="routine-list__acts"><button type="button" className="btn-secondary" onClick={onClose}>BACK</button></div>
  </section>;
}

function DayEditor({ view, day, busy, error, onCancel, onSet, onMove }: {
  view: WeekPlanView; day: WeekPlanDayView; busy: boolean; error: string | null;
  onCancel: () => void; onSet: (value: string, scope: "DAY" | "EVERY_WEEK", name: string) => void; onMove: (to: WeekPlanDayView) => void;
}) {
  const [value, setValue] = useState(day.value);
  const [moving, setMoving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { headingRef.current?.focus(); }, []);
  const week = view.weeks.find((w) => w.days.some((d) => d.date === day.date))!;
  const letter = week.letter;
  const name = view.choices.find((c) => c.value === value)?.name ?? day.name;
  const targets = week.days.filter((d) => d.date !== day.date && !d.past);

  return <section className="card week-plan" aria-labelledby={`${id}-title`} data-week-day>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">{day.weekday} {shortDate(day.date)}{day.work === "WORK" ? " · work day" : ""}</h3>
    {moving ? <>
      <p className="card-body">Move {day.name} to…</p>
      <ul className="week-plan__days">{targets.map((t) => <li key={t.date}>
        <button type="button" className="week-plan__day" disabled={busy} onClick={() => onMove(t)}>
          <span className="week-plan__when">{t.weekday.slice(0, 3)} {shortDate(t.date)}</span>
          <span className="week-plan__work">{t.work === "WORK" ? "WORK" : t.work === "OFF" ? "OFF" : ""}</span>
          <span className="week-plan__what">now {t.name}</span>
        </button></li>)}</ul>
      <div className="routine-list__acts"><button type="button" className="btn-secondary" disabled={busy} onClick={() => setMoving(false)}>BACK</button></div>
    </> : <>
      <fieldset className="week-plan__choices">
        <legend className="section-label">What's on</legend>
        {view.choices.map((c) => <label key={c.value} className="routine-option">
          <input type="radio" name={`${id}-choice`} value={c.value} checked={value === c.value} disabled={busy} onChange={() => setValue(c.value)} />{c.name}
        </label>)}
      </fieldset>
      {error && <p className="meta meta--error" role="alert">{error}</p>}
      <div className="routine-list__acts">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => onSet(value, "DAY", name)}>JUST THIS DAY</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => onSet(value, "EVERY_WEEK", name)}>{letter ? `EVERY WEEK ${letter}` : "EVERY WEEK"}</button>
        {day.value !== "REST" && targets.length > 0 && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setMoving(true)}>MOVE TO…</button>}
        <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>CANCEL</button>
      </div>
    </>}
  </section>;
}
