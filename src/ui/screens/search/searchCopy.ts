import type { SearchResultDomain } from "../../../application/searchQueries";

/** Personal Search 1.0: plain domain labels — no icon/color grammar invented for this V1. */
export function describeSearchDomain(domain: SearchResultDomain): string {
  if (domain === "MISSION") return "MISSION";
  if (domain === "OBLIGATION") return "OBLIGATION";
  return "CAPTURE";
}
