import { db } from "../persistence/db";
import { newId } from "./commands";
import { PHOTO_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { logUnscopedEvent } from "./unscopedEvents";
import { reencodePhoto } from "./photoEncoding";
import { formatLocalDate } from "../engine/scheduledContext";
import type {
  PhotoSource,
  ProgressPhoto,
  ProgressPhotoAddedPayload,
  ProgressPhotoCorrectedPayload,
  ProgressPhotoDeletedPayload,
  ProgressPhotoHiddenPayload,
} from "../domain/body/types";
import {
  photoCorrectionInputSchema,
  photoDetailsInputSchema,
  type PhotoCorrectionInput,
  type PhotoDetailsInput,
} from "../persistence/bodyRecordValidation";

/**
 * REVIEW-001 Phase 1a progress photos (see domain/body/types.ts). The image
 * is re-encoded before anything is written, so the original file — and its
 * metadata — is never stored. Each change writes the row and its event in
 * one transaction.
 */

function assertNotFuture(takenOn: string, now: Date): void {
  if (takenOn > formatLocalDate(now)) throw new Error("PHOTO_IN_FUTURE: A photo can't be dated after today.");
}

function notFound(): Error {
  return new Error("PHOTO_NOT_FOUND: That photo could not be found.");
}

/**
 * Asks the browser to keep this site's storage through storage pressure.
 * Best-effort: some browsers decline or ask the operator; the answer is
 * readable through isPhotoStoragePersistent.
 */
export async function requestPersistentPhotoStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function addProgressPhoto(
  file: Blob,
  details: PhotoDetailsInput,
  source: PhotoSource,
  now: Date = new Date(),
): Promise<ProgressPhoto> {
  const { pose, takenOn } = photoDetailsInputSchema.parse(details);
  assertNotFuture(takenOn, now);
  // Encoding awaits the browser's decoder, so it runs before the transaction opens.
  const { image, width, height } = await reencodePhoto(file);
  const timestamp = new Date().toISOString();
  const photo: ProgressPhoto = {
    id: newId(),
    pose,
    takenOn,
    source,
    addedAt: timestamp,
    updatedAt: timestamp,
    image,
    width,
    height,
    byteSize: image.size,
  };
  await writeAtomically(PHOTO_WRITE_TABLES, async () => {
    await db.progressPhotos.add(photo);
    const commandId = newId();
    const payload: ProgressPhotoAddedPayload = { commandId, photoId: photo.id, pose, takenOn, source, byteSize: photo.byteSize };
    await logUnscopedEvent("PROGRESS_PHOTO_ADDED", payload, commandId);
  });
  void requestPersistentPhotoStorage();
  return photo;
}

/** Corrects a photo's pose and/or date. The image itself never changes. */
export async function correctProgressPhoto(photoId: string, changes: PhotoCorrectionInput, now: Date = new Date()): Promise<void> {
  const parsed = photoCorrectionInputSchema.parse(changes);
  await writeAtomically(PHOTO_WRITE_TABLES, async () => {
    const photo = await db.progressPhotos.get(photoId);
    if (!photo) throw notFound();
    const pose = parsed.pose ?? photo.pose;
    const takenOn = parsed.takenOn ?? photo.takenOn;
    if (pose === photo.pose && takenOn === photo.takenOn) throw new Error("NO_OP_CORRECTION: No changes.");
    assertNotFuture(takenOn, now);
    await db.progressPhotos.update(photoId, { pose, takenOn, updatedAt: new Date().toISOString() });
    const commandId = newId();
    const payload: ProgressPhotoCorrectedPayload = { commandId, photoId, pose, takenOn };
    await logUnscopedEvent("PROGRESS_PHOTO_CORRECTED", payload, commandId);
  });
}

/** Takes a photo out of view and comparisons. The image is kept, here and in backups. Repeating it is a no-op. */
export async function hideProgressPhoto(photoId: string): Promise<void> {
  await writeAtomically(PHOTO_WRITE_TABLES, async () => {
    const photo = await db.progressPhotos.get(photoId);
    if (!photo) throw notFound();
    if (photo.hiddenAt) return;
    const timestamp = new Date().toISOString();
    await db.progressPhotos.update(photoId, { hiddenAt: timestamp, updatedAt: timestamp });
    const commandId = newId();
    const payload: ProgressPhotoHiddenPayload = { commandId, photoId };
    await logUnscopedEvent("PROGRESS_PHOTO_HIDDEN", payload, commandId);
  });
}

/**
 * Removes the image from this device for good (Gavin, 2026-10-17), so later
 * backups no longer contain it; a backup exported before stays as it was.
 * The PROGRESS_PHOTO_DELETED event records that a photo was deleted — with
 * no image data. Deleting an already-deleted photo is a no-op.
 */
export async function deleteProgressPhotoPermanently(photoId: string): Promise<void> {
  await writeAtomically(PHOTO_WRITE_TABLES, async () => {
    const photo = await db.progressPhotos.get(photoId);
    if (!photo) {
      const deleted = (await db.events.where("type").equals("PROGRESS_PHOTO_DELETED").toArray()).some(
        (e) => (e.payload as ProgressPhotoDeletedPayload).photoId === photoId,
      );
      if (deleted) return;
      throw notFound();
    }
    await db.progressPhotos.delete(photoId);
    const commandId = newId();
    const payload: ProgressPhotoDeletedPayload = { commandId, photoId };
    await logUnscopedEvent("PROGRESS_PHOTO_DELETED", payload, commandId);
  });
}
