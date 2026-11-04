import { useCallback, useEffect, useState } from "react";
import { createHabit, setHabitArchived, setHabitDone } from "../../application/habitCommands";
import { getHabitWorkspace } from "../../application/habitQueries";
import type { HabitScheduleKind } from "../../domain/habits";

type Workspace = Awaited<ReturnType<typeof getHabitWorkspace>>;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HabitsPanel({ active }: { active: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<HabitScheduleKind>("ANY_DAY");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(() => void getHabitWorkspace().then(setWorkspace, () => setError("Habits couldn't be read. Try again.")), []);
  useEffect(() => { if (active) load(); }, [active, load]);

  async function save() {
    try {
      await createHabit({ name, kind, ...(kind === "WEEKDAYS" ? { weekdays } : {}) });
      setName(""); setKind("ANY_DAY"); setWeekdays([]); setError(""); load();
    } catch { setError("Add a name and choose at least one day."); }
  }
  return <section className="habits-panel" aria-label="Habits">
    <p className="tool-label">HABITS</p>
    <p className="meta">A quiet record of what you did. Tap once for this lived day; tap again to undo.</p>
    <div className="habits-create">
      <label>Habit name<input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
      <label>When<select value={kind} onChange={(e) => setKind(e.target.value as HabitScheduleKind)}>
        <option value="ANY_DAY">Any day</option><option value="WEEKDAYS">Chosen days</option>
        <option value="WORK_DAYS">Work days</option><option value="DAYS_OFF">Days off</option>
      </select></label>
      {kind === "WEEKDAYS" && <fieldset><legend>Days</legend><div className="habit-days">{DAYS.map((day, index) => <label key={day}><input type="checkbox" checked={weekdays.includes(index)} onChange={() => setWeekdays((old) => old.includes(index) ? old.filter((d) => d !== index) : [...old, index])} />{day}</label>)}</div></fieldset>}
      <button type="button" className="btn-primary" onClick={() => void save()}>SAVE HABIT</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {!workspace?.dayId && <p className="meta">Start today to mark a habit done.</p>}
    <div className="habit-list">{workspace?.habits.map(({ habit, done, applies, thisWeek, fourWeeks }) => <article key={habit.id} className="habit-row">
      <div><strong>{habit.name}</strong><p className="meta">{thisWeek} this week · {fourWeeks} in 4 weeks{!applies ? " · Not scheduled today" : ""}</p></div>
      <div className="habit-actions"><button type="button" className={done ? "btn-primary" : "btn-secondary"} disabled={!workspace.dayId || !applies} aria-pressed={done} onClick={() => void setHabitDone(habit.id, !done, workspace.dayId ?? undefined).then(load)}> {done ? "DONE" : "MARK DONE"}</button>
      <button type="button" className="btn-secondary" onClick={() => void setHabitArchived(habit.id, true).then(load)}>PUT AWAY</button></div>
    </article>)}</div>
  </section>;
}
