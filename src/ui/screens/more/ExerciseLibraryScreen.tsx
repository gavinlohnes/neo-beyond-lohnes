import { ExerciseHowToSheet } from "../../components/ExerciseHowToSheet";
import { ExerciseNoteButton, ExerciseNoteLine, useExerciseNote } from "../../components/ExerciseNoteLine";
import type React from "react";
import { BodyMap } from "../../components/BodyMap";
import { captureCommitFeedback } from "../../feel/feedback";
import { useEffect, useState } from "react";
import type { CustomExercise } from "../../../domain/workout/customExercise";
import { EXERCISE_LIBRARY, searchLibraryExercises, type LibraryExercise, type MuscleGroup } from "../../../domain/workout/exerciseLibrary";
import { getCustomExercises } from "../../../application/exerciseLibraryQueries";
import { archiveCustomExercise, createCustomExercise, updateCustomExercise } from "../../../application/exerciseLibraryCommands";
import { formatHold } from "../../../domain/workout/types";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import "./openLibrary.css";
import {
  copyOpenExerciseToMine, getOpenLibraryPrefs, getOpenLibrarySource, getVisibleOpenExercises, hideOpenExercise, setShowStretches,
  showHiddenOpenExercises, type OpenLibraryPrefs,
} from "../../../application/openLibrary";
import { describeOpenExercise, searchOpenExercises, type OpenExercise } from "../../../domain/workout/openLibrary";
import { describeError } from "../../errorMessage";

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

function ExerciseRow({ exercise, onArchive, onTimed, customs }: { exercise: CustomExercise; onArchive: () => void; onTimed: (timed: boolean) => void; customs: readonly CustomExercise[] }) {
  const note = useExerciseNote(exercise.id, customs);
  return (
    <div className="equipment-row" style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <p className="card-body" style={{ margin: 0, fontWeight: 600 }}>{exercise.name}</p>
          <p className="meta" style={{ margin: 0 }}>
            {exercise.muscleGroup} · {exercise.equipment} · {exercise.measure === "TIME" ? `timed, target ${formatHold(exercise.targetSec ?? 30)}` : `${exercise.repRangeLow}-${exercise.repRangeHigh} reps`}
          </p>
          {/* GRAYSON-TRAIN-NOTES-001: his note, shown and edited the same way as on library rows. */}
          <ExerciseNoteLine name={exercise.name} state={note} returnFocusTo={`note-${exercise.id}`} />
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <ExerciseNoteButton id={`note-${exercise.id}`} name={exercise.name} state={note} />
        {/* GRAYSON-SET-TYPES-001: his own exercise can be held for time. New routine picks carry it. */}
        <label className="routine-option" style={{ fontSize: 14 }}><input type="checkbox" checked={exercise.measure === "TIME"}
          aria-label={`${exercise.name}: timed`} onChange={(e) => onTimed(e.target.checked)} /> Timed</label>
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
    </div>
  );
}

