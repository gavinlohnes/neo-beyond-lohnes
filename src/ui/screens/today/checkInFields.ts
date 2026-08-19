import type { StateCheckIn } from "../../../domain/common/types";

/**
 * Phase 2 (TODAY as daily command surface): pure presentation metadata for
 * the state check-in fields, kept separate from TodayScreen so the
 * direction-of-scale claims and ALL GOOD summary text can be unit tested
 * without a DOM. The five keys/ranges themselves are unchanged from the
 * locked StateCheckIn shape — this file only adds labels and direction.
 */

export type CheckInValues = Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt">;
export type CheckInFieldKey = keyof CheckInValues;
export type PartialCheckInValues = Partial<CheckInValues>;

export interface CheckInFieldConfig {
  key: CheckInFieldKey;
  label: string;
  min: number;
  max: number;
  /** Matches deriveCapacity's actual direction for this field — see tests/ui/checkInFields.test.ts. */
  direction: "higherIsBetter" | "higherIsWorse";
  directionLabel: string;
}

export const CHECK_IN_FIELDS: CheckInFieldConfig[] = [
  { key: "energy", label: "Energy", min: 1, max: 5, direction: "higherIsBetter", directionLabel: "higher = better" },
  { key: "stress", label: "Stress", min: 1, max: 5, direction: "higherIsWorse", directionLabel: "higher = worse" },
  { key: "mood", label: "Mood", min: 1, max: 5, direction: "higherIsBetter", directionLabel: "higher = better" },
  { key: "soreness", label: "Soreness", min: 0, max: 5, direction: "higherIsWorse", directionLabel: "higher = worse" },
  { key: "alcoholUrge", label: "Alcohol urge", min: 0, max: 5, direction: "higherIsWorse", directionLabel: "higher = worse" },
];

export function rangeForField(field: CheckInFieldConfig): number[] {
  return Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i);
}

export function isCheckInComplete(values: PartialCheckInValues): values is CheckInValues {
  return CHECK_IN_FIELDS.every((f) => values[f.key] !== undefined);
}

/** Human-readable summary of a full set of check-in values, e.g. for previewing ALL GOOD before it's tapped. */
export function describeCheckInValues(values: CheckInValues): string {
  return CHECK_IN_FIELDS.map((f) => `${f.label} ${values[f.key]}`).join(" · ");
}
