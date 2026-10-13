import { db } from "../persistence/db";
import type { DomainEvent } from "../domain/common/types";

/**
 * WORKOUT-ATOMICITY-001, owner option A (2026-10-13, issue #221): a
 * read-only check for workout rows and events that disagree — the split a
 * pre-transaction workout command could leave behind when one of its two
 * writes was lost. It reports; it never writes, repairs or reinterprets
 * history (option C, compensating events, was declined). Diagnostic tier
 * only: shown beside MORE's other technical readouts, never a claim,
 * recommendation or action.
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

const END_EVENT_FOR_STATUS: Record<string, "WORKOUT_COMPLETED" | "WORKOUT_ABANDONED"> = {
  COMPLETED: "WORKOUT_COMPLETED",
  PARTIAL: "WORKOUT_COMPLETED",
  ABANDONED: "WORKOUT_ABANDONED",
};

type SessionEventPayload = { sessionId?: string; status?: string };
type SetEventPayload = { sessionId?: string; exerciseId?: string; setNumber?: number };

function day(iso: string | undefined): string {
  return iso ? iso.slice(0, 10) : "unknown date";
}

function setKey(sessionId: unknown, exerciseId: unknown, setNumber: unknown, skipped: boolean): string {
  return JSON.stringify([sessionId, exerciseId, setNumber, skipped]);
}

export async function getWorkoutRecordMismatches(): Promise<WorkoutRecordMismatch[]> {
  const [sessions, sets, events] = await Promise.all([
    db.workoutSessions.toArray(),
    db.performedSets.toArray(),
    db.events
      .where("type")
      .anyOf("WORKOUT_STARTED", "WORKOUT_COMPLETED", "WORKOUT_ABANDONED", "SET_LOGGED", "SET_SKIPPED")
      .toArray() as Promise<DomainEvent[]>,
  ]);
  const mismatches: WorkoutRecordMismatch[] = [];
  const sessionsById = new Map(sessions.map((s) => [s.id, s]));
  const eventsOfType = (type: DomainEvent["type"]) => events.filter((e) => e.type === type);
  const sessionIdOf = (e: DomainEvent) => (e.payload as SessionEventPayload | undefined)?.sessionId;

  const startedIds = new Set(eventsOfType("WORKOUT_STARTED").map(sessionIdOf));
  for (const session of sessions) {
    if (!startedIds.has(session.id)) {
      mismatches.push({
        kind: "SESSION_WITHOUT_START_EVENT",
        sessionId: session.id,
        message: `Workout from ${day(session.startedAt)} is saved without its start event.`,
      });
    }
  }
  for (const event of eventsOfType("WORKOUT_STARTED")) {
    const sessionId = sessionIdOf(event);
    if (!sessionId || !sessionsById.has(sessionId)) {
      mismatches.push({
        kind: "START_EVENT_WITHOUT_SESSION",
        sessionId: sessionId ?? "",
        message: `Workout start event from ${day(event.occurredAt)} has no saved workout.`,
      });
    }
  }

  const endEvents = [...eventsOfType("WORKOUT_COMPLETED"), ...eventsOfType("WORKOUT_ABANDONED")];
  for (const session of sessions) {
    const expected = END_EVENT_FOR_STATUS[session.status];
    if (!expected) continue;
    const hasEnd = endEvents.some(
      (e) => e.type === expected && sessionIdOf(e) === session.id && (e.payload as SessionEventPayload).status === session.status,
    );
    if (!hasEnd) {
      mismatches.push({
        kind: "ENDED_SESSION_WITHOUT_END_EVENT",
        sessionId: session.id,
        message: `Workout from ${day(session.startedAt)} is saved as ${session.status} without a matching end event.`,
      });
    }
  }
  for (const event of endEvents) {
    const sessionId = sessionIdOf(event);
    const session = sessionId ? sessionsById.get(sessionId) : undefined;
    const status = (event.payload as SessionEventPayload).status;
    if (!session || session.status !== status) {
      mismatches.push({
        kind: "END_EVENT_WITHOUT_MATCHING_SESSION",
        sessionId: sessionId ?? "",
        message: session
          ? `Workout from ${day(session.startedAt)} has a ${status ?? "missing"} end event but is saved as ${session.status}.`
          : `Workout end event from ${day(event.occurredAt)} has no saved workout.`,
      });
    }
  }

  // Undo never deletes a performed-set row (SET_UNDONE only retracts it), so every row and every
  // SET_LOGGED/SET_SKIPPED event pair one-to-one; counts are compared per session/lift/set/kind.
  const counts = new Map<string, { rows: number; events: number; sessionId: string; exerciseId: string; setNumber: number; skipped: boolean; at: string }>();
  const entry = (sessionId: string, exerciseId: string, setNumber: number, skipped: boolean, at: string) => {
    const key = setKey(sessionId, exerciseId, setNumber, skipped);
    let current = counts.get(key);
    if (!current) {
      current = { rows: 0, events: 0, sessionId, exerciseId, setNumber, skipped, at };
      counts.set(key, current);
    }
    return current;
  };
  for (const set of sets) {
    const row = set as unknown as { sessionId: string; exerciseId: string; setNumber: number; skipped: boolean; recordedAt: string };
    entry(row.sessionId, row.exerciseId, row.setNumber, row.skipped, row.recordedAt).rows += 1;
  }
  for (const event of [...eventsOfType("SET_LOGGED"), ...eventsOfType("SET_SKIPPED")]) {
    const payload = event.payload as SetEventPayload;
    entry(payload.sessionId ?? "", payload.exerciseId ?? "", payload.setNumber ?? 0, event.type === "SET_SKIPPED", event.occurredAt).events += 1;
  }
  for (const c of counts.values()) {
    if (c.rows === c.events) continue;
    mismatches.push({
      kind: "SET_ROWS_AND_EVENTS_DIFFER",
      sessionId: c.sessionId,
      message: `${c.skipped ? "Skipped" : "Logged"} set ${c.setNumber} of ${c.exerciseId} on ${day(c.at)}: ${c.rows} saved, ${c.events} recorded as events.`,
    });
  }

  return mismatches;
}
