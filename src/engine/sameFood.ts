/**
 * "SAME FOOD?" (Drop 1.5, owner brief 2026-10-03). Field use showed one
 * food logged twice — a 49 g protein-only log at 20:43:11 and a meal with
 * 50 g protein at 20:43:26. Right after either kind is logged, this finds a
 * log of the OTHER kind close in time with similar protein, so BEYOND can
 * ask "Same food?". Pure, and only a question: it never blocks a log and
 * never removes anything on its own — the operator chooses KEEP BOTH or
 * REMOVE ONE.
 */

/** Two logs this close together (either order) can be the same food. */
export const SAME_FOOD_WINDOW_MS = 2 * 60_000;
/** Protein within this many grams… */
export const SAME_FOOD_PROTEIN_SLACK_G = 5;
/** …or within this fraction of the larger amount, whichever is wider. */
export const SAME_FOOD_PROTEIN_SLACK_FRACTION = 0.1;

export interface SameFoodProteinLog {
  /** The root PROTEIN_LOGGED event id. */
  id: string;
  grams: number;
  at: string;
}

export interface SameFoodMeal {
  /** The root MEAL_LOGGED event id. */
  id: string;
  savedMealId: string;
  name: string;
  calories: number;
  proteinG: number;
  at: string;
}

export interface SameFoodPair {
  protein: SameFoodProteinLog;
  meal: SameFoodMeal;
}

export interface DuplicateMealPair {
  earlier: SameFoodMeal;
  justLogged: SameFoodMeal;
}

/**
 * Most recent standing meal before `justLoggedId` that is an exact duplicate.
 * Array order breaks same-millisecond ties because getMealEntries already
 * orders roots by recordedAt + seq.
 */
export function findDuplicateMeal(
  meals: readonly SameFoodMeal[],
  justLoggedId: string,
): DuplicateMealPair | undefined {
  const index = meals.findIndex((meal) => meal.id === justLoggedId);
  if (index < 0) return undefined;
  const justLogged = meals[index]!;
  const justLoggedAt = new Date(justLogged.at).getTime();
  const earlier = meals
    .slice(0, index)
    .filter((candidate) => {
      const gap = justLoggedAt - new Date(candidate.at).getTime();
      return gap >= 0 && gap <= SAME_FOOD_WINDOW_MS && isSameMeal(candidate, justLogged);
    })
    .at(-1);

  return earlier ? { earlier, justLogged } : undefined;
}

/** The same saved meal, or the same name (trimmed, any case) with the same calories and protein. */
export function isSameMeal(a: SameFoodMeal, b: SameFoodMeal): boolean {
  return (
    a.savedMealId === b.savedMealId ||
    (a.name.trim().toLocaleLowerCase() === b.name.trim().toLocaleLowerCase() && a.calories === b.calories && a.proteinG === b.proteinG)
  );
}

/**
 * SAME AS YESTERDAY (DUP-MEAL-002): for a batch just logged together, each
 * new meal that repeats a standing meal logged before the batch, within the
 * same window. Meals inside the batch never match each other — a day that
 * had two shakes is repeated as two shakes, not flagged.
 */
export function findBatchDuplicateMeals(meals: readonly SameFoodMeal[], batchIds: readonly string[]): DuplicateMealPair[] {
  const batch = new Set(batchIds);
  const before = meals.filter((m) => !batch.has(m.id));
  const used = new Set<string>();
  const pairs: DuplicateMealPair[] = [];
  for (const id of batchIds) {
    const justLogged = meals.find((m) => m.id === id);
    if (!justLogged) continue;
    const t = new Date(justLogged.at).getTime();
    const earlier = before
      .filter((c) => !used.has(c.id))
      .filter((c) => {
        const gap = t - new Date(c.at).getTime();
        return gap >= 0 && gap <= SAME_FOOD_WINDOW_MS && isSameMeal(c, justLogged);
      })
      .at(-1);
    if (earlier) {
      used.add(earlier.id);
      pairs.push({ earlier, justLogged });
    }
  }
  return pairs;
}

export function isSimilarProtein(a: number, b: number): boolean {
  if (a <= 0 || b <= 0) return false;
  const slack = Math.max(SAME_FOOD_PROTEIN_SLACK_G, SAME_FOOD_PROTEIN_SLACK_FRACTION * Math.max(a, b));
  return Math.abs(a - b) <= slack;
}

/**
 * The closest-in-time log of the other kind that looks like the same food as
 * the one just logged, if any. `justLogged` names the new log by its root id.
 */
export function findSameFood(
  proteinLogs: readonly SameFoodProteinLog[],
  meals: readonly SameFoodMeal[],
  justLogged: { kind: "PROTEIN" | "MEAL"; id: string },
): SameFoodPair | undefined {
  const gap = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime());
  if (justLogged.kind === "PROTEIN") {
    const protein = proteinLogs.find((p) => p.id === justLogged.id);
    if (!protein) return undefined;
    const meal = meals
      .filter((m) => gap(m.at, protein.at) <= SAME_FOOD_WINDOW_MS && isSimilarProtein(m.proteinG, protein.grams))
      .sort((a, b) => gap(a.at, protein.at) - gap(b.at, protein.at))[0];
    return meal ? { protein, meal } : undefined;
  }
  const meal = meals.find((m) => m.id === justLogged.id);
  if (!meal) return undefined;
  const protein = proteinLogs
    .filter((p) => gap(p.at, meal.at) <= SAME_FOOD_WINDOW_MS && isSimilarProtein(p.grams, meal.proteinG))
    .sort((a, b) => gap(a.at, meal.at) - gap(b.at, meal.at))[0];
  return protein ? { protein, meal } : undefined;
}
