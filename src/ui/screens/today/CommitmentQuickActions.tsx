import { useState } from "react";
import { modifyObligation, releaseObligation, satisfyObligation } from "../../../application/intentCommands";
import type { Obligation } from "../../../domain/intent/types";

type Pending = "DONE" | "RELEASE" | "DATE" | null;

/**
 * REAL-DATA-001: the owner's real backup showed one overdue note leading TODAY nine times while the
 * way to close it lived in another panel. When a task is the answer, close it right on the card:
 * DONE, NOT A TASK (both one-way, so each asks once) or NEW DATE. Existing commands only.
 */
export const DONE_NOTE_MAX = 200;
export function CommitmentQuickActions({ obligation, today, onChanged, withNote = false, showRelease = true, label }: {
  obligation: Obligation; today: string; onChanged: () => Promise<void> | void;
  /** GRAYSON-HOME-LASTDONE-001: a Note in the DONE confirm, saved as its resolution note. */
  withNote?: boolean;
  /** GRAYSON-HOME-LASTDONE-001: Home leaves NOT A TASK off, because on a repeating job it ends the repeats. */
  showRelease?: boolean;
  /** How the confirm names it; the title by default. */
  label?: string | undefined;
}) {
  const [pending, setPending] = useState<Pending>(null);
  const [note, setNote] = useState("");
  const name = label ?? obligation.title;
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
      {showRelease && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPending("RELEASE")}>NOT A TASK</button>}
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPending("DATE")}>NEW DATE</button>
    </div>}
    {(pending === "DONE" || pending === "RELEASE") && <div className="commitment-quick__confirm">
      <p className="meta">{pending === "DONE" ? `Mark "${name}" done?` : `Drop "${name}" as a task? The note stays in your history.`}</p>
      {pending === "DONE" && withNote && <label className="meta commitment-quick__note">Note (optional): what you used or found
        <input className="input" value={note} maxLength={DONE_NOTE_MAX} disabled={busy} onChange={(e) => setNote(e.target.value)} /></label>}
      <div className="commitment-quick__row">
        <button type="button" className="btn-secondary" disabled={busy}
          onClick={() => void run(() => pending === "DONE" ? satisfyObligation(obligation.id, withNote && note.trim() ? note.trim() : undefined) : releaseObligation(obligation.id))}>
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
