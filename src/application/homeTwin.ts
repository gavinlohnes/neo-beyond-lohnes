import { buildHomeTwin, twinExercises, type TwinRow } from "../domain/workout/homeTwin";
import { EXERCISE_LIBRARY } from "../domain/workout/exerciseLibrary";
import { TEMPLATE_TO_LIBRARY_ID } from "../domain/workout/exerciseHowTo";
import { GRAYSON_HOME_TEMPLATE_INPUTS } from "../domain/workout/homeTemplates";
import type { SwapCandidate } from "../domain/workout/workoutChanges";
import type { ExercisePrescription } from "../domain/workout/types";
import type { SequenceTrainingProgramme } from "../domain/workout/trainingProgramme";
import { getCustomExercises } from "./exerciseLibraryQueries";
import { getCustomTemplates } from "./customTemplateQueries";
import { createCustomTemplate } from "./customTemplateCommands";
import { groupForExercise } from "./exerciseByMuscle";
import { getRoutineViews, type RoutineView } from "./routineEditQueries";
import { saveRoutineEdit } from "./routineEditCommands";
import { getLastNumbers } from "./workoutChanges";
import { getProgrammeView } from "./trainingProgrammeQueries";
import { getTrainingProgramme, saveTrainingProgramme } from "./trainingProgramme";

/**
 * GRAYSON-HOME-STRETCH-001 slice C: a home twin for a gym routine. BUILD TWIN proposes one bodyweight move per lift
 * (T2's swap ranker over the home moves); he reviews, changes or drops each, and SAVE TWIN saves it. Nothing saves
 * without that tap.
 * - For an A, B or C member of his sequence, the twin is that member's HOME form (linked through the programme's own
 *   save and version guard); an existing linked twin is updated through the routine editor's save, which keeps the
 *   programme in step.
 * - For any other routine there's no HOME form slot, so the twin is his own bodyweight routine "<name> · HOME", which
 *   TRAIN's HOME choice offers directly.
 */
export const twinName = (routineName: string) => `${routineName} · HOME`;

/** The home moves a twin can use (a HOME form holds only bodyweight-specific home-* moves), with their groups. */
export async function getHomeMoveChoices(): Promise<SwapCandidate[]> {
  const seen = new Map<string, SwapCandidate>();
  for (const t of GRAYSON_HOME_TEMPLATE_INPUTS) for (const ex of t.exercises) {
    if (seen.has(ex.exerciseId)) continue;
    const lib = EXERCISE_LIBRARY.find((l) => l.id === (TEMPLATE_TO_LIBRARY_ID[ex.exerciseId] ?? ex.exerciseId));
    const group = groupForExercise(ex.exerciseId, []);
    if (!group) continue;
    seen.set(ex.exerciseId, {
      exerciseId: ex.exerciseId, name: ex.name, muscleGroup: group, equipment: "Bodyweight",
      repRangeLow: lib && !TEMPLATE_TO_LIBRARY_ID[ex.exerciseId] ? lib.repRangeLow : ex.repRangeLow,
      repRangeHigh: lib && !TEMPLATE_TO_LIBRARY_ID[ex.exerciseId] ? lib.repRangeHigh : ex.repRangeHigh,
      incrementLbs: 0, mine: false,
    });
  }
  return [...seen.values()];
}

export interface HomeTwinView {
  routine: RoutineView;
  /** The sequence member this routine is, when it is one ("A", "B" or "C"). */
  memberKey: "A" | "B" | "C" | null;
  /** His current twin, if any: the member's linked HOME form, or his "<name> · HOME" routine. */
  twin: { templateId: string; name: string; exercises: ExercisePrescription[]; linked: boolean } | null;
}

const routineName = (r: RoutineView) => r.name ?? r.label;

export async function getHomeTwinView(templateId: string): Promise<HomeTwinView | null> {
  const [routines, view, custom] = await Promise.all([getRoutineViews(), getProgrammeView(), getCustomTemplates()]);
  const routine = routines.find((r) => r.templateId === templateId);
  // A HOME routine has no twin of its own.
  if (!routine || (routine.exercises.length > 0 && routine.exercises.every((e) => e.exerciseId.startsWith("home-")))) return null;
  const member = view.revision.programme?.mode === "SEQUENCE" ? view.revision.programme.members.find((m) => m.templateId === templateId) : undefined;
  let twin: HomeTwinView["twin"] = null;
  if (member?.home) {
    const t = custom.find((c) => c.id === member.home!.templateId);
    if (t) twin = { templateId: t.id, name: t.name, exercises: t.exercises, linked: true };
  } else {
    const t = custom.find((c) => c.name === twinName(routineName(routine)));
    if (t) twin = { templateId: t.id, name: t.name, exercises: t.exercises, linked: false };
  }
  return { routine, memberKey: member?.key ?? null, twin };
}

/** BUILD TWIN: the proposal, lift by lift. Gaps stay gaps. */
export async function proposeHomeTwin(templateId: string): Promise<TwinRow[]> {
  const [routines, customs, moves, last] = await Promise.all([getRoutineViews(), getCustomExercises(), getHomeMoveChoices(), getLastNumbers().catch(() => new Map())]);
  const routine = routines.find((r) => r.templateId === templateId);
  if (!routine) throw new Error("That routine isn't available any more.");
  const recent = new Set<string>(); // every home move is Bodyweight, so the ranker's equipment step is even.
  return buildHomeTwin({ exercises: routine.exercises, groupOf: (id) => groupForExercise(id, customs), homeMoves: moves, recentEquipment: recent, lastByExercise: last });
}

/**
 * SAVE TWIN. Refused with nothing saved when the routine or the programme changed since he opened the review, or
 * when every row was dropped.
 */
export async function saveHomeTwin(templateId: string, rows: readonly TwinRow[]): Promise<{ text: string; twinTemplateId: string }> {
  const exercises = twinExercises(rows);
  if (!exercises.length) throw new Error("A twin needs at least one home move.");
  const current = await getHomeTwinView(templateId);
  if (!current) throw new Error("That routine isn't available any more.");
  const name = routineName(current.routine);

  if (current.twin) {
    const same = JSON.stringify(current.twin.exercises) === JSON.stringify(exercises);
    if (!same) await saveRoutineEdit(current.twin.templateId, { exercises });
    return { text: `${current.twin.name} saved.`, twinTemplateId: current.twin.templateId };
  }

  const created = await createCustomTemplate({ name: twinName(name), exercises });
  if (current.memberKey) {
    const revision = await getTrainingProgramme();
    const programme = revision.programme;
    if (programme?.mode !== "SEQUENCE" || !revision.id) throw new Error("Your programme changed. Look again before saving the twin.");
    const view = await getProgrammeView();
    const next: SequenceTrainingProgramme = {
      ...programme,
      startTemplateId: view.sequence?.nextMember?.templateId ?? programme.startTemplateId,
      members: programme.members.map((m) => (m.templateId === templateId ? { ...m, home: { templateId: created.id, snapshot: { name: created.name, exercises: structuredClone(created.exercises) } } } : m)) as SequenceTrainingProgramme["members"],
    };
    await saveTrainingProgramme(next, revision.id);
    return { text: `${created.name} saved as your HOME ${current.memberKey}.`, twinTemplateId: created.id };
  }
  return { text: `${created.name} saved. Start it from HOME on TRAIN.`, twinTemplateId: created.id };
}
