import type { EarlyDayStart } from "../../../application/earlyDayStart";

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * EARLY-DAY-START-001 (Gavin, 2026-11-20): he leaves the day running after a shift, so when he wakes in the
 * afternoon yesterday's day is still open and TODAY had no START DAY. In the window before 16:30 this one row
 * offers it. The tap opens the 16:30 day early; nothing is written by showing the row.
 */
export function EarlyStartRow({ early, busy, onStart }: { early: EarlyDayStart; busy: boolean; onStart: () => void }) {
  const line = early.shift
    ? `Opens the day that owns your ${clock(early.shift.start)} shift. A check-in now carries past ${clock(early.boundary)}.`
    : `Opens today's day now instead of at ${clock(early.boundary)}.`;
  return (
    <section className="today-early-start" aria-label="Start your day">
      <div className="today-early-start__text">
        <p className="today-early-start__label">READY TO START?</p>
        <p className="today-early-start__line">{line}</p>
      </div>
      <button type="button" className="btn-primary today-early-start__go" disabled={busy} onClick={onStart}>START DAY</button>
    </section>
  );
}
