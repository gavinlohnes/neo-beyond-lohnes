/**
 * REVIEW-001 question catalog #9, #16, #20 and #21 (Phase 1a data): what the
 * recorded tape measurements and progress photos show. Pure and read only;
 * never used by `evaluate`. Differences between recorded values only — BEYOND
 * does not measure fat or muscle, so nothing here is a body-composition verdict.
 */
export const BODY_CHANGE_FLOOR = 2;

/** A calendar-dated measurement (YYYY-MM-DD), oldest measurement date first. */
export interface SiteMeasurement { site: string; inches: number; measuredOn: string; correctionCount?: number }

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * One site's recorded readings: the latest, the change since the reading before
 * it and since the first. Below BODY_CHANGE_FLOOR readings there is no change.
 */
export function summarizeSite<T extends SiteMeasurement>(entries: readonly T[], site: string) {
  const readings = entries.filter((entry) => entry.site === site);
  const latest = readings.at(-1);
  if (!latest) return { site, count: 0, readings, latest: undefined, first: undefined, previous: undefined, sinceFirst: undefined, sincePrevious: undefined };
  const first = readings[0]!;
  const previous = readings.length >= BODY_CHANGE_FLOOR ? readings.at(-2)! : undefined;
  return {
    site, count: readings.length, readings, latest, first, previous,
    sinceFirst: readings.length >= BODY_CHANGE_FLOOR ? round(latest.inches - first.inches) : undefined,
    sincePrevious: previous ? round(latest.inches - previous.inches) : undefined,
  };
}
export type SiteSummary = ReturnType<typeof summarizeSite>;

/** A visible, calendar-dated photo. */
export interface PosePhoto { pose: string; takenOn: string; hiddenAt?: string | undefined }

/** Per pose: how many visible photos, and the first and latest dates. Comparable once there are two. */
export function summarizePhotos<T extends PosePhoto>(photos: readonly T[], poses: readonly string[]) {
  return poses.map((pose) => {
    const dates = photos.filter((photo) => photo.pose === pose && !photo.hiddenAt).map((photo) => photo.takenOn).sort();
    return { pose, count: dates.length, first: dates[0], latest: dates.at(-1), comparable: dates.length >= BODY_CHANGE_FLOOR };
  });
}
