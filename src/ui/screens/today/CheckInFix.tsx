import { useEffect, useState } from "react";
import { getCheckInChain } from "../../../application/queries";
import { correctCheckIn, undoCheckInCorrection, type CheckInCorrectionResult } from "../../../application/checkInCorrectionCommands";
import { CHECK_IN_VALUE_KEYS, type CheckInAnswers, type CheckInChain } from "../../../domain/checkInCorrections";
import { captureCommitFeedback } from "../../feel/feedback";
import { describeError } from "../../errorMessage";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { CheckInSheet } from "./CheckInSheet";
import { CHECK_IN_FIELDS, isCheckInComplete, type PartialCheckInValues } from "./checkInFields";

/**
 * GRAYSON-CHECKIN-EDIT-001 (Gavin, 2026-11-24): correct a sent check-in. Opens on the chain's current answers, whichever
 * of its rows was tapped (the original included), so a stale row never opens. No "Are you sure?": SAVE FIX writes at
 * once and the caller shows Undo for FIX_UNDO_MS. The edited detail shows each standing fix and can put the newest back.
 */
export function CheckInFixSheet({ checkInId, onClose, onChanged }: {
  checkInId: string | null;
  onClose: () => void;
  onChanged: (result: CheckInCorrectionResult) => void | Promise<void>;
}) {
  const [chain, setChain] = useState<CheckInChain | null>(null);
  const [values, setValues] = useState<PartialCheckInValues>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setChain(null);
    setError(null);
    if (!checkInId) return;
    void getCheckInChain(checkInId).then((found) => {
      if (!live) return;
      if (!found) { setError("That check-in couldn't be found."); return; }
      setChain(found);
      setValues(Object.fromEntries(CHECK_IN_VALUE_KEYS.map((key) => [key, found.current[key]])) as PartialCheckInValues);
    }, (cause) => live && setError(describeError(cause, "Couldn't open that check-in.")));
    return () => { live = false; };
  }, [checkInId]);

  async function run(write: () => Promise<CheckInCorrectionResult>) {
    const acknowledge = captureCommitFeedback();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await write();
      if (result.status === "STALE") { setError("This check-in changed since you opened it. Close and open it again."); return; }
      if (result.status === "NOT_FOUND") { setError("That check-in couldn't be found."); return; }
      if (result.status !== "NO_OP") acknowledge("MEDIUM");
      onClose();
      await onChanged(result);
    } catch (cause) {
      setError(describeError(cause, "The fix didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const newest = chain?.fixes.at(-1);
  return <CheckInSheet mode="fix" open={checkInId !== null} close={onClose} values={values} setValues={setValues}
    busy={busy || !chain} isInFlight={() => busy} error={error}
    submit={() => { if (chain && isCheckInComplete(values)) void run(() => correctCheckIn(chain.current.id, values)); }}
  >
    {chain && chain.fixes.length > 0 && <details className="check-in-edited">
      <summary>Edited · before and after</summary>
      {chain.fixes.map((fix) => <p className="meta" key={fix.eventId}>
        Fixed {formatTime(fix.at)}: {describeChange(fix.before, fix.after)}.
      </p>)}
      {newest && <>
        <p className="meta">Put it back returns the answers from before the last fix.</p>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(() => undoCheckInCorrection(newest.eventId))}>PUT IT BACK</button>
      </>}
    </details>}
  </CheckInSheet>;
}

/** The Undo shown for FIX_UNDO_MS after a fix. */
export function FixUndoBanner({ message, busy, onUndo }: { message: string; busy: boolean; onUndo?: (() => void) | undefined }) {
  return <div role="status">{onUndo
    ? <ConfirmBanner message={message} actionLabel="UNDO" onAction={onUndo} disabled={busy} />
    : <ConfirmBanner message={message} />}</div>;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/** "Energy 2 → 4 · Mood 3 → 4": only the answers that changed. */
export function describeChange(before: CheckInAnswers, after: CheckInAnswers): string {
  const changed = CHECK_IN_FIELDS.filter((f) => before[f.key] !== after[f.key]).map((f) => `${f.label} ${String(before[f.key])} → ${String(after[f.key])}`);
  return changed.length ? changed.join(" · ") : "no change";
}
