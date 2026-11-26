import { useEffect, useState } from "react";
import { getFitsNow } from "../../application/fitsNowQueries";
import type { FitsNow } from "../../engine/fitsNow";

/**
 * GRAYSON-FITS-NOW-001: up to three of his own saved meals that fit what's left of today, best for protein first, each
 * saying what it leaves. LOG logs one serving now; the sheet's own receipt carries UNDO. Calm: no colour, no nag.
 * `compact` is the BODY food card's one line.
 */
export function FitsNowBlock({ busy, refreshKey = 0, onLog, compact = false }: {
  busy: boolean;
  refreshKey?: number;
  onLog?: (mealId: string, name: string) => void;
  compact?: boolean;
}) {
  const [fits, setFits] = useState<FitsNow | null>(null);
  useEffect(() => {
    let live = true;
    void getFitsNow().then((v) => { if (live) setFits(v); }, () => { if (live) setFits(null); });
    return () => { live = false; };
  }, [refreshKey]);
  if (!fits) return null;
  if (compact) {
    const top = fits.kind === "LIST" ? fits.rows[0]! : null;
    return <p className="meta fits-now__line" data-fits-now-line>
      {top ? `${top.aboutFits ? "About fits" : "Fits now"}: ${top.meal.name} · ${Math.round(top.meal.calories)} kcal · ${Math.round(top.meal.proteinG)} g protein` : fits.kind === "NONE" ? fits.line : ""}
    </p>;
  }
  return (
    <section className="fits-now" aria-label="Fits now">
      <h3>FITS NOW</h3>
      {fits.windowLine && <p className="meta">{fits.windowLine}</p>}
      {fits.kind === "NONE" ? <p className="meta">{fits.line}</p> : fits.rows.map((row) => (
        <div className="record-meal-row fits-now__row" key={row.meal.id}>
          <div className="fits-now__text">
            <strong>{row.meal.name}</strong>
            <span className="meta">{Math.round(row.meal.calories)} kcal · {Math.round(row.meal.proteinG)} g protein</span>
            <span className="meta">{row.leaves}</span>
          </div>
          {onLog && <button type="button" className="btn-secondary" disabled={busy} aria-label={`Log ${row.meal.name} now`} onClick={() => onLog(row.meal.id, row.meal.name)}>LOG</button>}
        </div>
      ))}
    </section>
  );
}
