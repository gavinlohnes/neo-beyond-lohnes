/**
 * DELTA-004 (DELTA-002 part 4, owner approval 2026-10-27): "not enough data" becomes a goal. Where a
 * reading abstains below its floor, say what to log and what it unlocks: "Log meals on 6 more days,
 * Unlocks: your daily burn estimate." A calm statement of what the records need — never a
 * streak, score, deadline, obligation or recommendation. Steps already met are left out.
 */
export interface UnlockStep {
  /** How many more are needed; zero or less drops the step. */
  more: number;
  /** The log action, phrased for the count: (n) => `log meals on ${n} more days`. */
  action: (more: number) => string;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** `unlocks` names the capability; `lead` is a shared verb said once ("log" water on 4 more days and protein on 7 more). */
export function unlockGoal(steps: readonly UnlockStep[], unlocks: string, lead?: string): string | undefined {
  const parts = steps.filter((step) => step.more > 0).map((step) => step.action(step.more));
  if (!parts.length) return undefined;
  // Items that already say "and" are separated by semicolons so the list stays readable.
  const list = parts.length === 1 ? parts[0]! : parts.some((part) => part.includes(" and ")) ? parts.join("; ") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  const joined = lead ? `${lead} ${list}` : list;
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}. Unlocks: ${unlocks}.`;
}
