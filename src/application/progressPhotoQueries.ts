import { db } from "../persistence/db";
import { parseProgressPhoto } from "../persistence/bodyRecordValidation";
import type { PhotoPose, ProgressPhoto } from "../domain/body/types";

/**
 * REVIEW-001 Phase 1a: progress photos, oldest date first; photos taken the
 * same day in the order they were added. Hidden photos are left out unless
 * asked for. Rows that fail validation are left out rather than shown.
 */
export async function getProgressPhotos(options: { includeHidden?: boolean; pose?: PhotoPose } = {}): Promise<ProgressPhoto[]> {
  const rows = (await db.progressPhotos.toArray()).map(parseProgressPhoto).filter((p): p is ProgressPhoto => p !== null);
  return rows
    .filter((p) => options.includeHidden || !p.hiddenAt)
    .filter((p) => options.pose === undefined || p.pose === options.pose)
    .sort((a, b) => a.takenOn.localeCompare(b.takenOn) || a.addedAt.localeCompare(b.addedAt));
}

/** Whether the browser has agreed to keep this site's storage under pressure; null where it can't say. */
export async function isPhotoStoragePersistent(): Promise<boolean | null> {
  try {
    return (await navigator.storage?.persisted?.()) ?? null;
  } catch {
    return null;
  }
}
