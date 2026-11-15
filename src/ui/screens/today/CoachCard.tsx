import { useEffect, useState } from "react";
import { getCoachCards, readCoachSkips, skipCoachCard, type CoachCard as Card, type CoachDestination } from "../../../application/coachCards";

/** One optional suggestion below Engine guidance; accepting opens the existing confirmation flow. */
export function CoachCard({ active, refreshKey, onOpen }: { active: boolean; refreshKey: number; onOpen: (destination: CoachDestination) => void }) {
  const [cards, setCards] = useState<Card[]>([]), [skips, setSkips] = useState<string[]>([]), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [skipError, setSkipError] = useState(false);
  useEffect(() => {
    if (!active) return;
    let live = true, request = 0;
    const load = () => { const current = ++request; setCards([]); void getCoachCards().then((next) => { if (live && current === request) { try { const dismissed = readCoachSkips(); setCards(next); setSkips(dismissed); setError(false); } catch { setCards([]); setError(true); } } }, () => { if (live && current === request) { setCards([]); setError(true); } }); };
    load();
    const visible = () => { if (document.visibilityState === "visible") load(); };
    const timer = window.setInterval(load, 60_000);
    document.addEventListener("visibilitychange", visible);
    return () => { live = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [active, refreshKey, retry]);
  if (!active) return null;
  if (error) return <div className="meta" role="status">Coach advice is unavailable. <button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY COACH</button></div>;
  const card = cards.find((c) => !skips.includes(c.key));
  if (!card) return null;
  return <section className="cc-panel" aria-label="One coach suggestion">
    <p className="tool-label">OPTIONAL COACH SUGGESTION</p><h3>{card.title}</h3><p>{card.evidence}</p>
    {skipError && <p role="alert">Could not keep this skip on this phone. Try again.</p>}
    <p className="meta">Review first. Nothing is changed here.</p>
    <button type="button" className="btn-secondary" onClick={() => onOpen(card.destination)}>REVIEW SUGGESTION</button>{" "}
    <button type="button" className="btn-secondary" onClick={() => { try { skipCoachCard(card); setSkips(readCoachSkips()); setSkipError(false); } catch { setSkipError(true); } }}>SKIP</button>
  </section>;
}
