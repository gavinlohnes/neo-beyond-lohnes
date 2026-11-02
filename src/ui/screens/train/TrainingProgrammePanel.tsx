import { mostRecentBoundaryAtOrBefore } from "../../../engine/dayRollover";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";
import { useEffect, useRef, useState } from "react";
import { getProgrammeView } from "../../../application/trainingProgrammeQueries";
import { saveTrainingProgramme } from "../../../application/trainingProgramme";
import { WEEKDAY_SLOTS, ROTATION_SLOTS, type TrainingProgramme } from "../../../domain/workout/trainingProgramme";
const WEEKDAYS: Record<string, string> = { "1": "Monday", "2": "Tuesday", "3": "Wednesday", "4": "Thursday", "5": "Friday", "6": "Saturday", "0": "Sunday" };
const slotLabel = (slot: string) => WEEKDAYS[slot] ?? slot.replace("WORK", "Work day ").replace("OFF", "Day off ");
export function TrainingProgrammePanel({ onStart, disabled = false, startDisabled = false, active = true, refreshKey = 0, now }: { onStart: (templateId: string) => void; disabled?: boolean; startDisabled?: boolean; active?: boolean; refreshKey?: number; now?: Date | undefined }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getProgrammeView>> | null>(null), [error, setError] = useState<string | null>(null), [key, setKey] = useState(0);
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<TrainingProgramme>({ mode: "ROTATION", slots: {} }), [busy, setBusy] = useState(false), [receipt, setReceipt] = useState<string | null>(null);
  const saving = useRef(false);
  const editingVersion = useRef<string | null>(null);
  const boundaryKey = mostRecentBoundaryAtOrBefore(now ?? new Date()).getTime();
  useDayRolloverRefresh(() => setKey((n) => n + 1));
  useEffect(() => {
    if (!active) return;
    let current = true; setData(null); setError(null);
    void getProgrammeView(now).then((v) => { if (current) setData(v); }).catch((e: unknown) => { if (current) setError(e instanceof Error ? e.message : "Programme couldn't be read."); });
    return () => { current = false; };
  }, [key, refreshKey, now, active, boundaryKey]);
  async function save(value: TrainingProgramme | null) {
    if (!data || saving.current) return;
    saving.current = true; setBusy(true); setError(null);
    try {
      await saveTrainingProgramme(value, editingVersion.current);
      setData(null); setEditing(false); setReceipt(value ? "Programme saved. No workout was started." : "Programme cleared. Past workouts are unchanged."); setKey((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Programme couldn't be saved."); }
    finally { saving.current = false; setBusy(false); }
  }
  const template = data?.templates.find((t) => t.id === data.planned.templateId);
  return <section className="suit-panel" aria-label="My programme" aria-busy={busy || (active && !data && !error)}><h2 className="suit-panel__title">MY PROGRAMME</h2>
    {active && !data && !error && <p className="suit-panel__loading">Reading your programme…</p>}
    {error && <p role="alert">{error}<button type="button" className="btn-secondary" onClick={() => { setEditing(false); setKey((n) => n + 1); }}>RELOAD PROGRAMME</button></p>}
    {data && <>
      {data.revision.programme ? <><p className="meta">Planned today: {!data.rotationAvailable && data.revision.programme.mode === "ROTATION" ? "Schedule not saved" : template?.name ?? (data.planned.templateId ? "Template no longer available" : "No assigned session")}{data.revision.programme.mode === "ROTATION" && data.rotationAvailable && data.forecast ? " · schedule forecast" : ""}</p>
        {!data.rotationAvailable && data.revision.programme.mode === "ROTATION" && <p className="meta">Save a work schedule to resolve rotation slots.</p>}
        {template && <button type="button" className="btn-secondary" disabled={disabled || startDisabled || busy} onClick={() => onStart(template.id)}>START PLANNED WORKOUT</button>}
        <p className="meta">Your own plan. The existing capacity and recovery advice still applies. Skipping changes nothing.</p>
      </> : <p className="meta">Assign existing templates to weekdays or work/day-off slots. This does not change recommendations.</p>}
      <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => { editingVersion.current = data.revision.id; setDraft(data.revision.programme ? { ...data.revision.programme, slots: { ...data.revision.programme.slots } } : { mode: "ROTATION", slots: {} }); setEditing(true); setReceipt(null); }}>EDIT PROGRAMME</button>
      {editing && <fieldset disabled={busy || disabled} style={{ minWidth: 0 }}><legend>Programme assignments</legend><label>Follow<select aria-label="Programme mode" value={draft.mode} onChange={(e) => setDraft({ mode: e.target.value as TrainingProgramme["mode"], slots: {} })}><option value="ROTATION">Work day / day off rotation</option><option value="WEEKDAYS">Weekdays</option></select></label>
        {(draft.mode === "WEEKDAYS" ? WEEKDAY_SLOTS : ROTATION_SLOTS).map((slot) => <label key={slot} style={{ display: "block", marginTop: 8 }}>{slotLabel(slot)}<select aria-label={slotLabel(slot)} style={{ width: "100%" }} value={draft.slots[slot] ?? ""} onChange={(e) => setDraft((old) => { const slots = { ...old.slots }; if (e.target.value) slots[slot] = e.target.value; else delete slots[slot]; return { ...old, slots }; })}><option value="">No assigned session</option>{draft.slots[slot] && !data.templates.some((t) => t.id === draft.slots[slot]) && <option value={draft.slots[slot]}>Unavailable template</option>}{data.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>)}
        <p className="meta">SAVE confirms these assignments. Days beyond a third consecutive work/off day remain unassigned.</p><button type="button" className="btn-primary" onClick={() => void save(draft)}>SAVE PROGRAMME</button><button type="button" className="btn-secondary" onClick={() => setEditing(false)}>CANCEL</button>
        {data.revision.programme && <button type="button" className="btn-secondary" onClick={() => void save(null)}>CONFIRM CLEAR PROGRAMME</button>}
      </fieldset>}
      {receipt && <p role="status">{receipt}</p>}
    </>}
  </section>;
}
