import { useEffect, useState } from "react";
import { getYearReview, MIN_DAYS_FOR_A_MONTH, type YearReview } from "../../../application/yearReview";
import { describeError } from "../../errorMessage";

/**
 * YEAR-REVIEW-001: "Your year in BEYOND", the month recap's cards added up across the calendar year. Opens on a tap
 * under the month recap, so MONTH stays as it was until you ask. Read only: nothing is saved, scored or sent.
 */
const STATUS = { COUNTED: "counted", THIN: "too little logged", EMPTY: "nothing recorded", AHEAD: "not yet" } as const;

export function YearReviewView({ year }: { year: number }) {
  const [review, setReview] = useState<YearReview | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setOpen(false); setReview(null); setError(null); }, [year]);

  const start = () => {
    setOpen(true); setError(null);
    void getYearReview(year).then(setReview, (e: unknown) => setError(describeError(e, "Could not read this year.")));
  };
  if (!open) return <button type="button" className="btn-secondary" onClick={start}>SEE YOUR YEAR IN BEYOND</button>;
  if (error) return <p role="alert" className="meta meta--error">{error}</p>;
  if (!review) return <p className="meta" role="status">Reading…</p>;
  return <section className="cave__block month__year" aria-label={`Your year in BEYOND · ${review.title}`}>
    <p className="meta" style={{ margin: 0 }}>Your year in BEYOND · {review.counted} of 12 months counted</p>
    {review.cards.map((card) => <div key={card.id} data-year-card={card.id}>
      <h3 className="cave__cap">{card.title}</h3>
      {card.lines.map((line) => <p key={line} className="card-body" style={{ margin: "0 0 6px" }}>{line}</p>)}
    </div>)}
    <details>
      <summary>Which months count</summary>
      <ul className="cave__facts">
        {review.months.map((m) => <li key={m.month}>{m.name}: {STATUS[m.status]}{m.daysLogged ? ` (${m.daysLogged} day${m.daysLogged === 1 ? "" : "s"} logged)` : ""}</li>)}
      </ul>
      <p className="meta">A month counts from {MIN_DAYS_FOR_A_MONTH} logged days. Thinner months are left out of every figure rather than guessed.</p>
    </details>
    <div className="button-row"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>DONE</button></div>
    <p className="meta">From your records only, counted the way the month recap counts. Nothing here is saved or sent.</p>
  </section>;
}
