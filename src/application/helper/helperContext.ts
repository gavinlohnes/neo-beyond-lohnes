import { getSavedMeals } from "../nutritionQueries";
import { getUnresolvedObligations } from "../intentQueries";
import { getProjects } from "../projectQueries";
import { getRoutines } from "../routineCommands";
import { getActiveWorkoutSession } from "../trainQueries";
import { resolveTemplateExercises } from "../customTemplateQueries";
import { getActiveDay, getBodyweightEntries, getHydrationEntries, getSleepEntries } from "../queries";
import type { HelperContext } from "./freeHelper";
import type { WorkoutTemplateId } from "../../domain/workout/types";
import { getLogTemplates } from "../snippetQueries";
import { getActiveHabits } from "../habitQueries";
import { getCollections } from "../collectionQueries";

/**
 * The one read the free helper needs, shared by Alfred's sheet, search and drive home so the preview,
 * the send and the voice loop can never drift apart (review of #380). Read-only.
 */
export async function readHelperContext(now = new Date()): Promise<HelperContext> {
  const [meals, tasks, projects, routines, session, logTemplates, habits, collections] = await Promise.all([getSavedMeals(), getUnresolvedObligations(), getProjects(), getRoutines(), getActiveWorkoutSession(), getLogTemplates(), getActiveHabits(), getCollections()]);
  const day = await getActiveDay();
  const [water, sleep, weight] = day ? await Promise.all([getHydrationEntries(day.id), getSleepEntries(day.id), getBodyweightEntries(day.id)]) : [[], [], []];
  const w = water.at(-1), s = sleep.at(-1), b = weight.at(-1);
  const exercises = session ? await resolveTemplateExercises(session.templateId as WorkoutTemplateId, session.sessionType === "REDUCED" ? "REDUCED" : "STANDARD") : [];
  return {
    now, savedMeals: meals, openTasks: tasks,
    openProjects: projects.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED"),
    routines: routines.filter((r) => r.status === "ACTIVE"),
    habits: habits.map(({ id, name }) => ({ id, name })),
    logTemplates,
    collections: collections.map((collection) => ({ id: collection.id, name: collection.name, firstFieldId: collection.fields[0]!.id, firstFieldLabel: collection.fields[0]!.label })),
    lastLogs: {
      ...(w ? { water: { id: w.headEventId, value: w.effectiveAmountOz } } : {}),
      ...(s ? { sleep: { id: s.headEventId, value: s.effectiveDurationMinutes } } : {}),
      ...(b ? { weight: { id: b.headEventId, value: b.effectiveWeightLbs } } : {}),
    },
    workout: session ? { sessionId: session.id, exercises: exercises.map((e) => ({ id: e.exerciseId, name: e.name })) } : null,
  };
}
