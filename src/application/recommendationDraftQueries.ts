import { getActiveDay, getLatestCheckIn, getLatestRecommendation, hasUnresolvedPostShift } from "./queries";
import { getDaySummaries } from "./dayLedgerQueries";
import { deriveShortSleepStreak } from "../engine/sleepStreak";
import { deriveRecommendationDraft, type RecommendationDraft } from "../engine/recommendationDraft";

/** Read only. Current-day check-in/recommendation always supersedes a provisional draft. */
export async function getRecommendationDraft(dayId: string, now = new Date()): Promise<RecommendationDraft | null> {
  const day = await getActiveDay();
  if (!day || day.id !== dayId) return null;
  const [checkIn, recommendation, postShift] = await Promise.all([
    getLatestCheckIn(dayId), getLatestRecommendation(dayId), hasUnresolvedPostShift(dayId),
  ]);
  if (checkIn || recommendation) return null;
  const sleep = postShift ? { streak: false, nights: [] } : deriveShortSleepStreak(await getDaySummaries(), dayId, now);
  return deriveRecommendationDraft({ hasCheckIn: false, hasRecommendation: false, hasUnresolvedPostShift: postShift, shortSleep: sleep });
}
