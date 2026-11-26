import { db } from "../persistence/db";
import { newId } from "./commands";
import { writeAtomically } from "./atomicWrite";
import { logIntentEvent } from "./intentCommands";
import { getRoutineEditEntries } from "./customTemplateQueries";
import { getTrainingProgramme } from "./trainingProgramme";
import { getSequenceNextTemplateId } from "./trainingProgrammeQueries";
import { parseCustomWorkoutTemplate } from "../persistence/workoutTemplateValidation";
import { trainingProgrammeSchema } from "../persistence/trainingProgrammeValidation";
import type { CustomWorkoutTemplate } from "../domain/workout/customTemplate";
import type { ExercisePrescription } from "../domain/workout/types";
import type { SequenceTrainingProgramme } from "../domain/workout/trainingProgramme";
import {
  builtInRoutineAt,
  isBuiltInRoutine,
  originalBuiltInExercises,
  routineEditState,
  sameRoutine,
  validateRoutineExercises,
  type RoutineEditedPayload,
  type RoutineVersion,
} from "../domain/workout/routineEdit";

/**
 * GRAYSON-ROUTINE-EDIT-001 (Gavin, 2026-11-25). SAVE, RESET and UNDO for any routine, each one transaction:
 * - A, B and C: one ROUTINE_EDITED event; the code's version never changes.
 * - His own routines: the record changes in place (as updateCustomTemplate did) and the event keeps the version it
 *   replaced.
 * - The programme stays in step: when the routine is an active sequence member (or its SHORT or HOME link) whose
 *   snapshot matched it before this change, the same transaction writes the next programme revision with the new
 *   snapshot, starting from the member the sequence names next. A member already changed elsewhere is left showing
 *   CHANGED, as before.
 */
const TABLES = ["customWorkoutTemplates", "workoutSessions", "performedSets"] as const;

export interface RoutineEditResult {
  eventId: string;
  templateId: string;
  exercises: ExercisePrescription[];
  /** True when the programme's snapshot moved with the routine. */
  programmeUpdated: boolean;
}

const fail = (code: string, words: string) => new Error(`${code}: ${words}`);
const snapshotOf = (version: { name: string; exercises: ExercisePrescription[] }) => ({ name: version.name, exercises: structuredClone(version.exercises) });
const sameSnapshot = (a: { name: string; exercises: unknown }, b: { name: string; exercises: unknown }) =>
  JSON.stringify({ name: a.name, exercises: a.exercises }) === JSON.stringify({ name: b.name, exercises: b.exercises });

async function currentVersion(templateId: string): Promise<{ version: RoutineVersion; record: CustomWorkoutTemplate | null }> {
  if (isBuiltInRoutine(templateId)) return { version: { exercises: builtInRoutineAt(templateId, await getRoutineEditEntries()).exercises }, record: null };
  const record = parseCustomWorkoutTemplate(await db.customWorkoutTemplates.get(templateId));
  if (!record || record.archivedAt) throw fail("ROUTINE_NOT_AVAILABLE", "That routine isn't available any more. Nothing changed.");
  return { version: { name: record.name, exercises: record.exercises }, record };
}

