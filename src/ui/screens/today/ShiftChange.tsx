import { useEffect, useRef, useState } from "react";
import { getShiftChange, getWorkStart, type ShiftChange, type WorkStart } from "../../../application/shiftChange";
import { markWorkStarted } from "../../../application/commands";
import { captureCommitFeedback } from "../../feel/feedback";
import { describeError } from "../../errorMessage";
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
        <ShiftLine line={show.line} landing={landing} />
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

/**
 * SHIFT-CHANGE-001: one tap and it's logged. Around the scheduled start, TODAY offers STARTED WORK; once
 * tapped, the line says when you went on the clock. The brief and the end of the shift count from it.
 */
export function StartedWork({ refreshKey, now, onSaved }: { refreshKey: string; now: Date; onSaved?: () => void }) {
  const [offer, setOffer] = useState<WorkStart | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  async function load() {
    const request = ++sequence.current;
    try { const o = await getWorkStart(now); if (request === sequence.current) setOffer(o); }
    catch { if (request === sequence.current) setOffer(null); }
  }
  useEffect(() => { void load(); }, [refreshKey]);
  if (!offer) return null;
  if (offer.startedAt) return <p className="work-start work-start--on"><span className="work-start__key">SHIFT</span><span>ON THE CLOCK · {hhmm(offer.startedAt)}</span></p>;
  const start = async () => {
    if (saving) return;
    const acknowledge = captureCommitFeedback();
    setSaving(true); setError(null);
    try { if (await markWorkStarted(offer.dayId)) acknowledge("MEDIUM"); await load(); onSaved?.(); }
    catch (e) { setError(describeError(e, "Nothing was saved.")); }
    finally { setSaving(false); }
  };
  return <div className="work-start">
    <span className="work-start__key">SHIFT {hhmm(offer.shiftStart)}</span>
    <button type="button" className="btn-secondary work-start__go" disabled={saving} onClick={() => void start()}>STARTED WORK</button>
    {error && <p className="meta meta--error" role="alert">{error}</p>}
  </div>;
}

/** The shift on one line: clock-in to clock-out, a tick for every water log above, every meal below. */
function ShiftLine({ line, landing }: { line: ShiftChange["line"]; landing: boolean }) {
  const s = Date.parse(line.start), e = Date.parse(line.end), span = Math.max(1, e - s);
  const W = 320, L = 8, R = 8, x = (at: string) => L + ((Date.parse(at) - s) / span) * (W - L - R);
  const label = `Your shift on one line, ${hhmm(line.start)} to ${hhmm(line.end)}: ${line.water.length} water log${line.water.length === 1 ? "" : "s"}, ${line.food.length} food log${line.food.length === 1 ? "" : "s"}.`;
  return (
    <figure className="shift-line">
      <svg viewBox={`0 0 ${W} 44`} role="img" aria-label={label}>
        <line x1={L} x2={W - R} y1={22} y2={22} className="shift-line__axis" />
        <line x1={L} x2={L} y1={14} y2={30} className="shift-line__edge" />
        <line x1={W - R} x2={W - R} y1={14} y2={30} className={landing ? "shift-line__edge shift-line__edge--ahead" : "shift-line__edge"} />
        {line.water.map((at, i) => <line key={`w${i}`} x1={x(at)} x2={x(at)} y1={8} y2={20} className="shift-line__water" style={{ animationDelay: `${300 + i * 40}ms` }} />)}
        {line.food.map((at, i) => <rect key={`f${i}`} x={x(at) - 3} y={26} width={6} height={6} className="shift-line__food" style={{ animationDelay: `${300 + i * 40}ms` }} />)}
      </svg>
      <figcaption aria-hidden="true"><span>{hhmm(line.start)}</span><span>▮ WATER · ■ FOOD</span><span>{hhmm(line.end)}</span></figcaption>
    </figure>
  );
}
