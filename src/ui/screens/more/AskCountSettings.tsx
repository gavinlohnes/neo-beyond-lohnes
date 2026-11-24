import { useEffect, useState } from "react";
import {
  clearAskCounts, readAskCountSettings, restoreAskCounts, writeAskCountSettings, type AskCountSettings as Settings,
} from "../../../application/askCounts";
import type { AskCount } from "../../../domain/askCounts";

/**
 * GRAYSON-ASKS-COUNT-001: his controls for counting GRAYSON's questions. Count asks on or off (default on), clear the
 * counts (with a confirm, then UNDO for 10 seconds), and hide the monthly review's ASKING LESS panel.
 */
export const ASK_CLEAR_UNDO_MS = 10_000;

export function AskCountSettings() {
  const [settings, setSettings] = useState<Settings>(readAskCountSettings);
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState<AskCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!cleared) return;
    const timer = setTimeout(() => setCleared(null), ASK_CLEAR_UNDO_MS);
    return () => clearTimeout(timer);
  }, [cleared]);
  const save = (next: Settings) => { writeAskCountSettings(next); setSettings(next); };
  return <div className="equipment-row" data-ask-count-setting>
    <p className="tool-label" style={{ marginBottom: 4 }}>COUNT GRAYSON'S QUESTIONS</p>
    <p className="card-body" style={{ marginBottom: 8 }}>{settings.on ? "On." : "Off. Nothing new is counted."} {settings.showPanel ? "Shown in the monthly review." : "Hidden from the monthly review."}</p>
    <p className="meta" style={{ marginBottom: 8 }}>Counts the questions the app puts to you, by area, so you can see it asking less. It measures the app, not you, and nothing else reads it.</p>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn-secondary" aria-pressed={settings.on} aria-label={`Count questions: ${settings.on ? "turn off" : "turn on"}`}
        onClick={() => save({ ...settings, on: !settings.on })}>{settings.on ? "TURN OFF" : "TURN ON"}</button>
      <button className="btn-secondary" aria-pressed={!settings.showPanel} aria-label={`Monthly review panel: ${settings.showPanel ? "hide" : "show"}`}
        onClick={() => save({ ...settings, showPanel: !settings.showPanel })}>{settings.showPanel ? "HIDE PANEL" : "SHOW PANEL"}</button>
      {!confirming && !cleared && <button className="btn-secondary" onClick={() => { setError(null); setConfirming(true); }}>CLEAR COUNTS</button>}
    </div>
    {confirming && <div role="group" aria-label="Clear the counts" style={{ marginTop: 8 }}>
      <p className="card-body" style={{ marginBottom: 8 }}>Clear every count? Counting starts again from now.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-secondary" onClick={() => void clearAskCounts().then((rows) => { setConfirming(false); setCleared(rows); },
          () => { setConfirming(false); setError("The counts couldn't be cleared. Nothing changed."); })}>CLEAR</button>
        <button className="btn-secondary" onClick={() => setConfirming(false)}>KEEP</button>
      </div>
    </div>}
    {cleared && <p className="card-body" role="status" style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      Counts cleared.
      <button className="btn-secondary" onClick={() => { const rows = cleared; setCleared(null); void restoreAskCounts(rows).catch(() => setError("The counts couldn't be put back.")); }}>UNDO</button>
    </p>}
    {error && <p className="meta" role="alert">{error}</p>}
  </div>;
}
