import { captureCommitFeedback } from "../../feel/feedback";
import { useSessionDraft } from "../../sessionDrafts";
import { useEffect, useRef, useState } from "react";
import { createObligation, modifyObligation } from "../../../application/intentCommands";
import { parseQuickAdd } from "../../../application/helper/freeHelper";
import { getTodayPlan, getTaskSmartLists, taskListDate, type TaskSmartLists } from "../../../application/planTodayQueries";
import type { Obligation } from "../../../domain/intent/types";
import { describeError } from "../../errorMessage";
import { OperatorHeader } from "../../components/OperatorHeader";
import { Section, SectionEmpty, SectionUnavailable } from "../../components/Section";
import { EMPTY_RECURRENCE, RecurrencePicker, recurrenceInputFor, sameRecurrence } from "./IntentScreen";
import type { IntentFocus } from "./IntentScreen";

export function PlanTodayScreen({ active = true, onOpen }: { active?: boolean; onOpen: (focus: IntentFocus | null) => void }) {
  const [plan, setPlan] = useState<TaskSmartLists | null>(null);
  const [list, setList] = useState<"today" | "next7" | "noDate">("today");
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
  const lastReadDate = useRef<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  async function refresh() {
    const request = ++sequence.current;
    lastReadDate.current = taskListDate();
    setReadError(null);
    try {
      const next = await getTaskSmartLists();
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
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && taskListDate() !== lastReadDate.current) void refresh(); }, 60_000);
    return () => { ++sequence.current; window.clearInterval(timer); document.removeEventListener("visibilitychange", resume); };
  }, [active]);
  async function addTask() {
    const acknowledge = captureCommitFeedback();
    if (inFlight.current || !title.trim() || !plan) return;
    inFlight.current = true; setBusy(true); setError(null); setReceipt(null);
    const name = title.trim();
    try {
      // Re-read the date at execution: a retained composer may span midnight.
      const current = await getTodayPlan();
      const rule = recurrenceInputFor(recurrence, due || current.date);
      // QUICK-ADD-001: a date in the words plans it for that day, unless a date was chosen in the form.
      const quick = !due && !rule ? parseQuickAdd(name) : null;
      await createObligation({ title: quick?.title ?? name, plannedAt: quick?.date ?? current.date, ...(due ? { dueAt: due } : {}),
        ...(quick?.time ? { description: `At ${quick.time}` } : {}),
        ...(mission ? { missionId: mission } : {}), ...(rule ? { recurrence: rule } : {}) });
      acknowledge("LIGHT");
      setTitle(""); setDue(""); setMission(""); setRecurrence(EMPTY_RECURRENCE);
      setReceipt(quick ? `Added “${quick.title}” for ${planDate(quick.date)}${quick.time ? ` at ${quick.time}` : ""}.` : `Added “${name}” to your plan.`);
      await refresh();
      titleInput.current?.focus({ preventScroll: true });
    } catch (cause) { setError(describeError(cause, "Could not add the task. Your input is kept.")); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const quick = !due && sameRecurrence(recurrence, EMPTY_RECURRENCE) ? parseQuickAdd(title) : null;
  async function moveToTomorrow(items: readonly Obligation[]) {
    if (inFlight.current || !items.length) return;
    inFlight.current = true; setBusy(true); setError(null); setReceipt(null);
    try {
      const current = await getTodayPlan();
      const [y, m, d] = current.date.split("-").map(Number);
      const next = new Date(y!, m! - 1, d! + 1);
      const tomorrow = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      for (const item of items) await modifyObligation(item.id, { plannedAt: tomorrow });
      setReceipt(items.length === 1 ? `Moved “${items[0]!.title}” to ${planDate(tomorrow)}.` : `Moved ${items.length} tasks to ${planDate(tomorrow)}.`);
      await refresh();
    } catch (cause) { setError(describeError(cause, "Could not move that. Nothing else changed.")); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function rows(items: Obligation[], empty: { line: string; detail: string }) {
    return items.length ? <ul className="plan-list">{items.map((item) => <li key={item.id}>
      <button className="plan-task" onClick={() => onOpen({ kind: "OBLIGATION", obligationId: item.id })}>
        <strong>{item.title}</strong>
        <span>{[item.status === "WAITING" ? "Waiting" : undefined,
          item.plannedAt ? item.plannedAt === plan!.date ? "Planned today" : `Planned · ${planDate(item.plannedAt)}` : undefined,
          item.dueAt ? item.dueAt < plan!.date ? `Due · from ${planDate(item.dueAt)}` : item.dueAt === plan!.date ? "Due today" : `Due · ${planDate(item.dueAt)}` : undefined,
          !item.plannedAt && !item.dueAt ? "No due or planned date" : undefined,
          plan!.missions.find((parent) => parent.id === item.missionId)?.title].filter(Boolean).join(" · ")}</span>
        <span className="visually-hidden">Open task</span>
      </button>
    </li>)}</ul> : <SectionEmpty line={empty.line} detail={empty.detail} />;
  }
  return <div className="plan-today">
    <OperatorHeader destination="mission" focusable>MORE // PLAN TODAY</OperatorHeader>
    <h2 className="more-title">Your plan</h2>
    <p className="meta">{plan ? planDate(plan.date) : "Today"} · Your choices and recorded deadlines. Not a recommendation.</p>
    <div className="plan-smart-lists" role="group" aria-label="Task views">
      {([['today', 'Today'], ['next7', 'Next 7'], ['noDate', 'No date']] as const).map(([value, label]) => <button key={value} type="button" className="btn-secondary" aria-pressed={list === value} onClick={() => setList(value)}>{label}</button>)}
    </div>
    <Section id="plan-commitments" eyebrow="YOUR COMMITMENTS" title={list === "today" ? "Today" : list === "next7" ? "Next 7" : "No date"}
      wayIn={{ label: "All missions", ariaLabel: "Open all missions and obligations", onClick: () => onOpen(null) }}>
      <p className="more-section-purpose">{list === "today" ? "Planned today, or due today or earlier. Earlier due dates stay where you put them." : list === "next7" ? `Tomorrow through ${plan ? planDate(plan.through) : "the next seven days"}. Tasks already in Today stay there.` : "Tasks with neither a due date nor a planned date."}</p>
      {readError ? <div role="alert"><SectionUnavailable>{readError} Tasks are unavailable, not empty.</SectionUnavailable><button className="btn-secondary" onClick={() => void refresh()}>RETRY PLAN</button></div>
        : !plan ? <p role="status">Reading your plan…</p> : rows(plan[list], list === "today"
          ? { line: "A little breathing room.", detail: "No tasks are planned or due today." }
          : list === "next7"
            ? { line: "The coming days are open.", detail: "No other tasks are dated in the next seven days." }
            : { line: "No undated tasks.", detail: "Every task has a planned or due date." })}
    </Section>
    <form className="plan-composer" onSubmit={(event) => { event.preventDefault(); void addTask(); }}>
      <Section id="plan-add-task" eyebrow="YOUR PLAN" title="Add a task"
        wayIn={{ label: quick ? `ADD FOR ${planDate(quick.date).toUpperCase()}` : "ADD TO TODAY", type: "submit", disabled: busy || !title.trim() || !plan }}>
        <label htmlFor="plan-task-title">Add a task for today</label>
        <input ref={titleInput} id="plan-task-title" className="input" value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} placeholder="What do you want to get done? Try “dentist Tue 3pm”" />
        {quick && <p className="meta" role="status" aria-live="polite">Understood: “{quick.title}” on {planDate(quick.date)}{quick.time ? ` at ${quick.time}` : ""}. Choose a date below to override.</p>}
        <details className="more-inspection"><summary>Date, Mission & repeat</summary>
          <label htmlFor="plan-due">Due date (optional)</label><input id="plan-due" className="input" type="date" value={due} disabled={busy} onChange={(event) => setDue(event.target.value)} />
          <label htmlFor="plan-mission">Mission (optional)</label><select id="plan-mission" className="input" value={mission} disabled={busy} onChange={(event) => setMission(event.target.value)}>
            <option value="">No Mission</option>{plan?.missions.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <RecurrencePicker form={recurrence} onChange={setRecurrence} idPrefix="plan-recurrence" disabled={busy} />
        </details>
        {error && <p role="alert">{error}</p>}{receipt && <p role="status">{receipt}</p>}
      </Section>
    </form>
    {/* SHUTDOWN-001 (APPS-PICKS-002 pick 3, after Sunsama): end the day on purpose. Each move is your tap. */}
    {plan && (({ movable, due }) => <Section id="plan-shutdown" eyebrow="END OF DAY" title="Wrap up today">
      {movable.length ? <>
        <p className="meta">Planned for today and still open. Move what can wait.</p>
        <ul className="plan-list">{movable.map((item) => <li key={item.id} className="plan-shutdown-row">
          <span>{item.title}</span>
          <button type="button" className="btn-secondary" disabled={busy} aria-label={`Move ${item.title} to tomorrow`} onClick={() => void moveToTomorrow([item])}>TOMORROW</button>
        </li>)}</ul>
        {movable.length > 1 && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void moveToTomorrow(movable)}>MOVE ALL {movable.length} TO TOMORROW</button>}
      </> : <SectionEmpty line="Nothing planned is left open today." detail="A good place to stop. Leave yourself a line in the daily note if it helps." />}
      {due.length > 0 && <p className="meta">{due.length === 1 ? "1 task is due" : `${due.length} tasks are due`} today or earlier; it stays here until done or given a new due date.</p>}
    </Section>)({ movable: plan.today.filter((item) => !(item.dueAt && item.dueAt <= plan.date)), due: plan.today.filter((item) => item.dueAt && item.dueAt <= plan.date) })}
    <p className="meta">Open a task to complete it, release it, or change its dates. Nothing is moved automatically.</p>
  </div>;
}

/** "2026-10-22" → "Thu, Oct 22": the plan's calendar date, read as a person would say it. */
const planDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};
