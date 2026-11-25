import type {
  DomainEvent,
  SetAddedPayload,
  SetCorrectedPayload,
  SetFixValues,
  SetRemovedPayload,
  SetUndonePayload,
} from "../common/types";

/**
 * GRAYSON-TRAIN-EDIT-001 (Gavin, 2026-11-24): the one projection of set fixes. Pure: events in, the retracted set ids
 * and each set's fix history out. Every set reader keeps using the one filter (getUndoneSetIds → retractedSetIds),
 * so a fix shows everywhere: history, PRs, progression, stall detection, the Day Ledger.
 *
 * - SET_UNDONE (the live last-set undo) retracts its set, exactly as before.
 * - SET_CORRECTED retracts the row it replaces; SET_REMOVED retracts its row; SET_ADDED creates a row.
 * - SET_FIX_UNDONE cancels one fix: a cancelled correction retracts its new row (the old one is back), a cancelled
 *   removal retracts nothing, a cancelled add retracts its row.
 */
export const SET_FIX_TYPES = ["SET_CORRECTED", "SET_REMOVED", "SET_ADDED", "SET_FIX_UNDONE"] as const satisfies readonly DomainEvent["type"][];
export const SET_RETRACTION_TYPES = ["SET_UNDONE", ...SET_FIX_TYPES] as const satisfies readonly DomainEvent["type"][];

export type SetFixKind = "CORRECTED" | "REMOVED" | "ADDED";

export interface SetFixEntry {
  eventId: string;
  kind: SetFixKind;
  at: string;
  seq: number;
  /** The set this fix acted on (the replaced row, the removed row, or the added row). */
  performedSetId: string;
  /** For a correction: the row it created. */
  newPerformedSetId?: string;
  before?: SetFixValues;
  after?: SetFixValues;
  undone: boolean;
}

export interface SetFixProjection {
  retractedSetIds: Set<string>;
  /** Every set id that belongs to a fix chain, mapped to the chain's root (the original row, or the added row). */
  rootOf: Map<string, string>;
  /** Each chain's fixes, oldest first, keyed by root id. */
  historyByRoot: Map<string, SetFixEntry[]>;
  /** Removed sets (removal still standing), with their removal event, for "Put it back". */
  removed: Map<string, SetFixEntry>;
}

const order = (a: DomainEvent, b: DomainEvent) => (a.seq ?? 0) - (b.seq ?? 0) || a.recordedAt.localeCompare(b.recordedAt);
const fields = (e: DomainEvent) => (e.payload && typeof e.payload === "object" ? e.payload : {}) as Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);

export function projectSetFixes(events: readonly DomainEvent[]): SetFixProjection {
  const relevant = events.filter((e) => (SET_RETRACTION_TYPES as readonly string[]).includes(e.type)).sort(order);
  const cancelled = new Set<string>();
  for (const e of relevant) if (e.type === "SET_FIX_UNDONE") { const id = str(fields(e).fixEventId); if (id) cancelled.add(id); }

  const retractedSetIds = new Set<string>();
  const rootOf = new Map<string, string>();
  const historyByRoot = new Map<string, SetFixEntry[]>();
  const removed = new Map<string, SetFixEntry>();
  const root = (id: string) => rootOf.get(id) ?? id;
  const record = (rootId: string, entry: SetFixEntry) => historyByRoot.set(rootId, [...(historyByRoot.get(rootId) ?? []), entry]);

  for (const e of relevant) {
    const p = fields(e);
    const undone = cancelled.has(e.id);
    const base = { eventId: e.id, at: e.occurredAt, seq: e.seq ?? 0, undone };
    if (e.type === "SET_UNDONE") {
      const id = str((p as Partial<SetUndonePayload>).performedSetId);
      if (id) retractedSetIds.add(id);
    } else if (e.type === "SET_CORRECTED") {
      const c = p as Partial<SetCorrectedPayload>;
      const from = str(c.replacesSetId);
      const to = str(c.newPerformedSetId);
      if (!from || !to) continue;
      const r = root(from);
      rootOf.set(from, r);
      rootOf.set(to, r);
      record(r, { ...base, kind: "CORRECTED", performedSetId: from, newPerformedSetId: to, ...(c.before ? { before: c.before } : {}), ...(c.after ? { after: c.after } : {}) });
      if (undone) retractedSetIds.add(to); else retractedSetIds.add(from);
    } else if (e.type === "SET_REMOVED") {
      const id = str((p as Partial<SetRemovedPayload>).performedSetId);
      if (!id) continue;
      const r = root(id);
      rootOf.set(id, r);
      const entry: SetFixEntry = { ...base, kind: "REMOVED", performedSetId: id };
      record(r, entry);
      if (!undone) { retractedSetIds.add(id); removed.set(id, entry); }
    } else if (e.type === "SET_ADDED") {
      const id = str((p as Partial<SetAddedPayload>).performedSetId);
      if (!id) continue;
      rootOf.set(id, id);
      record(id, { ...base, kind: "ADDED", performedSetId: id });
      if (undone) retractedSetIds.add(id);
    }
  }
  return { retractedSetIds, rootOf, historyByRoot, removed };
}

/** The newest standing fix on the chain this set belongs to: the only one Undo / Put it back may cancel. */
export function newestStandingFix(projection: SetFixProjection, performedSetId: string): SetFixEntry | null {
  const r = projection.rootOf.get(performedSetId) ?? performedSetId;
  return [...(projection.historyByRoot.get(r) ?? [])].filter((f) => !f.undone).sort((a, b) => a.seq - b.seq).at(-1) ?? null;
}

/** The fix this event id names, with its chain root, or null. */
export function findSetFix(projection: SetFixProjection, fixEventId: string): { root: string; entry: SetFixEntry } | null {
  for (const [r, list] of projection.historyByRoot) {
    const entry = list.find((f) => f.eventId === fixEventId);
    if (entry) return { root: r, entry };
  }
  return null;
}
