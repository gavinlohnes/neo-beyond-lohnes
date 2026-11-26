import { useEffect, useState } from "react";
import { isDayPartial, setFoodDayPartial } from "../../../application/foodDayMark";
import { FIX_UNDO_MS, useUndoWindow } from "../../hooks/useUndoWindow";
import "./notFullyLogged.css";

/**
 * GRAYSON-MISSION-REVIEW-001 slice A: one row under the day's food. "Not fully logged" leaves this day out of the burn
 * estimate (its weigh-ins still count). A change is a fix, so it shows UNDO for FIX_UNDO_MS (his Nov 24 undo rule).
 */
export function NotFullyLoggedRow({ dayId, disabled = false }: { dayId: string; disabled?: boolean }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useUndoWindow<{ to: boolean }>(FIX_UNDO_MS);
  useEffect(() => {
    let live = true;
    setOn(null); setUndo(null);
    void isDayPartial(dayId).then((v) => { if (live) setOn(v); }, () => { if (live) setOn(false); });
    return () => { live = false; };
  }, [dayId]);
  if (on === null) return null;
  const save = async (next: boolean, undoTo: boolean | null) => {
    setBusy(true); setError(null);
    try { await setFoodDayPartial(dayId, next); setOn(next); setUndo(undoTo === null ? null : { to: undoTo }); }
    catch { setError("That didn't save. Nothing changed."); }
    finally { setBusy(false); }
  };
  return (
    <div className="health-partial">
      <label className="health-partial__switch">
        <input type="checkbox" role="switch" checked={on} disabled={disabled || busy} onChange={(e) => void save(e.target.checked, on)} />
        <span>Not fully logged</span>
      </label>
      <p className="meta">{on ? "This day is left out of the burn estimate. Its weigh-ins still count." : "Mark it if some of this day's food wasn't logged, so the burn estimate leaves it out."}</p>
      {undo && <div className="health-partial__undo" role="status">
        <span className="meta">{on ? "Marked not fully logged." : "Unmarked."}</span>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void save(undo.to, null)}>UNDO</button>
      </div>}
      {error && <p className="meta" role="alert">{error}</p>}
    </div>
  );
}
