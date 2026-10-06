import type { AdvisoryNote } from "../../../domain/intelligence/types";
import { describePlainAdviceReason } from "../train/trainCopy";

/**
 * ADVISORY-002 (owner brief 2026-10-05): TODAY's ADVISORY groups same-kind
 * notes into one row each ("Easing back in · 4 lifts"), at most three rows,
 * with each item's WHY one tap down. Presentation only: the producers
 * (engine/advisory.ts, application/advisoryQueries.ts) are unchanged; this
 * file only sorts their notes into rows and words them.
 *
 * Obligation notes are not shown here at all: real to-dos live in
 * COMMITMENT (see CommitmentsCard's "Also due" list).
 */

export const MAX_ADVISORY_ROWS = 3;

export interface AdvisoryItem {
  note: AdvisoryNote;
  /** What the item is, e.g. the lift's name. */
  name: string;
  /** The plain-words WHY, shown only once the row is tapped open. */
  why: string;
}

export interface AdvisoryRow {
  key: string;
  /** "Easing back in · 4 lifts" */
  label: string;
  /** The note shown in full on the row itself (PROTECT keeps its message and quick actions visible). */
  lead: AdvisoryNote | null;
  items: AdvisoryItem[];
  attentionLevel: AdvisoryNote["attentionLevel"];
}

const ATTENTION_RANK = { INTERRUPT: 0, SURFACE: 1, QUIET: 2 } as const;

function basisValue(note: AdvisoryNote, key: string): unknown {
  return note.basis.find((b) => b.key === key)?.value;
}

/** The composers write "<name> — <rest>"; the name is the part before the dash. */
function nameOf(note: AdvisoryNote): string {
  const cut = note.message.indexOf(" — ");
  return cut === -1 ? note.message : note.message.slice(0, cut);
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const PROGRESSION_GROUPS: Record<string, string> = {
  RE_ENTRY: "Easing back in",
  INCREASE: "Ready to add weight",
  REDUCE: "Lighter next time",
};

interface Kind {
  key: string;
  label: (items: AdvisoryItem[]) => string;
  item: (note: AdvisoryNote) => AdvisoryItem;
}

function kindOf(note: AdvisoryNote): Kind | null {
  switch (note.sourceModule) {
    case "obligationRelevance":
      return null;
    case "progression": {
      const recommendation = String(basisValue(note, "recommendation") ?? "");
      const title = PROGRESSION_GROUPS[recommendation] ?? "Lift advice";
      return {
        key: `progression:${recommendation}`,
        label: (items) => `${title} · ${count(items.length, "lift", "lifts")}`,
        item: (n) => ({ note: n, name: nameOf(n), why: describePlainAdviceReason(String(basisValue(n, "reason") ?? "")) }),
      };
    }
    case "decisionJournal":
      return {
        key: "decisionJournal",
        label: (items) => `From your journal · ${count(items.length, "lesson", "lessons")}`,
        item: (n) => ({ note: n, name: nameOf(n), why: String(basisValue(n, "lesson") ?? "") }),
      };
    case "continuity":
      return {
        key: "continuity",
        label: (items) => (items.length === 1 ? "Still relevant from last time" : `Still relevant from last time · ${items.length}`),
        item: (n) => ({ note: n, name: n.message, why: "You set this aside last time, and it still fits today." }),
      };
    case "shiftProtection":
      return {
        key: "shiftProtection",
        label: () => "Before your shift",
        item: (n) => ({
          note: n,
          name: n.message,
          why: "The shift starts soon, and the Minimum Day amounts are easiest to reach before it.",
        }),
      };
    case "patternProposal":
      return {
        key: "patternProposal",
        label: () => "A pattern worth a look",
        item: (n) => ({
          note: n,
          name: n.message,
          why: `The last ${String(basisValue(n, "count"))} outcomes were all rated the same. Nothing changes unless you change it.`,
        }),
      };
    case "dayRolloverAmbiguity":
      return {
        key: "dayRolloverAmbiguity",
        label: () => "Check a sleep log",
        item: (n) => ({
          note: n,
          name: n.message,
          why: "The day rolled over on its own, so the sleep may belong to the day before.",
        }),
      };
    default:
      return {
        key: `other:${note.sourceModule}`,
        label: (items) => (items.length === 1 ? nameOf(items[0]!.note) : `Notes · ${items.length}`),
        item: (n) => ({ note: n, name: n.message, why: n.message }),
      };
  }
}

/**
 * Notes → at most MAX_ADVISORY_ROWS rows. Rows keep the producers' order,
 * except INTERRUPT before SURFACE before QUIET (FOUNDATION-1B). Past the
 * cap, the remaining rows fold into the last one: "More · 3 notes".
 */
export function groupAdvisoryNotes(notes: readonly AdvisoryNote[]): AdvisoryRow[] {
  const rows: (AdvisoryRow & { kind: Kind })[] = [];
  for (const note of notes) {
    const kind = kindOf(note);
    if (!kind) continue;
    let row = rows.find((r) => r.key === kind.key);
    if (!row) {
      row = { key: kind.key, kind, label: "", lead: null, items: [], attentionLevel: note.attentionLevel };
      rows.push(row);
    }
    row.items.push(kind.item(note));
    if (ATTENTION_RANK[note.attentionLevel] < ATTENTION_RANK[row.attentionLevel]) row.attentionLevel = note.attentionLevel;
  }
  for (const row of rows) {
    row.label = row.kind.label(row.items);
    row.lead = row.attentionLevel === "INTERRUPT" ? row.items[0]!.note : null;
  }
  const sorted = [...rows].sort((a, b) => ATTENTION_RANK[a.attentionLevel] - ATTENTION_RANK[b.attentionLevel]);
  const plain: AdvisoryRow[] = sorted.map(({ kind: _kind, ...row }) => row);
  if (plain.length <= MAX_ADVISORY_ROWS) return plain;
  const kept = plain.slice(0, MAX_ADVISORY_ROWS - 1);
  const rest = plain.slice(MAX_ADVISORY_ROWS - 1);
  const items = rest.flatMap((row) => row.items);
  return [
    ...kept,
    {
      key: "more",
      label: `More · ${count(items.length, "note", "notes")}`,
      lead: null,
      items,
      attentionLevel: rest.reduce<AdvisoryNote["attentionLevel"]>(
        (level, row) => (ATTENTION_RANK[row.attentionLevel] < ATTENTION_RANK[level] ? row.attentionLevel : level),
        "QUIET",
      ),
    },
  ];
}

/** The closed ADVISORY row's summary: the one row's own label, or how many rows wait inside. */
export function describeAdvisorySummary(rows: readonly AdvisoryRow[]): string {
  if (rows.length === 1) return rows[0]!.label;
  return count(rows.length, "note", "notes");
}
