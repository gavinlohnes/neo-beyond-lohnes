import { useState } from "react";
import { retimeLog } from "../../application/commands";
import { resolveWhen } from "../../application/logTimes";
import { captureCommitFeedback } from "../feel/feedback";
import { describeError } from "../errorMessage";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * LOG-TIME-001: a log's time, and one tap to say when it really happened. Saves a LOG_RETIMED fact;
 * the log and its amount are untouched. Any time inside the same lived day.
 */
export function LogTimeEditor({ dayId, dayStartedAt, rootEventId, at, label, onSaved }: {
  dayId: string; dayStartedAt: string; rootEventId: string; at: string; label: string; onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(hhmm(at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) return <span className="log-time">
    <span>{hhmm(at)}</span>
    <button type="button" className="log-time__change" aria-label={`Change the time of ${label}, now ${hhmm(at)}`} onClick={() => { setValue(hhmm(at)); setError(null); setOpen(true); }}>CHANGE TIME</button>
  </span>;
  const save = async () => {
    const acknowledge = captureCommitFeedback();
    const next = resolveWhen({ kind: "AT", hhmm: value }, dayStartedAt, new Date());
    if (!next || saving) return;
    setSaving(true); setError(null);
    try { if (await retimeLog(dayId, rootEventId, next)) acknowledge("LIGHT"); setOpen(false); await onSaved(); }
    catch (e) { setError(describeError(e, "The time was not changed.")); }
    finally { setSaving(false); }
  };
  return <span className="log-time log-time--open">
    <input type="time" className="input" aria-label={`New time for ${label}`} value={value} disabled={saving} onChange={(e) => setValue(e.target.value)} />
    <button type="button" className="btn-secondary" disabled={saving || !value} onClick={() => void save()}>SAVE TIME</button>
    <button type="button" className="btn-secondary" disabled={saving} onClick={() => setOpen(false)}>CANCEL</button>
    {error && <span className="meta meta--error" role="alert">{error}</span>}
  </span>;
}
