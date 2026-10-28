import { useEffect, useRef, useState } from "react";
import { getShiftChange, type ShiftChange } from "../../../application/shiftChange";
import { BatMark } from "../../components/BatMark";
import "./shiftChange.css";

const STORE = "beyond.shiftChange";
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function seen(key: string): boolean { try { return localStorage.getItem(STORE) === key; } catch { return false; } }
function remember(key: string) { try { localStorage.setItem(STORE, key); } catch { /* A private window still dismisses for this session. */ } }

/**
 * SHIFT-CHANGE-001: the end of a shift, given the whole screen once. LANDING in the last 45 minutes,
 * SHIFT SECURED for 3 hours after. It plays once per shift and phase, a tap or Escape continues to
 * TODAY, and reduced motion shows it still. Volume 2: one moment, earned by the shift itself.
 */
export function ShiftChangeMoment({ refreshKey, now, onOpen }: { refreshKey: string; now: Date; onOpen: () => void }) {
  const [moment, setMoment] = useState<ShiftChange | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    getShiftChange(now).then((m) => { if (request === sequence.current) setMoment(m); }).catch(() => { if (request === sequence.current) setMoment(null); });
  }, [refreshKey]);
  const show = moment && closed !== moment.key && !seen(moment.key) ? moment : null;
  useEffect(() => { if (show) heading.current?.focus({ preventScroll: true }); }, [show?.key]);
  if (!show) return null;

  const dismiss = () => { remember(show.key); setClosed(show.key); };
  const landing = show.phase === "LANDING";
  return (
    <div className={`shift-change shift-change--${show.phase.toLowerCase()}`} role="dialog" aria-modal="true" aria-labelledby="shift-change-title"
      onKeyDown={(e) => { if (e.key === "Escape") dismiss(); }}>
      <div className="shift-change__panel">
        <span className="shift-change__sweep" aria-hidden="true" />
        <BatMark width={112} cut="hairline" className="shift-change__mark" />
        <p className="shift-change__kicker">{landing ? `LANDING · SHIFT ENDS ${hhmm(show.end)}` : `SHIFT SECURED · ${hhmm(show.end)}`}</p>
        <h2 id="shift-change-title" ref={heading} tabIndex={-1} className="shift-change__clock"
          aria-label={landing ? `Landing. ${show.clock.replace("T–", "")} until the shift ends at ${hhmm(show.end)}.` : `Shift secured. ${show.clock} on the clock.`}>
          {show.clock}<small>{landing ? "TO GO" : "ON THE CLOCK"}</small>
        </h2>
        {show.signal && <p className="shift-change__signal">{show.signal}</p>}
        {show.rows.length > 0 && <ol className="shift-change__rows" aria-label={landing ? "Still open" : "After-action"}>
          {show.rows.map((r, i) => (
            <li key={r.key} className={`shift-change__row shift-change__row--${r.tone.toLowerCase()}`} style={{ animationDelay: `${180 + i * 80}ms` }}>
              <span className="shift-change__label">{r.label}</span>
              <span className="shift-change__value">{r.value}{r.tone === "OFF" ? <em> · off plan</em> : r.tone === "ON" ? <em> · on plan</em> : null}</span>
            </li>
          ))}
        </ol>}
        {landing && show.rows.length === 0 && <p className="shift-change__clear">Everything's closed out. Bring it home.</p>}
        <p className="shift-change__plan"><span>LANDING PLAN</span>{show.plan}</p>
        <div className="shift-change__actions">
          <button type="button" className="btn-secondary" onClick={dismiss}>CONTINUE</button>
          <button type="button" className="btn-secondary" onClick={() => { dismiss(); onOpen(); }}>{landing ? "OPEN BRIEF ›" : "FULL DEBRIEF ›"}</button>
        </div>
      </div>
    </div>
  );
}
