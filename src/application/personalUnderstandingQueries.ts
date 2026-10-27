import { db } from "../persistence/db";
import { getWholePicture } from "./wholePictureQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getActiveMissions } from "./intentQueries";
import { getReviewedDecisionJournalEntries } from "./journalQueries";
import { getNutritionTargets } from "./nutritionTargetQueries";
import { getSchedulePattern } from "./queries";
import { runPositions } from "./rotationProjection";
import { BASELINE_DAYS, PERIOD_DAYS, projectPersonalBaselines } from "../engine/personalBaselines";
import { finishedLivedDays, groupLivedDays, MEASURES, series } from "../engine/livedDaySeries";
import { findRelevantReviewedEntries } from "../engine/journalRelevance";

/** Read-only composition, never a profile store or recommendation input. */
export async function getPersonalUnderstanding(now = new Date()) {
  return db.transaction("r", db.tables, async () => {
    const [picture, summaries, missions, journal, targets, schedule] = await Promise.all([
      getWholePicture(now), getDaySummaries(), getActiveMissions(),
      getReviewedDecisionJournalEntries(), getNutritionTargets(), getSchedulePattern(),
    ]);
    const days = groupLivedDays(summaries);
    const baselineWindow = finishedLivedDays(now, PERIOD_DAYS, BASELINE_DAYS);
    const periodWindow = finishedLivedDays(now, 0, PERIOD_DAYS);
    const baselines = projectPersonalBaselines(summaries, now).map((reading) => {
      const evidence = (window: typeof baselineWindow) => series(days, MEASURES[reading.measure], window, reading.dayKind)
        .map((point) => ({ ...point, dayIds: days.get(point.livedDayStart)!.records.map((record) => record.beyondDayId) }));
      return { reading, baseline: evidence(baselineWindow), recent: evidence(periodWindow) };
    });
    // Only optional, actually stored choices: never describe seeded protein defaults as Gavin's choice.
    const chosenTargets = [
      ["calorieTargetKcal", "Daily calories", "kcal"],
      ["goalWeightLbs", "Goal weight", "lb"],
      ["weightChangeTargetPercentPerWeek", "Weekly weight change", "% of bodyweight/week"],
      ["muscleSetsTargetPerWeek", "Weekly sets per muscle", "sets"],
      ["strengthSessionsTargetPerWeek", "Weekly strength sessions", "sessions"],
    ] as const;
    return {
      readAt: now.toISOString(),
      missions: missions.map((mission) => ({ ...mission,
        relatedLessons: findRelevantReviewedEntries(journal.filter((entry) => Boolean(entry.lesson?.trim())), [mission.title, mission.description ?? ""]),
      })),
      targets: chosenTargets.flatMap(([key, label, unit]) => targets[key] === undefined ? [] : [{ key, label, unit, value: targets[key], updatedAt: targets.updatedAt }]),
      schedule,
      focus: picture.savedReview,
      baselines, baselineWindow, periodWindow,
      positions: runPositions(picture.rows),
      lessons: journal.filter((entry) => Boolean(entry.lesson?.trim())),
    };
  });
}
export type PersonalUnderstanding = Awaited<ReturnType<typeof getPersonalUnderstanding>>;