async function commit(templateId: string, next: RoutineVersion, reason: RoutineEditedPayload["reason"], undoesEventId?: string): Promise<RoutineEditResult> {
  const problem = validateRoutineExercises(next.exercises);
  if (problem) throw fail("ROUTINE_INVALID", problem);
  return writeAtomically([...TABLES], async () => {
    const { version: current, record } = await currentVersion(templateId);
    const target: RoutineVersion = record
      ? { name: (next.name ?? record.name).trim(), exercises: structuredClone(next.exercises) }
      : { exercises: structuredClone(next.exercises) };
    if (record && !target.name) throw fail("ROUTINE_INVALID", "A routine needs a name.");
    if (sameRoutine(current, target)) throw fail("ROUTINE_NO_CHANGE", "Nothing changed.");

    // The programme, read before anything is written, so "in step" means it matched the routine as it was.
    const revision = await getTrainingProgramme();
    let restamped: SequenceTrainingProgramme | null = null;
    if (record && revision.programme?.mode === "SEQUENCE") {
      const programme = revision.programme;
      const before = { name: record.name, exercises: record.exercises };
      const after = { name: target.name!, exercises: target.exercises };
      const linked = programme.members.some((m) => (m.templateId === templateId && sameSnapshot(before, m.snapshot))
        || (m.home?.templateId === templateId && sameSnapshot(before, m.home.snapshot))
        || (m.short?.templateId === templateId && sameSnapshot(before, m.short.snapshot)));
      if (linked) {
        if (programme.members.some((m) => m.home?.templateId === templateId) && !after.exercises.every((ex) => ex.exerciseId.startsWith("home-"))) {
          throw fail("ROUTINE_HOME_ONLY", "This is a HOME routine in your programme, so it keeps to its bodyweight exercises. Nothing changed.");
        }
        if (programme.members.some((m) => m.short?.templateId === templateId) && after.exercises.some((ex) => ex.exerciseId.startsWith("home-"))) {
          throw fail("ROUTINE_SHORT_LOADED", "This is a SHORT routine in your programme, so it keeps to gym exercises. Nothing changed.");
        }
        const nextStart = await getSequenceNextTemplateId(revision);
        // When the sequence can't name its next member, a new revision would invent one: leave it to the review.
        if (nextStart) {
          restamped = {
            ...programme,
            startTemplateId: nextStart,
            members: programme.members.map((m) => ({
              ...m,
              ...(m.templateId === templateId && sameSnapshot(before, m.snapshot) ? { snapshot: snapshotOf(after) } : {}),
              ...(m.home?.templateId === templateId && sameSnapshot(before, m.home.snapshot) ? { home: { templateId, snapshot: snapshotOf(after) } } : {}),
              ...(m.short?.templateId === templateId && sameSnapshot(before, m.short.snapshot) ? { short: { templateId, snapshot: snapshotOf(after) } } : {}),
            })) as SequenceTrainingProgramme["members"],
          };
          trainingProgrammeSchema.parse(restamped);
        }
      }
    }

    if (record) await db.customWorkoutTemplates.put({ ...record, name: target.name!, exercises: target.exercises });
    const commandId = newId();
    const payload: RoutineEditedPayload = {
      commandId, templateId, exercises: target.exercises, ...(target.name ? { name: target.name } : {}),
      previous: structuredClone(current), reason, ...(undoesEventId ? { undoesEventId } : {}),
    };
    const eventId = await logIntentEvent("ROUTINE_EDITED", payload, "USER", commandId, {}, undoesEventId);
    if (restamped) {
      const programmeCommand = newId();
      await logIntentEvent("TRAIN_PROGRAM_SET", { commandId: programmeCommand, previousId: revision.id, programme: restamped }, "USER", commandId, {}, revision.id ?? undefined);
    }
    return { eventId, templateId, exercises: target.exercises, programmeUpdated: restamped !== null };
  });
}

/** SAVE in the editor. `name` applies to his own routines only. */
export function saveRoutineEdit(templateId: string, change: { exercises: ExercisePrescription[]; name?: string }): Promise<RoutineEditResult> {
  return commit(templateId, { exercises: change.exercises, ...(change.name !== undefined ? { name: change.name } : {}) }, "EDIT");
}

/** RESET TO ORIGINAL: A, B or C back to the code's version; his own routine back to as first saved. */
export async function resetRoutine(templateId: string): Promise<RoutineEditResult> {
  const original = originalBuiltInExercises(templateId);
  if (original) return commit(templateId, { exercises: original }, "RESET");
  const { firstSaved } = routineEditState(templateId, await getRoutineEditEntries());
  if (!firstSaved) throw fail("ROUTINE_RESET_NONE", "This routine hasn't been changed since you first saved it.");
  return commit(templateId, firstSaved, "RESET");
}

/** UNDO the newest change to a routine (a reset included): it goes back to what it was before. */
export function undoRoutineEdit(eventId: string): Promise<RoutineEditResult> {
  // The staleness check and the write share one transaction (commit's joins it), so two quick UNDOs can't both pass.
  return writeAtomically([...TABLES], async () => {
    const entries = await getRoutineEditEntries();
    const entry = entries.find((e) => e.eventId === eventId);
    if (!entry) throw fail("ROUTINE_UNDO_STALE", "That change can't be found. Nothing changed.");
    if (routineEditState(entry.payload.templateId, entries).latest?.eventId !== eventId) {
      throw fail("ROUTINE_UNDO_STALE", "The routine has changed since. Edit it directly instead.");
    }
    return commit(entry.payload.templateId, entry.payload.previous, "UNDO", eventId);
  });
}
