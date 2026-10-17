import type { WeeklyFocus } from "../domain/review/types";
import { latestReviewWeek } from "../engine/weeklyReview";
import { writeAtomically } from "./atomicWrite";
import { logEvent } from "./commands";
import { getActiveDay } from "./queries";
import { findWeekReview, getWeeklyReviewRecords, weeklyReviewPayloadSchema } from "./weeklyReviewQueries";

/** Append-only revision; transactional optimistic ownership and no duplicate saves. */
export async function saveWeeklyReview(input: { weekStart: string; weekEnd: string; note: string; focus: WeeklyFocus | null; expectedPreviousId: string | null }): Promise<string> {
  const parsed = weeklyReviewPayloadSchema.safeParse({ weekStart: input.weekStart, weekEnd: input.weekEnd, note: input.note, focus: input.focus,
    ...(input.expectedPreviousId ? { supersedes: input.expectedPreviousId } : {}) });
  if (!parsed.success) throw new Error("Check the review dates, note length and focus. Nothing was saved.");
  const payload = parsed.data;
  return writeAtomically(["beyondDays"], async () => {
    const currentWeek = latestReviewWeek(new Date());
    if (payload.weekStart !== currentWeek.start || payload.weekEnd !== currentWeek.end) throw new Error("The review week changed. Your draft is still here; reopen the current week before saving.");
    const day = await getActiveDay();
    if (!day) throw new Error("Start your day before saving a weekly review. Your draft is still here.");
    const previous = findWeekReview(await getWeeklyReviewRecords(), currentWeek);
    if (previous && previous.note === payload.note && JSON.stringify(previous.focus) === JSON.stringify(payload.focus)) return previous.id;
    if ((previous?.id ?? null) !== input.expectedPreviousId) throw new Error("This review changed elsewhere. Your draft is still here; reload its saved version before revising.");
    return logEvent(day.id, "WEEKLY_REVIEW_SAVED", payload, "USER", crypto.randomUUID(), previous?.id);
  });
}
