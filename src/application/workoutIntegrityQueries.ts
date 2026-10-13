import { db } from "../persistence/db";
import type { DomainEvent, PerformedSetRaw, WorkoutSession } from "../domain/common/types";
import { formatLocalDate } from "../engine/scheduledContext";

/**
 * WORKOUT-ATOMICITY-001, owner option A (2026-10-13, issue #221): a
 * read-only check for workout rows and events that disagree — the split a
 * pre-transaction workout command could leave behind when one of its two
 * writes was lost. It reports; it never writes, repairs or reinterprets
 * history (option C, compensating events, was declined). Diagnostic tier
 * only: shown beside MORE's other technical readouts, never a claim,
 * recommendation or action.
 *
 * COMMAND-ATOMICITY-002 (#225): every payload read tolerates a null or
 * malformed payload (an imported backup could carry one) instead of
 * failing the whole diagnostics read; dates are the operator's local date;
 * the rows and events are read in one read-only transaction so a write
 * landing between separate reads cannot show up as a transient mismatch.
 * recordIntegrityQueries.ts runs this same check over its shared snapshot.
 */
export type WorkoutRecordMismatchKind =
  | "SESSION_WITHOUT_START_EVENT"
  | "START_EVENT_WITHOUT_SESSION"
  | "ENDED_SESSION_WITHOUT_END_EVENT"
  | "END_EVENT_WITHOUT_MATCHING_SESSION"
  | "SET_ROWS_AND_EVENTS_DIFFER";

export interface WorkoutRecordMismatch {
  kind: WorkoutRecordMismatchKind;
  sessionId: string;
  message: string;
}

export const WORKOUT_EVENT_TYPES = [
  "WORKOUT_STARTED",
  "WORKOUT_COMPLETED",
  "WORKOUT_ABANDONED",
  "SET_LOGGED",
  "SET_SKIPPED",
] as const satisfies readonly DomainEvent["type"][];

export interface WorkoutRecordSnapshot {
  sessions: readonly WorkoutSession[];
  sets: readonly PerformedSetRaw[];
  /** Events of at least WORKOUT_EVENT_TYPES; other types are ignored. */
  events: readonly DomainEvent[];
}

const END_EVENT_FOR_STATUS: Record<string, "WORKOUT_COMPLETED" | "WORKOUT_ABANDONED"> = {
  COMPLETED: "WORKOUT_COMPLETED",
  PARTIAL: "WORKOUT_COMPLETED",
  ABANDONED: "WORKOUT_ABANDONED",
};

/** A payload as a plain field bag; null, arrays and primitives read as empty. */
export function payloadFields(event: DomainEvent): Record<string, unknown> {
  const payload = event.payload;
  return payload !== null && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
}

export function stringField(fields: Record<string, unknown>, key: string): string | undefined {
  const value = fields[key];
  return typeof value === "string" ? value : undefined;
}

/** The operator's local calendar date for an ISO instant, or "unknown date". */
export function localDay(iso: unknown): string {
  if (typeof iso !== "string") return "unknown date";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "unknown date" : formatLocalDate(date);
}

function setKey(sessionId: unknown, exerciseId: unknown, setNumber: unknown, skipped: boolean): string {
  return JSON.stringify([sessionId, exerciseId, setNumber, skipped]);
}

