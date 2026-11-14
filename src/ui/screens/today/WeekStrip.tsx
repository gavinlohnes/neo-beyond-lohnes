import type { WeekAheadDay } from "../../../application/weekAheadQueries";
import { livedDayOn } from "../../../application/workContextResolution";

/**
 * WEEK-STRIP-001 (Gavin, 2026-11-14: "Let's work"; WALKTHROUGH-002 finding 6): the coming lived days as seven quiet
 * tiles under NEXT, read from Week Ahead's own days. WORK is a bar, OFF is empty. A record is solid, a forecast is
 * outlined, a confirmed change has a red notch, and an unknown day says "?". Tapping a day opens Week Ahead in place
 * at that day, where its What-If and confirm, move or cancel live. Read only.
 */
const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2).toUpperCase();
const dayNum = (date: string) => String(Number(date.slice(8, 10)));
const longDay = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const what = (d: WeekAheadDay) => d.basis === "UNKNOWN" ? "work or off not known"
  : `${d.work === "WORK" ? `work${d.shiftStartHour !== null ? ` ${String(d.shiftStartHour).padStart(2, "0")}:00` : ""}` : "day off"}, ${d.basis === "RECORDED" ? "recorded" : d.basis === "CONFIRMED" ? "confirmed change" : "forecast"}`;

export function WeekStrip({ days, now, onOpenDay }: { days: readonly WeekAheadDay[]; now: Date; onOpenDay: (date: string) => void }) {
  // Lived days that haven't ended yet (a lived day ends at 16:30 the next day).
  const shown = days.filter((d) => livedDayOn(d.date).getTime() + 24 * 3_600_000 > now.getTime() && d.basis !== "WHAT_IF").slice(0, 7);
  if (!shown.length) return null;
  const current = (d: WeekAheadDay) => { const s = livedDayOn(d.date).getTime(); return s <= now.getTime() && now.getTime() < s + 24 * 3_600_000; };
  return (
    <ol className="today-week-strip" aria-label="The coming days">
      {shown.map((d) => (
        <li key={d.date}>
          <button type="button" className="today-week-strip__day" data-week-strip-day={d.date} data-basis={d.basis} data-work={d.basis === "UNKNOWN" ? "UNKNOWN" : d.work}
            aria-current={current(d) ? "date" : undefined} aria-label={`${longDay(d.date)}: ${what(d)}. Open in week ahead`} onClick={() => onOpenDay(d.date)}>
            <span className="today-week-strip__wd" aria-hidden="true">{weekday(d.date)}</span>
            <span className="today-week-strip__glyph" aria-hidden="true">{d.basis === "UNKNOWN" ? "?" : ""}</span>
            <span className="today-week-strip__num" aria-hidden="true">{dayNum(d.date)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
