import { z } from "zod";
import {
  MEASUREMENT_MAX_INCHES,
  MEASUREMENT_MIN_INCHES,
  MEASUREMENT_SITES,
  PHOTO_POSES,
  type ProgressPhoto,
} from "../domain/body/types";

/**
 * REVIEW-001 Phase 1a measurements and progress photos. Same shared-schema
 * pattern as journalValidation.ts: *Input schemas validate a command's
 * caller-supplied fields (throws via .parse()); progressPhotoSchema validates
 * what comes back out of Dexie on every read (safeParse — an invalid row is
 * left out of results, not treated as canonical truth).
 */

/** A real local calendar date, YYYY-MM-DD (rejects 2026-02-30). */
export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number) as [number, number, number];
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }, "Date is not a real calendar date");

const inchesSchema = z
  .number()
  .finite("Measurement must be a number")
  .min(MEASUREMENT_MIN_INCHES, `Measurement must be at least ${MEASUREMENT_MIN_INCHES} in`)
  .max(MEASUREMENT_MAX_INCHES, `Measurement must be at most ${MEASUREMENT_MAX_INCHES} in`);

export const measurementInputSchema = z.object({
  site: z.enum(MEASUREMENT_SITES),
  inches: inchesSchema,
  measuredOn: localDateSchema,
});
export type MeasurementInput = z.infer<typeof measurementInputSchema>;

export const measurementCorrectionInputSchema = z
  .object({ inches: inchesSchema.optional(), measuredOn: localDateSchema.optional() })
  .refine((v) => v.inches !== undefined || v.measuredOn !== undefined, "At least one field must change");
export type MeasurementCorrectionInput = z.infer<typeof measurementCorrectionInputSchema>;

export const photoDetailsInputSchema = z.object({
  pose: z.enum(PHOTO_POSES),
  takenOn: localDateSchema,
});
export type PhotoDetailsInput = z.infer<typeof photoDetailsInputSchema>;

export const photoCorrectionInputSchema = z
  .object({ pose: z.enum(PHOTO_POSES).optional(), takenOn: localDateSchema.optional() })
  .refine((v) => v.pose !== undefined || v.takenOn !== undefined, "At least one field must change");
export type PhotoCorrectionInput = z.infer<typeof photoCorrectionInputSchema>;

export const progressPhotoSchema = z.object({
  id: z.string().min(1),
  pose: z.enum(PHOTO_POSES),
  takenOn: localDateSchema,
  source: z.enum(["CAMERA", "IMPORT"]),
  addedAt: z.string().min(1),
  updatedAt: z.string().min(1),
  hiddenAt: z.string().min(1).optional(),
  image: z.instanceof(Blob),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  byteSize: z.number().int().positive(),
});

export function parseProgressPhoto(raw: unknown): ProgressPhoto | null {
  const result = progressPhotoSchema.safeParse(raw);
  if (!result.success) return null;
  const { hiddenAt, ...rest } = result.data;
  return hiddenAt === undefined ? rest : { ...rest, hiddenAt };
}
