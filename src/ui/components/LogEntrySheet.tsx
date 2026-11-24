import { useEffect, useRef, useState } from "react";
import { correctLogEntry, getDayLogEntry, removeLogEntry, type DayLogEntry } from "../../application/logEntries";
import { LogSheet } from "./LogSheet";
import { LogTimeEditor } from "./LogTimeEditor";
import { describeError } from "../errorMessage";
import { captureCommitFeedback } from "../feel/feedback";
import { putBackLogEntry } from "../../application/logVoidCommands";
import { FIX_UNDO_MS, useUndoWindow } from "../hooks/useUndoWindow";

/**
 * TIMELINE-EDIT-001 (Gavin, 2026-11-15: "Approved."): one logged meal, water or protein entry, opened from TODAY's
 * timeline or the food diary, with the fixes the app already had: CHANGE TIME, EDIT AMOUNT and REMOVE. Each writes the
 * existing append-only fact, so HISTORY keeps the original beside the change.
 * GRAYSON-FIX-UNDO-001 (Gavin, 2026-11-24 02:02 CT): REMOVE acts on one tap, with no "Remove …?" step, and a removal
 * or an amount fix shows UNDO for FIX_UNDO_MS. UNDO after a removal puts the entry back (LOG_VOID_UNDONE); UNDO after
 * a fix saves the amount from before it as one more correction in the same chain.
 */
export interface LogEntryTarget { beyondDayId: string; rootEventId: string }
const r = (n: number | undefined) => Math.round((n ?? 0) * 10) / 10;

function describeAmount(e: DayLogEntry): string {
  if (e.kind === "WATER") return `${r(e.oz)} oz`;
  if (e.kind === "PROTEIN") return `${r(e.grams)} g protein`;
  return `${Math.round(e.calories ?? 0).toLocaleString("en-US")} kcal · ${r(e.proteinG)} g protein · ${r(e.carbsG)} g carbs · ${r(e.fatG)} g fat`;
}
const FIELDS = { MEAL: [["calories", "Calories (kcal)"], ["proteinG", "Protein (g)"], ["carbsG", "Carbs (g)"], ["fatG", "Fat (g)"]], WATER: [["oz", "Water (oz)"]], PROTEIN: [["grams", "Protein (g)"]] } as const;
type Field = (typeof FIELDS)[keyof typeof FIELDS][number][0];

