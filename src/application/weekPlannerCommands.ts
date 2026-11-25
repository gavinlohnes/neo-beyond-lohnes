import { INTENT_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { modifyObligation } from "./intentCommands";
import { plannerDates } from "./weekPlannerQueries";

/**
 * An explicit move of planned attention only; the original deadline and recurrence remain.
 * TIMEBOX-001: the same sheet may set his own estimate, saved in this one guarded write. `options.estimateMinutes`
 * undefined leaves the estimate alone; null removes it. A stale, resolved or ineligible task is refused, so a stale
 * sheet never rewrites it, and an unchanged day and estimate write nothing.
 */
export async function moveWeekTask(
  id: string,
  plannedAt: string,
  expected: { updatedAt: string; plannedAt?: string },
  now?: Date,
  options?: { estimateMinutes?: number | null },
) {
  return writeAtomically(INTENT_WRITE_TABLES, async () => {
    if (!plannerDates(now ?? new Date()).includes(plannedAt)) throw new Error("That day is outside the current seven-day plan. Refresh the week and choose again.");
    const current = (await getCurrentlyEligibleUnresolvedObligations()).find((t) => t.id === id);
    if (!current || (current.updatedAt !== expected.updatedAt || current.plannedAt !== expected.plannedAt)) throw new Error("This task changed or is no longer open. Refresh the week before moving it.");
    // Eligibility reads can cross midnight even after transaction acquisition.
    if (!plannerDates(now ?? new Date()).includes(plannedAt)) throw new Error("That day is outside the current seven-day plan. Refresh the week and choose again.");
    const moves = current.plannedAt !== plannedAt;
    const estimate = options?.estimateMinutes;
    const estimates = estimate !== undefined && (current.estimateMinutes ?? null) !== estimate;
    if (!moves && !estimates) return current;
    return modifyObligation(id, { ...(moves ? { plannedAt } : {}), ...(estimates ? { estimateMinutes: estimate } : {}) });
  });
}
