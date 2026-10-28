import { useState } from "react";
import { modifyObligation, releaseObligation, satisfyObligation } from "../../../application/intentCommands";
import type { Obligation } from "../../../domain/intent/types";

type Pending = "DONE" | "RELEASE" | "DATE" | null;

/**
 * REAL-DATA-001: the owner's real backup showed one overdue note leading TODAY nine times while the
 * way to close it lived in another panel. When a task is the answer, close it right on the card:
 * DONE, NOT A TASK (both one-way, so each asks once) or NEW DATE. Existing commands only.
 */
export function CommitmentQuickActions({ obligation, today, onChanged }: { obligation: Obligation; today: string; onChanged: () => Promise<void> | void }) {
  const [pending, setPending] = useState<Pending>(null);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError(null);
    try { await action(); setPending(null); await onChanged(); }
    catch { setError("That didn't save. Your task is unchanged. Try again."); }
    finally { setBusy(false); }
  }
  return <div className="commitment-quick" role="group" aria-label={`Task: ${obligation.title}`}>
    {pending === null && <div className="commitment-quick__row">
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPending("DONE")}>DONE</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPending("RELEASE")}>NOT A TASK</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPending("DATE")}>NEW DATE</button>
    </div>}
    {(pending === "DONE" || pending === "RELEASE") && <div className="commitment-quick__confirm">
      <p className="meta">{pending === "DONE" ? `Mark "${obligation.title}" done?` : `Drop "${obligation.title}" as a task? The note stays in your history.`}</p>
      <div className="commitment-quick__row">
        <button type="button" className="btn-secondary" disabled={busy}
          onClick={() => void run(() => pending === "DONE" ? satisfyObligation(obligation.id) : releaseObligation(obligation.id))}>
          {pending === "DONE" ? "YES, DONE" : "YES, DROP IT"}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPending(null)}>CANCEL</button>
      </div>
    </div>}
    {pending === "DATE" && <div className="commitment-quick__confirm">
      <label className="meta" htmlFor={`due-${obligation.id}`}>New due date</label>
      <input id={`due-${obligation.id}`} className="input" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
      <div className="commitment-quick__row">
        <button type="button" className="btn-secondary" disabled={busy || !date} onClick={() => void run(() => modifyObligation(obligation.id, { dueAt: date }))}>SAVE DATE</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPending(null)}>CANCEL</button>
      </div>
    </div>}
    {error && <p role="alert" className="meta">{error}</p>}
  </div>;
}
