/**
 * GRAYSON-PROTEIN-HEADSUP-001 (Gavin, 2026-11-26: "Brief all four"; his goal, Nov 24: "lose weight but keep muscle"):
 * a calm heads-up when protein runs well under target on several logged days. Pure, no I/O. Facts only, never advice.
 *
 * Counted days are finished days with at least one meal logged (the burn estimate's rule), minus days he marked not
 * fully logged; today never counts. The pattern is protein under `underPercent` of his target on at least `days` of
 * the last `windowDays` counted days. THAT'S FINE keeps it quiet for 7 days; it goes away by itself when the pattern ends.
 */
export interface ProteinHeadsUpSettings { on: boolean; underPercent: number; days: number; windowDays: number; dismissedAt?: string | undefined }
export const DEFAULT_PROTEIN_HEADSUP: ProteinHeadsUpSettings = { on: true, underPercent: 75, days: 3, windowDays: 4 };
export const PROTEIN_HEADSUP_LIMITS = { PERCENT_MIN: 50, PERCENT_MAX: 95, DAYS_MIN: 2, DAYS_MAX: 7 } as const;
export const QUIET_DAYS = 7;
const DAY_MS = 86_400_000;

export interface ProteinDay { beyondDayId: string; livedDayStart: string; proteinG: number }
export interface ProteinHeadsUp {
  /** "Protein has been under 75% of your target on 3 of the last 4 days." */
  line: string;
  /** "Mon 98 g, Tue 104 g, Thu 91 g of 180 g" — the short days, oldest first. */
  days: string;
  short: ProteinDay[];
  targetG: number;
}

const weekday = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short" });

/**
 * Null when it shouldn't show: off, no target, not enough counted days, the pattern isn't there, or THAT'S FINE was
 * tapped in the last 7 days. `counted` must already exclude today, unfinished days, days without a meal and marked days.
 */
export function proteinHeadsUp(counted: readonly ProteinDay[], targetG: number | undefined, settings: ProteinHeadsUpSettings, now: Date): ProteinHeadsUp | null {
  if (!settings.on || targetG === undefined || targetG <= 0) return null;
  if (settings.dismissedAt && now.getTime() - Date.parse(settings.dismissedAt) < QUIET_DAYS * DAY_MS) return null;
  const recent = [...counted].sort((a, b) => a.livedDayStart.localeCompare(b.livedDayStart)).slice(-settings.windowDays);
  if (recent.length < settings.windowDays) return null;
  const under = targetG * settings.underPercent / 100;
  const short = recent.filter((d) => d.proteinG < under);
  if (short.length < settings.days) return null;
  return {
    line: `Protein has been under ${settings.underPercent}% of your target on ${short.length} of the last ${recent.length} days.`,
    days: `${short.map((d) => `${weekday(d.livedDayStart)} ${Math.round(d.proteinG)} g`).join(", ")} of ${Math.round(targetG)} g`,
    short, targetG,
  };
}
