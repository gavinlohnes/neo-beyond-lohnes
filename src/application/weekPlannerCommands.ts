import { INTENT_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { modifyObligation } from "./intentCommands";
import { plannerDates } from "./weekPlannerQueries";

/** An explicit move of planned attention only; the original deadline and recurrence remain. */
export async function moveWeekTask(id: string, plannedAt: string, expected: { updatedAt: string; plannedAt?: string }, now?: Date) {
  return writeAtomically(INTENT_WRITE_TABLES, async () => {
    if (!plannerDates(now ?? new Date()).includes(plannedAt)) throw new Error("That day is outside the current seven-day plan. Refresh the week and choose again.");
    const current = (await getCurrentlyEligibleUnresolvedObligations()).find((t) => t.id === id);
    if (!current || (current.updatedAt !== expected.updatedAt || current.plannedAt !== expected.plannedAt)) throw new Error("This task changed or is no longer open. Refresh the week before moving it.");
    if (current.plannedAt === plannedAt) return current;
    return modifyObligation(id, { plannedAt });
  });
}
