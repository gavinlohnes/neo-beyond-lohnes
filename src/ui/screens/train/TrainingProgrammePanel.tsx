import { useEffect, useRef, useState } from "react";
import { buildSequenceProgramme, getProgrammeView, linkSequenceHomeForms } from "../../../application/trainingProgrammeQueries";
import { saveTrainingProgramme } from "../../../application/trainingProgramme";
import { ensureExactCustomTemplateSet } from "../../../application/customTemplateCommands";
import { GRAYSON_HOME_TEMPLATE_INPUTS } from "../../../domain/workout/homeTemplates";
import { mostRecentBoundaryAtOrBefore } from "../../../engine/dayRollover";
import { ROTATION_SLOTS, WEEKDAY_SLOTS, type AssignedTrainingProgramme, type TrainingProgramme } from "../../../domain/workout/trainingProgramme";
import type { WorkoutSession } from "../../../domain/common/types";
import type { SessionType } from "../../../domain/workout/types";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";
import "../../components/section.css";

const WEEKDAYS: Record<string, string> = { "1": "Monday", "2": "Tuesday", "3": "Wednesday", "4": "Thursday", "5": "Friday", "6": "Saturday", "0": "Sunday" };
const slotLabel = (slot: string) => WEEKDAYS[slot] ?? slot.replace("WORK", "Work day ").replace("OFF", "Day off ");
const emptyAssigned = (): AssignedTrainingProgramme => ({ mode: "ROTATION", slots: {} });
function RestorationDetail({ programme, templates }: { programme: TrainingProgramme; templates: readonly { id: string; name: string }[] }) {
  if (programme.mode === "SEQUENCE") return <>
    <p>Restore this exact sequence. Its preserved next member is {programme.members.find((member) => member.templateId === programme.startTemplateId)?.key ?? "unknown"}. Current sequence history remains recorded.</p>
    <ol>{programme.members.map((member) => <li key={member.key}><b>{member.key}</b> · {member.snapshot.name}{member.templateId === programme.startTemplateId ? " · NEXT" : ""}</li>)}</ol>
  </>;
  return <>
    <p>Restore these prior {programme.mode === "WEEKDAYS" ? "weekday" : "work/day-off"} assignments. Current sequence history remains recorded.</p>
    <ul>{Object.entries(programme.slots).map(([slot, templateId]) => <li key={slot}><b>{slotLabel(slot)}</b> · {templates.find((template) => template.id === templateId)?.name ?? `Unavailable template (${templateId})`}</li>)}</ul>
  </>;
}

