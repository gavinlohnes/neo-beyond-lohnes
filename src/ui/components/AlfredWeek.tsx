import { useEffect, useRef, useState } from "react";
import { getReview, lastFinishedWeek, reviewContext, saveReview, weekLabel } from "../../application/alfred/alfredReview";
import { addSpend, automaticAlfredOn, capReached } from "../../application/alfred/alfredSpend";
import type { AlfredReview } from "../../domain/alfred/types";
import { AlfredText, readAlfredKey } from "./AlfredSheet";
import "./alfred.css";

/**
 * ALFRED-006: once a week (after Sunday's lived day ends, Monday 16:30) Alfred writes the week's review
 * on his own and TODAY shows "Your week" until GOT IT. Every review stays in DATA → MONTH.
 */
const SEEN = "beyond.alfredReviewSeen";
const seenFor = () => { try { return localStorage.getItem(SEEN); } catch { return null; } };

export function AlfredWeek({ active }: { active: boolean }) {
  const [review, setReview] = useState<AlfredReview | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const key = readAlfredKey();
    if (!active || !key || busy.current) return;
    const week = lastFinishedWeek();
    if (seenFor() === week.start) { setDismissed(true); return; }
    busy.current = true;
    let live = true;
    void (async () => {
      try {
        let saved = await getReview(week.start);
        // ALFRED-COST-001: a saved review still shows; a new one is written only when automatic Alfred is on.
        if (!saved && navigator.onLine !== false && automaticAlfredOn() && !capReached()) {
          const context = await reviewContext(week);
          if (context) {
            const { writeWeeklyReview } = await import("../../application/alfred/alfredClient");
            const { text, costUsd } = await writeWeeklyReview(key, context, weekLabel(week));
            addSpend(costUsd);
            if (text) saved = await saveReview(week, text);
          }
        }
        if (live && saved) setReview(saved);
      } catch { /* no signal or no answer: try again next time TODAY opens */ }
      finally { busy.current = false; }
    })();
    return () => { live = false; };
  }, [active]);

  if (!review || dismissed) return null;
  const label = weekLabel({ start: review.weekStart, end: review.weekEnd });
  return <section className="alfred-brief alfred-week" aria-label={`Your week, ${label}`}>
    <div className="alfred-brief__open">
      <span className="alfred-brief__who">ALFRED · YOUR WEEK · {label}</span>
      {open ? <AlfredText text={review.text} /> : <span className="alfred-brief__text">{review.text.split("\n").find((l) => l.trim())?.replace(/\*\*/g, "").replace(/^#+\s*/, "")}</span>}
      <div className="alfred-week__row">
        <button type="button" className="btn-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "LESS" : "READ"}</button>
        <button type="button" className="btn-secondary" onClick={() => { try { localStorage.setItem(SEEN, review.weekStart); } catch { /* shows again */ } setDismissed(true); }}>GOT IT</button>
      </div>
    </div>
  </section>;
}
