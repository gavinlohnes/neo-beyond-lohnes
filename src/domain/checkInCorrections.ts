import type {
  CheckInCorrectedPayload,
  CheckInCorrectionUndonePayload,
  DomainEvent,
  StateCheckIn,
} from "./common/types";

/**
 * GRAYSON-CHECKIN-EDIT-001 (Gavin, 2026-11-24: "I should be able to edit and tweak or correct everything in this
 * app"). Pure: which check-ins count, from STATE_CHECKED_IN, CHECK_IN_CORRECTED and CHECK_IN_CORRECTION_UNDONE.
 * Each sent check-in starts a chain; a standing fix replaces its current answers; an undone fix stops counting.
 * Nothing stored is edited or deleted, so the original is always recoverable.
 */

/** The answers a fix may change. The time it was made never changes. */
export const CHECK_IN_VALUE_KEYS = ["energy", "stress", "mood", "soreness", "alcoholUrge"] as const;
export type CheckInValueKey = (typeof CHECK_IN_VALUE_KEYS)[number];
export type CheckInAnswers = Pick<StateCheckIn, CheckInValueKey>;

export interface CheckInFix {
  /** The CHECK_IN_CORRECTED event. */
  eventId: string;
  /** When the fix was saved. */
  at: string;
  before: StateCheckIn;
  after: StateCheckIn;
}

export interface CheckInChain {
  originalCheckInId: string;
  beyondDayId: string;
  /** The original STATE_CHECKED_IN event's time: when he checked in. */
  at: string;
  original: StateCheckIn;
  /** The answers that count now: the newest standing fix, else the original. */
  current: StateCheckIn;
  /** Standing fixes, oldest first. Undone fixes are left out. */
  fixes: CheckInFix[];
  /** Every check-in row id in this chain (original, standing and undone fixes). */
  rowIds: string[];
}

function byOccurrence(a: DomainEvent, b: DomainEvent): number {
  return a.occurredAt.localeCompare(b.occurredAt) || (a.seq ?? 0) - (b.seq ?? 0);
}

export function sameAnswers(a: CheckInAnswers, b: CheckInAnswers): boolean {
  return CHECK_IN_VALUE_KEYS.every((key) => a[key] === b[key]);
}

/** One chain per sent check-in, in the order they were sent. A day with no fixes reads exactly as before. */
export function checkInChains(events: readonly DomainEvent[]): CheckInChain[] {
  const ordered = [...events].sort(byOccurrence);
  const undone = new Set(
    ordered
      .filter((e) => e.type === "CHECK_IN_CORRECTION_UNDONE")
      .map((e) => (e.payload as CheckInCorrectionUndonePayload).correctionEventId),
  );
  const rows = new Map<string, StateCheckIn>();
  const corrections = new Map<string, DomainEvent<CheckInCorrectedPayload>[]>();
  const allCorrectionRowIds = new Map<string, string[]>();
  for (const e of ordered) {
    if (e.type === "STATE_CHECKED_IN") rows.set((e.payload as StateCheckIn).id, e.payload as StateCheckIn);
    if (e.type !== "CHECK_IN_CORRECTED") continue;
    const payload = e.payload as CheckInCorrectedPayload;
    rows.set(payload.checkIn.id, payload.checkIn);
    allCorrectionRowIds.set(payload.originalCheckInId, [...(allCorrectionRowIds.get(payload.originalCheckInId) ?? []), payload.checkIn.id]);
    if (undone.has(e.id)) continue;
    corrections.set(payload.originalCheckInId, [...(corrections.get(payload.originalCheckInId) ?? []), e as DomainEvent<CheckInCorrectedPayload>]);
  }
  const chains: CheckInChain[] = [];
  for (const e of ordered) {
    if (e.type !== "STATE_CHECKED_IN") continue;
    const original = e.payload as StateCheckIn;
    const fixes = (corrections.get(original.id) ?? []).map((c): CheckInFix => ({
      eventId: c.id,
      at: c.occurredAt,
      before: rows.get(c.payload.supersedesCheckInId) ?? original,
      after: c.payload.checkIn,
    }));
    chains.push({
      originalCheckInId: original.id,
      beyondDayId: original.beyondDayId,
      at: e.occurredAt,
      original,
      current: fixes.at(-1)?.after ?? original,
      fixes,
      rowIds: [original.id, ...(allCorrectionRowIds.get(original.id) ?? [])],
    });
  }
  return chains;
}

/** The check-ins that count, oldest first: each chain's current answers. */
export function effectiveCheckIns(events: readonly DomainEvent[]): StateCheckIn[] {
  return checkInChains(events).map((c) => c.current);
}

/** Check-in row ids that no longer count: superseded by a fix, or a fix that was undone. */
export function hiddenCheckInIds(events: readonly DomainEvent[]): Set<string> {
  const hidden = new Set<string>();
  for (const chain of checkInChains(events)) for (const id of chain.rowIds) if (id !== chain.current.id) hidden.add(id);
  return hidden;
}

/** The chain any of its rows belongs to: the original, a standing fix or an undone one. */
export function chainForCheckIn(chains: readonly CheckInChain[], checkInId: string): CheckInChain | undefined {
  return chains.find((c) => c.rowIds.includes(checkInId));
}
