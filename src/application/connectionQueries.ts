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

/**
 * UNLINKED-001 (APPS-PICKS-003 pick 13, after Obsidian): daily notes that name a record in plain words but
 * don't link it yet. Suggestion only — nothing changes until the operator taps LINK, which saves the note
 * through the ordinary daily-note command with the first plain mention wrapped in [[ ]].
 */
export interface UnlinkedMention { dayId: string; date: string; excerpt: string }
const plainPattern = (label: string) => new RegExp(`(^|[^\\p{L}\\[])(${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\p{L}\\]])`, "iu");

/** Existing [[links]], kept whole so a mention inside one is never treated as plain text. */
const LINK_SPAN = /(\[\[[^\]\n]*\]\])/;
/** Where the first plain-text mention starts, ignoring text inside existing [[links]], or -1. */
function plainIndex(text: string, pattern: RegExp): number {
  let offset = 0;
  for (const [i, part] of text.split(LINK_SPAN).entries()) {
    if (i % 2 === 0) { const at = part.search(pattern); if (at >= 0) return offset + at; }
    offset += part.length;
  }
  return -1;
}

export async function getUnlinkedMentions(label: string): Promise<UnlinkedMention[]> {
  const needle = label.trim();
  if (needle.length < 3) return [];
  const [notes, days] = await Promise.all([db.dailyNotes.toArray(), db.beyondDays.toArray()]);
  const dates = new Map(days.map((day) => [day.id, day.startedAt.slice(0, 10)]));
  const pattern = plainPattern(needle);
  return notes.filter((note) => plainIndex(note.text, pattern) >= 0 && !wikiLabels(note.text).some((item) => item.toLowerCase() === needle.toLowerCase()))
    .map((note) => {
      const at = plainIndex(note.text, pattern);
      return { dayId: note.dayId, date: dates.get(note.dayId) ?? "", excerpt: note.text.slice(Math.max(0, at - 30), at + needle.length + 40).trim() };
    })
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
}

/** The note text with the first plain mention of `label` wrapped as [[label]], or null when there is none. */
export function linkFirstMention(text: string, label: string): string | null {
  const pattern = plainPattern(label.trim());
  const parts = text.split(LINK_SPAN);
  // Even parts are plain text, odd parts are existing [[links]], which are never touched.
  const index = parts.findIndex((part, i) => i % 2 === 0 && pattern.test(part));
  if (index < 0) return null;
  parts[index] = parts[index]!.replace(pattern, (_all, before: string, word: string) => `${before}[[${word}]]`);
  return parts.join("");
}
