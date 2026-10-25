import { getDaySummaries } from "./dayLedgerQueries";
import { getBodyweightEntries } from "./queries";
import { projectReviewOverview, reviewEligibleDays } from "../engine/reviewOverview";
import { getNutritionTargets } from "./nutritionTargetQueries";

/** Canonical corrections/voids first; no raw-log arithmetic, writes or Engine evaluation. */
export async function getReviewOverview(now = new Date()) {
  const [summaries, targets] = await Promise.all([getDaySummaries(), getNutritionTargets()]);
  const weights = (await Promise.all(reviewEligibleDays(summaries, now).map(async (day) =>
    (await getBodyweightEntries(day.beyondDayId)).map((entry) => ({
      dayId: day.beyondDayId, lbs: entry.effectiveWeightLbs, at: entry.recordedAt, rootId: entry.rootEventId,
    }))
  ))).flat();
  return { ...projectReviewOverview(summaries, weights, now), strengthSessionsTargetPerWeek: targets.strengthSessionsTargetPerWeek };
}
