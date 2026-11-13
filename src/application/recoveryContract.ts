import { hasPlanItem, livedDayDates } from "./lifeTransition";

/**
 * LIFE-STATE-003: the recovery contract, offered when slice 2 names RUN OVER. A short, optional set of plan items for
 * the first full day off: sleep first, easy training or rest, and a light day. The operator picks which, sees them,
 * and they're written only on CONFIRM through the existing plan-item path. Nothing changes the schedule or the
 * training programme, and it's never an Engine input.
 */
export interface ContractItem { key: "SLEEP" | "TRAINING" | "LIGHT"; title: string; description: string }

export const RECOVERY_CONTRACT: readonly ContractItem[] = [
  { key: "SLEEP", title: "Sleep first", description: "From your recovery contract: main sleep before anything else." },
  { key: "TRAINING", title: "Easy training or rest", description: "From your recovery contract: no hard session. Your programme is unchanged." },
  { key: "LIGHT", title: "Keep the day light", description: "From your recovery contract: nothing new booked." },
];

/**
 * The date the contract's items are planned for: the second calendar date the recovery lived day covers, which for a
 * 16:30 lived day is the first full day off (review of #495: a Friday-evening item should still read as planned on
 * Saturday daytime).
 */
export const contractDate = (now: Date) => livedDayDates(now)[1]!;

/** Read only: whether any contract item is already planned in this lived day, so it isn't offered twice. */
export async function hasRecoveryContract(now: Date): Promise<boolean> {
  const dates = livedDayDates(now);
  for (const item of RECOVERY_CONTRACT) if (await hasPlanItem(item.title, dates)) return true;
  return false;
}
