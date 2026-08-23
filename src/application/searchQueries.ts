import { getMissions, getObligations } from "./intentQueries";
import { getAllCaptureItems } from "./queries";

export type SearchResultDomain = "MISSION" | "OBLIGATION" | "CAPTURE";

export interface SearchResult {
  domain: SearchResultDomain;
  id: string;
  title: string;
  /** A secondary line of context — description snippet, or the capture's own status. Never a match explanation/score. */
  context: string | undefined;
  status: string;
}

/**
 * Personal Search 1.0 (Post-FIELD Capability Acceleration Campaign,
 * Slice 2). RETRIEVAL, not command execution: a plain case-insensitive
 * substring match over the durable operator-authored text this app
 * already has — Mission title/description, Obligation title/
 * description, Capture text — never a new source of truth.
 *
 * Deliberately not MiniSearch or any lexical-search library: real corpus
 * size today is tens of records (Missions/Obligations/Capture are all
 * new record types with zero production history at this checkpoint,
 * confirmed against the real historical backup fixtures, which predate
 * all three tables entirely), not the "few hundred to low-thousands"
 * docs/HARVEST_READINESS_REPORT.md speculated when it flagged MiniSearch
 * as a future candidate. A dependency earns its place on demonstrated
 * need, not a stale estimate — see the campaign report's "Open-source
 * dependencies" section. Revisit if real corpus size or relevance-
 * ranking needs actually outgrow a linear substring scan.
 *
 * Reuses getMissions/getObligations/getAllCaptureItems verbatim — the
 * exact same already-validated, already-sorted arrays their own screens
 * render. No new Dexie query, no new index, no derived interpretation of
 * what a Mission/Obligation/Capture *is*. Search results include every
 * status (including RESOLVED captures and ARCHIVED missions) — retrieval
 * answers "does this exist," not "is this currently actionable"; that
 * eligibility question belongs to TODAY/AdvisoryNotes, not here. The
 * index is fully disposable: rebuilt from canonical Dexie state on every
 * call, nothing is ever written.
 */
export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const [missions, obligations, captures] = await Promise.all([
    getMissions(),
    getObligations(),
    getAllCaptureItems(),
  ]);

  const results: SearchResult[] = [];

  for (const mission of missions) {
    if (mission.title.toLowerCase().includes(q) || mission.description?.toLowerCase().includes(q)) {
      results.push({ domain: "MISSION", id: mission.id, title: mission.title, context: mission.description, status: mission.status });
    }
  }
  for (const obligation of obligations) {
    if (obligation.title.toLowerCase().includes(q) || obligation.description?.toLowerCase().includes(q)) {
      results.push({ domain: "OBLIGATION", id: obligation.id, title: obligation.title, context: obligation.description, status: obligation.status });
    }
  }
  for (const capture of captures) {
    if (capture.text.toLowerCase().includes(q)) {
      results.push({ domain: "CAPTURE", id: capture.id, title: capture.text, context: undefined, status: capture.status });
    }
  }

  return results;
}
