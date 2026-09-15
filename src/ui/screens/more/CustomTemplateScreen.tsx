import { useEffect, useState } from "react";
import type { CustomWorkoutTemplate } from "../../../domain/workout/customTemplate";
import type { CustomExercise } from "../../../domain/workout/customExercise";
import type { ExercisePrescription } from "../../../domain/workout/types";
import { getCustomExercises } from "../../../application/exerciseLibraryQueries";
import { getCustomTemplates } from "../../../application/customTemplateQueries";
import { archiveCustomTemplate, createCustomTemplate } from "../../../application/customTemplateCommands";
import { FieldDisclosure } from "../../components/FieldDisclosure";

/**
 * TRAIN-CREATE-002 (Custom Workout Templates). The one dedicated
 * management surface, reachable from MORE (same placement pattern as
 * Exercise Library/Decision Journal), not a new primary bottom-nav
 * destination. Every mutation goes through
 * application/customTemplateCommands.ts. Assembles a template from the
 * operator's own saved CustomExercise library (TRAIN-CREATE-001) — this
 * screen does not create or edit exercise facts (name/muscle group/
 * equipment/rep range) itself, only which exercises belong to a template
 * and how many sets each gets here.
 *
 * DEFAULT_SETS/DEFAULT_INCREMENT_LBS below mirror the same "no real
 * per-machine data exists yet, so use one explicit placeholder" precedent
 * domain/workout/types.ts's own DEFAULT_INCREMENT_LBS already sets for
 * the built-in A/B/C templates — not a new, separately-invented default.
 */
const DEFAULT_SETS = 3;
const DEFAULT_INCREMENT_LBS = 5;

function TemplateRow({ template, onArchive }: { template: CustomWorkoutTemplate; onArchive: () => void }) {
  return (
    <div className="equipment-row" style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <p className="card-body" style={{ margin: 0, fontWeight: 600 }}>{template.name}</p>
          <p className="meta" style={{ margin: 0 }}>
            {template.exercises.length} {template.exercises.length === 1 ? "exercise" : "exercises"}:{" "}
            {template.exercises.map((ex) => ex.name).join(", ")}
          </p>
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

export function CustomTemplateScreen() {
  const [templates, setTemplates] = useState<CustomWorkoutTemplate[]>([]);
  const [savedExercises, setSavedExercises] = useState<CustomExercise[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [name, setName] = useState("");
  const [selectedSets, setSelectedSets] = useState<Record<string, number>>({});

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setTemplates(await getCustomTemplates());
    setSavedExercises(await getCustomExercises());
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

  function toggleExercise(exerciseId: string) {
    setSelectedSets((prev) => {
      const next = { ...prev };
      if (exerciseId in next) delete next[exerciseId];
      else next[exerciseId] = DEFAULT_SETS;
      return next;
    });
  }

  function adjustSets(exerciseId: string, delta: number) {
    setSelectedSets((prev) => ({ ...prev, [exerciseId]: Math.max(1, (prev[exerciseId] ?? DEFAULT_SETS) + delta) }));
  }

  const selectedIds = Object.keys(selectedSets);

  async function handleCreate() {
    if (!name.trim() || selectedIds.length === 0) return;
    await withBusy(async () => {
      const exercises: ExercisePrescription[] = selectedIds.map((exerciseId) => {
        const source = savedExercises.find((ex) => ex.id === exerciseId)!;
        return {
          exerciseId: source.id,
          name: source.name,
          sets: selectedSets[exerciseId]!,
          repRangeLow: source.repRangeLow,
          repRangeHigh: source.repRangeHigh,
          incrementLbs: DEFAULT_INCREMENT_LBS,
        };
      });
      await createCustomTemplate({ name: name.trim(), exercises });
      setName("");
      setSelectedSets({});
      setCreateOpen(false);
      await refresh();
    });
  }

  async function handleArchive(id: string) {
    await withBusy(async () => {
      await archiveCustomTemplate(id);
      await refresh();
    });
  }

  return (
    <div className="intent-field">
      <header className="intent-field__intro">
        <p className="tool-label">CUSTOM PROGRAMS</p>
        <p className="card-body">
          Build your own workout template from your saved exercises. Selectable in TRAIN alongside A/B/C — always your own choice, never suggested automatically.
        </p>
      </header>

      <section aria-labelledby="custom-template-heading">
        <h2 id="custom-template-heading" className="section-label">My templates</h2>
        <div role="group" aria-label="My templates">
          {templates.length === 0 && <p className="empty-state">No custom templates yet.</p>}
          {templates.map((t) => (
            <TemplateRow key={t.id} template={t} onArchive={() => void handleArchive(t.id)} />
          ))}
        </div>

        <div className="intent-create">
          <FieldDisclosure summary="CREATE TEMPLATE" open={createOpen} onToggle={setCreateOpen}>
            {savedExercises.length === 0 ? (
              <p className="card-body">
                You don't have any saved exercises yet — add some in the Exercise Library first, then come back here to build a template from them.
              </p>
            ) : (
              <>
                <input
                  type="text"
                  className="input"
                  style={{ marginBottom: 12 }}
                  aria-label="Template name"
                  placeholder="Template name"
                  value={name}
                  disabled={busy}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="meta" style={{ marginBottom: 8 }}>SELECT EXERCISES</p>
                {savedExercises.map((ex) => {
                  const selected = ex.id in selectedSets;
                  return (
                    <div key={ex.id} className="equipment-row" style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          className={`chip ${selected ? "chip--selected" : ""}`}
                          style={{ flex: 1, textAlign: "left" }}
                          aria-pressed={selected}
                          disabled={busy}
                          onClick={() => toggleExercise(ex.id)}
                        >
                          {ex.name} <span className="meta">({ex.muscleGroup})</span>
                        </button>
                        {selected && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ width: 32, minWidth: 32, padding: 0 }}
                              aria-label={`Decrease sets for ${ex.name}`}
                              onClick={() => adjustSets(ex.id, -1)}
                            >
                              -
                            </button>
                            <span className="meta" style={{ minWidth: 48, textAlign: "center" }}>
                              {selectedSets[ex.id]} sets
                            </span>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ width: 32, minWidth: 32, padding: 0 }}
                              aria-label={`Increase sets for ${ex.name}`}
                              onClick={() => adjustSets(ex.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  className="btn-primary"
                  style={{ marginTop: 12 }}
                  disabled={busy || !name.trim() || selectedIds.length === 0}
                  onClick={() => void handleCreate()}
                >
                  SAVE TEMPLATE
                </button>
              </>
            )}
          </FieldDisclosure>
        </div>
      </section>
      {error && <p className="meta" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
