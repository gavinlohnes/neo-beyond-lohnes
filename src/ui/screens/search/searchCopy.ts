import type { SearchResultDomain } from "../../../application/searchQueries";

/** Personal Search 1.0: plain domain labels — no icon/color grammar invented for this V1. FIND-001 adds the new kinds. */
const LABELS: Record<SearchResultDomain, string> = {
  MISSION: "MISSION",
  OBLIGATION: "OBLIGATION",
  CAPTURE: "CAPTURE",
  LIFT: "LIFT",
  PR: "PR",
  MEAL: "MEAL",
  JOURNAL: "JOURNAL",
  NOTE: "NOTE",
  DAY: "DAY",
};

export function describeSearchDomain(domain: SearchResultDomain): string {
  return LABELS[domain];
}
