import { useCallback, useEffect, useRef, useState } from "react";
import { createHabit, setHabitArchived, setHabitAnswer } from "../../application/habitCommands";
import { getHabitWorkspace } from "../../application/habitQueries";
import { HABIT_ANSWERS, HABIT_ANSWER_LABEL, type HabitAnswer, type HabitScheduleKind } from "../../domain/habits";
import { CommandBar, Panel } from "../foundation/primitives";
import { LogSheet } from "./LogSheet";
import "../foundation/foundation.css";
import "./habitsPanel.css";

type Workspace = Awaited<ReturnType<typeof getHabitWorkspace>>;
type Row = Workspace["habits"][number];
type Day = Row["history"][number];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dateLabel = (d: Day) => new Date(d.from).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const contextLabel = (d: Day) => d.work === "UNKNOWN" ? "Work context not recorded" : `${d.workPlanned ? "Planned " : ""}${d.work === "WORK" ? "work day" : "day off"}`;
const answerLabel = (d: Day) => d.answer === "UNRECORDED" && !d.applies ? "Not scheduled · Not recorded" : HABIT_ANSWER_LABEL[d.answer];
const MARK: Record<HabitAnswer, string> = { DONE: "✓", NOT_DONE: "×", UNRECORDED: "—" };

function DayGrid({ days, selected, onPick }: { days: Day[]; selected?: string | undefined; onPick: (d: Day) => void }) {
  return <div className="habit-calendar" role="group" aria-label={`${days.length} lived days`}>
    {days.map((d) => <button key={d.date} type="button" className="habit-calendar__day" aria-pressed={selected === d.date}
      data-answer={d.answer} aria-label={`${dateLabel(d)} · ${answerLabel(d)} · ${contextLabel(d)}${!d.dayId ? " · No day record" : ""}`}
      onClick={() => onPick(d)}>
      <span>{new Date(d.from).getDate()}</span><span aria-hidden="true">{MARK[d.answer]}</span>
      <span aria-hidden="true">{d.work === "WORK" ? (d.workPlanned ? "P" : "W") : "·"}</span>
    </button>)}
  </div>;
}

function Answers({ answer, disabled, onAnswer }: { answer: HabitAnswer; disabled: boolean; onAnswer: (a: HabitAnswer) => void }) {
  return <div className="habit-answer" role="group" aria-label="Record an answer">
    {HABIT_ANSWERS.map((a) => <button key={a} type="button" aria-pressed={answer === a} disabled={disabled} onClick={() => onAnswer(a)}>{HABIT_ANSWER_LABEL[a]}</button>)}
  </div>;
}