export function findWorkoutMismatches({ sessions, sets, events }: WorkoutRecordSnapshot): WorkoutRecordMismatch[] {
  const mismatches: WorkoutRecordMismatch[] = [];
  const sessionsById = new Map(sessions.map((s) => [s.id, s]));
  const eventsOfType = (type: DomainEvent["type"]) => events.filter((e) => e.type === type);
  const sessionIdOf = (e: DomainEvent) => stringField(payloadFields(e), "sessionId");

  const startedIds = new Set(eventsOfType("WORKOUT_STARTED").map(sessionIdOf));
  for (const session of sessions) {
    if (!startedIds.has(session.id)) {
      mismatches.push({
        kind: "SESSION_WITHOUT_START_EVENT",
        sessionId: session.id,
        message: `Workout from ${localDay(session.startedAt)} is saved without its start event.`,
      });
    }
  }
  for (const event of eventsOfType("WORKOUT_STARTED")) {
    const sessionId = sessionIdOf(event);
    if (!sessionId || !sessionsById.has(sessionId)) {
      mismatches.push({
        kind: "START_EVENT_WITHOUT_SESSION",
        sessionId: sessionId ?? "",
        message: `Workout start event from ${localDay(event.occurredAt)} has no saved workout.`,
      });
    }
  }

  const endEvents = [...eventsOfType("WORKOUT_COMPLETED"), ...eventsOfType("WORKOUT_ABANDONED")];
  for (const session of sessions) {
    const expected = END_EVENT_FOR_STATUS[session.status];
    if (!expected) continue;
    const hasEnd = endEvents.some(
      (e) => e.type === expected && sessionIdOf(e) === session.id && stringField(payloadFields(e), "status") === session.status,
    );
    if (!hasEnd) {
      mismatches.push({
        kind: "ENDED_SESSION_WITHOUT_END_EVENT",
        sessionId: session.id,
        message: `Workout from ${localDay(session.startedAt)} is saved as ${session.status} without a matching end event.`,
      });
    }
  }
  for (const event of endEvents) {
    const sessionId = sessionIdOf(event);
    const session = sessionId ? sessionsById.get(sessionId) : undefined;
    const status = stringField(payloadFields(event), "status");
    if (!session || session.status !== status) {
      mismatches.push({
        kind: "END_EVENT_WITHOUT_MATCHING_SESSION",
        sessionId: sessionId ?? "",
        message: session
          ? `Workout from ${localDay(session.startedAt)} has a ${status ?? "missing"} end event but is saved as ${session.status}.`
          : `Workout end event from ${localDay(event.occurredAt)} has no saved workout.`,
      });
    }
  }

  // Undo never deletes a performed-set row (SET_UNDONE only retracts it), so every row and every
  // SET_LOGGED/SET_SKIPPED event pair one-to-one; counts are compared per session/lift/set/kind.
  const counts = new Map<string, { rows: number; events: number; sessionId: string; exerciseId: string; setNumber: unknown; skipped: boolean; at: unknown }>();
  const entry = (sessionId: string, exerciseId: string, setNumber: unknown, skipped: boolean, at: unknown) => {
    const key = setKey(sessionId, exerciseId, setNumber, skipped);
    let current = counts.get(key);
    if (!current) {
      current = { rows: 0, events: 0, sessionId, exerciseId, setNumber, skipped, at };
      counts.set(key, current);
    }
    return current;
  };
  for (const set of sets) {
    const row = set as Record<string, unknown>;
    entry(String(row.sessionId ?? ""), String(row.exerciseId ?? ""), row.setNumber ?? 0, row.skipped === true, row.recordedAt).rows += 1;
  }
  for (const event of [...eventsOfType("SET_LOGGED"), ...eventsOfType("SET_SKIPPED")]) {
    const fields = payloadFields(event);
    entry(
      stringField(fields, "sessionId") ?? "",
      stringField(fields, "exerciseId") ?? "",
      fields.setNumber ?? 0,
      event.type === "SET_SKIPPED",
      event.occurredAt,
    ).events += 1;
  }
  for (const c of counts.values()) {
    if (c.rows === c.events) continue;
    mismatches.push({
      kind: "SET_ROWS_AND_EVENTS_DIFFER",
      sessionId: c.sessionId,
      message: `${c.skipped ? "Skipped" : "Logged"} set ${String(c.setNumber)} of ${c.exerciseId} on ${localDay(c.at)}: ${c.rows} saved, ${c.events} recorded as events.`,
    });
  }

  return mismatches;
}

export async function getWorkoutRecordMismatches(): Promise<WorkoutRecordMismatch[]> {
  const snapshot = await db.transaction("r", ["workoutSessions", "performedSets", "events"], async () => ({
    sessions: await db.workoutSessions.toArray(),
    sets: await db.performedSets.toArray(),
    events: await db.events.where("type").anyOf(WORKOUT_EVENT_TYPES).toArray(),
  }));
  return findWorkoutMismatches(snapshot);
}
