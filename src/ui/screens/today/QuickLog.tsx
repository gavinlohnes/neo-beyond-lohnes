import { useEffect, useRef, useState } from "react";
import { getRecentSavedMeals } from "../../../application/nutritionQueries";
import type { SavedMeal } from "../../../domain/common/types";

/** TONIGHT-001: how many recently used saved meals TODAY offers as one-tap logs. */
export const QUICK_LOG_MEALS = 3;

/**
 * TONIGHT-001 (owner approval, 2026-10-19): the likely next log, one tap away.
 * Gavin doesn't always eat the same foods, so this is a shortcut, not a plan:
 * the saved meals most recently logged (the ordering BEYOND already uses) and
 * water at the last amount. Nothing is pre-checked and nothing logs without a
 * tap; each tap goes through the same canonical command as BODY and the MEAL
 * sheet, with TODAY's usual confirmation and UNDO.
 */
export function QuickLog({
  refreshKey,
  lastWaterAmount,
  busy,
  onLogMeal,
  onLogWater,
}: {
  /** Changes whenever TODAY re-reads, so a just-logged meal moves to the front. */
  refreshKey: unknown;
  lastWaterAmount: number | null;
  busy: boolean;
  onLogMeal: (meal: SavedMeal) => Promise<boolean>;
  onLogWater: (amount: number) => Promise<boolean>;
}) {
  const [meals, setMeals] = useState<SavedMeal[] | null>(null);
  const writing = useRef(false);
  useEffect(() => {
    let cancelled = false;
    getRecentSavedMeals(QUICK_LOG_MEALS)
      .then((recent) => { if (!cancelled) setMeals(recent); })
      .catch(() => { if (!cancelled) setMeals([]); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  async function run(write: () => Promise<boolean>) {
    if (writing.current || busy) return;
    writing.current = true;
    try { await write(); } finally { writing.current = false; }
  }

  if (meals === null) return null;
  if (meals.length === 0 && lastWaterAmount === null) return null;
  return (
    <div className="equipment-row quick-log" role="group" aria-labelledby="quick-log-heading">
      <p id="quick-log-heading" className="tool-label" style={{ marginBottom: 4 }}>QUICK LOG</p>
      <div className="quick-log__items">
        {meals.map((meal) => (
          <button key={meal.id} type="button" className="today-sheet__option" disabled={busy} aria-label={`Log ${meal.name}`}
            onClick={() => void run(() => onLogMeal(meal))}>
            <span><strong>{meal.name}</strong><span>{meal.calories} kcal · {meal.proteinG} g protein</span></span>
            <span className="today-sheet__tag" aria-hidden="true">LOG</span>
          </button>
        ))}
        {lastWaterAmount !== null && (
          <button type="button" className="today-sheet__option" disabled={busy} aria-label={`Log ${lastWaterAmount} oz water`}
            onClick={() => void run(() => onLogWater(lastWaterAmount))}>
            <span><strong>Water</strong><span>Your last amount</span></span>
            <span className="today-sheet__tag" aria-hidden="true">+{lastWaterAmount} OZ</span>
          </button>
        )}
      </div>
    </div>
  );
}
