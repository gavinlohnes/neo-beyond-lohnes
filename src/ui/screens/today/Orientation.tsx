import { useEffect, useState } from "react";
import { Crosshair, ListChecks, MessageSquareText, Moon, Route, Target } from "lucide-react";
import { getOrientation, hm, type Orientation as OrientationModel } from "../../../application/orientation";
import { OperatorHeader } from "../../components/OperatorHeader";
import { Panel, SourceTag } from "../../foundation/primitives";
import "../../foundation/foundation.css";
import "./orientation.css";

export interface OrientationRoutes {
  onEnter: () => void;
  onCheckIn: () => void;
  onPrep: () => void;
  onCapture: () => void;
  onTrain?: (() => void) | undefined;
  onSleep?: (() => void) | undefined;
  onCommitment?: (() => void) | undefined;
  onSetContext: (value: "WORK" | "OFF") => Promise<void>;
}

/**
 * GRAYSON C1.1 · Orientation slice 1 (Gavin, 2026-11-20). What START DAY opens on a work day: where the day stands,
 * how you slept against your own usual, Delta's read, the one recommendation, the runway to the shift and at most
 * two things worth doing, then ENTER TODAY. Read and route only: every button opens an existing surface, and
 * nothing is recorded by reading it. Replaces BEYOND 4.0-d's briefing preview.
 */
