import { useEffect, useState } from "react";
import { getMonth, getSleepDebt, SLEEP_NEED_MINUTES, type MonthDay } from "../../../application/monthQueries";
import { AlfredText, askAlfred } from "../../components/AlfredSheet";
import { listReviews, weekLabel } from "../../../application/alfred/alfredReview";
import type { AlfredReview } from "../../../domain/alfred/types";
import { describeError } from "../../errorMessage";

/**
 * MONTH-001 (owner go 2026-10-31, ideas 9–11): the month on one page — each lived day's shift, sleep,
 * protein, training and clean day — with the sleep owed this week. Tap a day for its numbers and to ask
 * Alfred about it. Read only.
 */
const hm = (m: number) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const longDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

export function CaveMonthView() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [days, setDays] = useState<MonthDay[] | null>(null);
  const [debt, setDebt] = useState<{ owedMinutes: number; days: number } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<AlfredReview[]>([]);
  useEffect(() => { void listReviews().then(setReviews).catch(() => {}); }, []);

  useEffect(() => {
    let live = true;
    setDays(null); setError(null);
    Promise.all([getMonth(cursor.y, cursor.m), getSleepDebt()])
      .then(([month, owed]) => { if (live) { setDays(month); setDebt(owed); } })
      .catch((e: unknown) => { if (live) setError(describeError(e, "Could not read this month.")); });
    return () => { live = false; };
  }, [cursor.y, cursor.m]);

  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const step = (n: number) => { setPicked(null); setCursor(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 })); };
  const lead = days?.length ? (new Date(`${days[0]!.date}T12:00:00`).getDay() + 6) % 7 : 0;
  const day = days?.find((d) => d.date === picked);

  return <div className="month">
    {debt && <p className="month__debt" role="status">{debt.days === 0 ? "No sleep logged yet, so nothing to count as owed."
      : `Sleep owed, last ${debt.days} logged day${debt.days === 1 ? "" : "s"}: ${hm(debt.owedMinutes)} against ${SLEEP_NEED_MINUTES / 60} h a day.`}</p>}
    <div className="month__head">
      <button type="button" className="btn-secondary" aria-label="Previous month" onClick={() => step(-1)}>‹</button>
      <h3 className="cave__cap">{title}</h3>
      <button type="button" className="btn-secondary" aria-label="Next month" onClick={() => step(1)}>›</button>
    </div>
    {error && <p role="alert" className="meta meta--error">{error}</p>}
    {!days && !error && <p className="meta" role="status">Reading…</p>}
    {days && <>
      <div className="month__grid" role="group" aria-label={title}>
        {WEEKDAYS.map((w, i) => <span key={i} className="month__wd" aria-hidden="true">{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`pad${i}`} />)}
        {days.map((d) => <button key={d.date} type="button" className={`month__day${d.work === "WORK" ? " month__day--work" : ""}`} aria-pressed={d.date === picked}
          aria-label={`${longDate(d.date)}${d.dayId ? "" : ", nothing logged"}`} onClick={() => setPicked(d.date === picked ? null : d.date)}>
          <span className="month__n">{Number(d.date.slice(8))}</span>
          {d.sleepMinutes !== undefined && <span className={d.sleepMinutes < SLEEP_NEED_MINUTES ? "month__short" : undefined}>{hm(d.sleepMinutes)}</span>}
          {d.proteinG !== undefined && <span>{Math.round(d.proteinG)}g</span>}
          <span className="month__marks">{d.workouts ? "▲" : ""}{d.clean ? "✓" : ""}</span>
        </button>)}
      </div>
      <p className="meta">Red top line: a work day. Sleep under {SLEEP_NEED_MINUTES / 60} h underlined red · protein in grams · ▲ trained · ✓ clean day.</p>
    </>}
    {day && <section className="cave__block" aria-label={longDate(day.date)}>
      <h3 className="cave__cap">{longDate(day.date)}</h3>
      {day.dayId ? <ul className="cave__facts">
        <li>{day.work === "WORK" ? "Work day" : day.work === "OFF" ? "Day off" : "Work not set"}</li>
        <li>Sleep {day.sleepMinutes !== undefined ? hm(day.sleepMinutes) : "not logged"}</li>
        <li>Protein {day.proteinG !== undefined ? `${Math.round(day.proteinG)} g` : "not logged"}</li>
        <li>{day.workouts ? `${day.workouts} workout${day.workouts === 1 ? "" : "s"}` : "No workout"}{day.urges ? ` · ${day.urges} urge${day.urges === 1 ? "" : "s"}` : ""}{day.clean ? " · clean day" : ""}</li>
      </ul> : <p className="meta">Nothing logged that day.</p>}
      <button type="button" className="btn-secondary" onClick={() => askAlfred(`Tell me about ${longDate(day.date)}: what happened, what went well, what didn't, and why. Use get_days for that day and the days around it.`)}>ASK ALFRED ABOUT THIS DAY</button>
    </section>}
    {/* ALFRED-006: every weekly review Alfred has written, newest first. */}
    {reviews.length > 0 && <section className="cave__block month__reviews" aria-label="Weekly reviews">
      <h3 className="cave__cap">Weekly reviews</h3>
      {reviews.map((r) => <details key={r.id}><summary>{weekLabel({ start: r.weekStart, end: r.weekEnd })}</summary><AlfredText text={r.text} /></details>)}
    </section>}
  </div>;
}
