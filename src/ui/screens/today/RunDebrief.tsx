import { useEffect, useState } from "react";
import type { DecisionJournalEntry } from "../../../domain/journal/types";
import { getPostRunReport, type PostRunReport } from "../../../application/postRunReport";
import {
  RUN_NEXT_MAX, SHIFT_FELT, changeRunDebriefFelt, getRunDebrief, isRunDebriefSkipped, recordRunDebrief, restoreRunDebrief,
  runDebriefContext, runFeltLine, setRunDebriefNext, skipRunDebrief, type ShiftFelt,
} from "../../../application/reflect";
import { FIX_UNDO_MS, useUndoWindow } from "../../hooks/useUndoWindow";
import "./reflect.css";

/**
 * GRAYSON-RUN-DEBRIEF-001 (C2.5): inside RUN OVER, between the post-run report and the recovery contract. "How did the
 * run go?" One tap saves a journal entry; then "One thing for next run (optional)". Afterwards one line with CHANGE,
 * where a fix to the word or the line shows the shared 8 s Undo. NOT NOW hides it for this run. Never asks about calls
 * or people at work. Reads once when shown; with no post-run report it shows nothing.
 */
const NEXT_PREFIX = "Next run: ";
const SAVE_FAILED = "That didn't save. Nothing changed.";
type Step = "ASK" | "NEXT" | "SAVED" | "CHANGE";
interface Read { report: PostRunReport; entry: DecisionJournalEntry | undefined }

const feltOf = (entry: DecisionJournalEntry) => SHIFT_FELT.find((f) => entry.decision === runFeltLine(f));
const nextOf = (entry: DecisionJournalEntry) => (entry.expectation?.startsWith(NEXT_PREFIX) ? entry.expectation.slice(NEXT_PREFIX.length) : entry.expectation ?? "");

export function RunDebrief({ busy, readReport = getPostRunReport }: { busy: boolean; readReport?: typeof getPostRunReport }) {
  const [read, setRead] = useState<Read | null | undefined>(undefined);
  const [step, setStep] = useState<Step>("ASK");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useUndoWindow<{ decision: string; expectation?: string }>(FIX_UNDO_MS);

  useEffect(() => {
    let live = true;
    void (async () => {
      const report = await readReport();
      if (!report || isRunDebriefSkipped(report.to)) return live && setRead(null);
      const entry = await getRunDebrief(report.to);
      if (!live) return;
      setRead({ report, entry });
      if (entry) setStep("SAVED");
    })().catch(() => live && setRead(null));
    return () => { live = false; };
  }, [readReport]);

  if (!read) return null;
  const { report, entry } = read;
  const off = busy || saving;
  const run = async (work: () => Promise<DecisionJournalEntry>, after: (saved: DecisionJournalEntry) => void) => {
    setSaving(true); setError(null);
    try { const saved = await work(); setRead({ report, entry: saved }); after(saved); }
    catch { setError(SAVE_FAILED); }
    finally { setSaving(false); }
  };
  const errorLine = error && <p className="meta" role="alert">{error}</p>;
  const context = <p className="meta" style={{ margin: "2px 0 4px" }}>{runDebriefContext({ from: report.from, to: report.to, shifts: report.shifts })}. Only you see this.</p>;

  if (!entry) {
    return (
      <section className="today-run-debrief" aria-label="Run debrief">
        <p className="meta-strong today-run-debrief__title">How did the run go?</p>
        {context}
        <div className="reflect-chips" role="group" aria-label="How did the run go?">
          {SHIFT_FELT.map((felt) => (
            <button key={felt} type="button" className="chip" disabled={off}
              onClick={() => void run(() => recordRunDebrief({ felt, run: report }), () => { setDraft(""); setStep("NEXT"); })}>{felt}</button>
          ))}
        </div>
        <div className="today-run-debrief__row">
          <button type="button" className="btn-secondary" disabled={off} onClick={() => { skipRunDebrief(report.to); setRead(null); }}>NOT NOW</button>
        </div>
        {errorLine}
      </section>
    );
  }

  const felt = feltOf(entry);
  const line = nextOf(entry);
  const savedLine = <p className="meta-strong today-run-debrief__title" role="status">{entry.decision}{step === "NEXT" ? ". Saved." : ""}</p>;
  const nextField = (label: string) => (
    <label className="today-run-debrief__field">
      <span className="meta">{label}</span>
      <input type="text" className="input" value={draft} maxLength={RUN_NEXT_MAX} placeholder="Bed by 9 on night one" disabled={off}
        onChange={(e) => setDraft(e.target.value)} />
    </label>
  );

  if (step === "NEXT") {
    return (
      <section className="today-run-debrief" aria-label="Run debrief">
        {savedLine}
        {nextField("One thing for next run (optional)")}
        <div className="today-run-debrief__row">
          <button type="button" className="btn-secondary" disabled={off || !draft.trim()}
            onClick={() => void run(() => setRunDebriefNext(entry.id, draft), () => setStep("SAVED"))}>SAVE</button>
          <button type="button" className="btn-secondary" disabled={off} onClick={() => setStep("SAVED")}>DONE</button>
        </div>
        {errorLine}
      </section>
    );
  }

  const undoRow = undo && (
    <div className="today-run-debrief__row" role="status">
      <span className="meta">Changed.</span>
      <button type="button" className="btn-secondary" disabled={off}
        onClick={() => { const before = undo; setUndo(null); void run(() => restoreRunDebrief(entry.id, before), () => {}); }}>UNDO</button>
    </div>
  );

  if (step === "CHANGE") {
    const before = { decision: entry.decision, ...(entry.expectation ? { expectation: entry.expectation } : {}) };
    return (
      <section className="today-run-debrief" aria-label="Run debrief">
        <p className="meta-strong today-run-debrief__title">How did the run go?</p>
        {context}
        <div className="reflect-chips" role="group" aria-label="How did the run go?">
          {SHIFT_FELT.map((f) => (
            <button key={f} type="button" className={`chip ${f === felt ? "chip--selected" : ""}`} aria-pressed={f === felt} disabled={off}
              onClick={() => { if (f !== felt) void run(() => changeRunDebriefFelt(entry.id, f as ShiftFelt), () => setUndo(before)); }}>{f}</button>
          ))}
        </div>
        {nextField("One thing for next run (optional)")}
        {/* #726 review: the journal can't clear a field, so say why SAVE LINE is off with the field emptied. */}
        {line && !draft.trim() && <p className="meta" style={{ margin: "4px 0 0" }}>A saved line can be changed, not cleared.</p>}
        <div className="today-run-debrief__row">
          <button type="button" className="btn-secondary" disabled={off || !draft.trim() || draft.trim() === line}
            // A first line is a new log (quiet); changing an existing line is a fix (Undo).
            onClick={() => void run(() => setRunDebriefNext(entry.id, draft), () => { if (line) setUndo(before); })}>SAVE LINE</button>
          <button type="button" className="btn-secondary" disabled={off} onClick={() => setStep("SAVED")}>DONE</button>
        </div>
        {undoRow}
        {errorLine}
      </section>
    );
  }

  return (
    <section className="today-run-debrief" aria-label="Run debrief">
      <div className="today-run-debrief__row">
        <p className="meta-strong today-run-debrief__title">{entry.decision}</p>
        <button type="button" className="btn-secondary" aria-label="Change the run debrief" disabled={off}
          onClick={() => { setDraft(line); setError(null); setStep("CHANGE"); }}>CHANGE</button>
      </div>
      {line && <p className="meta" style={{ margin: 0 }}>Next run: {line}</p>}
      {undoRow}
      {errorLine}
    </section>
  );
}
