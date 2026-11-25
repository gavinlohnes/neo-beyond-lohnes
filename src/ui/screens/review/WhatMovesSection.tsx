import { useCallback, useEffect, useState } from "react";
import {
  getWhatMoves, getWhatMovesPreference, setWhatMovesPreference, type WhatMoves, type WhatMovesLine, type WhatMovesMeasure,
  type WhatMovesPreference, type WhatMovesWindow,
} from "../../../application/whatMoves";
import { hoursMinutes } from "../health/healthFormat";
import "./whatMoves.css";

/**
 * GRAYSON-WHAT-MOVES-001 (Gavin, 2026-11-24): DATA → Patterns, "What moves your numbers". Read only and calm: clear
 * lines first, then "about the same", then one folded "Can't tell yet". Every line names its days. Hide keeps a line
 * out until he brings it back from Hidden. These line up; they don't prove a cause. Nothing here changes advice.
 */

const WINDOWS: { value: WhatMovesWindow; label: string }[] = [{ value: 90, label: "90 days" }, { value: 180, label: "180 days" }, { value: "ALL", label: "All" }];
const MEASURE_NAME: Record<WhatMovesMeasure, string> = { SLEEP: "Next-day sleep", ENERGY: "Next-day energy", RESTING: "Next-day resting heart rate" };

function causeLead(line: WhatMovesLine): string {
  if (line.cause.kind === "TRAINED") return "After a day you trained";
  if (line.cause.kind === "WORK") return "After a work day";
  return `After a day you did ${line.cause.name}`;
}
function causeShort(line: WhatMovesLine): string {
  if (line.cause.kind === "TRAINED") return "Trained or not";
  if (line.cause.kind === "WORK") return "Work day or day off";
  return `${line.cause.name.charAt(0).toUpperCase()}${line.cause.name.slice(1)}, done or not`;
}
function amount(line: WhatMovesLine): string {
  const d = Math.abs(line.diff);
  if (line.measure === "SLEEP") { const m = Math.max(5, Math.round(d / 5) * 5); return m < 60 ? `${m} min` : hoursMinutes(m); }
  if (line.measure === "ENERGY") return `${(Math.round(d * 10) / 10).toFixed(1)} of 5`;
  return `${Math.round(d)} bpm`;
}
const days = (l: WhatMovesLine) => `${l.nWith} days against ${l.nWithout}`;

/** "After a day you trained, you slept about 40m more (12 days against 9)." */
export function describeWhatMovesLine(line: WhatMovesLine): string {
  const more = line.diff > 0;
  if (line.verdict === "up" || line.verdict === "down") {
    const what = line.measure === "SLEEP" ? `you slept about ${amount(line)} ${more ? "more" : "less"}`
      : line.measure === "ENERGY" ? `your energy was about ${amount(line)} ${more ? "higher" : "lower"}`
        : `your resting heart rate was about ${amount(line)} ${more ? "higher" : "lower"}`;
    return `${causeLead(line)}, ${what} (${days(line)}).`;
  }
  if (line.verdict === "same") return `${causeShort(line)}: ${MEASURE_NAME[line.measure].toLowerCase()} was about the same either way (${line.nWith} against ${line.nWithout}).`;
  return `${causeShort(line)} and ${MEASURE_NAME[line.measure].toLowerCase()} (${line.nWith} against ${line.nWithout})`;
}

export function WhatMovesSection({ active }: { active: boolean }) {
  const [pref, setPref] = useState<WhatMovesPreference>(getWhatMovesPreference);
  const [data, setData] = useState<WhatMoves | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async (p: WhatMovesPreference) => {
    try { setData(await getWhatMoves(new Date(), p.window, p.hidden)); setFailed(false); } catch { setFailed(true); }
  }, []);
  useEffect(() => { if (active) void load(pref); }, [active, pref, load]);
  const update = (next: WhatMovesPreference) => { setWhatMovesPreference(next); setPref(next); };
  const hide = (id: string) => update({ ...pref, hidden: [...pref.hidden, id] });
  const show = (id: string) => update({ ...pref, hidden: pref.hidden.filter((h) => h !== id) });

  const windowPicker = <div className="what-moves__windows" role="group" aria-label="How far back">
    {WINDOWS.map((w) => <button key={String(w.value)} type="button" className="btn-secondary" aria-pressed={pref.window === w.value}
      onClick={() => update({ ...pref, window: w.value })}>{w.label}</button>)}
  </div>;

  if (failed) return <section className="what-moves" aria-label="What moves your numbers">{windowPicker}
    <p className="meta" role="alert">What moves your numbers couldn't be read; nothing changed.</p></section>;
  if (!data) return <section className="what-moves" aria-label="What moves your numbers" aria-busy="true">{windowPicker}<p className="meta">Reading your days…</p></section>;
  const empty = !data.clear.length && !data.same.length && !data.unsure.length;
  const row = (line: WhatMovesLine, text: string) => <li key={line.id} className="what-moves__line" data-line={line.id} data-verdict={line.verdict}>
    <p className="what-moves__text">{text}</p>
    <button type="button" className="btn-secondary what-moves__hide" aria-label={`Hide: ${text}`} onClick={() => hide(line.id)}>HIDE</button>
  </li>;

  return <section className="what-moves" aria-label="What moves your numbers" data-what-moves>
    {windowPicker}
    {empty && <p className="meta">Not enough days yet. This fills in as you log.</p>}
    {(data.clear.length > 0 || data.same.length > 0) && <ul className="what-moves__list">
      {data.clear.map((l) => row(l, describeWhatMovesLine(l)))}
      {data.same.map((l) => row(l, describeWhatMovesLine(l)))}
    </ul>}
    {data.unsure.length > 0 && <details className="what-moves__fold">
      <summary>Can't tell yet: {data.unsure.length} {data.unsure.length === 1 ? "comparison" : "comparisons"}</summary>
      <ul className="what-moves__list">{data.unsure.map((l) => row(l, describeWhatMovesLine(l)))}</ul>
    </details>}
    {data.hidden.length > 0 && <details className="what-moves__fold">
      <summary>Hidden ({data.hidden.length})</summary>
      <ul className="what-moves__list">{data.hidden.map((l) => {
        const text = describeWhatMovesLine(l);
        return <li key={l.id} className="what-moves__line" data-hidden-line={l.id}>
          <p className="what-moves__text">{text}</p>
          <button type="button" className="btn-secondary what-moves__hide" aria-label={`Bring back: ${text}`} onClick={() => show(l.id)}>BRING BACK</button>
        </li>;
      })}</ul>
    </details>}
    <p className="meta">Each habit compares days you did it with days you didn't (days with no answer count on neither side), against the next lived day. A line needs 5 days on each side with that number recorded. These line up in your records; they don't prove a cause. Nothing here changes advice.</p>
  </section>;
}
