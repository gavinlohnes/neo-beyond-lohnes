import "./lifeState.css";
import type { LifeStateReading } from "../../../application/lifeState";
import type { LifeMomentReading } from "../../../application/lifeTransition";
import type { AheadReading } from "../../../application/ahead";
import { useState, type ReactNode } from "react";

/**
 * LIFE-STATE-001: what state BEYOND believes today is in (WORK RUN, RECOVERY, FLIP, FREE), in one calm line, with
 * where it came from one tap away. LIFE-STATE-002: on the day a state changes, the moment leads ("RUN OVER The run is
 * over. This is the first day off."); TODAY puts slice 3's post-run report and recovery contract just below its next
 * card. Read only; TODAY derives both readings in render. With no reading it shows nothing.
 * OPERATOR-EXPERIENCE-001: NOW (the state) and NEXT (the next switch between work and off, labelled forecast or
 * confirmed change) in one place, with WEEK AHEAD one tap away: the week, its confirmed changes (confirm, move,
 * cancel; each confirm-first) without leaving TODAY. `weekAhead` renders only while open.
 */
export function LifeStateBand({ reading, moment = null, ahead = null, weekAhead, since = null }: {
  reading: LifeStateReading | null; moment?: LifeMomentReading | null; ahead?: AheadReading | null; weekAhead?: (() => ReactNode) | undefined;
  /** Slice 3: what changed since the last look on this device; shown only when something did. */
  since?: { label: string; items: string[] } | null;
}) {
  const [open, setOpen] = useState(false);
  if (!reading) return null;
  return (
    <section className="today-life-state" data-life-state={reading.state} data-life-moment={moment?.moment} aria-label="Operating state">
      {since && since.items.length > 0 && <p className="today-life-state__since" data-life-since><strong>{since.label}</strong> <span>{since.items.join(" · ")}</span></p>}
      {moment && <p className="today-life-state__moment"><strong>{moment.label}</strong> <span>{moment.line}</span></p>}
      <p className="today-life-state__line"><strong>{reading.label}</strong> <span>{reading.line}</span></p>
      {ahead && <p className="today-life-state__next" data-life-next><strong>NEXT</strong> <span>{ahead.line}</span></p>}
      <div className="today-life-state__tools">
        <details className="today-life-state__why">
          <summary>WHY {reading.label}</summary>
          <ul>{[...reading.why, ...(ahead ? [ahead.why] : [])].map((line) => <li key={line} className="meta">{line}</li>)}</ul>
        </details>
        {weekAhead && <button type="button" className="today-life-state__week" aria-expanded={open} aria-controls="today-week-ahead" onClick={() => setOpen((o) => !o)}>
          {open ? "HIDE WEEK AHEAD" : `WEEK AHEAD${ahead?.confirmed ? ` · ${ahead.confirmed} CONFIRMED` : ""}`}</button>}
      </div>
      {weekAhead && open && <div id="today-week-ahead" className="today-life-state__week-panel" role="region" aria-label="Week ahead">{weekAhead()}</div>}
    </section>
  );
}
