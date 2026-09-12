import { useEffect, useState } from "react";
import type { CustomExercise } from "../../../domain/workout/customExercise";
import { EXERCISE_LIBRARY, searchLibraryExercises, type LibraryExercise, type MuscleGroup } from "../../../domain/workout/exerciseLibrary";
import { getCustomExercises } from "../../../application/exerciseLibraryQueries";
import { archiveCustomExercise, createCustomExercise } from "../../../application/exerciseLibraryCommands";
import { FieldDisclosure } from "../../components/FieldDisclosure";

/**
 * TRAIN-CREATE-001 (Personal Exercise Library). The one dedicated
 * management surface, reachable from MORE (same placement pattern as the
 * Decision Journal and Missions & Obligations), not a new primary
 * bottom-nav destination. Every mutation goes through
 * application/exerciseLibraryCommands.ts; EXERCISE_LIBRARY is pure,
 * inert domain data read directly (same precedent TrainScreen.tsx
 * already sets by importing WORKOUT_TEMPLATES/getReducedExercises
 * straight from the domain layer).
 *
 * Deliberately standalone: nothing here is consumed by TrainScreen yet,
 * and no saved exercise can be assembled into a new workout template —
 * both are explicitly out of this Drop's scope (see
 * docs/agent/drops/TRAIN-CREATE-001.md).
 */

const MUSCLE_GROUPS: MuscleGroup[] = ["Chest", "Back", "Shoulders", "Legs", "Glutes", "Arms", "Core", "Full Body"];

function ExerciseRow({ exercise, onArchive }: { exercise: CustomExercise; onArchive: () => void }) {
  return (
    <div className="equipment-row" style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <p className="card-body" style={{ margin: 0, fontWeight: 600 }}>{exercise.name}</p>
          <p className="meta" style={{ margin: 0 }}>
            {exercise.muscleGroup} · {exercise.equipment} · {exercise.repRangeLow}-{exercise.repRangeHigh} reps
          </p>
          {exercise.notes && <p className="meta" style={{ margin: 0 }}>{exercise.notes}</p>}
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ width: "auto", padding: "4px 10px", fontSize: 14, flexShrink: 0 }}
          onClick={onArchive}
        >
          ARCHIVE
        </button>
      </div>
    </div>
  );
}

