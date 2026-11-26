import { useState } from "react";
import type { ShortDay } from "../../../engine/monthlyReview";
import { answerShortDays, setFoodDayPartial } from "../../../application/foodDayMark";
import "../body/bodyProgress.css";

/**
 * GRAYSON-MISSION-REVIEW-001 slice A: at the top of the monthly review, the days that look short (logged calories under
 * half his median day), each with its date and calories and a switch. Nothing is marked by itself: DONE records his
 * answer for every shown day (marked or not), so a day he left unmarked isn't suggested again. UNDO unmarks what DONE
 * marked.
 */
const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function ShortDaysRow({ days, onChanged }: { days: readonly ShortDay[]; onChanged: () => void }) {
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (done) {
    return <section className="weekly-dashboard__panel short-days" aria-label="Days that look short">
      <p role="status" className="meta">{done.length ? `${done.length} ${done.length === 1 ? "day" : "days"} marked not fully logged. The burn estimate leaves ${done.length === 1 ? "it" : "them"} out.` : "Kept as fully logged."}</p>
      {done.length > 0 && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void (async () => {
        setBusy(true);
        try { for (const id of done) await setFoodDayPartial(id, false); setDone([]); onChanged(); } catch { setError("That didn't save. Nothing changed."); }
        finally { setBusy(false); }
      })()}>UNDO</button>}
      {error && <p className="meta" role="alert">{error}</p>}
    </section>;
  }
  if (!days.length) return null;
  return (
    <section className="weekly-dashboard__panel short-days" aria-label="Days that look short">
      <p className="card-body">{days.length} {days.length === 1 ? "day looks" : "days look"} short. Mark {days.length === 1 ? "it" : "them"} as not fully logged?</p>
      <p className="meta">Logged calories under half your usual day in these four weeks. A marked day is left out of the burn estimate.</p>
      <ul className="short-days__list">
        {days.map((d) => (
          <li key={d.beyondDayId}>
            <label className="short-days__row">
              <input type="checkbox" role="switch" checked={marked.has(d.beyondDayId)} disabled={busy}
                onChange={(e) => setMarked((m) => { const next = new Set(m); if (e.target.checked) next.add(d.beyondDayId); else next.delete(d.beyondDayId); return next; })} />
              <span>{dateOf(d.livedDayStart)} · {Math.round(d.kcal)} kcal logged</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => void (async () => {
        setBusy(true); setError(null);
        try {
          await answerShortDays(days.map((d) => ({ beyondDayId: d.beyondDayId, partial: marked.has(d.beyondDayId) })));
          setDone(days.filter((d) => marked.has(d.beyondDayId)).map((d) => d.beyondDayId)); onChanged();
        } catch { setError("That didn't save. Nothing changed."); }
        finally { setBusy(false); }
      })()}>DONE</button>
      {error && <p className="meta" role="alert">{error}</p>}
    </section>
  );
}
