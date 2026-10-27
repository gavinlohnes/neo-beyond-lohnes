import { useEffect, useId, useState } from "react";
import type { DecisionJournalEntry } from "../../../domain/journal/types";
import type { PictureRow } from "../../../application/wholePictureProjection";
import { getWholePicture } from "../../../application/wholePictureQueries";
import {
  TRY_LENGTHS, TRY_OUTCOMES, TRY_SCOPES, closeExperiment, experimentDay, experimentResult, readExperiment, startExperiment,
  type Experiment, type TryScope,
} from "../../../application/tryExperiment";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { describeError } from "../../errorMessage";
import "../today/reflect.css";

/**
 * LOOP step 3 — TRY: start a bounded personal experiment, watch it run, then compare its days with
 * your usual days of the same kind and close it with a lesson. Experiments are journal entries
 * (application/tryExperiment.ts); this reads the Journal's own loaded list, and reads the Whole
 * Picture only when there is an experiment to compare.
 */
export function Experiments({ entries, onChanged }: { entries: readonly DecisionJournalEntry[]; onChanged: () => void }) {
  const experiments = entries.map(readExperiment).filter((e): e is Experiment => e !== null && e.entry.status === "OPEN");
  const [rows, setRows] = useState<PictureRow[] | null | "error">(null);
  const any = experiments.length > 0;
  useEffect(() => {
    if (!any || rows !== null) return;
    let live = true;
    void getWholePicture().then((data) => { if (live) setRows(data.rows); }, () => { if (live) setRows("error"); });
    return () => { live = false; };
  }, [any, rows]);

  return <section className="follow-ups" aria-labelledby="experiments-heading" data-experiments>
    <h2 id="experiments-heading" className="section-label">Experiments</h2>
    {experiments.map((e) => <ExperimentCard key={e.entry.id} experiment={e} rows={rows} onClosed={onChanged} />)}
    <StartExperiment onStarted={() => { setRows(null); onChanged(); }} />
  </section>;
}

function StartExperiment({ onStarted }: { onStarted: () => void }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState("");
  const [days, setDays] = useState<number>(14);
  const [scope, setScope] = useState<TryScope>("WORK");
  const [expect, setExpect] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    if (!what.trim() || busy) return;
    setBusy(true); setError("");
    try { await startExperiment({ what, days, scope, expect }); setWhat(""); setExpect(""); setOpen(false); onStarted(); }
    catch (cause) { setError(describeError(cause, "Could not start the experiment.")); }
    finally { setBusy(false); }
  }
  return <FieldDisclosure summary="TRY SOMETHING" open={open} onToggle={setOpen}>
    <div className="reflect">
      <p className="meta">One change, for a set time. BEYOND compares those days with your usual ones. It never changes advice.</p>
      <label className="meta" htmlFor={`${uid}-what`}>What will you try?</label>
      <input id={`${uid}-what`} className="input" value={what} maxLength={80} placeholder="Nap 40 min before night 1" onChange={(e) => setWhat(e.target.value)} />
      <p className="meta" id={`${uid}-days`}>For how long, starting today?</p>
      <div className="reflect-chips" role="group" aria-labelledby={`${uid}-days`}>
        {TRY_LENGTHS.map((n) => <button key={n} type="button" className={`chip ${days === n ? "chip--selected" : ""}`} aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</button>)}
      </div>
      <p className="meta" id={`${uid}-scope`}>On which days?</p>
      <div className="reflect-chips" role="group" aria-labelledby={`${uid}-scope`}>
        {TRY_SCOPES.map((s) => <button key={s.id} type="button" className={`chip ${scope === s.id ? "chip--selected" : ""}`} aria-pressed={scope === s.id} onClick={() => setScope(s.id)}>{s.label}</button>)}
      </div>
      <label className="meta" htmlFor={`${uid}-expect`}>What do you expect? Optional.</label>
      <input id={`${uid}-expect`} className="input" value={expect} maxLength={140} onChange={(e) => setExpect(e.target.value)} />
      <button type="button" className="btn-secondary" disabled={busy || !what.trim()} onClick={() => void start()}>START EXPERIMENT</button>
      {error && <p role="alert" className="meta">{error}</p>}
    </div>
  </FieldDisclosure>;
}

function ExperimentCard({ experiment: e, rows, onClosed }: { experiment: Experiment; rows: PictureRow[] | null | "error"; onClosed: () => void }) {
  const uid = useId();
  const now = new Date();
  const ended = now >= e.to;
  const [outcome, setOutcome] = useState<string | null>(null);
  const [lesson, setLesson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const result = Array.isArray(rows) ? experimentResult(e, rows) : null;
  const span = `${e.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(e.to.getTime() - 86_400_000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  async function close() {
    if (!outcome || busy) return;
    setBusy(true); setError("");
    try { await closeExperiment(e.entry.id, outcome, lesson); onClosed(); }
    catch (cause) { setError(describeError(cause, "Could not close the experiment.")); setBusy(false); }
  }
  return <div className="follow-up reflect" data-experiment={e.entry.id}>
    <p className="card-title">{e.what}</p>
    <p className="meta">{ended ? `Ended · ${span}` : `Day ${Math.min(experimentDay(e, now), e.days)} of ${e.days} · ${span}`} · {TRY_SCOPES.find((s) => s.id === e.scope)!.label.toLowerCase()}</p>
    {e.entry.expectation && <p className="meta">You expected: {e.entry.expectation}</p>}
    {rows === "error" && <p className="meta">The comparison is unavailable right now, not empty.</p>}
    {result && <>
      <p className="meta">{ended ? "Result" : "So far"}, from your recorded days. A pattern, not proof:</p>
      {result.enough ? <ul>{result.lines.map((line) => <li key={line.text} className="meta">{line.text}</li>)}</ul>
        : <p className="meta" data-try-not-yet>Not enough recorded yet: this needs {result.need}.</p>}
    </>}
    {ended && <>
      <div className="reflect-chips" role="group" aria-label="How did the experiment go?">
        {TRY_OUTCOMES.map((o) => <button key={o} type="button" className={`chip ${outcome === o ? "chip--selected" : ""}`} aria-pressed={outcome === o} disabled={busy} onClick={() => setOutcome(o)}>{o}</button>)}
      </div>
      {outcome && <>
        <label className="meta" htmlFor={`${uid}-lesson`}>Lesson for next time? Optional.</label>
        <input id={`${uid}-lesson`} className="input" value={lesson} maxLength={280} onChange={(ev) => setLesson(ev.target.value)} />
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void close()}>CLOSE EXPERIMENT</button>
      </>}
    </>}
    {error && <p role="alert" className="meta">{error}</p>}
  </div>;
}
