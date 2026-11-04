import { useEffect, useState } from "react";
import {
  AUTOMATION_EVENTS, automationAllowsValue, readAutomationConfig, readAutomationSends,
  saveAutomationConfig, sendAutomationTest, type AutomationConfig, type AutomationEvent,
} from "../../../application/iftttAutomations";
import { describeError } from "../../errorMessage";

const LABEL: Record<AutomationEvent, string> = {
  work_started: "Work started", work_ended: "Work ended", workout_finished: "Workout finished",
  day_started: "Day started", routine_finished: "Routine finished",
};

export function AutomationsScreen({ active }: { active: boolean }) {
  const [draft, setDraft] = useState<AutomationConfig>(() => readAutomationConfig());
  const [sends, setSends] = useState(() => readAutomationSends());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    if (!active) return;
    const refresh = () => setSends(readAutomationSends());
    window.addEventListener("beyond-ifttt-log", refresh);
    return () => window.removeEventListener("beyond-ifttt-log", refresh);
  }, [active]);
  const toggle = (event: AutomationEvent, key: "events" | "includeValue") => setDraft((current) => ({
    ...current, [key]: current[key].includes(event) ? current[key].filter((item) => item !== event) : [...current[key], event],
  }));
  return <section className="automations-screen" aria-label="IFTTT automations">
    <p className="meta">Optional outgoing Webhooks. Off until you save it on. One attempt per event; failures never retry themselves.</p>
    <label>IFTTT Webhooks key<input className="input" type="password" autoComplete="off" value={draft.key}
      onChange={(event) => setDraft({ ...draft, key: event.target.value })} /></label>
    <label className="setting-row automation-choice"><input type="checkbox" checked={draft.enabled}
      onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />Automations on</label>
    <fieldset><legend>Send when</legend>
      {AUTOMATION_EVENTS.map((event) => <div className="automation-event" key={event}>
        <label className="automation-choice"><input type="checkbox" checked={draft.events.includes(event)} onChange={() => toggle(event, "events")} />{LABEL[event]}</label>
        {automationAllowsValue(event) && <label className="meta automation-choice"><input type="checkbox" checked={draft.includeValue.includes(event)}
          onChange={() => toggle(event, "includeValue")} />Include non-sensitive value</label>}
      </div>)}
    </fieldset>
    <div className="button-row">
      <button type="button" className="btn-primary" onClick={() => {
        setError(""); setMessage("");
        try { saveAutomationConfig(draft); setDraft(readAutomationConfig()); setMessage("Automation settings saved on this phone."); }
        catch (cause) { setError(describeError(cause, "Settings could not be saved on this phone.")); }
      }}>SAVE AUTOMATIONS</button>
      <button type="button" className="btn-secondary" disabled={testing} onClick={() => {
        setTesting(true); setError(""); setMessage("");
        void sendAutomationTest(draft.key).then(() => setMessage("Test sent."), (cause) => setError(describeError(cause, "Test failed."))).finally(() => setTesting(false));
      }}>{testing ? "SENDING…" : "TEST"}</button>
    </div>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    <p className="section-label">Last sends on this phone</p>
    {!sends.length ? <p className="meta">No sends yet.</p> : <ol className="automation-log">{sends.map((send) =>
      <li key={send.id}><strong>{send.event.replaceAll("_", " ")}</strong> · {send.ok ? "sent" : "failed · " + send.error}<br />
        <span className="meta">{new Date(send.time).toLocaleString()}</span></li>)}</ol>}
    <p className="meta">The key and send log stay in this browser only. They are not included in BEYOND backups or exports.</p>
  </section>;
}
