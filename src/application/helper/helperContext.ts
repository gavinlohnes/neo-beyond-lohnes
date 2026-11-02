import { getSavedMeals } from "../nutritionQueries";
import { getUnresolvedObligations } from "../intentQueries";
import { getProjects } from "../projectQueries";
import { getRoutines } from "../routineCommands";
import { getActiveWorkoutSession } from "../trainQueries";
import { resolveTemplateExercises } from "../customTemplateQueries";
import type { HelperContext } from "./freeHelper";

/**
 * The one read the free helper needs, shared by Alfred's sheet, search and drive home so the preview,
 * the send and the voice loop can never drift apart (review of #380). Read-only.
 */
export async function readHelperContext(now = new Date()): Promise<HelperContext> {
  const [meals, tasks, projects, routines, session] = await Promise.all([getSavedMeals(), getUnresolvedObligations(), getProjects(), getRoutines(), getActiveWorkoutSession()]);
  const exercises = session ? await resolveTemplateExercises(session.templateId as never, session.sessionType === "REDUCED" ? "REDUCED" : "STANDARD") : [];
  return {
    now, savedMeals: meals, openTasks: tasks,
    openProjects: projects.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED"),
    routines: routines.filter((r) => r.status === "ACTIVE"),
    workout: session ? { sessionId: session.id, exercises: exercises.map((e) => ({ id: e.exerciseId, name: e.name })) } : null,
  };
}
