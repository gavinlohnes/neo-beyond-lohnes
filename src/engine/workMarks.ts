import type { DomainEvent, WorkPeriodRetimedPayload, WorkPeriodVoidedPayload } from "../domain/common/types";

/**
 * SHIFT-CORRECT-001 (Gavin, 2026-11-15: "Yes, amend WORK TRANSITION to allow explicit shift start/end corrections"):
 * the effective work marks of one lived day, from its events. Pure, so the Engine's day ledger and the application's
 * queries read one answer. A mark is the latest WORK_PERIOD_STARTED/ENDED (in write order) that no WORK_PERIOD_VOIDED
 * names; its time is the latest WORK_PERIOD_RETIMED naming it, else its own occurredAt. Nothing is inferred: with no
 * explicit mark there is none.
 */
export interface EffectiveWorkMark {
  /** The original WORK_PERIOD_STARTED/ENDED event. */
  eventId: string;
  /** When it happened, after any explicit retime. */
  occurredAt: string;
  /** When it was first recorded as happening. */
  originalAt: string;
  retimed: boolean;
  seq?: number;
}
export interface EffectiveWorkMarks { started?: EffectiveWorkMark; ended?: EffectiveWorkMark }

/** Write order: seq when both carry it (every event this build writes), else recordedAt, else occurredAt. */
function writeOrder(a: DomainEvent, b: DomainEvent): number {
  if (a.seq !== undefined && b.seq !== undefined) return a.seq - b.seq;
  const ra = a.recordedAt ?? a.occurredAt, rb = b.recordedAt ?? b.occurredAt;
  return ra < rb ? -1 : ra > rb ? 1 : 0;
}

export function effectiveWorkMarks(events: readonly DomainEvent[]): EffectiveWorkMarks {
  const ordered = [...events].sort(writeOrder);
  const voided = new Set(ordered.filter((e) => e.type === "WORK_PERIOD_VOIDED").map((e) => (e.payload as WorkPeriodVoidedPayload).markEventId));
  const retimes = ordered.filter((e) => e.type === "WORK_PERIOD_RETIMED");
  const mark = (type: "WORK_PERIOD_STARTED" | "WORK_PERIOD_ENDED"): EffectiveWorkMark | undefined => {
    const root = ordered.filter((e) => e.type === type && !voided.has(e.id)).at(-1);
    if (!root) return undefined;
    const retime = retimes.filter((e) => (e.payload as WorkPeriodRetimedPayload).markEventId === root.id).at(-1);
    return {
      eventId: root.id, originalAt: root.occurredAt, retimed: !!retime,
      occurredAt: retime ? (retime.payload as WorkPeriodRetimedPayload).occurredAt : root.occurredAt,
      ...(root.seq !== undefined ? { seq: root.seq } : {}),
    };
  };
  const started = mark("WORK_PERIOD_STARTED"), ended = mark("WORK_PERIOD_ENDED");
  return { ...(started ? { started } : {}), ...(ended ? { ended } : {}) };
}