export function HabitsPanel({ active }: { active: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<HabitScheduleKind>("ANY_DAY");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [readFailed, setReadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), generation = useRef(0), mounted = useRef(true);
  const [saved, setSaved] = useState("");
  const [selection, setSelection] = useState<{ habitId: string; date: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const load = useCallback(async () => {
    const request = ++generation.current;
    try {
      const next = await getHabitWorkspace();
      if (mounted.current && request === generation.current) { setWorkspace(next); setReadFailed(false); }
    } catch {
      if (mounted.current && request === generation.current) { setReadFailed(true); setError("Habits couldn't be read. Retry to see current records."); }
    }
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  useEffect(() => { if (active) void load(); }, [active, load]);
  useEffect(() => {
    if (!active || !workspace) return;
    const timer = setTimeout(() => void load(), Math.max(1, workspace.nextBoundary - Date.now() + 1));
    return () => clearTimeout(timer);
  }, [active, workspace, load]);

  async function run(write: () => Promise<unknown>, message: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setSaved("");
    try { await write(); if (mounted.current) setSaved(message); await load(); }
    catch { if (mounted.current) setError("That change couldn't be saved. Your selection is still here; try again."); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  const pick = (row: Row, day: Day) => { setSelection({ habitId: row.habit.id, date: day.date }); setHistoryOpen(true); setSaved(""); };
  const row = workspace?.habits.find((r) => r.habit.id === selection?.habitId);
  const selected = row?.history.find((d) => d.date === selection?.date);
  const record = (r: Row, d: Day, a: HabitAnswer) => {
    if (d.dayId) void run(() => setHabitAnswer(r.habit.id, a, d.dayId!), `${r.habit.name} · ${dateLabel(d)}: ${HABIT_ANSWER_LABEL[a]} saved.`);
  };
  const blocked = busy || readFailed;

  return <><section className="bf habits-panel" aria-label="Habits">
    <CommandBar eyebrow="HABITS // DAILY" context={<p className="habit-copy">A quiet record. Missing answers stay unrecorded; past answers can be corrected.</p>} />
    {workspace && <p className="habit-copy">{new Date(workspace.from).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · Lived day since 16:30</p>}
    <p className="habit-copy">✓ Done · × Didn't do it · — Not recorded. W marks a recorded work day; P marks planned work.</p>
    {error && <p role="alert" className="habit-copy">{error}</p>}
    {readFailed && <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setError(""); void load(); }}>RETRY HABITS</button>}
    <p role="status" className="habit-copy">{saved}</p>
    {!workspace && !readFailed && <p className="habit-copy">Reading habits…</p>}
    {workspace && !workspace.dayId && <p className="habit-copy">Start today to record a habit. Existing past days can still be corrected.</p>}
    <div className="habit-list">
      {workspace?.habits.map((r) => <Panel key={r.habit.id} headingId={`habit-${r.habit.id}`} label={r.habit.name} icon={null} wide>
        <p className="habit-copy">{r.thisWeek} this week · {r.fourWeeks} in 4 weeks{!r.applies ? " · Not scheduled today" : ""}</p>
        <p className="habit-copy"><b>Today:</b> {HABIT_ANSWER_LABEL[r.answer]}</p>
        <Answers answer={r.answer} disabled={blocked || !workspace.dayId} onAnswer={(a) => record(r, r.history.at(-1)!, a)} />
        <DayGrid days={r.history.slice(-7)} onPick={(d) => pick(r, d)} />
        <div className="habit-actions">
          <button type="button" className="btn-secondary" onClick={() => pick(r, r.history.at(-1)!)}>28-DAY HISTORY</button>
          <button type="button" className="btn-secondary" disabled={blocked} onClick={() => void run(() => setHabitArchived(r.habit.id, true), `${r.habit.name} put away.`)}>PUT AWAY</button>
        </div>
      </Panel>)}
    </div>
    {workspace && !workspace.habits.length && <p className="habit-copy">No habits yet. Add one below.</p>}

    <div className="habits-create">
      <h3>Add a habit</h3>
      <label className="field"><span>Habit name</span><input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Evening walk" /></label>
      <label className="field"><span>When</span><select className="input" value={kind} onChange={(e) => setKind(e.target.value as HabitScheduleKind)}>
        <option value="ANY_DAY">Any day</option><option value="WEEKDAYS">Chosen days</option><option value="WORK_DAYS">Work days</option><option value="DAYS_OFF">Days off</option>
      </select></label>
      {kind === "WEEKDAYS" && <fieldset className="habit-days-fieldset"><legend>Days</legend><div className="habit-days">
        {DAYS.map((d, i) => <label key={d} className="habit-day-toggle"><input type="checkbox" checked={weekdays.includes(i)} onChange={() => setWeekdays((old) => old.includes(i) ? old.filter((n) => n !== i) : [...old, i])} /><span>{d}</span></label>)}
      </div></fieldset>}
      <button type="button" className="btn-primary" disabled={busy || readFailed} onClick={() => void run(async () => {
        await createHabit({ name, kind, ...(kind === "WEEKDAYS" ? { weekdays } : {}) });
        if (mounted.current) { setName(""); setKind("ANY_DAY"); setWeekdays([]); }
      }, "Habit saved.")}>SAVE HABIT</button>
    </div>
  </section>
    <LogSheet open={historyOpen} title={historyOpen && row ? `${row.habit.name} history` : ""} onClose={() => { if (!lock.current) setHistoryOpen(false); }} canClose={() => !lock.current}>
      {historyOpen && row && !selected && <p className="habit-copy">This date is outside the last 28 days. Close history and choose a recent day.</p>}
      {historyOpen && !row && <p className="habit-copy">This habit is no longer active. Close history to return.</p>}
      {historyOpen && row && selected && <div className="bf habit-history">
        <p className="habit-copy">Last 28 lived days. Select a date to inspect or correct it. W is recorded work; P is planned work.</p>
        <DayGrid days={row.history} selected={selected.date} onPick={(d) => { if (!lock.current) setSelection({ habitId: row.habit.id, date: d.date }); }} />
        <h3>{dateLabel(selected)}</h3>
        <p className="habit-copy">{contextLabel(selected)} · {answerLabel(selected)}</p>
        {!selected.applies && <p className="habit-copy">Not scheduled. You can still record what happened.</p>}
        {!selected.dayId ? <p className="habit-copy">No BEYOND day was recorded here. This gap stays unrecorded; browsing never creates a past day.</p>
          : <Answers answer={selected.answer} disabled={blocked} onAnswer={(a) => record(row, selected, a)} />}
        {error && <p role="alert" className="habit-copy">{error}</p>}
        {readFailed && <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setError(""); void load(); }}>RETRY HABITS</button>}
        <p role="status" className="habit-copy">{saved}</p>
      </div>}
    </LogSheet>
  </>;
}
