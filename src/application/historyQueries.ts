import { db } from "../persistence/db";
import type { BeyondDay, DomainEvent } from "../domain/common/types";

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
  const sortedDays = [...days].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const result: HistoryDay[] = [];
  for (const day of sortedDays) {
    const events = (await db.events.where("beyondDayId").equals(day.id).toArray()).sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt),
    );
    result.push({ day, events });
  }
  return result;
}
