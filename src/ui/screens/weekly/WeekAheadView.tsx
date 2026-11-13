import { CalendarExportPanel } from "./CalendarExportPanel";
import { useEffect, useRef, useState } from "react";
import { getWeekAhead, getWeekTasks, type WeekAhead, type WeekTasksDay } from "../../../application/weekAheadQueries";
import { askAlfred, PLAN_MY_WEEK_ASK } from "../../components/AlfredSheet";
import { readCachedGoogleEvents, type GoogleCalendarEvent } from "../../../application/googleCalendar";
import { GoogleCalendarPanel } from "./GoogleCalendarPanel";
import { FamilyCalendarPanel } from "./FamilyCalendarPanel";
import { ShiftWhatIfPanel } from "./ShiftWhatIfPanel";
import type { WhatIfChange } from "../../../application/shiftWhatIf";
import { getWeekEnergyForecast, type WeekEnergyForecast } from "../../../application/weekEnergyForecast";
import { ForecastActions, forecastLine, WeekEnergyForecastSummary } from "./WeekEnergyForecast";
import { createObligation } from "../../../application/intentCommands";


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

/** FORECAST-DECIDE-001: onOpenPlanItem / onOpenPlans let the forecast's suggestions open your plans; left out without them. */
export function WeekAheadView({ now, onOpenPlanItem, onOpenPlans }: { now?: Date | undefined; onOpenPlanItem?: (id: string) => void; onOpenPlans?: () => void }) {
  const [week, setWeek] = useState<WeekAhead | null>(null);
  const [tasks, setTasks] = useState<WeekTasksDay[] | null>(null);
  const [tasksFailed, setTasksFailed] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>(() => readCachedGoogleEvents());
  const [whatIf, setWhatIf] = useState<WhatIfChange | null>(null);
  const [forecast, setForecast] = useState<WeekEnergyForecast | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Review of #474: after CLOSE, focus returns to that day's WHAT IF button.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => {
    if (whatIf || !returnTo) return;
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-week-ahead-day="${returnTo}"] [data-what-if]`)?.focus();
    setReturnTo(null);
  }, [whatIf, returnTo]);

  useEffect(() => {
    let current = true;
    void getWeekAhead(now)
      .then((next) => {
        if (current) setWeek(next);
      })
      .catch(() => {});
    // A forecast that can't be read simply isn't shown; Week Ahead still works.
    void getWeekEnergyForecast(now).then((next) => { if (current) setForecast(next); }).catch(() => {});
    void getWeekTasks(now)
      .then((next) => { if (current) { setTasks(next); setTasksFailed(false); } })
      .catch(() => { if (current) setTasksFailed(true); });
    return () => {
      current = false;
    };
  }, [now]);

  if (!week) return <p className="meta">Loading…</p>;

  return (
    <div data-week-ahead ref={rootRef}>
      <p className="meta" style={{ margin: "0 0 10px" }}>Suggestions only. Move or skip anything.</p>
      {forecast && <WeekEnergyForecastSummary forecast={forecast} />}
      {forecast?.scheduled && <ForecastActions forecast={forecast} onOpenPlanItem={onOpenPlanItem} onOpenPlans={onOpenPlans}
        plannedOn={(date) => { const t = tasks?.find((d) => d.date === date); return t ? [...t.planned, ...t.due].map((o) => ({ id: o.id, title: o.title })) : []; }}
        onCreate={async (draft) => {
          await createObligation({ title: draft.title, plannedAt: draft.plannedAt, description: draft.description });
          // The new item shows under its day straight away.
          setTasks(await getWeekTasks(now));
        }} />}
      {week.days.map((day) => (
        <div
          key={day.date}
          data-week-ahead-day={day.date}
          className="equipment-row"
          style={{ marginBottom: 6, padding: "10px 12px" }}
        >
          <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>{dayLabel(day.date)}</p>
          <p className="meta" style={{ margin: "2px 0 0" }}>
            {/* CONTEXT-INTEGRATION-001: an unknown day says so; a recorded day says it was recorded, not forecast. */}
            {day.basis === "UNKNOWN" ? "Work or off not known · no saved schedule"
              : <>{day.work === "WORK" ? (day.shiftStartHour === null ? "SHIFT" : shiftLabel(day.shiftStartHour)) : "OFF"}{day.basis === "RECORDED" ? " · recorded" : ""}
                {day.suggestedTemplate ? ` · Suggested workout ${day.suggestedTemplate}${day.afterShift ? " after shift" : ""}` : " · Rest"}</>}
          </p>
          {(() => {
            const f = forecast?.days.find((d) => d.date === day.date);
            return f ? <p className="meta" data-energy-forecast-day style={{ margin: "2px 0 0" }}>{forecastLine(f)}</p> : null;
          })()}
          {(() => {
            const t = tasks?.find((d) => d.date === day.date);
            if (!t || (t.planned.length === 0 && t.due.length === 0)) return null;
            return <ul className="meta" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {t.planned.map((o) => <li key={o.id}>Planned: {o.title}</li>)}
              {t.due.map((o) => <li key={o.id}>Due: {o.title}</li>)}
            </ul>;
          })()}
          {calendarEvents.filter((event) => event.start.slice(0, 10) === day.date).map((event) => (
            <p className="meta" style={{ margin: "4px 0 0" }} key={event.id}>Google · {event.title}{event.allDay ? " · all day" : ` · ${new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}</p>
          ))}
          {/* What-If is about the plan: not for an unknown day, nor for a day already recorded. */}
          {day.basis === "UNKNOWN" || day.basis === "RECORDED" ? null : whatIf?.date === day.date
            ? <ShiftWhatIfPanel change={whatIf} events={calendarEvents} now={now} onClose={() => { setReturnTo(whatIf.date); setWhatIf(null); }} />
            : <button type="button" data-what-if className="btn-secondary" style={{ marginTop: 6 }} aria-label={`What if ${dayLabel(day.date)} were ${day.work === "WORK" ? "a day off" : "a shift"}?`}
                onClick={() => setWhatIf({ date: day.date, to: day.work === "WORK" ? "OFF" : "WORK" })}>{day.work === "WORK" ? "WHAT IF I'M OFF?" : "WHAT IF I WORK?"}</button>}
        </div>
      ))}
      {tasksFailed && <p role="alert" className="meta">Commitments couldn't be read, so days may show fewer than you have. Nothing changed.</p>}
      <CalendarExportPanel now={now} />
      <GoogleCalendarPanel now={now} onEventsChanged={() => setCalendarEvents(readCachedGoogleEvents())} />
      {/* BIG-IDEAS-001 item 8: a family calendar with only shifts, usual sleep and days off. */}
      <FamilyCalendarPanel now={now} />
      <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={() => askAlfred(PLAN_MY_WEEK_ASK)}>PLAN MY WEEK WITH ALFRED</button>
      <p className="meta">He offers each placement as a card. Only the ones you SAVE change a task's planned day.</p>
    </div>
  );
}
