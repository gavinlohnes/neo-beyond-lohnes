import "./lifeState.css";
import { useState } from "react";
import type { LifeStateReading } from "../../../application/lifeState";
import type { LifeFollowUp, LifeMomentReading } from "../../../application/lifeTransition";

/**
 * LIFE-STATE-001: what state BEYOND believes today is in (WORK RUN, RECOVERY, FLIP, FREE), in one calm line, with
 * where it came from one tap away. LIFE-STATE-002: on the day a state changes, the moment leads ("RUN OVER The run is
 * over. Recovery begins today."), and the run-over moment offers one optional plan item, written only on CONFIRM.
 * Read only otherwise; TODAY derives both readings in render. With no reading it shows nothing.
 */
export function LifeStateBand({ reading, moment = null, followUpPlanned = false, busy = false, onAddFollowUp }: {
  reading: LifeStateReading | null;
  moment?: LifeMomentReading | null;
  followUpPlanned?: boolean;
  busy?: boolean;
  onAddFollowUp?: ((followUp: LifeFollowUp) => Promise<void>) | undefined;
}) {
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!reading) return null;
  const followUp = moment?.followUp ?? null;
  const confirm = () => {
    if (!followUp || !onAddFollowUp) return;
    setSaving(true); setError(null);
    void onAddFollowUp(followUp).then(() => { setSaved(followUp.title); setPreview(false); },
      () => setError("That couldn't be saved. Nothing changed.")).finally(() => setSaving(false));
  };
  return (
    <section className="today-life-state" data-life-state={reading.state} data-life-moment={moment?.moment} aria-label="Operating state">
      {moment && <p className="today-life-state__moment"><strong>{moment.label}</strong> <span>{moment.line}</span></p>}
      <p className="today-life-state__line"><strong>{reading.label}</strong> <span>{reading.line}</span></p>
      {followUp && onAddFollowUp && (saved
        ? <p className="meta" role="status">Added plan item for today: {saved}.</p>
        : followUpPlanned ? <p className="meta">“{followUp.title}” is already in today's plans.</p>
        : preview ? <div role="group" aria-label="Preview" className="equipment-row today-life-state__preview">
            <p className="meta" style={{ margin: 0 }}>Adds this plan item for today. Nothing else changes.</p>
            <p className="meta-strong" style={{ margin: "6px 0 0", color: "var(--text-1)" }}>{followUp.title}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button type="button" className="btn-primary" disabled={saving || busy} onClick={confirm}>CONFIRM</button>
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => setPreview(false)}>CANCEL</button>
            </div>
          </div>
        : <button type="button" className="btn-secondary today-life-state__follow" disabled={busy} onClick={() => setPreview(true)}>PLAN A LIGHT DAY</button>)}
      {error && <p className="meta" role="alert">{error}</p>}
      <details className="today-life-state__why">
        <summary>WHY {reading.label}</summary>
        <ul>{reading.why.map((line) => <li key={line} className="meta">{line}</li>)}</ul>
      </details>
    </section>
  );
}
