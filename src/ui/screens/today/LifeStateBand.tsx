import "./lifeState.css";
import type { LifeStateReading } from "../../../application/lifeState";
import type { LifeMomentReading } from "../../../application/lifeTransition";
import type { AheadReading } from "../../../application/ahead";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { WeekAheadDay } from "../../../application/weekAheadQueries";
import { WeekStrip } from "./WeekStrip";

/**
 * LIFE-STATE-001: what state BEYOND believes today is in (WORK RUN, RECOVERY, FLIP, FREE), in one calm line, with
 * where it came from one tap away. LIFE-STATE-002: on the day a state changes, the moment leads ("RUN OVER The run is
 * over. This is the first day off."); TODAY puts slice 3's post-run report and recovery contract just below its next
 * card. Read only; TODAY derives both readings in render. With no reading it shows nothing.
 * OPERATOR-EXPERIENCE-001: NOW (the state) and NEXT (the next switch between work and off, labelled forecast or
 * confirmed change) in one place, with WEEK AHEAD one tap away: the week, its confirmed changes (confirm, move,
 * cancel; each confirm-first) without leaving TODAY. `weekAhead` renders only while open.
 */
const underNext = (line: string) => line.replace(/^Next (\w)/, (_, c: string) => c.toUpperCase());

export function LifeStateBand({ reading, moment = null, ahead = null, weekAhead, since = null, days, now, flip = null }: {
  /** WEEK-STRIP-001: the coming days, as tiles under NEXT; tapping one opens Week Ahead at that day. */
  days?: readonly WeekAheadDay[] | undefined; now?: Date | undefined;
  reading: LifeStateReading | null; moment?: LifeMomentReading | null; ahead?: AheadReading | null; weekAhead?: (() => ReactNode) | undefined;
  /** Slice 3: what changed since the last look on this device; shown only when something did. */
  since?: { label: string; items: string[] } | null;
  /** GRAYSON-FLIP-PLAN-001: the rotation flip in one muted line under the moment; the tap opens ROUTE at its card. */
  flip?: { line: string; onOpen?: (() => void) | undefined } | null;
}) {
  const [open, setOpen] = useState(false);
  // WALKTHROUGH-002: on a work day the band sits at the bottom of the first screen, so the week opened below the fold;
  // bring it into view when it opens.
  const panelRef = useRef<HTMLDivElement>(null);
  // WEEK-STRIP-001: a tapped day opens the week at that day's row (it loads a moment later), else at the top.
  const [focusDay, setFocusDay] = useState<string | null>(null);
  useEffect(() => { if (open) panelRef.current?.scrollIntoView({ block: "start" }); }, [open]);
  useEffect(() => {
    if (!open || !focusDay) return;
    // The week loads a moment later (on a slow phone, seconds), and content above it can still grow after the row
    // appears. Wait up to 5 s for the row, centre it, then keep it in view for 1 s while the page settles. Any touch,
    // wheel or key from him stops it at once, so it never fights his own scrolling.
    let tries = 0, settled = 0, found: HTMLElement | null = null, stopped = false;
    const stop = () => { stopped = true; };
    const opts = { passive: true, once: true } as const;
    window.addEventListener("touchstart", stop, opts); window.addEventListener("wheel", stop, opts); window.addEventListener("keydown", stop, opts);
    const inView = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; };
    const timer = window.setInterval(() => {
      if (stopped) { window.clearInterval(timer); setFocusDay(null); return; }
      if (!found) {
        found = panelRef.current?.querySelector<HTMLElement>(`[data-week-ahead-day="${focusDay}"]`) ?? null;
        if (found) found.scrollIntoView({ block: "center" });
        else if (++tries > 100) { window.clearInterval(timer); setFocusDay(null); }
        return;
      }
      if (!inView(found)) found.scrollIntoView({ block: "center" });
      if (++settled >= 20) { window.clearInterval(timer); setFocusDay(null); }
    }, 50);
    return () => { window.clearInterval(timer); window.removeEventListener("touchstart", stop); window.removeEventListener("wheel", stop); window.removeEventListener("keydown", stop); };
  }, [open, focusDay]);
  if (!reading) return null;
  return (
    <section className="today-life-state" data-life-state={reading.state} data-life-moment={moment?.moment} aria-label="Operating state">
      {since && since.items.length > 0 && <p className="today-life-state__since" data-life-since><strong>{since.label}</strong> <span>{since.items.join(" · ")}</span></p>}
      {moment && <p className="today-life-state__moment"><strong>{moment.label}</strong> <span>{moment.line}</span></p>}
      {flip && (flip.onOpen
        ? <button type="button" className="today-life-state__flip" data-flip-line onClick={flip.onOpen} aria-label={`${flip.line} Open the flip plan in ROUTE`}>{flip.line}</button>
        : <p className="today-life-state__flip" data-flip-line>{flip.line}</p>)}
      <p className="today-life-state__line"><strong>{reading.label}</strong> <span>{reading.line}</span></p>
      {/* TODAY-CLARITY-001: under the NEXT label the line drops its own leading "Next" ("NEXT Day off: Wed, …"). */}
      {ahead && <p className="today-life-state__next" data-life-next><strong>NEXT</strong> <span>{underNext(ahead.line)}</span></p>}
      {days && now && weekAhead && <WeekStrip days={days} now={now} onOpenDay={(date) => { setFocusDay(date); setOpen(true); }} />}
      <div className="today-life-state__tools">
        <details className="today-life-state__why">
          <summary>WHY {reading.label}</summary>
          <ul>{[...reading.why, ...(ahead ? [ahead.why] : [])].map((line) => <li key={line} className="meta">{line}</li>)}</ul>
        </details>
        {weekAhead && <button type="button" className="today-life-state__week" aria-expanded={open} aria-controls="today-week-ahead" onClick={() => setOpen((o) => !o)}>
          {open ? "HIDE WEEK AHEAD" : `WEEK AHEAD${ahead?.confirmed ? ` · ${ahead.confirmed} CONFIRMED` : ""}`}</button>}
      </div>
      {weekAhead && open && <div ref={panelRef} id="today-week-ahead" className="today-life-state__week-panel" role="region" aria-label="Week ahead">{weekAhead()}</div>}
    </section>
  );
}
