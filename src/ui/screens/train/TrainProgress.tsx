import { useEffect, useState } from "react";
import { getTrainProgress } from "../../../application/trainProgressQueries";
import type { TrainProgress as Progress, EvidenceClass } from "../../../application/trainProgress";
import "../../components/section.css";

const EVIDENCE: Record<EvidenceClass, string> = { OBSERVED: "RECORDED", ESTIMATE: "ESTIMATE", PROXY: "PROXY", UNKNOWN: "NOT YET KNOWN" };

/**
 * GRAYSON-TRAIN-PROGRESS-001: TRAIN → PROGRESS. Read only, in the design's phone order: the verdict, where you are,
 * the standards, strength, and consistency, with WHY on demand. Nothing here changes your plan.
 */
export function TrainProgress({ active }: { active: boolean }) {
  const [data, setData] = useState<Progress | null | "ERROR">(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void getTrainProgress().then((d) => { if (live) setData(d); }, () => { if (live) setData("ERROR"); });
    return () => { live = false; };
  }, [active]);
  if (data === null) return <section className="suit-panel bx-section" aria-label="Progress" aria-busy="true"><p className="suit-panel__loading">Reading your training…</p></section>;
  if (data === "ERROR") return <section className="suit-panel bx-section" aria-label="Progress"><p role="alert">Progress couldn't be read. Your records are unchanged.</p></section>;
  const { assessment: a, where, standards, lifts, bodyweight } = data;
  const forms = (Object.entries(where.byForm) as [string, number][]).map(([form, n]) => `${form} ${n}`).join(" · ");
  return <section className="suit-panel bx-section train-progress" aria-label="Progress">
    <header className="bx-head"><div><p className="bx-eyebrow">PROGRESS &amp; DIRECTION</p><h2 className="bx-title" data-assessment={a.state}>{a.state}</h2></div></header>
    <p className="train-progress__verdict">{a.verdict}</p>
    <p className="meta">Confidence: {a.confidence.toLowerCase()}. Nothing here changes your plan.</p>

    <h3 className="train-progress__h">WHERE YOU ARE</h3>
    <p className="meta">{where.next ? `Next in your A → B → C: ${where.next}.` : "No A → B → C sequence active."} {where.sessions28} finished {where.sessions28 === 1 ? "session" : "sessions"} in the last 4 weeks{forms ? ` (${forms})` : ""}.</p>
    <p className="meta" data-per-week>By week, oldest first: {where.perWeek.join(" · ")}</p>

    <h3 className="train-progress__h">THIS BLOCK</h3>
    <p className="meta">No emphasis block set. Emphasis blocks come later, with your confirmation.</p>

    <h3 className="train-progress__h">STANDARDS</h3>
    <ul className="train-progress__list">{standards.map((s) => <li key={s.name}><b>{s.name}</b> <span className="bf-src">{EVIDENCE[s.evidence]}</span><br /><span className="meta">{s.text}</span></li>)}</ul>

    <h3 className="train-progress__h">STRENGTH</h3>
    {lifts.length ? <ul className="train-progress__list">{lifts.map((l) => <li key={l.name}><b>{l.name}</b> <span className="bf-src">{l.status}</span><br /><span className="meta">{l.text}</span></li>)}</ul>
      : <p className="meta">No lift has sessions in both of the last two 4-week periods yet.</p>}
    <p className="meta">Bodyweight <span className="bf-src">{EVIDENCE[bodyweight.evidence]}</span> {bodyweight.text}</p>

    <details className="train-progress__why">
      <summary>WHY?</summary>
      <ul className="train-progress__list">{a.why.map((w) => <li key={w} className="meta">{w}</li>)}</ul>
      {a.missing.length > 0 && <p className="meta">Still needed before a firmer verdict: {a.missing.join("; ")}.</p>}
      <p className="meta">Lift direction compares the last 4 weeks with the 4 before. It describes recorded sets; it can't measure muscle.</p>
    </details>
  </section>;
}
