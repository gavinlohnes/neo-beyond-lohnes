import { db } from "../persistence/db";
import type { BeyondDay, DomainEvent } from "../domain/common/types";
import { byTimeThenSeq } from "./queries";

export interface HistoryDay {
  day: BeyondDay;
  events: DomainEvent[];
}

/**
 * Priority 1 (HISTORY screen): every BeyondDay with its full event
 * history — a pure read, never mutates anything. Days most-recent-first
 * (the standard history-screen convention); events within a day
 * chronological oldest-first (the order they actually happened).
 * Read-only reconstruction from the existing event store — no new
 * tables, no new domain concept.
 */
export async function getHistoryDays(): Promise<HistoryDay[]> {
  const days = await db.beyondDays.toArray();
  // Leverage Implementation 001 (deterministic ordering hardening,
  // 2026-08-22): audited and deliberately left on raw startedAt
  // comparison — BeyondDay carries no `seq` field, unlike DomainEvent
  // below. Adding one would be a schema-adjacent change outside this
  // checkpoint's scope. Two BeyondDays sharing the same startedAt
  // millisecond is not a scenario this codebase creates in practice
  // (startDay() always closes any prior ACTIVE day first).
  const sortedDays = [...days].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const result: HistoryDay[] = [];
  for (const day of sortedDays) {
    // DomainEvent carries `seq` — a same-instant collision (routine
    // under fast CI/automated command sequences) is now resolved
    // deterministically instead of by raw timestamp-string comparison.
    const events = (await db.events.where("beyondDayId").equals(day.id).toArray()).sort((a, b) =>
      byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq),
    );
    result.push({ day, events });
  }
  return result;
}