export function LogEntrySheet({ target, onClose, onChanged }: { target: LogEntryTarget | null; onClose: () => void; onChanged: () => void | Promise<void> }) {
  const [entry, setEntry] = useState<DayLogEntry | null | "MISSING" | "ERROR">(null);
  const [mode, setMode] = useState<"VIEW" | "AMOUNT" | "REMOVED">("VIEW");
  const [undo, setUndo] = useUndoWindow<{ kind: "REMOVED" } | { kind: "FIXED"; before: Record<string, number> }>(FIX_UNDO_MS);
  const [values, setValues] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  // The REMOVE button leaves with the entry, so keyboard focus moves to UNDO rather than falling to the page.
  const undoRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const load = async (t: LogEntryTarget) => {
    try { setEntry((await getDayLogEntry(t.beyondDayId, t.rootEventId)) ?? "MISSING"); } catch { setEntry("ERROR"); }
  };
  useEffect(() => {
    setEntry(null); setMode("VIEW"); setError(null); setSaved(null); setUndo(null);
    if (target) void load(target);
  }, [target?.beyondDayId, target?.rootEventId]);

  const e = entry && entry !== "MISSING" && entry !== "ERROR" ? entry : null;
  const changed = async (message: string) => { setSaved(message); if (target) await load(target); await onChanged(); };
  const startAmount = () => {
    if (!e) return;
    setValues(Object.fromEntries(FIELDS[e.kind].map(([k]) => [k, String(r(e[k as keyof DayLogEntry] as number | undefined))])));
    setError(null); setSaved(null); setMode("AMOUNT");
  };
  const saveAmount = async () => {
    if (!e || busy) return;
    const parsed = Object.fromEntries(FIELDS[e.kind].map(([k]) => [k, Number(values[k as Field])]));
    if (Object.values(parsed).some((n) => !Number.isFinite(n) || n < 0) || (e.kind !== "MEAL" && Object.values(parsed).some((n) => n <= 0))) {
      setError(e.kind === "MEAL" ? "Enter numbers of 0 or more." : "Enter an amount above 0. To take it out, use REMOVE."); return;
    }
    const acknowledge = captureCommitFeedback();
    setBusy(true); setError(null);
    const before = Object.fromEntries(FIELDS[e.kind].map(([k]) => [k, e[k as keyof DayLogEntry] as number]));
    try {
      await correctLogEntry(e, parsed); acknowledge("LIGHT"); setMode("VIEW");
      setUndo({ kind: "FIXED", before });
      await changed("Amount corrected. The original stays in HISTORY.");
    }
    catch (err) { setError(describeError(err, "The amount was not changed.")); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!e || busy) return;
    const acknowledge = captureCommitFeedback();
    setBusy(true); setError(null);
    try { await removeLogEntry(e); acknowledge("HEAVY"); setMode("REMOVED"); setUndo({ kind: "REMOVED" }); await onChanged(); }
    catch (err) { setError(describeError(err, "It was not removed.")); }
    finally { setBusy(false); }
  };

  const undoLast = async () => {
    if (!undo || busy || !target) return;
    const acknowledge = captureCommitFeedback();
    setBusy(true); setError(null);
    try {
      if (undo.kind === "REMOVED") {
        await putBackLogEntry(target.rootEventId);
        setMode("VIEW"); setUndo(null); acknowledge("LIGHT");
        await changed("Put back. HISTORY shows the removal and the put-back.");
      } else {
        const current = await getDayLogEntry(target.beyondDayId, target.rootEventId);
        if (!current) throw new Error("LOG_NOT_FOUND: this entry was removed or can't be found.");
        await correctLogEntry(current, undo.before); setUndo(null); acknowledge("LIGHT");
        await changed("Back to the amount before the fix. HISTORY shows both.");
      }
    } catch (err) { setError(describeError(err, "Nothing was undone.")); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (mode === "REMOVED" && !busy) undoRef.current?.focus(); }, [mode, busy]);
  const undoButton = undo ? <button ref={undoRef} type="button" className="btn-secondary" disabled={busy} onClick={() => void undoLast()}
    aria-label={undo.kind === "REMOVED" ? "Undo the removal" : "Undo the amount fix"}>UNDO</button> : null;

  return <LogSheet open={target !== null} title={e ? e.name.toUpperCase() : "ENTRY"} onClose={onClose}>
    {target === null ? null : entry === null ? <p role="status" className="meta">Reading…</p>
      : entry === "ERROR" ? <p role="alert" className="meta">Couldn't read this entry. Your records are unchanged.</p>
      : mode === "REMOVED" ? <div className="log-entry"><p role="status">Removed. It stays in HISTORY as removed.</p>
        <div className="log-entry__actions">{undo?.kind === "REMOVED" && undoButton}<button type="button" className="btn-secondary" onClick={onClose}>DONE</button></div>
        {error && <p role="alert" className="meta meta--error">{error}</p>}</div>
      : entry === "MISSING" ? <p role="status" className="meta">This entry was removed or can't be found.</p>
      : <div className="log-entry" data-log-entry={entry.kind}>
        <p className="log-entry__amount">{describeAmount(entry)}</p>
        <p className="meta">Logged at <LogTimeEditor dayId={entry.beyondDayId} dayStartedAt={entry.dayStartedAt} rootEventId={entry.rootEventId} at={entry.at} label={entry.name}
          onSaved={() => changed("Time changed. The original stays in HISTORY.")} /></p>
        {mode === "AMOUNT" ? <div className="log-entry__amounts" role="group" aria-label="Correct the amount">
          {FIELDS[entry.kind].map(([k, label]) => <label key={k} className="meta">{label}
            <input className="input" type="number" inputMode="decimal" min="0" step="any" aria-label={label} value={values[k as Field] ?? ""} disabled={busy}
              onChange={(ev) => setValues((v) => ({ ...v, [k]: ev.target.value }))} /></label>)}
          <div className="log-entry__actions">
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => void saveAmount()}>SAVE AMOUNT</button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setMode("VIEW"); setError(null); }}>CANCEL</button>
          </div>
        </div> : <div className="log-entry__actions">
          <button type="button" className="btn-secondary" disabled={busy} onClick={startAmount}>EDIT AMOUNT</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setSaved(null); void remove(); }}>REMOVE</button>
        </div>}
        {error && <p role="alert" className="meta meta--error">{error}</p>}
        {saved && <div className="log-entry__actions"><p role="status" className="meta">{saved}</p>{undo?.kind === "FIXED" && undoButton}</div>}
        <p className="meta">Every change is kept in HISTORY; nothing is erased.</p>
      </div>}
  </LogSheet>;
}
