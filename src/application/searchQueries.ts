import MiniSearch from "minisearch";
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
 * SEARCH-002: one MiniSearch document per searchable record. `id` is a
 * synthetic `${domain}-${entityId}` key (MiniSearch requires a single
 * unique id field; a Mission and a Capture could otherwise collide on
 * the same underlying id value) — `entityId` carries the real domain id
 * back out in the result, `id` itself is never shown to the operator.
 */
interface IndexedDoc {
  id: string;
  domain: SearchResultDomain;
  entityId: string;
  title: string;
  context: string;
  status: string;
}

/**
 * Personal Search (Post-FIELD Capability Acceleration Campaign, Slice 2;
 * tap-to-navigate shipped 2026-09-02; MiniSearch upgrade, SEARCH-002,
 * 2026-09-15). RETRIEVAL, not command execution: fuzzy/prefix/ranked
 * lexical search over the durable operator-authored text this app
 * already has — Mission title/description, Obligation title/
 * description, Capture text — never a new source of truth.
 *
 * MiniSearch (MIT, zero runtime deps) replaces the original plain
 * substring scan per the pre-existing owner sign-off on file in
 * docs/agent/CAPABILITY_MAP.md's SEARCH entry — this was always the
 * intended "revisit" once ranking actually mattered, not a new
 * authorization. The index is fully disposable: rebuilt from scratch on
 * every call from the exact same already-validated, already-sorted
 * arrays their own screens render (getMissions/getObligations/
 * getAllCaptureItems) — nothing is ever persisted or cached across
 * calls, and Dexie/events remain the sole source of truth. Search
 * results include every status (including RESOLVED captures and
 * ARCHIVED missions) — retrieval answers "does this exist," not "is
 * this currently actionable"; that eligibility question belongs to
 * TODAY/AdvisoryNotes, not here.
 */
export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length === 0) return [];

  const [missions, obligations, captures] = await Promise.all([
    getMissions(),
    getObligations(),
    getAllCaptureItems(),
  ]);

  const docs: IndexedDoc[] = [
    ...missions.map((m): IndexedDoc => ({
      id: `MISSION-${m.id}`,
      domain: "MISSION",
      entityId: m.id,
      title: m.title,
      context: m.description ?? "",
      status: m.status,
    })),
    ...obligations.map((o): IndexedDoc => ({
      id: `OBLIGATION-${o.id}`,
      domain: "OBLIGATION",
      entityId: o.id,
      title: o.title,
      context: o.description ?? "",
      status: o.status,
    })),
    ...captures.map((c): IndexedDoc => ({
      id: `CAPTURE-${c.id}`,
      domain: "CAPTURE",
      entityId: c.id,
      title: c.text,
      context: "",
      status: c.status,
    })),
  ];

  const index = new MiniSearch<IndexedDoc>({
    fields: ["title", "context"],
    storeFields: ["domain", "entityId", "title", "context", "status"],
  });
  index.addAll(docs);

  // fuzzy: 0.2 tolerates roughly one typo per five characters — enough to
  // survive a small slip without matching genuinely unrelated terms.
  // boost on title outranks a match that only hit the description/
  // context field, so the closer match surfaces first.
  const hits = index.search(q, { fuzzy: 0.2, prefix: true, boost: { title: 2 } });

  return hits.map((hit) => ({
    domain: hit.domain as SearchResultDomain,
    id: hit.entityId as string,
    title: hit.title as string,
    context: (hit.context as string) || undefined,
    status: hit.status as string,
  }));
}
