import { useEffect, useState } from "react";
import { getFoodSources, type FoodSources as Sources, type SourceNutrient } from "../../application/foodSources";
import "../foundation/foundation.css";
import "./metricDetail.css";

/**
 * FOOD-SOURCES-001 (Gavin, 2026-11-15): WHERE IT CAME FROM. Your main sources of calories or protein over the last
 * finished lived days, from your own meal logs after corrections. Each row opens the days it was logged on; a day
 * can open its records where corrections live. Read only, and no judgement: no "bad" foods, no advice to cut.
 */
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (share: number) => `${Math.round(share * 100)}%`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function FoodSources({ nutrient, windowDays, refreshKey = 0, onOpenDay }: {
  nutrient: SourceNutrient; windowDays: number; refreshKey?: number | string;
  /** The day's existing records, where corrections live. Without it the day isn't a link. */
  onOpenDay?: ((beyondDayId: string) => void) | undefined;
}) {
  const [data, setData] = useState<Sources | null | "ERROR">(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    void getFoodSources(nutrient, windowDays).then((d) => { if (live) setData(d); }, () => { if (live) setData("ERROR"); });
    return () => { live = false; };
  }, [nutrient, windowDays, refreshKey, attempt]);
  const unit = nutrient === "calories" ? "kcal" : "g";
  const label = `WHERE IT CAME FROM · LAST ${windowDays} DAYS`;

  return <section className="bf md-sources" aria-label={`Where your ${nutrient === "calories" ? "calories" : "protein"} came from, last ${windowDays} days`} data-food-sources={nutrient}>
    <p className="md-split__label">{label}</p>
    {data === "ERROR" ? <><p role="alert" className="md-meta">Couldn't read your meals. Your records are unchanged.</p>
      <button type="button" className="md-act" onClick={() => setAttempt((n) => n + 1)}>RETRY</button></>
      : data === null ? <p role="status" className="md-meta">Reading…</p>
      : data.total <= 0 ? <p className="md-meta">Nothing {nutrient === "calories" ? "with calories" : "with protein"} logged in the last {windowDays} finished days.</p>
      : <>
        <ul className="md-sources__list">
          {data.sources.map((s) => <li key={s.key}>
            <details className="md-source-row">
              <summary><span className="md-source-row__name">{s.name}</span>
                <span className="md-source-row__value">{fmt(s.total)} {unit} · {pct(s.share)} · {s.count} {s.count === 1 ? "time" : "times"}</span></summary>
              <ul className="md-source-row__days">{s.days.map((d) => <li key={d.beyondDayId}>
                {onOpenDay ? <button type="button" className="md-source-day" onClick={() => onOpenDay(d.beyondDayId)} aria-label={`${day(d.at)}, ${fmt(d.value)} ${unit}: open that day's records`}>
                  <span>{day(d.at)}{d.count > 1 ? ` · ${d.count} times` : ""}</span><span>{fmt(d.value)} {unit}</span></button>
                  : <span className="md-source-day"><span>{day(d.at)}{d.count > 1 ? ` · ${d.count} times` : ""}</span><span>{fmt(d.value)} {unit}</span></span>}
              </li>)}</ul>
            </details>
          </li>)}
          {data.others.sources > 0 && <li className="md-source-row md-source-row--others"><span className="md-source-row__name">…and {data.others.sources} other {data.others.sources === 1 ? "meal" : "meals"}</span>
            <span className="md-source-row__value">{fmt(data.others.total)} {unit} · {pct(data.others.share)}</span></li>}
        </ul>
        <p className="md-meta" data-food-sources-coverage>{fmt(data.total)} {unit} logged on {data.loggedDays} of the last {data.finishedDays} finished days; days with nothing logged are left out. Corrected values; this lived day not counted.</p>
      </>}
  </section>;
}
