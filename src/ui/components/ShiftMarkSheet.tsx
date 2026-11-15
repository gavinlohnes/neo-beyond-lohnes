import { useEffect, useState } from "react";
import { retimeWorkMark, voidWorkMark } from "../../application/commands";
import { getShiftMarkView, shiftChangeNote, type ShiftMarkView } from "../../application/shiftMarks";
import { LogSheet } from "./LogSheet";
import { LogTimeEditor } from "./LogTimeEditor";
import { describeError } from "../errorMessage";
import { captureCommitFeedback } from "../feel/feedback";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * SHIFT-CORRECT-001 (Gavin, 2026-11-15: "Yes, amend WORK TRANSITION to allow explicit shift start/end corrections"):
 * the day's work marks, opened from TODAY's timeline. CHANGE TIME on the start or the end (never later than now, start
 * before end), and REOPEN SHIFT when it was marked ended but he's still working. Each is an explicit, append-only
 * correction naming the original mark, so HISTORY keeps both.
 */
export function ShiftMarkSheet({ target, onClose, onChanged }: { target: { beyondDayId: string } | null; onClose: () => void; onChanged: () => void | Promise<void> }) {
  const [view, setView] = useState<ShiftMarkView | null | "MISSING" | "ERROR">(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const load = async (dayId: string) => {
    try { setView((await getShiftMarkView(dayId)) ?? "MISSING"); } catch { setView("ERROR"); }
  };
  useEffect(() => {
    setView(null); setConfirming(false); setError(null); setSaved(null);
    if (target) void load(target.beyondDayId);
  }, [target?.beyondDayId]);

  const v = view && view !== "MISSING" && view !== "ERROR" ? view : null;
  const changed = async (message: string) => { setSaved(message); if (target) await load(target.beyondDayId); await onChanged(); };
  const reopen = async () => {
    if (!v || busy) return;
    const acknowledge = captureCommitFeedback();
    setBusy(true); setError(null);
    try {
      await voidWorkMark(v.dayId, "ENDED");
      acknowledge("HEAVY"); setConfirming(false);
      await changed("Shift reopened. Tap WORK ENDED on TODAY when you're off.");
    } catch (err) { setError(describeError(err, "The shift was not reopened.")); }
    finally { setBusy(false); }
  };

  return <LogSheet open={target !== null} title="SHIFT" onClose={onClose} canClose={() => !busy}>
    {target === null ? null : view === null ? <p role="status" className="meta">Reading…</p>
      : view === "ERROR" ? <p role="alert" className="meta">Couldn't read this shift. Your records are unchanged.</p>
      : view === "MISSING" ? <p role="status" className="meta">This day can't be found.</p>
      : <div className="log-entry" data-shift-sheet>
        {view.started ? <p className="meta">Started at <LogTimeEditor dayId={view.dayId} dayStartedAt={view.dayStartedAt} rootEventId={view.started.eventId} at={view.started.occurredAt} label="shift start"
            retime={(at) => retimeWorkMark(view.dayId, "STARTED", at)} onSaved={() => changed("Shift start changed. The original stays in HISTORY.")} />
          {view.started.retimed && view.started.originalAt && <span> (marked {hhmm(view.started.originalAt)})</span>}</p>
          : <p className="meta">No shift start recorded.</p>}
        {view.ended ? <p className="meta">Ended at <LogTimeEditor dayId={view.dayId} dayStartedAt={view.dayStartedAt} rootEventId={view.ended.eventId} at={view.ended.occurredAt} label="shift end"
            retime={(at) => retimeWorkMark(view.dayId, "ENDED", at)} onSaved={() => changed("Shift end changed. The original stays in HISTORY.")} />
          {view.ended.retimed && view.ended.originalAt && <span> (marked {hhmm(view.ended.originalAt)})</span>}</p>
          : <p className="meta">Shift still open. Tap WORK ENDED on TODAY when you're off.</p>}
        {view.ended && view.canReopen && (confirming ? <div className="log-entry__confirm" role="group" aria-label="Reopen this shift">
          <p>Still working? Reopening takes back the {hhmm(view.ended.occurredAt)} end; TODAY offers WORK ENDED again for when you're off.</p>
          <p className="meta">{shiftChangeNote(view.endAutomationOn)}</p>
          <div className="log-entry__actions">
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => void reopen()}>REOPEN SHIFT</button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>KEEP IT</button>
          </div>
        </div> : <div className="log-entry__actions">
          <button type="button" className="btn-secondary" onClick={() => { setError(null); setSaved(null); setConfirming(true); }}>REOPEN SHIFT</button>
        </div>)}
        {view.ended && view.endAutomationOn && !confirming && <p className="meta">Your “work ended” phone automation already ran at the original mark; a correction can't take that back.</p>}
        {error && <p role="alert" className="meta meta--error">{error}</p>}
        {saved && <p role="status" className="meta">{saved}</p>}
        <p className="meta">A shift time can't be later than now. Every change is kept in HISTORY; nothing is erased.</p>
      </div>}
  </LogSheet>;
}
