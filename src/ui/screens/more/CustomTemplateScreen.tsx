import { captureCommitFeedback } from "../../feel/feedback";
import { useEffect, useState } from "react";
import { archiveCustomTemplate } from "../../../application/customTemplateCommands";
import { getRoutineViews, type RoutineView } from "../../../application/routineEditQueries";
import { undoRoutineEdit } from "../../../application/routineEditCommands";
import { getActiveWorkoutSession } from "../../../application/trainQueries";
import { RoutineEditor, type RoutineSaved } from "../train/RoutineEditor";
import { describeError } from "../../errorMessage";

/**
 * TRAIN-CREATE-002 (Custom Workout Templates): the management surface in MORE. GRAYSON-ROUTINE-EDIT-001: creating and
 * editing open TRAIN's one routine editor (sets, rep range, rest, order, swap, add from his exercises or the bundled
 * library), with UNDO after every save. ARCHIVE stays here.
 */

function TemplateRow({ routine, busy, onArchive, onEdit }: { routine: RoutineView; busy: boolean; onArchive: () => void; onEdit: () => void }) {
  return (
    <div className="equipment-row" style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p className="card-body" style={{ margin: 0, fontWeight: 600, overflowWrap: "anywhere" }}>{routine.label}{routine.edited && <span className="meta"> · edited</span>}</p>
          <p className="meta" style={{ margin: 0, overflowWrap: "anywhere" }}>
            {routine.exercises.length} {routine.exercises.length === 1 ? "exercise" : "exercises"}:{" "}
            {routine.exercises.map((ex) => ex.name).join(", ")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button type="button" className="btn-secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 14, minHeight: 44 }} disabled={busy} aria-label={`Edit ${routine.label}`} onClick={onEdit}>EDIT</button>
          <button type="button" className="btn-secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 14, minHeight: 44 }} disabled={busy} onClick={onArchive}>ARCHIVE</button>
        </div>
      </div>
    </div>
  );
}

export function CustomTemplateScreen() {
  const [routines, setRoutines] = useState<RoutineView[]>([]);
  const [editing, setEditing] = useState<RoutineView | "NEW" | null>(null);
  const [workoutActive, setWorkoutActive] = useState(false);
  const [saved, setSaved] = useState<RoutineSaved | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    setRoutines((await getRoutineViews()).filter((r) => !r.builtIn));
    setWorkoutActive(Boolean(await getActiveWorkoutSession()));
  }

  async function withBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(describeError(e, "Something went wrong.")); } finally { setBusy(false); }
  }

  async function handleArchive(id: string) {
    await withBusy(async () => {
      const acknowledge = captureCommitFeedback();
      if (await archiveCustomTemplate(id)) acknowledge("HEAVY");
      setSaved(null);
      await refresh();
    });
  }

  if (editing) {
    return (
      <div className="intent-field">
        <RoutineEditor routine={editing === "NEW" ? null : editing} workoutActive={workoutActive}
          onCancel={() => setEditing(null)}
          onDone={async (text, result) => { setEditing(null); setSaved({ text, eventId: result?.eventId ?? null }); await refresh(); }} />
      </div>
    );
  }

  return (
    <div className="intent-field">
      <header className="intent-field__intro">
        <p className="tool-label">CUSTOM PROGRAMS</p>
        <p className="card-body">
          Build your own workout template from your exercises or the exercise library. Selectable in TRAIN alongside A/B/C — always your own choice, never suggested automatically. A, B and C are edited from TRAIN · ROUTINES.
        </p>
      </header>

      <section aria-labelledby="custom-template-heading">
        <h2 id="custom-template-heading" className="section-label">My templates</h2>
        {saved && <p className="routine-saved" role="status">{saved.text}{" "}
          {saved.eventId && <button type="button" className="btn-secondary routine-inline" disabled={busy}
            onClick={() => void withBusy(async () => { await undoRoutineEdit(saved.eventId!); setSaved({ text: "Undone. The routine is back as it was.", eventId: null }); await refresh(); })}>UNDO</button>}</p>}
        <div role="group" aria-label="My templates">
          {routines.length === 0 && <p className="empty-state">No custom templates yet.</p>}
          {routines.map((r) => (
            <TemplateRow key={r.templateId} routine={r} busy={busy} onArchive={() => void handleArchive(r.templateId)} onEdit={() => { setSaved(null); setEditing(r); }} />
          ))}
        </div>
        <button type="button" className="btn-secondary" style={{ marginTop: 12 }} disabled={busy} onClick={() => { setSaved(null); setEditing("NEW"); }}>CREATE TEMPLATE</button>
      </section>
      {error && <p className="meta meta--error" role="alert">{error}</p>}
    </div>
  );
}
