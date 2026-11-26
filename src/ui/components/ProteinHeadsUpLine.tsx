import { useEffect, useState } from "react";
import { dismissProteinHeadsUp, getProteinHeadsUp } from "../../application/proteinPatternQueries";
import type { ProteinHeadsUp } from "../../engine/proteinPattern";
import { FIX_UNDO_MS, useUndoWindow } from "../hooks/useUndoWindow";
import "./logSheet.css";

/**
 * GRAYSON-PROTEIN-HEADSUP-001: one quiet line on BODY's food card when protein has run well under target on several
 * logged days. Facts only: the days behind it are one tap away. SHOW HIGH-PROTEIN MEALS opens the meal log, where Fits
 * now lists his own meals best for protein first; THAT'S FINE keeps it quiet for a week (with UNDO). No colour.
 */
export function ProteinHeadsUpLine({ refreshKey = 0, onShowMeals }: { refreshKey?: number; onShowMeals?: (() => void) | undefined }) {
  const [headsUp, setHeadsUp] = useState<ProteinHeadsUp | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useUndoWindow<{ run: () => Promise<boolean> }>(FIX_UNDO_MS);
  useEffect(() => {
    let live = true;
    void getProteinHeadsUp().then((v) => { if (live) setHeadsUp(v); }, () => { if (live) setHeadsUp(null); });
    return () => { live = false; };
  }, [refreshKey, tick]);
  if (undo) {
    return <div className="protein-headsup" role="status">
      <span className="meta">Hidden for a week.</span>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => void (async () => { setBusy(true); try { await undo.run(); } finally { setUndo(null); setTick((n) => n + 1); setBusy(false); } })()}>UNDO</button>
    </div>;
  }
  if (!headsUp) return null;
  return (
    <div className="protein-headsup" data-protein-headsup>
      <details>
        <summary className="meta protein-headsup__line">{headsUp.line}</summary>
        <p className="meta">{headsUp.days}</p>
      </details>
      <div className="protein-headsup__acts">
        {onShowMeals && <button type="button" className="btn-secondary" disabled={busy} onClick={onShowMeals}>SHOW HIGH-PROTEIN MEALS</button>}
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void (async () => {
          setBusy(true);
          try { const { undo: u } = await dismissProteinHeadsUp(); setUndo({ run: u }); setHeadsUp(null); }
          finally { setBusy(false); }
        })()}>THAT'S FINE</button>
      </div>
    </div>
  );
}