export function ExerciseLibraryScreen() {
  const [exercises, setExercises] = useState<CustomExercise[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState<LibraryExercise[]>(EXERCISE_LIBRARY);

  const [customName, setCustomName] = useState("");
  const [customMuscleGroup, setCustomMuscleGroup] = useState<MuscleGroup>("Chest");
  const [customEquipment, setCustomEquipment] = useState("");
  const [customRepLow, setCustomRepLow] = useState("8");
  const [customRepHigh, setCustomRepHigh] = useState("12");
  const [customNotes, setCustomNotes] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setLibraryResults(searchLibraryExercises(query));
  }, [query]);

  async function refresh() {
    setExercises(await getCustomExercises());
  }

  async function withBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddFromLibrary(lib: LibraryExercise) {
    await withBusy(async () => {
      await createCustomExercise({
        name: lib.name,
        muscleGroup: lib.muscleGroup,
        equipment: lib.equipment,
        repRangeLow: lib.repRangeLow,
        repRangeHigh: lib.repRangeHigh,
        libraryExerciseId: lib.id,
      });
      await refresh();
    });
  }

  async function handleAddCustom() {
    if (!customName.trim() || !customEquipment.trim()) return;
    await withBusy(async () => {
      await createCustomExercise({
        name: customName.trim(),
        muscleGroup: customMuscleGroup,
        equipment: customEquipment.trim(),
        repRangeLow: Number(customRepLow) || 1,
        repRangeHigh: Number(customRepHigh) || 1,
        ...(customNotes.trim() ? { notes: customNotes.trim() } : {}),
      });
      setCustomName("");
      setCustomEquipment("");
      setCustomRepLow("8");
      setCustomRepHigh("12");
      setCustomNotes("");
      setAddOpen(false);
      await refresh();
    });
  }

  async function handleArchive(id: string) {
    await withBusy(async () => {
      await archiveCustomExercise(id);
      await refresh();
    });
  }

  return (
    <div className="intent-field">
      <header className="intent-field__intro">
        <p className="tool-label">EXERCISE LIBRARY</p>
        <p className="card-body">
          Your own exercises — pulled from a reference list or fully your own. Not yet used by TRAIN's workouts; this is where they live for now.
        </p>
      </header>

      <section aria-labelledby="exercise-library-heading">
        <h2 id="exercise-library-heading" className="section-label">My exercises</h2>
        {/*
         * Explicit role="group"/aria-label rather than relying on the
         * <section>'s own aria-labelledby, so this list can be targeted
         * unambiguously — a saved exercise's name can also legitimately
         * appear in the reference-list picker below (e.g. immediately
         * after adding it from the library, or any time its source entry
         * is still visible in a search), and this is the one grouping
         * that always means "what's actually saved," not "what's
         * browsable."
         */}
        <div role="group" aria-label="My exercises">
          {exercises.length === 0 && <p className="empty-state">No exercises saved yet.</p>}
          {exercises.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} onArchive={() => void handleArchive(ex.id)} />
          ))}
        </div>

        <div className="intent-create">
          <FieldDisclosure summary="ADD EXERCISE" open={addOpen} onToggle={setAddOpen}>
            <p className="meta" style={{ marginBottom: 4 }}>SEARCH REFERENCE LIST</p>
            <input
              type="text"
              className="input"
              style={{ marginBottom: 8 }}
              aria-label="Search exercise reference list"
              placeholder="Search by name, muscle group, or equipment"
              value={query}
              disabled={busy}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 16 }}>
              {libraryResults.length === 0 && <p className="meta">No matches.</p>}
              {libraryResults.map((lib) => (
                <div key={lib.id} className="equipment-row" style={{ marginBottom: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div>
                      <p className="card-body" style={{ margin: 0 }}>{lib.name}</p>
                      <p className="meta" style={{ margin: 0 }}>
                        {lib.muscleGroup} · {lib.equipment} · {lib.repRangeLow}-{lib.repRangeHigh} reps
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: "auto", padding: "4px 10px", fontSize: 14, flexShrink: 0 }}
                      disabled={busy}
                      onClick={() => void handleAddFromLibrary(lib)}
                    >
                      ADD
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="meta" style={{ marginBottom: 8, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
              OR CREATE A FULLY CUSTOM EXERCISE
            </p>
            <input
              type="text"
              className="input"
              style={{ marginBottom: 8 }}
              aria-label="Exercise name"
              placeholder="Exercise name"
              value={customName}
              disabled={busy}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <label htmlFor="exercise-muscle-group" className="meta" style={{ display: "block", marginBottom: 4 }}>Muscle group</label>
            <select
              id="exercise-muscle-group"
              className="input"
              style={{ marginBottom: 8 }}
              value={customMuscleGroup}
              disabled={busy}
              onChange={(e) => setCustomMuscleGroup(e.target.value as MuscleGroup)}
            >
              {MUSCLE_GROUPS.map((mg) => (
                <option key={mg} value={mg}>{mg}</option>
              ))}
            </select>
            <input
              type="text"
              className="input"
              style={{ marginBottom: 8 }}
              aria-label="Equipment"
              placeholder="Equipment (e.g. Barbell, Bodyweight)"
              value={customEquipment}
              disabled={busy}
              onChange={(e) => setCustomEquipment(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="number"
                inputMode="numeric"
                className="input"
                style={{ flex: 1 }}
                aria-label="Rep range low"
                placeholder="Reps low"
                value={customRepLow}
                disabled={busy}
                onChange={(e) => setCustomRepLow(e.target.value)}
              />
              <input
                type="number"
                inputMode="numeric"
                className="input"
                style={{ flex: 1 }}
                aria-label="Rep range high"
                placeholder="Reps high"
                value={customRepHigh}
                disabled={busy}
                onChange={(e) => setCustomRepHigh(e.target.value)}
              />
            </div>
            <label htmlFor="exercise-notes" className="meta" style={{ display: "block", marginBottom: 4 }}>Notes (optional)</label>
            <textarea
              id="exercise-notes"
              className="input"
              style={{ marginBottom: 12, minHeight: 50 }}
              placeholder="Setup, cues, anything worth remembering"
              value={customNotes}
              disabled={busy}
              onChange={(e) => setCustomNotes(e.target.value)}
            />
            <button
              className="btn-primary"
              disabled={busy || !customName.trim() || !customEquipment.trim()}
              onClick={() => void handleAddCustom()}
            >
              ADD EXERCISE
            </button>
          </FieldDisclosure>
        </div>
      </section>
      {error && <p className="meta" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
