import { useEffect, useRef, useState } from "react";
import { buildSequenceProgramme, getProgrammeView } from "../../../application/trainingProgrammeQueries";
import { saveTrainingProgramme } from "../../../application/trainingProgramme";
import { mostRecentBoundaryAtOrBefore } from "../../../engine/dayRollover";
import { ROTATION_SLOTS, WEEKDAY_SLOTS, type AssignedTrainingProgramme, type TrainingProgramme } from "../../../domain/workout/trainingProgramme";
import type { SessionType } from "../../../domain/workout/types";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";
import "../../components/section.css";

const WEEKDAYS: Record<string, string> = { "1": "Monday", "2": "Tuesday", "3": "Wednesday", "4": "Thursday", "5": "Friday", "6": "Saturday", "0": "Sunday" };
const slotLabel = (slot: string) => WEEKDAYS[slot] ?? slot.replace("WORK", "Work day ").replace("OFF", "Day off ");
const emptyAssigned = (): AssignedTrainingProgramme => ({ mode: "ROTATION", slots: {} });
const describeRestoration = (programme: TrainingProgramme) => programme.mode === "SEQUENCE"
  ? `Restore its A → B → C sequence beginning from the preserved next member ${programme.members.find((member) => member.templateId === programme.startTemplateId)?.key ?? "unknown"}.`
  : `Restore the prior ${programme.mode === "WEEKDAYS" ? "weekday" : "work/day-off"} assignments.`;