export function TrainingProgrammePanel({ onStart, onProgrammeChanged, capacityForm, selectedForm, disabled = false, startDisabled = false, active = true, refreshKey = 0, now }: {
  onStart: (templateId: string, capacityForm?: SessionType, programmeContext?: WorkoutSession["programmeContext"]) => void;
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
  const [homeEditing, setHomeEditing] = useState(false);
  const [homeIds, setHomeIds] = useState<[string, string, string]>(["", "", ""]);
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
      setHomeEditing(false);
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

  async function saveHomeLinks(sequence: NonNullable<Awaited<ReturnType<typeof getProgrammeView>>["sequence"]>) {
    if (!data || data.revision.programme?.mode !== "SEQUENCE" || !sequence.nextMember) return;
    try {
      const linked = linkSequenceHomeForms(data.revision.programme, homeIds, data.customTemplates, sequence.nextMember.templateId);
      await save(linked, "HOME forms linked. Current next member was preserved. No workout was started.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "HOME forms couldn't be linked."); }
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
        {sequence.nextMember?.home && !sequence.nextMember.issue && !sequence.nextMember.home.issue && data.revision.id && <button type="button" className="btn-primary" disabled={disabled || startDisabled || busy} onClick={() => onStart(sequence.nextMember!.home!.templateId, "STANDARD", { programmeRevisionId: data.revision.id!, memberKey: sequence.nextMember!.key, parentTemplateId: sequence.nextMember!.templateId, form: "HOME" })}>START HOME · {sequence.nextMember.key}</button>}
        {sequence.status === "READY" && sequence.nextMember
          ? <p role="status">START NEXT is ready in the command surface above.</p>
          : <p role="status">Guided start is paused. Review the sequence before GRAYSON names a next workout. Direct workout choice remains available above.</p>}
        <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={beginActivation}>REVIEW OR REPLACE SEQUENCE</button>
        <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => { editingVersion.current = data.revision.id; setHomeIds(sequence.members.map((member) => member.home?.templateId ?? "") as [string, string, string]); setHomeEditing(true); }}>SET UP HOME FORMS</button>
        <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => { editingVersion.current = data.revision.id; setPendingAction("UNDO"); }}>UNDO ACTIVATION</button>
        <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => { editingVersion.current = data.revision.id; setPendingAction("DEACTIVATE"); }}>DEACTIVATE</button>
        {pendingAction && <div className="quiet-fact" role="group" aria-label={pendingAction === "UNDO" ? "Confirm activation undo" : "Confirm programme deactivation"}>
          <h3>{pendingAction === "UNDO" ? "Restore the programme from before this activation?" : "Deactivate this programme?"}</h3>
          {pendingAction === "UNDO" ? sequence.previousProgramme
            ? <RestorationDetail programme={sequence.previousProgramme} templates={data.templates} />
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

      {homeEditing && sequence && data.revision.programme?.mode === "SEQUENCE" && <fieldset disabled={busy || disabled} style={{ minWidth: 0 }}><legend>Review HOME forms</legend>
        <p className="meta">HOME stays attached to the same A, B or C member. It advances only after a completed linked HOME workout with recorded work.</p>
        {sequence.members.map((member, index) => <label key={member.key} style={{ display: "block", marginTop: 8 }}>HOME {member.key}<select aria-label={`HOME ${member.key}`} style={{ width: "100%" }} value={homeIds[index]} onChange={(event) => setHomeIds((old) => { const next = [...old] as [string, string, string]; next[index] = event.target.value; return next; })}><option value="">Choose a bodyweight workout</option>{data.customTemplates.filter((template) => template.exercises.every((exercise) => exercise.exerciseId.startsWith("home-"))).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>)}
        {homeIds.map((id, index) => { const template = data.customTemplates.find((item) => item.id === id); return template ? <div key={id} className="quiet-fact"><h3>{sequence.members[index]!.key} · {template.name}</h3><ol>{template.exercises.map((exercise) => <li key={exercise.exerciseId}>{exercise.name} · {exercise.sets} × {exercise.repRangeLow}–{exercise.repRangeHigh}</li>)}</ol></div> : null; })}
        {data.customTemplates.filter((template) => template.exercises.every((exercise) => exercise.exerciseId.startsWith("home-"))).length < 3 && <button type="button" className="btn-secondary" onClick={() => void (async () => { try { setBusy(true); const created = await ensureExactCustomTemplateSet(GRAYSON_HOME_TEMPLATE_INPUTS); setHomeIds(created.map((template) => template.id) as [string, string, string]); setReceipt("Bodyweight HOME options are ready for review. They are not linked yet."); setKey((value) => value + 1); } catch (cause) { setError(cause instanceof Error ? cause.message : "HOME options couldn't be created."); } finally { setBusy(false); } })()}>CREATE BODYWEIGHT HOME OPTIONS</button>}
        <button type="button" className="btn-primary" disabled={homeIds.some((id) => !id) || new Set(homeIds).size !== 3 || !sequence.nextMember} onClick={() => void saveHomeLinks(sequence)}>CONFIRM HOME LINKS</button>
        <button type="button" className="btn-secondary" onClick={() => setHomeEditing(false)}>CANCEL</button>
      </fieldset>}

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
