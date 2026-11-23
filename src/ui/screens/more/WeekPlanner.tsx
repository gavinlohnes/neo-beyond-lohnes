import { useEffect, useRef, useState } from "react";
import type { Obligation } from "../../../domain/intent/types";
import { getWeekPlanner, plannerDates, type WeekPlanner as Planner } from "../../../application/weekPlannerQueries";
import { moveWeekTask } from "../../../application/weekPlannerCommands";
import { createObligation } from "../../../application/intentCommands";
import { LogSheet } from "../../components/LogSheet";
import { describeError } from "../../errorMessage";
import { useSessionDraft } from "../../sessionDrafts";

const label = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
export function WeekPlanner({ active, onOpen, onChanged }: { active: boolean; onOpen: (id: string) => void; onChanged: () => void }) {
  const [plan, setPlan] = useState<Planner | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [moving, setMoving] = useState<Obligation | null>(null);
  const [moveDate, setMoveDate] = useState("");
  const [title, setTitle] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [moveDays, setMoveDays] = useState<Planner["days"]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), sequence = useRef(0), readDate = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);
  useSessionDraft("week-plan", Boolean(title.trim() || moving));
  async function refresh() {
    const request = ++sequence.current;
    try {
      const next = await getWeekPlanner();
      if (request !== sequence.current) return false;
      setPlan(next); setReadError(null); readDate.current = next.date;
      setSelected((old) => next.days.some((d) => d.date === old) ? old : next.date);
      return true;
    } catch (cause) {
      if (request === sequence.current) { setPlan(null); setReadError(describeError(cause, "Could not read the week.")); }
      return false;
    }
  }
  useEffect(() => {
    if (!active) return;
    void refresh();
    const resume = () => { if (document.visibilityState === "visible" && !lock.current) void refresh(); };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && plannerDates()[0] !== readDate.current) resume(); }, 60_000);
    document.addEventListener("visibilitychange", resume);
    return () => { ++sequence.current; window.clearInterval(timer); document.removeEventListener("visibilitychange", resume); };
  }, [active]);
  async function saveMove() {
    if (lock.current || !moving || !moveDate) return;
    lock.current = true; setBusy(true); setError(null); setReceipt(null);
    try {
      const result = await moveWeekTask(moving.id, moveDate, moving);
      setReceipt(`Planned “${result.title}” for ${label(moveDate)}. ${result.dueAt ? `Deadline unchanged: ${label(result.dueAt)}.` : "No deadline added."}`);
      setMoving(null); setSelected(moveDate);
      await refresh(); onChanged();
      requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    } catch (cause) { setError(describeError(cause, "Could not move this task. Your choice is kept.")); }
    finally { lock.current = false; setBusy(false); }
  }
  async function add() {
    if (lock.current || !title.trim() || !plan) return;
    if (draftDate !== selected) { setError("Choose a day for this draft before adding it."); return; }
    if (!plannerDates().includes(selected)) { setError("The week changed. Refresh the week before adding this task."); return; }
    lock.current = true; setBusy(true); setError(null); setReceipt(null);
    try {
      const item = await createObligation({ title: title.trim(), plannedAt: selected });
      setReceipt(`Added “${item.title}” for ${label(selected)}. No deadline added.`); setTitle(""); setDraftDate("");
      await refresh(); onChanged();
    } catch (cause) { setError(describeError(cause, "Could not add this task. Your words are kept.")); }
    finally { lock.current = false; setBusy(false); }
  }
  function task(item: Obligation) {
    return <li key={item.id} className="week-planner__task">
      <button type="button" className="plan-task" onClick={() => onOpen(item.id)}>
        <strong>{item.title}</strong>
        <span>{item.status === "WAITING" ? "Waiting · " : ""}{item.plannedAt ? `Planned ${label(item.plannedAt)}` : "Not planned"}{item.dueAt ? ` · Due ${label(item.dueAt)}` : " · No deadline"}</span>
      </button>
      <button type="button" className="btn-secondary" disabled={busy || !!readError} aria-label={`Plan ${item.title}`} onClick={() => { setMoving(item); setMoveDays(plan?.days ?? []); setMoveDate(item.plannedAt && plan?.days.some((d) => d.date === item.plannedAt) ? item.plannedAt : selected); setError(null); }}>PLAN DAY</button>
    </li>;
  }
  const day = plan?.days.find((d) => d.date === selected);
  return <section className="week-planner" aria-label="Week planner">
    <h2 className="more-title">Make room for your week</h2>
    <p className="meta">Choose a day, see what is already there, then place or move a task. Deadlines stay separate.</p>
    {receipt && <p role="status" className="week-planner__receipt">{receipt}</p>}
    {readError ? <div role="alert"><p>{readError} The week is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void refresh()}>RETRY WEEK</button></div> : !plan ? <p role="status">Reading your week…</p> : <>
      <div className="week-planner__days" role="group" aria-label="Choose a day">
        {plan.days.map((d) => <button type="button" key={d.date} className="week-planner__day" aria-pressed={d.date === selected} onClick={() => { setSelected(d.date); if (title.trim()) setDraftDate(d.date); }}>
          <strong>{label(d.date)}</strong>
          <span>{d.basis === "UNKNOWN" ? "Work unknown" : d.work === "WORK" ? "Work" : "Off"}</span>
          <span>{d.tasks.length} tasks · {d.events.length} events</span>
          <span>{plan.trainingConnection && d.suggestedTemplate ? plan.trainingConnection.status === "READY" ? `Next ${plan.trainingConnection.key}` : "Review in TRAIN" : d.workout.basis === "ASSIGNED" ? "Your workout" : d.workout.basis === "SUGGESTED" ? "Workout idea" : "—"}</span>
        </button>)}
      </div>
      {day && <div className="week-planner__agenda">
        <h3 ref={heading} tabIndex={-1}>{label(day.date)}{day.date === plan.date ? " · Today" : ""}</h3>
        <p className="meta">{day.basis === "UNKNOWN" ? "Work or off is not known. Set your schedule to see work context." : `${day.work === "WORK" ? `Work${day.shiftStartHour !== null ? ` · shift starts ${String(day.shiftStartHour).padStart(2, "0")}:00` : ""}` : "Day off"} · ${day.basis === "RECORDED" ? "recorded" : day.basis === "CONFIRMED" ? "confirmed change" : "saved schedule forecast"}`}</p>
        {plan.trainingConnection && day.suggestedTemplate ? <div data-training-planning-connection>{plan.trainingConnection.status === "READY" ? <>
          <p className="card-body">Training opportunity · Next {plan.trainingConnection.key} · {plan.trainingConnection.name}</p>
          <p className="meta">{plan.trainingConnection.why} Moving or skipping this opportunity changes nothing. Only recorded qualifying training advances the sequence.</p>
        </> : <>
          <p className="card-body">Sequence needs review in TRAIN</p>
          <p className="meta">{plan.trainingConnection.why} Direct workout choice remains available in TRAIN.</p>
        </>}</div> : <p className="card-body">{day.workout.basis === "ASSIGNED" ? "Your programme: " : day.workout.basis === "SUGGESTED" ? "Suggestion, not a booking: " : ""}{day.workout.label}</p>}
        <p className="meta">These are item counts, not hours available. Shifts belong to the lived day starting at 16:30; tasks and calendar events use calendar dates.</p>
        {day.events.length > 0 && <><h4 className="tool-label">SAVED CALENDAR EVENTS</h4><ul className="plan-list">{day.events.map((event) => <li key={event.id} className="week-planner__event"><strong>{event.title}</strong><span>{event.allDay ? "All day" : `${new Date(event.start).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} – ${new Date(event.end).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`} · Google, read only</span></li>)}</ul></>}
        <p className="meta">{plan.calendar.lastSyncAt ? `Calendar snapshot last synced ${new Date(plan.calendar.lastSyncAt).toLocaleString()}.` : "No synced calendar snapshot available."} {plan.calendar.connected ? "Refresh the connection in Week Ahead for newer events." : "Calendar is not connected."}</p>
        <h4 className="tool-label">TASKS PLANNED OR DUE</h4>
        {day.tasks.length ? <ul className="plan-list">{day.tasks.map(task)}</ul> : <p className="meta">No tasks planned or due on this date. This does not mean the day is free.</p>}
        <form onSubmit={(e) => { e.preventDefault(); void add(); }} className="week-planner__add">
          <label htmlFor="week-plan-title">Add a task for {label(day.date)}</label>
          <input id="week-plan-title" className="input" value={title} disabled={busy} onChange={(e) => { if (!title.trim()) setDraftDate(selected); setTitle(e.target.value); }} placeholder="What would you like to get done?" />
          {title.trim() && draftDate !== selected && <div role="status"><p>Your draft was written for {label(draftDate)}. Choose a day before adding it.</p><button type="button" className="btn-secondary" onClick={() => setDraftDate(selected)}>USE {label(selected).toUpperCase()} FOR THIS DRAFT</button></div>}
          <button type="submit" className="btn-primary" disabled={busy || !title.trim() || draftDate !== selected}>ADD TO THIS DAY</button>
        </form>
      </div>}
      <details className="more-inspection"><summary>Earlier deadlines · {plan.overdue.length}</summary><p className="meta">Moving a planned day never removes an overdue deadline.</p>{plan.overdue.length ? <ul className="plan-list">{plan.overdue.map(task)}</ul> : <p className="meta">No earlier open deadlines.</p>}</details>
      <details className="more-inspection"><summary>Unplanned or earlier plans · {plan.unplanned.length}</summary>{plan.unplanned.length ? <ul className="plan-list">{plan.unplanned.map(task)}</ul> : <p className="meta">No tasks waiting to be placed.</p>}</details>
    </>}
    {error && !moving && <p role="alert">{error}</p>}
    <LogSheet open={Boolean(moving)} title={moving ? "Choose a planned day" : ""} onClose={() => { if (!lock.current) { setMoving(null); setError(null); } }} canClose={() => !busy}>
      {moving && <>
        <p className="card-body">{moving.title}</p>
        <p className="meta">{moving.dueAt ? `Deadline stays ${label(moving.dueAt)}.` : "This adds a planned day, not a deadline."}</p>
        <label htmlFor="week-move-day">Planned day</label><select id="week-move-day" className="input" disabled={busy} value={moveDate} onChange={(e) => setMoveDate(e.target.value)}>{(plan?.days ?? moveDays).map((d) => <option key={d.date} value={d.date}>{label(d.date)} · {d.basis === "UNKNOWN" ? "Work unknown" : d.work === "WORK" ? "Work" : "Off"} · {d.tasks.length} tasks</option>)}</select>
        {readError && <div role="alert"><p>{readError} Your selected day is kept. Refresh the week before saving.</p><button type="button" className="btn-secondary" disabled={busy} onClick={() => void refresh()}>RETRY WEEK IN FORM</button></div>}
        {error && <div role="alert"><p>{error}</p><button type="button" className="btn-secondary" disabled={busy} onClick={async () => { setMoving(null); setError(null); await refresh(); }}>REFRESH WEEK</button></div>}
        <button type="button" className="btn-primary" disabled={busy || !moveDate || !!readError} onClick={() => void saveMove()}>SAVE PLANNED DAY</button>
      </>}
    </LogSheet>
  </section>;
}
