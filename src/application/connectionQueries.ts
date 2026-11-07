import { db } from "../persistence/db";
import { getMentions, wikiLabels } from "./dailyNoteQueries";
import { readSection, type SectionRead } from "./sectionRead";

/**
 * CONNECT-001: everything that explicitly links to one record through [[label]].
 * Read-only. Only links the operator wrote count; nothing is inferred from loose text,
 * and nothing is stored, ranked or turned into a suggestion.
 */
export type ConnectionKind = "DAY" | "JOURNAL" | "HIGHLIGHT" | "TASK" | "PROJECT";
export interface Connection { kind: ConnectionKind; id: string; label: string; status?: string }

export async function getConnections(label: string, self?: { kind: ConnectionKind; id: string }): Promise<SectionRead<Connection[]>> {
  return readSection(async () => {
    const needle = label.trim().toLowerCase();
    if (!needle) return [];
    const has = (text?: string) => !!text && wikiLabels(text).some((item) => item.toLowerCase() === needle);
    const [mentions, obligations, projects] = await Promise.all([getMentions(label), db.obligations.toArray(), db.projects.toArray()]);
    const found: Connection[] = [
      ...mentions,
      ...obligations.filter((o) => has(o.title) || has(o.description)).map((o) => ({ kind: "TASK" as const, id: o.id, label: o.title, status: o.status })),
      ...projects.filter((p) => has(p.title) || has(p.finish)).map((p) => ({ kind: "PROJECT" as const, id: p.id, label: p.title, status: p.status })),
    ];
    const seen = new Set<string>();
    return found.filter((item) => {
      const key = `${item.kind}:${item.id}`;
      if (seen.has(key) || (self && self.kind === item.kind && self.id === item.id)) return false;
      seen.add(key); return true;
    });
  });
}