export function TrainingProgrammePanel({ onStart, onProgrammeChanged, capacityForm, selectedForm, disabled = false, startDisabled = false, active = true, refreshKey = 0, now }: {
  onStart: (templateId: string, capacityForm?: SessionType) => void;
  onProgrammeChanged?: () => void;
  capacityForm: SessionType;
  selectedForm: SessionType;
  disabled?: boolean;
  startDisabled?: boolean;
  active?: boolean;
  refreshKey?: number;
  now?: Date;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getProgrammeView>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [draft, setDraft] = useState<AssignedTrainingProgramme>(emptyAssigned());
  const [memberIds, setMemberIds] = useState<[string, string, string]>(["", "", ""]);
  const [startId, setStartId] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"UNDO" | "DEACTIVATE" | null>(null);
  const saving = useRef(false);
  const editingVersion = useRef<string | null>(null);
  const boundaryKey = mostRecentBoundaryAtOrBefore(now ?? new Date()).getTime();
  useDayRolloverRefresh(() => setKey((value) => value + 1));

  useEffect(() => {
    if (!active) return;
    let current = true;
    setData(null);
    setError(null);
    void getProgrammeView(now).then((value) => { if (current) setData(value); }).catch((cause: unknown) => {
      if (current) setError(cause instanceof Error ? cause.message : "Programme couldn't be read.");
    });
    return () => { current = false; };
  }, [active, boundaryKey, key, now, refreshKey]);

  async function save(value: TrainingProgramme | null, success: string) {
    if (!data || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await saveTrainingProgramme(value, editingVersion.current);
      setData(null);
      setEditing(false);
      setActivating(false);
      setPendingAction(null);
      setReceipt(success);
      setKey((value) => value + 1);
      onProgrammeChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Programme couldn't be saved.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function beginActivation() {
    if (!data) return;
    editingVersion.current = data.revision.id;
    setMemberIds(["", "", ""]);
    setStartId("");
    setActivating(true);
    setEditing(false);
    setReceipt(null);
  }

  function beginAssignments() {
    if (!data) return;
    editingVersion.current = data.revision.id;
    const current = data.revision.programme;
    setDraft(current && current.mode !== "SEQUENCE" ? { ...current, slots: { ...current.slots } } : emptyAssigned());
    setEditing(true);
    setActivating(false);
    setReceipt(null);
  }

  const plannedTemplate = data?.templates.find((template) => template.id === data.planned.templateId);
  const sequence = data?.sequence ?? null;
  const selectedTemplates = memberIds.map((id) => data?.customTemplates.find((template) => template.id === id));
  const activationReady = memberIds.every(Boolean) && new Set(memberIds).size === 3 && selectedTemplates.every(Boolean) && memberIds.includes(startId);
  const standing = !data ? "Your programme" : sequence
    ? sequence.status === "READY" ? `Next: ${sequence.nextMember?.key ?? "—"} · ${sequence.nextMember?.name ?? "Unknown"}` : "Sequence needs review"
    : !data.revision.programme ? "No programme set"
      : !data.rotationAvailable && data.revision.programme.mode === "ROTATION" ? "Schedule not saved"
        : plannedTemplate ? `Today: ${plannedTemplate.name}` : data.planned.templateId ? "Template no longer available" : "Nothing assigned today";

  return <section className="suit-panel bx-section" aria-label="My programme" aria-busy={busy || (active && !data && !error)}>
    <header className="bx-head"><div><p className="bx-eyebrow">MY PROGRAMME</p><h2 className="bx-title">{standing}</h2></div></header>
    {active && !data && !error && <p className="suit-panel__loading">Reading your programme…</p>}
    {error && <p role="alert">{error}<button type="button" className="btn-secondary" onClick={() => { setEditing(false); setActivating(false); setKey((value) => value + 1); }}>RELOAD PROGRAMME</button></p>}
    {data && <>
      {sequence ? <>
        <p className="meta"><b>A → B → C</b> · advances by qualifying completed training, never by weekday. Missed time creates no debt.</p>
        <ol className="train-prescription train-prescription--preview" aria-label="Active programme sequence">
          {sequence.members.map((member) => <li key={member.key}><span className="train-prescription-index">{member.key}</span><span>{member.name}</span><span className="meta">{member.issue ? member.issue.toLowerCase() : member.templateId === sequence.nextMember?.templateId ? "NEXT" : "READY"}</span></li>)}
        </ol>
        <p className="meta"><b>Capacity guidance:</b> {capacityForm}. <b>Selected start form:</b> {selectedForm}. The sequence chooses what to train; capacity guidance and your explicit choice still choose how.</p>
        <p className="meta"><b>WHY:</b> {sequence.why}</p>
        {sequence.status === "READY" && sequence.nextMember
          ? <p role="status">START NEXT is ready in the command surface above.</p>
          : <p role="status">Guided start is paused. Review the sequence before GRAYSON names a next workout. Direct workout choice remains available above.</p>}
        <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={beginActivation}>REVIEW OR REPLACE SEQUENCE</button>
        <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => { editingVersion.current = data.revision.id; setPendingAction("UNDO"); }}>UNDO ACTIVATION</button>
        <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => { editingVersion.current = data.revision.id; setPendingAction("DEACTIVATE"); }}>DEACTIVATE</button>
        {pendingAction && <div className="quiet-fact" role="group" aria-label={pendingAction === "UNDO" ? "Confirm activation undo" : "Confirm programme deactivation"}>
          <h3>{pendingAction === "UNDO" ? "Restore the programme from before this activation?" : "Deactivate this programme?"}</h3>
          {pendingAction === "UNDO" ? sequence.previousProgramme
            ? <p>{describeRestoration(sequence.previousProgramme)} Current sequence history remains recorded.</p>
            : <p>No restorable prior programme is available. Confirming leaves no active programme; workout history remains recorded.</p>
            : <p>The A → B → C sequence will stop guiding START NEXT. Saved templates and workout history remain unchanged.</p>}
          <button type="button" className="btn-primary" onClick={() => void save(pendingAction === "UNDO" ? sequence.previousProgramme : null, pendingAction === "UNDO" ? sequence.previousProgramme ? "Activation undone. Your prior programme was restored." : "Activation undone. No prior programme was set." : "Programme deactivated. Past workouts are unchanged.")}>{pendingAction === "UNDO" ? "CONFIRM RESTORE" : "CONFIRM DEACTIVATE"}</button>
          <button type="button" className="btn-secondary" onClick={() => setPendingAction(null)}>CANCEL</button>
        </div>}
      </> : data.revision.programme ? <>
        <p className="meta">Planned today: {!data.rotationAvailable && data.revision.programme.mode === "ROTATION" ? "Schedule not saved" : plannedTemplate?.name ?? (data.planned.templateId ? "Template no longer available" : "No assigned session")}{data.revision.programme.mode === "ROTATION" && data.rotationAvailable && data.forecast ? " · schedule forecast" : ""}</p>
        {!data.rotationAvailable && data.revision.programme.mode === "ROTATION" && <p className="meta">Save a work schedule to resolve rotation slots.</p>}
        {plannedTemplate && <button type="button" className="btn-secondary" disabled={disabled || startDisabled || busy} onClick={() => onStart(plannedTemplate.id)}>START PLANNED WORKOUT</button>}
        <p className="meta">Your own plan. Existing capacity and recovery advice still applies. Skipping changes nothing.</p>
        <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={beginAssignments}>EDIT PROGRAMME</button>
        <button type="button" className="btn-secondary" disabled={disabled || busy || data.customTemplates.length < 3} onClick={beginActivation}>ACTIVATE A → B → C</button>
      </> : <>
        <p className="meta">Activate three saved custom workouts as one sequence, or assign templates to weekdays or work/day-off slots. Neither changes recovery authority.</p>
        <button type="button" className="btn-primary" disabled={disabled || busy || data.customTemplates.length < 3} onClick={beginActivation}>ACTIVATE A → B → C</button>
        {data.customTemplates.length < 3 && <p className="meta">Save three custom workout templates before activating a sequence.</p>}
        <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={beginAssignments}>EDIT PROGRAMME</button>
      </>}

      {activating && <fieldset disabled={busy || disabled} style={{ minWidth: 0 }}><legend>Review A → B → C activation</legend>
        {(["A", "B", "C"] as const).map((memberKey, index) => <label key={memberKey} style={{ display: "block", marginTop: 8 }}>{memberKey}<select aria-label={`Sequence ${memberKey}`} style={{ width: "100%" }} value={memberIds[index]} onChange={(event) => setMemberIds((old) => { const next = [...old] as [string, string, string]; next[index] = event.target.value; if (!startId || !next.includes(startId)) setStartId(next[0]); return next; })}><option value="">Choose a saved workout</option>{data.customTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>)}
        <label style={{ display: "block", marginTop: 8 }}>Begin with<select aria-label="First sequence member" style={{ width: "100%" }} value={startId} onChange={(event) => setStartId(event.target.value)}>{memberIds.map((id, index) => id && <option key={`${id}-${index}`} value={id}>{(["A", "B", "C"] as const)[index]}</option>)}</select></label>
        {!activationReady && <p className="meta">Choose three different, available custom workouts.</p>}
        {selectedTemplates.map((template, index) => template && <div key={`${template.id}-${index}`} className="quiet-fact"><h3>{(["A", "B", "C"] as const)[index]} · {template.name}</h3><ol>{template.exercises.map((exercise) => <li key={exercise.exerciseId}>{exercise.name} · {exercise.sets} × {exercise.repRangeLow}–{exercise.repRangeHigh}</li>)}</ol></div>)}
        <p className="meta">CONFIRM stores these exact reviewed templates. STANDARD complete with a working set advances; STANDARD partial holds. REDUCED complete or partial with a working set advances. Recovery, abandoned, zero-set and non-member sessions hold.</p>
        <button type="button" className="btn-primary" disabled={!activationReady} onClick={() => { editingVersion.current = data.revision.id; void save(buildSequenceProgramme(memberIds, data.customTemplates, startId), "A → B → C activated. No workout was started."); }}>CONFIRM ACTIVATION</button>
        <button type="button" className="btn-secondary" onClick={() => setActivating(false)}>CANCEL</button>
      </fieldset>}

      {editing && <fieldset disabled={busy || disabled} style={{ minWidth: 0 }}><legend>Programme assignments</legend><label>Follow<select aria-label="Programme mode" value={draft.mode} onChange={(event) => setDraft({ mode: event.target.value as AssignedTrainingProgramme["mode"], slots: {} })}><option value="ROTATION">Work day / day off rotation</option><option value="WEEKDAYS">Weekdays</option></select></label>
        {(draft.mode === "WEEKDAYS" ? WEEKDAY_SLOTS : ROTATION_SLOTS).map((slot) => <label key={slot} style={{ display: "block", marginTop: 8 }}>{slotLabel(slot)}<select aria-label={slotLabel(slot)} style={{ width: "100%" }} value={draft.slots[slot] ?? ""} onChange={(event) => setDraft((old) => { const slots = { ...old.slots }; if (event.target.value) slots[slot] = event.target.value; else delete slots[slot]; return { ...old, slots }; })}><option value="">No assigned session</option>{draft.slots[slot] && !data.templates.some((template) => template.id === draft.slots[slot]) && <option value={draft.slots[slot]}>Unavailable template</option>}{data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>)}
        <p className="meta">SAVE confirms these assignments. Days beyond a third consecutive work/off day remain unassigned.</p><button type="button" className="btn-primary" onClick={() => void save(draft, "Programme saved. No workout was started.")}>SAVE PROGRAMME</button><button type="button" className="btn-secondary" onClick={() => setEditing(false)}>CANCEL</button>
        {data.revision.programme && <button type="button" className="btn-secondary" onClick={() => void save(null, "Programme cleared. Past workouts are unchanged.")}>CONFIRM CLEAR PROGRAMME</button>}
      </fieldset>}
      {receipt && <p role="status">{receipt}</p>}
    </>}
  </section>;
}
