import { useEffect, useState } from "react";
import { getTrainProgress } from "../../../application/trainProgressQueries";
import type { TrainProgress as Progress, EvidenceClass } from "../../../application/trainProgress";
import { Activity, Compass, Dumbbell, Target } from "lucide-react";
import { Panel } from "../../foundation/primitives";
import "../../foundation/foundation.css";

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
  if (data === null) return <section className="train-progress" aria-label="Progress" aria-busy="true"><p className="train-progress__note">Reading your training…</p></section>;
  if (data === "ERROR") return <section className="train-progress" aria-label="Progress"><p role="alert" className="train-progress__note">Progress couldn't be read. Your records are unchanged.</p></section>;
  const { assessment: a, where, standards, lifts, bodyweight } = data;
  const forms = (Object.entries(where.byForm) as [string, number][]).map(([form, n]) => `${form} ${n}`).join(" · ");
  const next = where.next.kind === "KNOWN" ? `Next in your A → B → C: ${where.next.label}.` : where.next.kind === "UNKNOWN" ? `Next in your A → B → C is unknown: ${where.next.why}` : "No A → B → C sequence active.";
  // C9.2 (TRAIN finish 3): the Orientation grammar: framed panels, mono keys, one rule between rows, tokens only.
  return <section className="train-progress" aria-label="Progress">
    <Panel headingId="train-progress-verdict" headingLevel={2} icon={<Activity size={18} />} label="PROGRESS & DIRECTION" wide
      source={<span className={`train-progress__tag train-progress__tag--${a.state === "WORKING" ? "ok" : a.state === "UNCERTAIN" ? "quiet" : "look"}`}>{a.confidence} CONFIDENCE</span>}>
      <h3 className="train-progress__state" data-assessment={a.state}>{a.state}</h3>
      <p className="train-progress__verdict">{a.verdict}</p>
      <p className="train-progress__note">Nothing here changes your plan.</p>
      <details className="train-progress__why">
        <summary>WHY?</summary>
        <div className="train-progress__rows">{a.why.map((w) => <p key={w} className="train-progress__row">{w}</p>)}</div>
        {a.missing.length > 0 && <p className="train-progress__note">Still needed before a firmer verdict: {a.missing.join("; ")}.</p>}
        <p className="train-progress__note">Lift direction compares the last 4 weeks with the 4 before. It describes recorded sets; it can't measure muscle.</p>
      </details>
    </Panel>
    <Panel headingId="train-progress-where" icon={<Compass size={18} />} label="WHERE YOU ARE" wide>
      <div className="train-progress__rows">
        <p className="train-progress__row" data-next={where.next.kind}>{next} {where.sessions28} finished {where.sessions28 === 1 ? "session" : "sessions"} in the last 4 weeks{forms ? ` (${forms})` : ""}.</p>
        <p className="train-progress__row" data-per-week><span className="train-progress__key">BY WEEK</span> oldest first: {where.perWeek.join(" · ")}</p>
        <p className="train-progress__row"><span className="train-progress__key">THIS BLOCK</span> No emphasis block set. Emphasis blocks come later, with your confirmation.</p>
      </div>
    </Panel>
    <Panel headingId="train-progress-standards" icon={<Target size={18} />} label="STANDARDS" wide>
      <div className="train-progress__rows">{standards.map((x) => <div key={x.name} className="train-progress__row">
        <p className="train-progress__name">{x.name} <span className={`train-progress__tag${x.evidence === "UNKNOWN" ? " train-progress__tag--quiet" : ""}`}>{EVIDENCE[x.evidence]}</span></p>
        <p className="train-progress__text">{x.text}</p></div>)}</div>
    </Panel>
    <Panel headingId="train-progress-strength" icon={<Dumbbell size={18} />} label="STRENGTH" wide>
      <div className="train-progress__rows">
        {lifts.length ? lifts.map((l) => <div key={l.name} className="train-progress__row">
          <p className="train-progress__name">{l.name} <span className="train-progress__tag">{l.status}</span></p>
          <p className="train-progress__text">{l.text}</p></div>)
          : <p className="train-progress__row">No lift has sessions in both of the last two 4-week periods yet.</p>}
        <div className="train-progress__row">
          <p className="train-progress__name">Bodyweight <span className={`train-progress__tag${bodyweight.evidence === "UNKNOWN" ? " train-progress__tag--quiet" : ""}`}>{EVIDENCE[bodyweight.evidence]}</span></p>
          <p className="train-progress__text">{bodyweight.text}</p></div>
      </div>
    </Panel>
  </section>;
}
