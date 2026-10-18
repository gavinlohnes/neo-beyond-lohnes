import { getSleepEntries } from "./queries";
import { getNutritionTargets } from "./nutritionTargetQueries";
import { getBodyweightHistory, projectGoalDate } from "./bodyTrendQueries";
import { dailySwing, weeklyRate, weighInTiming } from "../engine/weightAnswers";
import type { ReviewOverview } from "../engine/reviewOverview";

/**
 * REVIEW-001 "Is my weight going down, and at what rate?": rate, usual swing,
 * weigh-in timing and the existing goal-date projection, for the hub's same
 * 28-day window. Read only; nothing here reaches the Engine.
 */
export async function getWeightAnswers(overview: ReviewOverview) {
  const weighed = overview.rows.filter((row) => row.weights.length > 0);
  const days = await Promise.all(weighed.map(async (row) => {
    const sleeps = (await Promise.all(row.dayIds.map(getSleepEntries))).flat().filter((entry) => entry.kind === "PRIMARY");
    const mainSleepLoggedAt = sleeps.map((entry) => entry.recordedAt).sort()[0];
    return { weighIns: row.weights.map((weight) => weight.at), mainSleepLoggedAt };
  }));
  const [targets, history] = await Promise.all([getNutritionTargets(), getBodyweightHistory()]);
  return {
    rate: weeklyRate(overview.weight),
    swing: dailySwing(overview.rows),
    timing: weighInTiming(days),
    goalWeightLbs: targets.goalWeightLbs,
    goal: projectGoalDate(history, targets.goalWeightLbs),
  };
}
export type WeightAnswers = Awaited<ReturnType<typeof getWeightAnswers>>;
