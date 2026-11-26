/**
 * GRAYSON-FITS-NOW-001 (Gavin, 2026-11-26: "Brief all four"): his own saved meals that fit what's left of today. Pure,
 * no I/O. What's left is the day's calorie target minus what's logged today; a meal fits at or under it (one serving),
 * and one over by 50 kcal or less "about fits". Best for protein toward what's left first; a tie goes to the meal he's
 * logged most on this kind of day. At most three. Nothing shows under 150 kcal left, or once the eating window is shut.
 */
export const FITS_NOW = { ABOUT_FITS_KCAL: 50, MIN_LEFT_KCAL: 150, MAX_ROWS: 3, WINDOW_CLOSING_MINUTES: 60 } as const;

export interface FitsMeal { id: string; name: string; calories: number; proteinG: number }
export interface FitsNowInput {
  /** Today's calorie target (the day's own when targets by kind of day are on); undefined hides Fits now. */
  targetKcal: number | undefined;
  eatenKcal: number;
  proteinTargetG: number | undefined;
  proteinG: number;
  meals: readonly FitsMeal[];
  /** How often he logged each saved meal on this kind of day over the last 28 days. */
  usesOnThisKind: ReadonlyMap<string, number>;
  /** The eating window, if he uses it: CLOSED hides Fits now; OPEN with minutes left under 60 says so. */
  window: { state: "OPEN"; leftMinutes: number } | { state: "CLOSED" } | null;
}
export interface FitsRow { meal: FitsMeal; aboutFits: boolean; leaves: string }
export type FitsNow =
  | { kind: "LIST"; leftKcal: number; rows: FitsRow[]; windowLine: string | null }
  | { kind: "NONE"; leftKcal: number; line: string; windowLine: string | null };

const round = (n: number) => Math.round(n);

/** What one serving leaves: "Leaves 80 kcal, protein target met"; "About fits: 30 kcal over, 12 g protein to go". */
export function leavesLine(meal: FitsMeal, leftKcal: number, proteinLeftG: number | undefined): string {
  const after = leftKcal - meal.calories;
  const kcal = after >= 0 ? `Leaves ${round(after)} kcal` : `About fits: ${round(-after)} kcal over`;
  if (proteinLeftG === undefined) return kcal;
  const proteinAfter = proteinLeftG - meal.proteinG;
  return `${kcal}, ${proteinAfter <= 0 ? "protein target met" : `${round(proteinAfter)} g protein to go`}`;
}

/** Null when Fits now shouldn't show at all: no calorie target, under 150 kcal left, or the window is shut. */
export function fitsNow(input: FitsNowInput): FitsNow | null {
  if (input.targetKcal === undefined || input.window?.state === "CLOSED") return null;
  const leftKcal = input.targetKcal - input.eatenKcal;
  if (leftKcal < FITS_NOW.MIN_LEFT_KCAL) return null;
  const proteinLeft = input.proteinTargetG === undefined ? undefined : Math.max(0, input.proteinTargetG - input.proteinG);
  const windowLine = input.window?.state === "OPEN" && input.window.leftMinutes < FITS_NOW.WINDOW_CLOSING_MINUTES
    ? `Window closes in ${Math.max(0, round(input.window.leftMinutes))} min` : null;
  const toward = (m: FitsMeal) => (proteinLeft === undefined ? m.proteinG : Math.min(m.proteinG, proteinLeft));
  const rows = input.meals
    .filter((m) => m.calories <= leftKcal + FITS_NOW.ABOUT_FITS_KCAL)
    .sort((a, b) => toward(b) - toward(a) || (input.usesOnThisKind.get(b.id) ?? 0) - (input.usesOnThisKind.get(a.id) ?? 0) || a.name.localeCompare(b.name))
    .slice(0, FITS_NOW.MAX_ROWS)
    .map((meal) => ({ meal, aboutFits: meal.calories > leftKcal, leaves: leavesLine(meal, leftKcal, proteinLeft) }));
  if (!rows.length) return { kind: "NONE", leftKcal, line: `None of your saved meals fit the ${round(leftKcal)} kcal left`, windowLine };
  return { kind: "LIST", leftKcal, rows, windowLine };
}