/** A library row: name and details, his note (GRAYSON-TRAIN-NOTES-001), and HOW TO, NOTE and ADD. */
function LibraryRow({ lib, children }: { lib: LibraryExercise; children: React.ReactNode }) {
  const note = useExerciseNote(lib.id);
  return (
    <div className="equipment-row" style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p className="card-body" style={{ margin: 0 }}>{lib.name}</p>
          <p className="meta" style={{ margin: 0 }}>
            {lib.muscleGroup} · {lib.equipment} · {lib.measure === "TIME" ? `timed, ${formatHold(lib.targetSec ?? 30)}` : `${lib.repRangeLow}-${lib.repRangeHigh} reps`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <ExerciseNoteButton id={`note-${lib.id}`} name={lib.name} state={note} />
          {children}
        </div>
      </div>
      <ExerciseNoteLine name={lib.name} state={note} returnFocusTo={`note-${lib.id}`} />
    </div>
  );
}

/** GRAYSON-OPEN-LIBRARY-001: one open exercise: its muscles and equipment, HOW TO (its steps), EDIT (copy to mine), HIDE. */
function OpenRow({ ex, busy, onHowTo, onEdit, onHide }: { ex: OpenExercise; busy: boolean; onHowTo: () => void; onEdit: () => void; onHide: () => void }) {
  return (
    <div className="equipment-row open-row" data-open-exercise={ex.id}>
      <p className="card-body" style={{ margin: 0 }}>{ex.name}</p>
      <p className="meta" style={{ margin: 0 }}>{describeOpenExercise(ex)} · open set</p>
      <div className="open-row__acts">
        <button type="button" className="btn-secondary open-row__act" aria-label={`How to do ${ex.name}`} onClick={onHowTo}>HOW TO</button>
        <button type="button" className="btn-secondary open-row__act" aria-label={`Copy ${ex.name} into my exercises to edit it`} disabled={busy} onClick={onEdit}>EDIT</button>
        <button type="button" className="btn-secondary open-row__act" aria-label={`Hide ${ex.name} from search`} disabled={busy} onClick={onHide}>HIDE</button>
      </div>
    </div>
  );
}

export function ExerciseLibraryScreen() {
  const [howTo, setHowTo] = useState<{ id: string; name: string } | null>(null);
  const [byMuscle, setByMuscle] = useState(false);
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

  // GRAYSON-OPEN-LIBRARY-001: the open set loads the first time he searches, and shows after his own matches.
  const [openVisible, setOpenVisible] = useState<OpenExercise[] | null>(null);
  const [openPrefs, setOpenPrefs] = useState<OpenLibraryPrefs>(() => getOpenLibraryPrefs());
  const [openNotice, setOpenNotice] = useState<string | null>(null);
  const [openSource, setOpenSource] = useState<{ commit: string; licence: string } | null>(null);
  const searching = query.trim().length > 0;
  useEffect(() => {
    if (!searching) return;
    let live = true;
    void getVisibleOpenExercises().then((list) => { if (live) setOpenVisible(list); }).catch(() => { if (live) setOpenVisible([]); });
    if (!openSource) void getOpenLibrarySource().then((src) => { if (live) setOpenSource(src); }).catch(() => {});
    return () => { live = false; };
    // Reload when his choices or his own exercises change.
  }, [searching, openPrefs, exercises]); // eslint-disable-line react-hooks/exhaustive-deps
  // His hide list applies at once, before the reload finishes.
  const openMatches = searching && openVisible ? searchOpenExercises(openVisible, query).filter((ex) => !openPrefs.hidden.includes(ex.id)) : [];
  const OPEN_SHOWN = 40;

  function updateOpenPrefs(change: () => void, notice: string) {
    change();
    setOpenPrefs(getOpenLibraryPrefs());
    setOpenNotice(notice);
  }

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
      setError(describeError(e, "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddFromLibrary(lib: LibraryExercise) {
    await withBusy(async () => {
    const acknowledge = captureCommitFeedback();
      await createCustomExercise({
        name: lib.name,
        muscleGroup: lib.muscleGroup,
        equipment: lib.equipment,
        repRangeLow: lib.repRangeLow,
        repRangeHigh: lib.repRangeHigh,
        libraryExerciseId: lib.id,
        ...(lib.measure === "TIME" ? { measure: "TIME" as const, targetSec: lib.targetSec ?? 30 } : {}),
      });
      acknowledge("LIGHT");
      await refresh();
    });
  }

  async function handleAddCustom() {
    if (!customName.trim() || !customEquipment.trim()) return;
    await withBusy(async () => {
    const acknowledge = captureCommitFeedback();
      await createCustomExercise({
        name: customName.trim(),
        muscleGroup: customMuscleGroup,
        equipment: customEquipment.trim(),
        repRangeLow: Number(customRepLow) || 1,
        repRangeHigh: Number(customRepHigh) || 1,
        ...(customNotes.trim() ? { notes: customNotes.trim() } : {}),
      });
      acknowledge("LIGHT");
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
    const acknowledge = captureCommitFeedback();
      if (await archiveCustomExercise(id)) acknowledge("HEAVY");
      await refresh();
    });
  }

  return (
    <div className="intent-field">
      {howTo && <ExerciseHowToSheet exerciseId={howTo.id} name={howTo.name} onClose={() => setHowTo(null)} />}
      <header className="intent-field__intro">
        <p className="tool-label">EXERCISE LIBRARY</p>
        <p className="card-body">
          Your own exercises — pulled from a reference list or fully your own. Not yet used by TRAIN's workouts; this is where they live for now.
        </p>
      </header>

      {/* GRAYSON-TRAIN-BODYMAP-001: BY MUSCLE opens the map above the list. */}
      <button type="button" className="btn-secondary" style={{ width: "auto", minHeight: 44, fontSize: 16, marginBottom: 8 }} aria-expanded={byMuscle}
        onClick={() => setByMuscle((v) => !v)}>BY MUSCLE</button>
      {byMuscle && <BodyMap onHowTo={(entry) => setHowTo({ id: entry.howToId ?? entry.id, name: entry.name })} />}

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
            <ExerciseRow key={ex.id} exercise={ex} customs={exercises} onArchive={() => void handleArchive(ex.id)}
              onTimed={(timed) => void withBusy(async () => { await updateCustomExercise(ex.id, { measure: timed ? "TIME" : "REPS" }); await refresh(); })} />
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
                <LibraryRow key={lib.id} lib={lib}>
                    {/* GRAYSON-TRAIN-HOWTO-001: how to do it, beside ADD. */}
                    <button type="button" className="btn-secondary howto-open" aria-label={`How to do ${lib.name}`} onClick={() => setHowTo(lib)}>HOW TO</button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: "auto", padding: "4px 10px", fontSize: 14, flexShrink: 0 }}
                      disabled={busy}
                      onClick={() => void handleAddFromLibrary(lib)}
                    >
                      ADD
                    </button>
                </LibraryRow>
              ))}
            </div>

            {/* GRAYSON-OPEN-LIBRARY-001: the open set, by search, after his own and the library's matches. */}
            <section aria-labelledby="open-library-heading" className="open-library" data-open-library>
              <h3 id="open-library-heading" className="meta" style={{ margin: "0 0 4px" }}>OPEN EXERCISE SET</h3>
              {!searching && <p className="meta">Search to find about 800 more from the open exercise set.</p>}
              {searching && openVisible === null && <p className="meta" role="status">Loading the open exercise set…</p>}
              {searching && openVisible !== null && openMatches.length === 0 && <p className="meta">No open matches.</p>}
              {openMatches.length > OPEN_SHOWN && <p className="meta" role="status">Showing {OPEN_SHOWN} of {openMatches.length}. Type more to narrow it.</p>}
              {openNotice && <p className="meta" role="status">{openNotice}</p>}
              <div role="group" aria-label="Open exercise set matches">
                {openMatches.slice(0, OPEN_SHOWN).map((ex) => (
                  <OpenRow key={ex.id} ex={ex} busy={busy} onHowTo={() => setHowTo({ id: ex.id, name: ex.name })}
                    onEdit={() => void withBusy(async () => {
                      const acknowledge = captureCommitFeedback();
                      await copyOpenExerciseToMine(ex.id);
                      acknowledge("LIGHT");
                      setOpenPrefs(getOpenLibraryPrefs());
                      setOpenNotice(`${ex.name} is in your exercises now. Change it there.`);
                      await refresh();
                    })}
                    onHide={() => updateOpenPrefs(() => hideOpenExercise(ex.id), `${ex.name} is hidden from search.`)} />
                ))}
              </div>
              <label className="routine-option">
                <input type="checkbox" checked={openPrefs.showStretches}
                  onChange={(e) => { const show = e.target.checked; updateOpenPrefs(() => setShowStretches(show), show ? "Stretches show in search." : "Stretches are hidden."); }} />
                Show stretches
              </label>
              {openPrefs.hidden.length > 0 && (
                <p className="meta" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  {openPrefs.hidden.length} hidden
                  <button type="button" className="btn-secondary open-row__act" onClick={() => updateOpenPrefs(() => showHiddenOpenExercises(), "Hidden open exercises show again.")}>SHOW THEM AGAIN</button>
                </p>
              )}
              {openSource && <p className="meta">From free-exercise-db ({openSource.licence}), pinned at {openSource.commit.slice(0, 8)}.</p>}
            </section>

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
      {error && <p className="meta meta--error">{error}</p>}
    </div>
  );
}
