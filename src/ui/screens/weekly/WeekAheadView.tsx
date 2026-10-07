import { useEffect, useState } from "react";
import { getWeekAhead, type WeekAhead } from "../../../application/weekAheadQueries";

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

  useEffect(() => {
    let current = true;
    void getWeekAhead(now)
      .then((next) => {
        if (current) setWeek(next);
      })
      .catch(() => {});
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
            {day.suggestedTemplate ? ` · Suggested workout ${day.suggestedTemplate}` : " · Rest"}
          </p>
        </div>
      ))}
    </div>
  );
}
