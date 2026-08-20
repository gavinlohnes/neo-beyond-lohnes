/**
 * Phase 5 (BODY logging): pure copy/formatting/validation helpers, kept
 * separate from BodyScreen so they're unit tested without a DOM. None of
 * this changes what's stored — durationMinutes/weightLbs/grams remain
 * exactly as logged; this only formats them for display and flags
 * (never blocks) values worth a second look before logging.
 */

/** Water quick-add shortcuts, plus a custom amount and "repeat last" — never a duplicate of the underlying logWater call, just faster ways to reach it. */
export const WATER_QUICK_ADD_OZ = [8, 12, 16] as const;

export function hoursAndMinutesToTotalMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export function totalMinutesToHoursAndMinutes(totalMinutes: number): { hours: number; minutes: number } {
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/** Always human-readable — never raw minutes on their own. */
export function formatDuration(totalMinutes: number): string {
  const { hours, minutes } = totalMinutesToHoursAndMinutes(totalMinutes);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export function describeWaterLogged(amountOz: number): string {
  return `${amountOz} oz added.`;
}

export function describeSleepLogged(totalMinutes: number): string {
  return `Sleep saved as ${formatDuration(totalMinutes)}.`;
}

export function describeProteinLogged(grams: number): string {
  return `${grams} g added.`;
}

export function describeBodyweightLogged(weightLbs: number): string {
  return `${weightLbs} lbs logged.`;
}

/**
 * Plausible ranges are a soft check, not a hard rule — deliberately wide
 * enough to rarely fire for a genuine value, catching the realistic slip
 * (a stray digit, minutes typed where hours were meant) without ever
 * blocking an intentional outlier. Values outside the range still log
 * successfully; the UI surfaces a confirmation, it doesn't refuse.
 */
export interface PlausibleRange {
  min: number;
  max: number;
}

export const BODYWEIGHT_PLAUSIBLE_RANGE: PlausibleRange = { min: 50, max: 500 }; // lbs
export const PROTEIN_PLAUSIBLE_RANGE: PlausibleRange = { min: 0, max: 300 }; // grams, per single log
export const SLEEP_PRIMARY_PLAUSIBLE_RANGE: PlausibleRange = { min: 120, max: 720 }; // 2-12 hours
export const SLEEP_SUPPLEMENTAL_PLAUSIBLE_RANGE: PlausibleRange = { min: 5, max: 180 }; // 5 min - 3 hours

export function isImplausible(value: number, range: PlausibleRange): boolean {
  return value < range.min || value > range.max;
}

export function describeImplausibleBodyweight(weightLbs: number): string {
  return `${weightLbs} lbs is outside the usual range — log it anyway?`;
}

export function describeImplausibleProtein(grams: number): string {
  return `${grams} g is outside the usual range for one log — log it anyway?`;
}

export function describeImplausibleSleep(totalMinutes: number): string {
  return `${formatDuration(totalMinutes)} is outside the usual range — log it anyway?`;
}