export function Orientation({ active, busy, refreshKey, routes }: { active: boolean; busy: boolean; refreshKey: number; routes: OrientationRoutes }) {
  const [model, setModel] = useState<OrientationModel | null | "ERROR" | undefined>(undefined);
  const [retry, setRetry] = useState(0);
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void getOrientation().then((next) => { if (!cancelled) setModel(next); }, () => { if (!cancelled) setModel("ERROR"); });
    return () => { cancelled = true; };
  }, [active, refreshKey, retry]);

  const answer = async (value: "WORK" | "OFF") => {
    if (answering) return;
    setAnswering(true);
    try { await routes.onSetContext(value); setRetry((n) => n + 1); } finally { setAnswering(false); }
  };

  if (model === undefined) {
    return <div className="screen command-console today-field orientation bf"><OperatorHeader destination="mission">BEYOND // ORIENT</OperatorHeader><p className="bf-meta" role="status">Reading your records…</p></div>;
  }
  if (model === "ERROR" || model === null) {
    return (
      <div className="screen command-console today-field orientation bf">
        <OperatorHeader destination="mission">BEYOND // ORIENT</OperatorHeader>
        <p className="bf-meta" role="alert">{model === null ? "No day is started, so there's nothing to orient." : "Orientation couldn't be read. Your records are unchanged."}</p>
        <div className="orientation__release">
          {model === "ERROR" && <button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY</button>}
          <button type="button" className="btn-primary orientation__enter" onClick={routes.onEnter}>ENTER TODAY</button>
        </div>
      </div>
    );
  }

  const o = model;
  const until = o.runway.find((r) => r.kind === "SHIFT")?.time;
  return (
    <div className="screen command-console today-field orientation bf" data-orientation-mode={o.mode}>
      <OperatorHeader destination="mission">BEYOND // ORIENT</OperatorHeader>
      <header className="bf-bar orientation__bar">
        <div className="bf-bar__id">
          <p className="bf-bar__eyebrow"><span className="bf-slashes" aria-hidden="true">///</span>{` ${o.date}`}</p>
        </div>
        <p className="orientation__state">{o.stateLabel}</p>
      </header>

      <div className="orientation__stack">
        {o.situation.kind === "ASK" ? (
          <Panel headingLevel={2} headingId="orient-situation" icon={<Crosshair size={18} />} label="WHAT KIND OF DAY?" wide primary
            source={o.situation.predicted ? <SourceTag>SCHEDULE SAYS {o.situation.predicted}</SourceTag> : <SourceTag>NO SCHEDULE</SourceTag>}>
            <p className="bf-meta">{o.situation.line}</p>
            <div className="orientation__choices">
              <button type="button" className="btn-primary" disabled={busy || answering} onClick={() => void answer("WORK")}>WORK</button>
              <button type="button" className="btn-secondary" disabled={busy || answering} onClick={() => void answer("OFF")}>OFF</button>
            </div>
          </Panel>
        ) : (
          <Panel headingLevel={2} headingId="orient-situation" icon={<Crosshair size={18} />} label="SITUATION" wide
            source={o.situation.kind === "ERROR" ? <SourceTag>READ FAILED</SourceTag> : <SourceTag>{o.situation.source}</SourceTag>}>
            {o.situation.kind === "SHIFT" ? <>
              <p className="bf-value bf-value--xl">{o.situation.time}<small> {o.situation.sub}</small></p>
              <p className="bf-meta">{o.situation.line}</p>
            </> : o.situation.kind === "PLAIN" ? <p className="bf-meta">{o.situation.line}</p>
              : <p className="bf-meta" role="alert">Today's state couldn't be read. Your records are unchanged.</p>}
          </Panel>
        )}

        <Panel headingLevel={2} headingId="orient-you" icon={<Moon size={18} />} label="YOU" wide
          source={o.sleep.state === "KNOWN" ? <SourceTag garmin={o.sleep.source === "GARMIN"}>{o.sleep.source}</SourceTag> : <SourceTag>{o.sleep.state === "ERROR" ? "READ FAILED" : "NO RECORD"}</SourceTag>}>
          {o.sleep.state === "KNOWN" ? <>
            <p className={`bf-value${o.sleep.source === "GARMIN" ? " orientation__garmin" : ""}`}>{hm(o.sleep.minutes)}<small> main sleep</small></p>
            <p className="bf-meta">{o.sleep.band
              ? `${o.sleep.under ? "Under" : o.sleep.minutes > o.sleep.band.high ? "Over" : "In"} your ${o.sleep.band.kind === "WORK" ? "work-day" : "day-off"} range (${hm(o.sleep.band.low)}–${hm(o.sleep.band.high)}).`
              : "No usual range yet. BEYOND compares once it has learned yours."}</p>
          </> : <div className="orientation__row">
            <p className="bf-meta" role={o.sleep.state === "ERROR" ? "alert" : undefined}>{o.sleep.state === "ERROR" ? "Sleep couldn't be read. Your records are unchanged." : "No main sleep is recorded since the shift."}</p>
            {o.sleep.state === "ERROR" ? <button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY</button>
              : routes.onSleep && <button type="button" className="btn-secondary" onClick={routes.onSleep}>LOG SLEEP</button>}
          </div>}
          <div className="orientation__row orientation__row--rule">
            <span className="orientation__key">CHECK-IN</span>
            {o.checkIn.state === "DONE" ? <span className="orientation__value">Energy {o.checkIn.energy} · Stress {o.checkIn.stress} · Mood {o.checkIn.mood}</span>
              : o.checkIn.state === "ERROR" ? <span className="orientation__value" role="alert">Couldn't be read</span>
              : <button type="button" className="btn-primary" disabled={busy} onClick={routes.onCheckIn}>CHECK IN</button>}
          </div>
        </Panel>

        {o.delta && (
          <Panel headingLevel={2} headingId="orient-delta" icon={<MessageSquareText size={18} />} label="DELTA" wide source={<SourceTag>FROM YOUR RECORDS</SourceTag>}>
            <p className="orientation__delta">{o.delta}</p>
          </Panel>
        )}

        {o.recommendation ? (
          <Panel headingLevel={2} headingId="orient-rec" icon={<Target size={18} />} label="RECOMMENDATION" wide primary
            source={<span className={`orientation__tag orientation__tag--${o.recommendation.source === "ENGINE" ? "engine" : "draft"}`}>{o.recommendation.source === "ENGINE" ? "ENGINE" : "DRAFT"}</span>}>
            <p className="orientation__title">{o.recommendation.title}</p>
            <p className="bf-meta">{o.recommendation.rationale}</p>
            {o.recommendation.opensTrain && routes.onTrain && <div className="orientation__row"><span /><button type="button" className="btn-secondary" onClick={routes.onTrain}>OPEN TRAIN</button></div>}
          </Panel>
        ) : o.guidanceUnread ? <p className="bf-meta" role="alert">Today's advice couldn't be read. Your records are unchanged.</p> : null}

        {o.runway.length > 1 && (
          <Panel headingLevel={2} headingId="orient-runway" icon={<Route size={18} />} label={until ? `UNTIL ${until}` : "TODAY"} wide>
            <ol className="orientation__runway">
              {o.runway.map((r) => (
                <li key={`${r.kind}-${r.at}-${r.label}`} className={`orientation__step orientation__step--${r.kind.toLowerCase()}`}>
                  <span className="orientation__time">{r.time}</span>
                  <span className="orientation__what"><b>{r.label}</b>{r.detail && <small>{r.detail}</small>}</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}

        {o.actions.length > 0 && (
          <Panel headingLevel={2} headingId="orient-actions" icon={<ListChecks size={18} />} label={until ? `BEFORE ${until}` : "WORTH DOING"} wide source={<SourceTag>{o.actions.length} OF 2</SourceTag>}>
            {o.actions.map((a) => (
              <div key={a.kind === "COMMITMENT" ? a.obligationId : a.kind} className="orientation__row orientation__row--action">
                <p className="orientation__act">{a.line}<small>{a.detail}</small></p>
                {a.kind === "PREP" ? <button type="button" className="btn-secondary" onClick={routes.onPrep}>OPEN PREP</button>
                  : routes.onCommitment && <button type="button" className="btn-secondary" onClick={routes.onCommitment}>OPEN</button>}
              </div>
            ))}
          </Panel>
        )}
      </div>

      <div className="orientation__release">
        <p className="bf-meta">{o.release}</p>
        <button type="button" className="btn-primary orientation__enter" onClick={routes.onEnter}>ENTER TODAY</button>
        <button type="button" className="orientation__capture" onClick={routes.onCapture}>+ CAPTURE A THOUGHT</button>
      </div>
    </div>
  );
}
