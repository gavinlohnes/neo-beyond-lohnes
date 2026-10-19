import { getMeasurements } from "./measurementQueries";
import { getProgressPhotos } from "./progressPhotoQueries";
import { summarizePhotos, summarizeSite } from "../engine/bodyReview";
import { MEASUREMENT_SITES, PHOTO_POSES } from "../domain/body/types";

/**
 * REVIEW-001 Body questions (#9, #16, #20, #21): every recorded tape
 * measurement per site and the visible progress photos per pose. Read only,
 * from the existing BODY queries; no verdict.
 */
export async function getBodyReview() {
  const [measurements, photos] = await Promise.all([getMeasurements(), getProgressPhotos()]);
  return {
    sites: MEASUREMENT_SITES.map((site) => summarizeSite(measurements, site)),
    photos: summarizePhotos(photos, PHOTO_POSES),
  };
}
export type BodyReview = Awaited<ReturnType<typeof getBodyReview>>;
