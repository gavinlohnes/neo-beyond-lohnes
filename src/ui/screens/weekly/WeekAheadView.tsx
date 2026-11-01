import { useEffect, useState } from "react";
import { getWeekAhead, getWeekTasks, type WeekAhead, type WeekTasksDay } from "../../../application/weekAheadQueries";
import { askAlfred, PLAN_MY_WEEK_ASK } from "../../components/AlfredSheet";


function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function shiftLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}00 SHIFT`;
}

export function WeekAheadView({ now }: { now?: Date | undefined }) {
  const [week, setWeek] = useState<WeekAhead | null>(null);
  const [tasks, setTasks] = useState<WeekTasksDay[] | null>(null);
  const [tasksFailed, setTasksFailed] = useState(false);

  useEffect(() => {
    let current = true;
    void getWeekAhead(now)
      .then((next) => {
        if (current) setWeek(next);
      })
      .catch(() => {});
    void getWeekTasks(now)
      .then((next) => { if (current) { setTasks(next); setTasksFailed(false); } })
      .catch(() => { if (current) setTasksFailed(true); });
    return () => {
      current = false;
    };
  }, [now]);

  if (!week) return <p className="meta">Loading…</p>;

  return (
    <div data-week-ahead>
      <p className="meta" style={{ margin: "0 0 10px" }}>Suggestions only. Move or skip anything.</p>
      {week.days.map((day) => (
        <div
          key={day.date}
          data-week-ahead-day={day.date}
          className="equipment-row"
          style={{ marginBottom: 6, padding: "10px 12px" }}
        >
          <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>{dayLabel(day.date)}</p>
          <p className="meta" style={{ margin: "2px 0 0" }}>
            {day.work === "WORK" ? shiftLabel(day.shiftStartHour!) : "OFF"}
            {day.suggestedTemplate ? ` · Suggested workout ${day.suggestedTemplate}${day.afterShift ? " after shift" : ""}` : " · Rest"}
          </p>
          {(() => {
            const t = tasks?.find((d) => d.date === day.date);
            if (!t || (t.planned.length === 0 && t.due.length === 0)) return null;
            return <ul className="meta" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {t.planned.map((o) => <li key={o.id}>Planned: {o.title}</li>)}
              {t.due.map((o) => <li key={o.id}>Due: {o.title}</li>)}
            </ul>;
          })()}
        </div>
      ))}
      {tasksFailed && <p role="alert" className="meta">Commitments couldn't be read, so days may show fewer than you have. Nothing changed.</p>}
      <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={() => askAlfred(PLAN_MY_WEEK_ASK)}>PLAN MY WEEK WITH ALFRED</button>
      <p className="meta">He offers each placement as a card. Only the ones you SAVE change a task's planned day.</p>
    </div>
  );
}
