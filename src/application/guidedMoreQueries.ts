import { getOpenCaptureItems } from "./queries";
import { getOpenDecisionJournalEntries } from "./journalQueries";
import { getActiveMissions, getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";

export interface MoreStart {
  id: "reflection" | "direction";
  destination: "JOURNAL" | "CAPTURE" | "INTENT";
  title: string;
  basis: string;
  action: string;
}
export type MoreStarts = readonly [MoreStart, MoreStart];

/** Optional destination discovery, not recommendation arbitration. No clock, ranking,
 * due-date inference, sealed memories, Engine inputs or writes. Fixed slots preserve
 * muscle memory; only the relevant canonical counts change the suggested paths. */
export function moreStartsFromCounts(counts: { decisions: number; captures: number; obligations: number; missions: number }): MoreStarts {
  const reflection: MoreStart = counts.decisions > 0
    ? { id: "reflection", destination: "JOURNAL", title: "Return to a decision", basis: `${counts.decisions} ${counts.decisions === 1 ? "decision awaits" : "decisions await"} review. Return when there is an outcome.`, action: "OPEN JOURNAL" }
    : counts.captures > 0
      ? { id: "reflection", destination: "CAPTURE", title: "Give a note somewhere to go", basis: `${counts.captures} unresolved ${counts.captures === 1 ? "note" : "notes"} in Capture. Write freely or inspect task/resolve controls.`, action: "OPEN CAPTURE" }
      : { id: "reflection", destination: "JOURNAL", title: "Think through a choice", basis: "Optional starting point: record a choice and expectation. Plain notes stay in Capture.", action: "OPEN JOURNAL" };
  const direction: MoreStart = {
    id: "direction", destination: "INTENT",
    title: counts.obligations > 0 ? "Inspect your commitments" : counts.missions > 0 ? "Return to your direction" : "Give a plan a place",
    basis: counts.obligations > 0
      ? `${counts.obligations} unresolved ${counts.obligations === 1 ? "commitment" : "commitments"} eligible for current attention. A count, not an urgency ranking.`
      : counts.missions > 0
        ? `${counts.missions} active ${counts.missions === 1 ? "mission" : "missions"}. Inspect your direction or add a commitment.`
        : "Optional starting point: a Mission holds direction; an Obligation holds a commitment.",
    action: "OPEN PLANS",
  };
  return [reflection, direction];
}

export const GENERIC_MORE_STARTS = moreStartsFromCounts({ decisions: 0, captures: 0, obligations: 0, missions: 0 });

export async function getGuidedMoreStarts(): Promise<MoreStarts> {
  const [decisions, captures, obligations, missions] = await Promise.all([
    getOpenDecisionJournalEntries(), getOpenCaptureItems(), getCurrentlyEligibleUnresolvedObligations(), getActiveMissions(),
  ]);
  return moreStartsFromCounts({ decisions: decisions.length, captures: captures.length, obligations: obligations.length, missions: missions.length });
}
