import { useEffect, useRef, useState } from "react";
import { getKeyMomentAlerts, setKeyMomentAlerts } from "../../../application/keyMomentAlerts";
import type { KeyMomentAlertSettings, KeyMomentKind } from "../../../domain/common/types";
import { describeError } from "../../errorMessage";

/**
 * BRIDGE-NOTIFY-001 (Gavin, 2026-11-15; BEYOND-4.0 decision 5): each key-moment kind easy to turn off, and quiet
 * hours. Saved as soon as it's changed; the phone gets them with the plan at the next SYNC GARMIN. Each change applies to
 * the latest settings (not the last render) and saves run one after another, so quick taps never drop a change.
 */
const KINDS: { kind: KeyMomentKind; label: string; when: string }[] = [
  { kind: "BEFORE_SHIFT", label: "Before the shift", when: "30 minutes before it starts" },
  { kind: "SHIFT_DONE", label: "Shift's done", when: "At its end; the last of a run says days off start" },
  { kind: "TASK_DUE", label: "Task due", when: "16:00 on its day" },
  { kind: "WAKE", label: "Up for the shift", when: "3 hours before it starts" },
];
const DEFAULT_QUIET = { quietFrom: "08:00", quietTo: "14:00" };

export function KeyMomentAlerts() {
  const [settings, setSettings] = useState<KeyMomentAlertSettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const latest = useRef<KeyMomentAlertSettings | null>(null);
  const saved = useRef<KeyMomentAlertSettings | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let live = true;
    void getKeyMomentAlerts().then((s) => { if (live) { latest.current = s; saved.current = s; setSettings(s); } });
    return () => { live = false; };
  }, []);
  if (!settings) return null;

  function change(update: (current: KeyMomentAlertSettings) => KeyMomentAlertSettings) {
    if (!latest.current) return;
    const next = update(latest.current);
    latest.current = next;
    setSettings(next);
    saving.current = saving.current.then(async () => {
      try {
        await setKeyMomentAlerts(next);
        saved.current = next;
        setStatus("Saved. Your phone gets it at the next SYNC GARMIN.");
      } catch (e) {
        // Back to what is actually stored; a later queued change still applies on top of it.
        if (latest.current === next && saved.current) { latest.current = saved.current; setSettings(saved.current); }
        setStatus(describeError(e, "Could not save."));
      }
    });
  }
  const quietOn = settings.quietFrom !== null && settings.quietTo !== null;

  return (
    <section aria-label="Key-moment alerts" style={{ marginTop: 24 }}>
      <p className="section-label">Key-moment alerts</p>
      <p className="meta" style={{ marginBottom: 8 }}>
        Health Bridge notifications, at most 3 a day. When a day has more, the earlier kinds in this list win.
        Nothing sounds during a shift of your standing rotation (swaps, overtime and corrected shift times aren't
        counted yet).
      </p>
      {KINDS.map(({ kind, label, when }) => {
        const on = !settings.off.includes(kind);
        return (
          <div className="card" key={kind} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <h2 className="card-title">{label}</h2>
              <p className="meta">{when}</p>
            </div>
            <button
              type="button"
              className={`chip ${on ? "chip--selected" : ""}`}
              aria-pressed={on}
              aria-label={`${label} alert`}
              onClick={() => change((s) => ({ ...s, off: s.off.includes(kind) ? s.off.filter((k) => k !== kind) : [...s.off, kind] }))}
            >
              {on ? "ON" : "OFF"}
            </button>
          </div>
        );
      })}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h2 className="card-title">Quiet hours</h2>
            <p className="meta">No alerts in this window, every day.</p>
          </div>
          <button
            type="button"
            className={`chip ${quietOn ? "chip--selected" : ""}`}
            aria-pressed={quietOn}
            aria-label="Quiet hours"
            onClick={() => change((s) => (s.quietFrom !== null && s.quietTo !== null ? { ...s, quietFrom: null, quietTo: null } : { ...s, ...DEFAULT_QUIET }))}
          >
            {quietOn ? "ON" : "OFF"}
          </button>
        </div>
        {quietOn && (
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="meta">From</span>
              <input className="input" type="time" value={settings.quietFrom ?? ""} onChange={(e) => { const v = e.target.value; if (v) change((s) => ({ ...s, quietFrom: v })); }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="meta">Until</span>
              <input className="input" type="time" value={settings.quietTo ?? ""} onChange={(e) => { const v = e.target.value; if (v) change((s) => ({ ...s, quietTo: v })); }} />
            </label>
          </div>
        )}
      </div>
      {status && <p className="meta" role="status">{status}</p>}
    </section>
  );
}
