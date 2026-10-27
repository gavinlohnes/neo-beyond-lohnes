import { useId, useState } from "react";
import type { DecisionJournalEntry } from "../../../domain/journal/types";
import { SHIFT_BECAUSE, SHIFT_FELT, getShiftDebriefFor, recordShiftDebrief, type ShiftFelt } from "../../../application/reflect";
import { describeError } from "../../errorMessage";
import "./reflect.css";

/**
 * LOOP step 2 — REFLECT: the 30-second shift debrief, closed by default in the post-shift row.
 * How it felt, what mostly made it so, and one thing for next shift — saved as a journal entry,
 * which asks next lived day whether the one thing happened. One per lived day; never advice input.
 * Nothing but the summary renders until it is opened.
 */
export function ShiftDebrief() {
  const uid = useId();
  const [saved, setSaved] = useState<DecisionJournalEntry | null | undefined>(undefined);
  const [felt, setFelt] = useState<ShiftFelt | null>(null);
  const [because, setBecause] = useState<string[]>([]);
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Read only when opened, so the post-shift row never changes under you while it draws.
  function onToggle(open: boolean) {
    if (open && saved === undefined) void getShiftDebriefFor().then((entry) => setSaved(entry ?? null), () => setSaved(null));
  }

  async function save() {
    if (!felt || busy) return;
    setBusy(true); setError("");
    try { setSaved(await recordShiftDebrief({ felt, because, next })); }
    catch (cause) { setError(describeError(cause, "Could not save the debrief.")); }
    finally { setBusy(false); }
  }

  const toggle = (item: string) => setBecause((list) => list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  return <details className="reflect" data-debrief onToggle={(e) => onToggle(e.currentTarget.open)}>
    <summary>30-second shift debrief</summary>
    {saved ? <p className="meta" data-debrief-saved>Shift debrief saved: {saved.decision.toLowerCase()}.{saved.expectation ? ` ${saved.expectation}.` : ""}</p> : saved === null && <>
    <p className="meta" id={`${uid}-felt`}>How was the shift?</p>
    <div className="reflect-chips" role="group" aria-labelledby={`${uid}-felt`}>
      {SHIFT_FELT.map((f) => <button key={f} type="button" className={`chip ${felt === f ? "chip--selected" : ""}`} aria-pressed={felt === f} disabled={busy} onClick={() => setFelt(f)}>{f}</button>)}
    </div>
    <p className="meta" id={`${uid}-because`}>Mostly because of… Optional, pick any.</p>
    <div className="reflect-chips" role="group" aria-labelledby={`${uid}-because`}>
      {SHIFT_BECAUSE.map((b) => <button key={b} type="button" className={`chip ${because.includes(b) ? "chip--selected" : ""}`} aria-pressed={because.includes(b)} disabled={busy} onClick={() => toggle(b)}>{b}</button>)}
    </div>
    <label className="meta" htmlFor={`${uid}-next`}>One thing for next shift? Optional.</label>
    <input id={`${uid}-next`} className="input" value={next} maxLength={140} onChange={(e) => setNext(e.target.value)} />
    <button type="button" className="btn-secondary" disabled={busy || !felt} onClick={() => void save()}>SAVE DEBRIEF</button>
    {error && <p role="alert" className="meta">{error}</p>}
    </>}
  </details>;
}
