/**
 * PLATES-001 (APPS-PICKS-002 pick 16, after Strong/Hevy): plates per side for a barbell weight.
 * Pure arithmetic for display; it never changes a prescription or a logged set.
 */
export const BAR_LBS = 45;
const PLATES = [45, 35, 25, 10, 5, 2.5] as const;

export function platesPerSide(totalLbs: number, bar = BAR_LBS): { plates: number[]; leftover: number } | null {
  if (!Number.isFinite(totalLbs) || totalLbs < bar) return null;
  let side = (totalLbs - bar) / 2;
  const plates: number[] = [];
  for (const plate of PLATES) while (side + 1e-9 >= plate) { plates.push(plate); side -= plate; }
  return { plates, leftover: Math.round(side * 2 * 100) / 100 };
}

/** Free-weight barbell lifts only; machines, cables, dumbbells and Smith bars have no plate math here. */
export const usesBarbellPlates = (name: string) =>
  /barbell|deadlift|back squat|front squat|bench press|overhead press|\bsquat\b/i.test(name) && !/dumbbell|machine|cable|smith|goblet|leg press|hack|trap bar/i.test(name);

export function describePlates(totalLbs: number): string | null {
  const result = platesPerSide(totalLbs);
  if (!result) return null;
  const list = result.plates.length ? result.plates.join(" + ") : "empty bar";
  return `Per side: ${list}${result.leftover ? ` (${result.leftover} lb plates can't make)` : ""} · ${BAR_LBS} lb bar`;
}
