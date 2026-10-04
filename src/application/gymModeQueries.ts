import { getCustomExercises } from "./exerciseLibraryQueries";

/**
 * GYM-001 (owner brief 2026-10-04, rulings 1A and 3A): the gym screen's two
 * pure helpers (plate math and the warm-up ramp) plus the one read that
 * says which lifts are barbell lifts. Nothing here is stored or logged; the
 * warm-up ramp is a suggestion only.
 */

export const BAR_LBS = 45;
/** Standard plates, heaviest first, in lb. */
export const PLATES_LBS = [45, 35, 25, 10, 5, 2.5] as const;

/**
 * Plates per side for a 45 lb bar, fewest plates first (heavier first on a
 * tie), or null when the weight can't be made exactly. 45 lb is the bare
 * bar ([]).
 */
export function platesPerSide(totalLbs: number): number[] | null {
  if (!Number.isFinite(totalLbs) || totalLbs < BAR_LBS) return null;
  // Work in half-pounds so 2.5 lb plates are whole numbers.
  const target = Math.round(totalLbs * 2) - BAR_LBS * 2;
  if (target % 2 !== 0) return null; // each side must be the same
  const perSide = target / 2;
  const units = PLATES_LBS.map((p) => p * 2);
  const best: (number[] | null)[] = new Array(perSide + 1).fill(null);
  best[0] = [];
  for (let amount = 1; amount <= perSide; amount++) {
    for (const u of units) {
      const prev = amount >= u ? best[amount - u] : null;
      if (!prev) continue;
      const candidate = [...prev, u].sort((a, b) => b - a);
      const current = best[amount];
      if (!current || candidate.length < current.length || (candidate.length === current.length && heavierFirst(candidate, current))) {
        best[amount] = candidate;
      }
    }
  }
  const result = best[perSide];
  return result ? result.map((u) => u / 2) : null;
}

function heavierFirst(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

/** "185 lb = bar + 45 + 25 per side"; "45 lb = the bar"; or the reason it can't be loaded. */
export function describePlates(totalLbs: number): string {
  const plates = platesPerSide(totalLbs);
  if (!plates) return `${totalLbs} lb: not loadable with standard plates`;
  if (plates.length === 0) return `${totalLbs} lb = the bar`;
  return `${totalLbs} lb = bar + ${plates.join(" + ")} per side`;
}

export interface WarmUpStep {
  weightLbs: number;
  reps: number;
}

const RAMP = [
  { pct: 0.5, reps: 5 },
  { pct: 0.7, reps: 3 },
  { pct: 0.85, reps: 1 },
] as const;

/**
 * Ruling 3A: the bar ×10, then about 50% ×5, 70% ×3 and 85% ×1 of the
 * working weight, each rounded to the nearest loadable weight (5 lb steps
 * on a 45 lb bar); steps not above the bar, not below the working weight,
 * or repeating a weight are dropped. Empty when the working weight is
 * the bar or less.
 */
export function warmUpRamp(workingLbs: number): WarmUpStep[] {
  if (!Number.isFinite(workingLbs) || workingLbs <= BAR_LBS) return [];
  const steps: WarmUpStep[] = [{ weightLbs: BAR_LBS, reps: 10 }];
  for (const { pct, reps } of RAMP) {
    const weightLbs = BAR_LBS + Math.round((workingLbs * pct - BAR_LBS) / 5) * 5;
    const last = steps.at(-1)!;
    if (weightLbs > last.weightLbs && weightLbs < workingLbs) steps.push({ weightLbs, reps });
  }
  return steps;
}

/** "Warm-up: 45 ×10 · 95 ×5 · 130 ×3 · 155 ×1" */
export function describeWarmUp(steps: readonly WarmUpStep[]): string {
  return `Warm-up: ${steps.map((s) => `${s.weightLbs} ×${s.reps}`).join(" · ")}`;
}

/** Ids of the custom exercises whose equipment is a barbell (built-in templates have none). */
export async function getBarbellExerciseIds(): Promise<Set<string>> {
  const exercises = await getCustomExercises({ includeArchived: true });
  return new Set(exercises.filter((e) => e.equipment === "Barbell").map((e) => e.id));
}
