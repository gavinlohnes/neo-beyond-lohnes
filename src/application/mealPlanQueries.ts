import { getSavedMeals } from "./nutritionQueries";
import { getEffectiveProteinTargetG, getNutritionTargets } from "./nutritionTargetQueries";
import { getSchedulePattern } from "./queries";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";

export async function getMealPlanInputs(count: 3 | 7, now = new Date()) {
  const [meals, targets, proteinG, schedule] = await Promise.all([getSavedMeals(), getNutritionTargets(), getEffectiveProteinTargetG(), getSchedulePattern()]);
  const start = mostRecentBoundaryAtOrBefore(now);
  const saved = isOperatorSavedSchedule(schedule);
  const window = Array.from({ length: count }, (_, i) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 16, 30);
    return { date: formatLocalDate(day), work: saved && scheduledWorkContextForLivedDay(day, schedule) === "WORK" };
  });
  return { meals, targets: { calories: targets.calorieTargetKcal, proteinG }, window, scheduleSaved: saved };
}
