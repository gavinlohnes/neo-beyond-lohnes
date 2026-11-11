import { useEffect, useRef, useState } from "react";
import { getShiftWhatIf, type ShiftWhatIf, type ShiftWhatIfImpact, type WhatIfChange, type WhatIfRun, type WhatIfStretch, type WhatIfWindow, type WhatIfTrainingChange } from "../../../application/shiftWhatIf";
import type { GoogleCalendarEvent } from "../../../application/googleCalendar";
import { RUN_MEAN_FLOOR } from "../../../application/rotationProjection";

/**
 * SHIFT-WHAT-IF: what one flipped Week Ahead day would change. Information only: no button here saves,
 * moves or schedules anything, and the Engine never sees it.
 */
const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const short = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
const clock = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const span = (s: { from: string; to: string }) => s.from === s.to ? short(s.from) : `${short(s.from)}–${short(s.to)}`;

const stretch = (s: WhatIfStretch | null, unit: string) => s ? `${s.days}${s.open ? "+" : ""} ${unit}${s.days === 1 && !s.open ? "" : "s"} (${span(s)})` : "none in the next 3 weeks";
const shifts = (r: WhatIfRun) => `${r.clipped ? "at least " : ""}${r.days}${r.open ? "+" : ""} shift${r.days === 1 && !r.open && !r.clipped ? "" : "s"}`;
const run = (r: WhatIfRun | null) => r ? `${r.clipped ? "at least " : ""}${stretch(r, "shift")}` : "no work run around this day";
const offDutyWindow = (w: WhatIfWindow) => w.hours === null ? (w.from ? `open from ${clock(w.from)}, no shift in the next 3 weeks` : "no shift ends before it") : `${Math.round(w.hours)} h, ${clock(w.from!)} to ${clock(w.to!)}`;
const workout = (template: string | null, afterShift: boolean) => template ? `Workout ${template}${afterShift ? " after shift" : ""}` : "Rest";
const training = (t: WhatIfTrainingChange) => `${day(t.date)}: ${workout(t.before, t.beforeAfterShift)} → ${workout(t.after, t.afterAfterShift)}`;
const mean = (s: { mean: number | undefined; days: number }, format: (n: number) => string) => s.mean === undefined ? `not enough days (${s.days})` : `${format(s.mean)} (${s.days} days)`;

function History({ label, history }: { label: string; history: ShiftWhatIf | null }) {
  if (!history) return <li>{label}: the run's full length isn't in view, so there's nothing to compare.</li>;
  if (!history.enough) return <li>{label}: {history.runs} complete {history.shifts}-shift run{history.runs === 1 ? "" : "s"} in your records; patterns need {RUN_MEAN_FLOOR}.</li>;
  return <li>{label}: over your {history.runs} past {history.shifts}-shift runs, energy on the last shift {mean(history.lastShiftEnergy, (n) => `${n.toFixed(1)} of 5`)}; main sleep on day off 1 {mean(history.offDay1Sleep, (n) => `${n.toFixed(1)} h`)}, day off 2 {mean(history.offDay2Sleep, (n) => `${n.toFixed(1)} h`)}.</li>;
}

export function ShiftWhatIfPanel({ change, events, now, onClose }: { change: WhatIfChange; events: readonly GoogleCalendarEvent[]; now?: Date | undefined; onClose: () => void }) {
  const [impact, setImpact] = useState<ShiftWhatIfImpact | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const headingRef = useRef<HTMLParagraphElement>(null);
  // Review of #474: the button that opened this panel is gone, so focus moves to the panel's heading.
  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => {
    let current = true;
    setImpact(undefined); setFailed(false);
    void getShiftWhatIf(change, events, now).then((next) => { if (current) setImpact(next); }).catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [change, events, now]);

  const heading = `What if ${day(change.date)} were ${change.to === "WORK" ? "a shift" : "a day off"}?`;
  return (
    <section data-shift-what-if={change.date} aria-label={heading} style={{ marginTop: 8 }}>
      <p ref={headingRef} tabIndex={-1} className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>{heading}</p>
      <p className="meta" style={{ margin: "2px 0 6px" }}>Information only. Your schedule and plans haven't changed.</p>
      {failed ? <p role="alert" className="meta">This couldn't be worked out right now. Nothing changed.</p>
        : impact === undefined ? <p className="meta">Working it out…</p>
        : impact === null ? <p className="meta">That day already is {change.to === "WORK" ? "a shift" : "a day off"}.</p>
        : <ul className="meta" style={{ margin: 0, paddingLeft: 18 }}>
            <li>{change.to === "WORK" ? "Adds" : "Removes"} the {clock(impact.shift.start)} to {clock(impact.shift.end)} shift.</li>
            <li>Work run: {run(impact.run.before)} → {run(impact.run.after)}.</li>
            <li>Recovery window (days off): {stretch(impact.recovery.before, "day")} → {stretch(impact.recovery.after, "day")}.</li>
            <li>Next sleep opportunity (off-duty window): {offDutyWindow(impact.sleepWindow.before)} → {offDutyWindow(impact.sleepWindow.after)}.</li>
            {impact.training.length === 0 ? <li>Workout suggestions: no change.</li>
              : <li>Workout suggestions:<ul style={{ paddingLeft: 16 }}>{impact.training.map((t) => <li key={t.date}>{training(t)}</li>)}</ul></li>}
            {impact.commitments.length === 0 ? <li>No commitments on this day.</li>
              : <li>Commitments affected:<ul style={{ paddingLeft: 16 }}>{impact.commitments.map((c, i) => <li key={i}>{c.kind === "PLANNED" ? "Planned" : c.kind === "DUE" ? "Due" : "Google"}: {c.title}{c.duringShift ? " · during the shift" : ""}</li>)}</ul></li>}
            {impact.run.before && <History label={`Now (${shifts(impact.run.before)})`} history={impact.history.before} />}
            {impact.run.after && <History label={`With the change (${shifts(impact.run.after)})`} history={impact.history.after} />}
          </ul>}
      <p className="meta" style={{ margin: "6px 0 0" }}>From your saved schedule and your own records. Patterns, not predictions.</p>
      <button type="button" className="btn-secondary" style={{ marginTop: 6 }} onClick={onClose}>CLOSE</button>
    </section>
  );
}
