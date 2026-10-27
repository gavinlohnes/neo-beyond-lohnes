import { captureFeedback } from "../../feel/feedback";
import { useSessionDraft } from "../../sessionDrafts";
import { useEffect, useRef, useState } from "react";
import { createObligation } from "../../../application/intentCommands";
import { getTodayPlan, type TodayPlan } from "../../../application/planTodayQueries";
import type { Obligation } from "../../../domain/intent/types";
import { describeError } from "../../errorMessage";
import { OperatorHeader } from "../../components/OperatorHeader";
import { EMPTY_RECURRENCE, RecurrencePicker, recurrenceInputFor, sameRecurrence } from "./IntentScreen";
import type { IntentFocus } from "./IntentScreen";

export function PlanTodayScreen({ active = true, onOpen }: { active?: boolean; onOpen: (focus: IntentFocus | null) => void }) {
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [mission, setMission] = useState("");
  const [recurrence, setRecurrence] = useState(EMPTY_RECURRENCE);
  // Review blocker 2: a due date, Mission or repetition alone is unfinished input too.
  useSessionDraft("plan-create", [title, due, mission].some((value) => value.length > 0) || !sameRecurrence(recurrence, EMPTY_RECURRENCE));
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const sequence = useRef(0);
  const titleInput = useRef<HTMLInputElement>(null);
  async function refresh() {
    const request = ++sequence.current;
    setReadError(null);
    try {
      const next = await getTodayPlan();
      if (request === sequence.current) setPlan(next);
    } catch (cause) {
      if (request === sequence.current) { setPlan(null); setReadError(describeError(cause, "Could not read your plan.")); }
    }
  }
  useEffect(() => {
    if (!active) return;
    void refresh();
    function resume() { if (document.visibilityState === "visible") void refresh(); }
    document.addEventListener("visibilitychange", resume);
    return () => { ++sequence.current; document.removeEventListener("visibilitychange", resume); };
  }, [active]);
  async function addTask() {
    const acknowledge = captureFeedback();
    if (inFlight.current || !title.trim() || !plan) return;
    inFlight.current = true; setBusy(true); setError(null); setReceipt(null);
    const name = title.trim();
    try {
      // Re-read the date at execution: a retained composer may span midnight.
      const current = await getTodayPlan();
      const rule = recurrenceInputFor(recurrence, due || current.date);
      await createObligation({ title: name, plannedAt: current.date, ...(due ? { dueAt: due } : {}),
        ...(mission ? { missionId: mission } : {}), ...(rule ? { recurrence: rule } : {}) });
      acknowledge("LIGHT");
      setTitle(""); setDue(""); setMission(""); setRecurrence(EMPTY_RECURRENCE);
      setReceipt(`Added “${name}” to your plan.`);
      await refresh();
      titleInput.current?.focus({ preventScroll: true });
    } catch (cause) { setError(describeError(cause, "Could not add the task. Your input is kept.")); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function rows(items: Obligation[], empty: string) {
    return items.length ? <ul className="plan-list">{items.map((item) => <li key={item.id}>
      <button className="plan-task" onClick={() => onOpen({ kind: "OBLIGATION", obligationId: item.id })}>
        <strong>{item.title}</strong>
        <span>{[item.status === "WAITING" ? "Waiting" : undefined, item.dueAt ? `${item.dueAt < plan!.date ? "Overdue" : item.dueAt === plan!.date ? "Due today" : "Due"} · ${item.dueAt}` : "Planned for today",
          plan!.missions.find((parent) => parent.id === item.missionId)?.title].filter(Boolean).join(" · ")}</span>
        <span className="visually-hidden">Open task</span>
      </button>
    </li>)}</ul> : <p className="meta">{empty}</p>;
  }
  return <div className="plan-today">
    <OperatorHeader destination="mission" focusable>MORE // PLAN TODAY</OperatorHeader>
    <h2 className="more-title">Your plan</h2>
    <p className="meta">{plan ? planDate(plan.date) : "Today"} · Your choices and recorded deadlines. Not a recommendation.</p>
    {readError ? <div role="alert"><p>{readError} Tasks are unavailable, not empty.</p><button className="btn-secondary" onClick={() => void refresh()}>RETRY PLAN</button></div>
      : !plan ? <p role="status">Reading your plan…</p> : <>
        <section aria-labelledby="plan-chosen-heading"><h3 id="plan-chosen-heading" className="section-label">Planned today</h3>{rows(plan.planned, "Nothing planned for today. Add only what you want to commit to.")}</section>
        <section aria-labelledby="plan-due-heading"><h3 id="plan-due-heading" className="section-label">Due & overdue</h3>{rows(plan.due, "No other due commitments.")}</section>
      </>}
    <form className="plan-composer" onSubmit={(event) => { event.preventDefault(); void addTask(); }}>
      <label htmlFor="plan-task-title">Add a task for today</label>
      <input ref={titleInput} id="plan-task-title" className="input" value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} placeholder="What do you want to get done?" />
      <details className="more-inspection"><summary>Date, Mission & repeat</summary>
        <label htmlFor="plan-due">Due date (optional)</label><input id="plan-due" className="input" type="date" value={due} disabled={busy} onChange={(event) => setDue(event.target.value)} />
        <label htmlFor="plan-mission">Mission (optional)</label><select id="plan-mission" className="input" value={mission} disabled={busy} onChange={(event) => setMission(event.target.value)}>
          <option value="">No Mission</option>{plan?.missions.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <RecurrencePicker form={recurrence} onChange={setRecurrence} idPrefix="plan-recurrence" disabled={busy} />
      </details>
      <button className="btn-primary" disabled={busy || !title.trim() || !plan}>ADD TO TODAY</button>
      {error && <p role="alert">{error}</p>}{receipt && <p role="status">{receipt}</p>}
    </form>
    <button className="btn-secondary" onClick={() => onOpen(null)}>ALL MISSIONS & OBLIGATIONS</button>
    <p className="meta">Open a task to complete it, release it, or change its dates. Nothing is moved automatically.</p>
  </div>;
}

/** "2026-10-22" → "Thu, Oct 22": the plan's calendar date, read as a person would say it. */
const planDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};
