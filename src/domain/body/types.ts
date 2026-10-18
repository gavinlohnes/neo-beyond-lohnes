// Domain layer must not import React, Dexie, or UI code.

/**
 * REVIEW-001 Phase 1a — baseline capture (owner-approved plan, 2026-10-14).
 *
 * Body measurements are BODY log facts, corrected the way other BODY logs
 * are: MEASUREMENT_LOGGED starts a chain, MEASUREMENT_LOG_CORRECTED
 * supersedes its value or date without erasing the original, and
 * MEASUREMENT_LOG_VOIDED takes the whole chain out of every reading.
 * Nothing is deleted. Earlier tape measurements can be entered with the
 * date they were taken (`measuredOn`), so a measurement is not tied to a
 * BeyondDay — like Decision Journal and Time Capsule events, these events
 * carry no beyondDayId.
 */
export const MEASUREMENT_SITES = ["WAIST", "CHEST", "ARMS", "SHOULDERS", "HIPS"] as const;
export type MeasurementSite = (typeof MEASUREMENT_SITES)[number];

/** Waist is the primary measurement; the others are optional. */
export const PRIMARY_MEASUREMENT_SITE: MeasurementSite = "WAIST";

export const MEASUREMENT_MIN_INCHES = 5;
export const MEASUREMENT_MAX_INCHES = 100;

export interface MeasurementLoggedPayload {
  commandId: string;
  site: MeasurementSite;
  inches: number;
  /** Local calendar date the measurement was taken, YYYY-MM-DD. */
  measuredOn: string;
}

/** Same correction-chain shape as the other BODY logs; carries the full effective value and date. */
export interface MeasurementLogCorrectedPayload {
  commandId: string;
  originalEventId: string;
  supersedesEventId: string;
  inches: number;
  measuredOn: string;
}

/** Same shape as BodyLogVoidedPayload: names the root MEASUREMENT_LOGGED event. */
export interface MeasurementLogVoidedPayload {
  commandId: string;
  loggedEventId: string;
}

/**
 * Progress photos stay on the device only, and are included in the normal
 * backup file (REVIEW-001 Decision 2, option (a), Gavin 2026-10-17).
 *
 * The image lives in the progressPhotos table as a re-encoded Blob — never
 * the original file, so location and device metadata are stripped before
 * anything is stored. The row is current state (pose and date can be
 * corrected in place); every change also writes a DomainEvent, like
 * Mission/Obligation. Events never carry image data.
 *
 * Two ways to take a photo out of view (Gavin, 2026-10-17):
 * - HIDE keeps the image, in this device's data and in backups.
 * - DELETE PERMANENTLY removes the image from this device, so later
 *   backups no longer contain it. A backup exported earlier still does.
 */
export const PHOTO_POSES = ["FRONT", "SIDE", "BACK"] as const;
export type PhotoPose = (typeof PHOTO_POSES)[number];

export type PhotoSource = "CAMERA" | "IMPORT";

/** Longest edge of a stored photo, in pixels. Larger images are scaled down when re-encoded. */
export const PHOTO_MAX_EDGE_PX = 1600;
export const PHOTO_JPEG_QUALITY = 0.85;

export interface ProgressPhoto {
  id: string;
  pose: PhotoPose;
  /** Local calendar date the photo was taken, YYYY-MM-DD. */
  takenOn: string;
  source: PhotoSource;
  addedAt: string;
  updatedAt: string;
  /** Set when hidden; a hidden photo keeps its image. */
  hiddenAt?: string;
  /** The re-encoded JPEG. */
  image: Blob;
  width: number;
  height: number;
  byteSize: number;
}

export interface ProgressPhotoAddedPayload {
  commandId: string;
  photoId: string;
  pose: PhotoPose;
  takenOn: string;
  source: PhotoSource;
  byteSize: number;
}

export interface ProgressPhotoCorrectedPayload {
  commandId: string;
  photoId: string;
  pose: PhotoPose;
  takenOn: string;
}

export interface ProgressPhotoHiddenPayload {
  commandId: string;
  photoId: string;
}

export interface ProgressPhotoDeletedPayload {
  commandId: string;
  photoId: string;
}
