import { useEffect, useRef, useState } from "react";
import { describeTonightReading, getCaveTonight, type CaveTonight, type SinceFact } from "../../../application/caveTonight";
import type { CaveVitalId } from "../../../application/caveVitals";
import type { RecommendationDecision } from "../../../application/queries";
import { describeError } from "../../errorMessage";
import { describePlainRecommendationTitle, describeRecommendationReason, explainRecommendation } from "../today/recommendationCopy";

/**
 * SUIT-ALIVE S3 — the cave, Tonight. The call exactly as the Engine made it, with its reasoning read
 * from its own trace; which readings sit furthest outside your own usual range; and what's overdue.
 * Read-only. The order is distance from your normal, never a score, and no number for it is shown.
 */
const NAMES: Record<CaveVitalId, string> = { sleep: "SLEEP", energy: "ENERGY", protein: "PROTEIN", water: "WATER", resting: "RESTING HR", steps: "STEPS" };
const DECISION: Record<RecommendationDecision, string> = {
  ACCEPTED: "You said you'd do this.",
  DECLINED: "You said not now.",
  NO_ACTION_RECORDED: "Seen.",
};
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const due = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function CaveTonightView({ onOpenVital, onOpenNormal, onInspectDay }: {
  onOpenVital: (id: CaveVitalId) => void;
  /** CAVE-DATA D4: "What's normal for me?" opens VITALS. */
  onOpenNormal?: (() => void) | undefined;
  /** CAVE-DATA D4: a "since last shift" line opens the day it came from in DATA. */
  onInspectDay?: ((dayId: string) => void) | undefined;
}) {
  const [tonight, setTonight] = useState<CaveTonight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);

  async function load() {
    const request = ++sequence.current;
    setError(null);
    try {
      const t = await getCaveTonight();
      if (request === sequence.current) setTonight(t);
    } catch (e) {
      if (request === sequence.current) setError(describeError(e, "Could not read tonight."));
    }
  }
  useEffect(() => { void load(); }, []);

  if (error) return <div role="alert"><p className="meta meta--error">{error} The reading is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void load()}>RETRY</button></div>;
  if (!tonight) return <p className="meta" role="status">Reading…</p>;
  const rec = tonight.recommendation;
  const steady = tonight.steady.map((r) => NAMES[r.id].toLowerCase());
  const learning = tonight.learning.map((l) => `${NAMES[l.id].toLowerCase()} (${l.days} of ${l.need} days)`);

  const since = tonight.since;
  const openFact = (f: SinceFact) => f.key === "SLEEP" ? () => onOpenVital("sleep") : f.dayId && onInspectDay ? () => onInspectDay(f.dayId!) : undefined;
  const whyThis = () => {
    const heading = document.getElementById("tonight-call");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); heading.scrollIntoView({ block: "start" }); }
  };

  return <>
    {since && <section className="cave__block" aria-labelledby="tonight-since">
      <h3 id="tonight-since" className="cave__cap">Since last shift</h3>
      <ul className="cave__since">{since.map((f) => { const open = openFact(f); return (
        <li key={f.key}>{open
          ? <button type="button" onClick={open} aria-label={`${f.text} ${f.why} Open ${f.key === "SLEEP" ? "sleep in vitals" : "that day's records"}.`}><span aria-hidden="true">{f.text}</span><small aria-hidden="true">{f.why}</small></button>
          : <p><span>{f.text}</span><small>{f.why}</small></p>}</li>
      ); })}</ul>
      <div className="cave__asks" role="group" aria-label="Questions">
        {rec && <button type="button" className="chip" onClick={whyThis}>WHY THIS?</button>}
        {onOpenNormal && <button type="button" className="chip" onClick={onOpenNormal}>WHAT'S NORMAL FOR ME?</button>}
      </div>
      <p className="meta">Facts from your records against your own usual. Nothing here is a score or a call.</p>
    </section>}
    <section className="cave__block" aria-labelledby="tonight-call">
      <h3 id="tonight-call" className="cave__cap">The call{rec ? ` · ${clock(rec.trace.evaluatedAt)}` : ""}</h3>
      {rec ? <>
        <p className="cave__call">{describePlainRecommendationTitle(rec.kind, rec.title)}</p>
        <p className="cave__sum">{describeRecommendationReason(rec.rationale)}</p>
        <p className="meta">{tonight.decision ? DECISION[tonight.decision] : "Not answered yet. Answer it on TODAY."}</p>
        <div className="cave__trace">{explainRecommendation(rec, tonight.checkIn).map((line) => <p key={line}>{line}</p>)}</div>
        <p className="cave__axis-line">ENGINE {rec.trace.engineVersion} · EVALUATED {clock(rec.trace.evaluatedAt)}</p>
      </> : <p className="cave__sum">No call yet today. It comes with the day on TODAY.</p>}
    </section>
    <section className="cave__block" aria-labelledby="tonight-off">
      <h3 id="tonight-off" className="cave__cap">Furthest from your normal</h3>
      {tonight.off.length ? <ol className="cave__glance">{tonight.off.map((r, i) => (
        <li key={r.id}><button type="button" onClick={() => onOpenVital(r.id)} aria-label={`${i + 1}. ${describeTonightReading(r)} Open ${NAMES[r.id].toLowerCase()} in vitals.`}>
          <span className="cave__rank" aria-hidden="true">{i + 1}</span>
          <span className="cave__gt" aria-hidden="true">{NAMES[r.id]}</span>
          <span className="cave__gm" aria-hidden="true">{describeTonightReading(r)}</span>
        </button></li>
      ))}</ol> : <p className="cave__sum">{tonight.steady.length ? "Nothing is outside your normal." : "Nothing to judge yet."}</p>}
      {steady.length > 0 && <p className="meta">Holding steady: {steady.join(", ")}.</p>}
      {learning.length > 0 && <p className="meta">Still learning: {learning.join(", ")}.</p>}
      <p className="meta">Ordered by how far each reading sits outside your own usual range. Not a score. Today's protein and water are judged against your usual by this hour, or the last full day until that's known.</p>
    </section>
    {tonight.late.length > 0 && <section className="cave__block" aria-labelledby="tonight-late">
      <h3 id="tonight-late" className="cave__cap cave__cap--late">Overdue</h3>
      <ul className="cave__facts">{tonight.late.map((l) => <li key={l.id}>{l.title} · due {due(l.dueAt)}</li>)}</ul>
    </section>}
  </>;
}
