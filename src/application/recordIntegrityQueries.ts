import { db } from "../persistence/db";
import type { BeyondDay, DomainEvent, PerformedSetRaw, Recommendation, StateCheckIn, WorkoutSession } from "../domain/common/types";
import type { Mission, Obligation } from "../domain/intent/types";
import type { DecisionJournalEntry } from "../domain/journal/types";
import {
  WORKOUT_EVENT_TYPES,
  findWorkoutMismatches,
  localDay,
  payloadFields,
  stringField,
} from "./workoutIntegrityQueries";

/**
 * COMMAND-ATOMICITY-002 (owner approval 2026-10-13, issue #225): the
 * read-only record check behind MORE → Diagnostic detail, widened from
 * workouts (#221, option A) to the other command families whose row and
 * event used to be written separately. It reports a row without the event
 * that should record it, or the reverse. It never writes or repairs.
 *
 * Every row and event is read inside one read-only transaction, so the
 * report is one consistent snapshot: a command committing between two
 * separate reads can no longer show up as a transient mismatch.
 *
 * Covered only where both sides have always been written together and the
 * protected historical backups agree, so old data cannot raise a false
 * alarm:
 *   - days: DAY_STARTED for every day row and the reverse; DAY_ENDED for
 *     every ENDED day, and no DAY_ENDED on a day still saved ACTIVE;
 *   - check-ins: every check-in row has its STATE_CHECKED_IN event (one
 *     direction — the oldest backups kept check-ins as events only);
 *   - recommendations: every row has RECOMMENDATION_ISSUED and the reverse;
 *   - missions, obligations, journal entries: created events both ways, and
 *     ARCHIVED / SATISFIED / RELEASED / REVIEWED status both ways.
 * Deliberately not covered: work context (older app versions may have set
 * it through paths not visible in this history), outcome ratings (the
 * oldest backups hold outcome rows without OUTCOME_RATED), Capture
 * conversion (a converted capture may legitimately be reopened or
 * deleted), and WAITING/OPEN toggles (no stable one-to-one pairing).
 */
export type RecordArea = "WORKOUT" | "DAY" | "INTENT" | "JOURNAL";

export interface RecordMismatch {
  area: RecordArea;
  kind: string;
  recordId: string;
  message: string;
}

const CHECKED_EVENT_TYPES = [
  ...WORKOUT_EVENT_TYPES,
  "DAY_STARTED",
  "DAY_ENDED",
  "STATE_CHECKED_IN",
  "RECOMMENDATION_ISSUED",
  "MISSION_CREATED",
  "MISSION_ARCHIVED",
  "OBLIGATION_CREATED",
  "OBLIGATION_SATISFIED",
  "OBLIGATION_RELEASED",
  "DECISION_JOURNAL_CREATED",
  "DECISION_JOURNAL_REVIEWED",
] as const satisfies readonly DomainEvent["type"][];

export interface RecordSnapshot {
  days: readonly BeyondDay[];
  checkIns: readonly StateCheckIn[];
  recommendations: readonly Recommendation[];
  sessions: readonly WorkoutSession[];
  sets: readonly PerformedSetRaw[];
  missions: readonly Mission[];
  obligations: readonly Obligation[];
  journal: readonly DecisionJournalEntry[];
  events: readonly DomainEvent[];
}

function idsOf(events: readonly DomainEvent[], type: DomainEvent["type"], idOf: (e: DomainEvent) => string | undefined): Map<string, DomainEvent> {
  const found = new Map<string, DomainEvent>();
  for (const event of events) {
    if (event.type !== type) continue;
    const id = idOf(event);
    if (id && !found.has(id)) found.set(id, event);
  }
  return found;
}

/** Event scope field first (how intent/journal events are keyed), payload field as fallback. */
function scopedId(event: DomainEvent, scopeKey: "missionId" | "obligationId" | "decisionJournalEntryId"): string | undefined {
  const scope = (event as unknown as Record<string, unknown>)[scopeKey];
  return typeof scope === "string" ? scope : stringField(payloadFields(event), scopeKey);
}

/**
 * One lifecycle pairing: a row in `status` must have a `type` event, and a
 * `type` event must point at a row now in `status`.
 */
function pairStatus<T extends { id: string; status: string }>(params: {
  area: RecordArea;
  rows: readonly T[];
  events: readonly DomainEvent[];
  type: DomainEvent["type"];
  status: string;
  idOf: (e: DomainEvent) => string | undefined;
  label: (row: T | undefined, event?: DomainEvent) => string;
  verb: string;
}): RecordMismatch[] {
  const { area, rows, events, type, status, idOf, label, verb } = params;
  const out: RecordMismatch[] = [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const withEvent = idsOf(events, type, idOf);
  for (const row of rows) {
    if (row.status === status && !withEvent.has(row.id)) {
      out.push({ area, kind: `${status}_WITHOUT_EVENT`, recordId: row.id, message: `${label(row)} is saved as ${verb} without its ${type} event.` });
    }
  }
  for (const [id, event] of withEvent) {
    const row = byId.get(id);
    if (!row || row.status !== status) {
      out.push({
        area,
        kind: `${type}_WITHOUT_MATCHING_RECORD`,
        recordId: id,
        message: row
          ? `${label(row)} has a ${type} event but is saved as ${row.status}.`
          : `${type} event from ${localDay(event.occurredAt)} has no saved record.`,
      });
    }
  }
  return out;
}

function pairCreated<T extends { id: string }>(params: {
  area: RecordArea;
  rows: readonly T[];
  events: readonly DomainEvent[];
  type: DomainEvent["type"];
  idOf: (e: DomainEvent) => string | undefined;
  label: (row: T) => string;
  bothWays?: boolean;
}): RecordMismatch[] {
  const { area, rows, events, type, idOf, label, bothWays = true } = params;
  const out: RecordMismatch[] = [];
  const ids = new Set(rows.map((r) => r.id));
  const withEvent = idsOf(events, type, idOf);
  for (const row of rows) {
    if (!withEvent.has(row.id)) {
      out.push({ area, kind: `RECORD_WITHOUT_${type}`, recordId: row.id, message: `${label(row)} is saved without its ${type} event.` });
    }
  }
  if (bothWays) {
    for (const event of events) {
      if (event.type !== type) continue;
      const id = idOf(event);
      if (!id || !ids.has(id)) {
        out.push({
          area,
          kind: `${type}_WITHOUT_RECORD`,
          recordId: id ?? "",
          message: `${type} event from ${localDay(event.occurredAt)} has no saved record.`,
        });
      }
    }
  }
  return out;
}

export function findRecordMismatches(snapshot: RecordSnapshot): RecordMismatch[] {
  const { days, checkIns, recommendations, missions, obligations, journal, events } = snapshot;
  const mismatches: RecordMismatch[] = findWorkoutMismatches(snapshot).map((m) => ({
    area: "WORKOUT" as const,
    kind: m.kind,
    recordId: m.sessionId,
    message: m.message,
  }));

  const dayLabel = (d: BeyondDay | undefined) => (d ? `Day from ${localDay(d.startedAt)}` : "A day");
  mismatches.push(
    ...pairCreated({ area: "DAY", rows: days, events, type: "DAY_STARTED", idOf: (e) => e.beyondDayId, label: dayLabel }),
    ...pairStatus({ area: "DAY", rows: days, events, type: "DAY_ENDED", status: "ENDED", idOf: (e) => e.beyondDayId, label: dayLabel, verb: "ended" }),
    ...pairCreated({
      area: "DAY",
      rows: checkIns,
      events,
      type: "STATE_CHECKED_IN",
      idOf: (e) => stringField(payloadFields(e), "id"),
      label: (c) => `Check-in from ${localDay(c.recordedAt)}`,
      bothWays: false,
    }),
    ...pairCreated({
      area: "DAY",
      rows: recommendations,
      events,
      type: "RECOMMENDATION_ISSUED",
      idOf: (e) => stringField(payloadFields(e), "recommendationId"),
      label: (r) => `Recommendation from ${localDay(r.issuedAt)}`,
    }),
  );

  const missionLabel = (m: Mission | undefined) => (m ? `Mission “${m.title}”` : "A mission");
  const obligationLabel = (o: Obligation | undefined) => (o ? `Obligation “${o.title}”` : "An obligation");
  mismatches.push(
    ...pairCreated({ area: "INTENT", rows: missions, events, type: "MISSION_CREATED", idOf: (e) => scopedId(e, "missionId"), label: missionLabel }),
    ...pairStatus({ area: "INTENT", rows: missions, events, type: "MISSION_ARCHIVED", status: "ARCHIVED", idOf: (e) => scopedId(e, "missionId"), label: missionLabel, verb: "archived" }),
    ...pairCreated({ area: "INTENT", rows: obligations, events, type: "OBLIGATION_CREATED", idOf: (e) => scopedId(e, "obligationId"), label: obligationLabel }),
    ...pairStatus({ area: "INTENT", rows: obligations, events, type: "OBLIGATION_SATISFIED", status: "SATISFIED", idOf: (e) => scopedId(e, "obligationId"), label: obligationLabel, verb: "satisfied" }),
    ...pairStatus({ area: "INTENT", rows: obligations, events, type: "OBLIGATION_RELEASED", status: "RELEASED", idOf: (e) => scopedId(e, "obligationId"), label: obligationLabel, verb: "released" }),
  );

  const entryLabel = (j: DecisionJournalEntry | undefined) => (j ? `Decision “${j.title}”` : "A decision");
  mismatches.push(
    ...pairCreated({ area: "JOURNAL", rows: journal, events, type: "DECISION_JOURNAL_CREATED", idOf: (e) => scopedId(e, "decisionJournalEntryId"), label: entryLabel }),
    ...pairStatus({ area: "JOURNAL", rows: journal, events, type: "DECISION_JOURNAL_REVIEWED", status: "REVIEWED", idOf: (e) => scopedId(e, "decisionJournalEntryId"), label: entryLabel, verb: "reviewed" }),
  );

  return mismatches;
}

const SNAPSHOT_TABLES = [
  "beyondDays",
  "checkIns",
  "recommendations",
  "workoutSessions",
  "performedSets",
  "missions",
  "obligations",
  "decisionJournalEntries",
  "events",
];

export async function getRecordMismatches(): Promise<RecordMismatch[]> {
  const snapshot = await db.transaction("r", SNAPSHOT_TABLES, async (): Promise<RecordSnapshot> => ({
    days: await db.beyondDays.toArray(),
    checkIns: await db.checkIns.toArray(),
    recommendations: await db.recommendations.toArray(),
    sessions: await db.workoutSessions.toArray(),
    sets: await db.performedSets.toArray(),
    missions: await db.missions.toArray(),
    obligations: await db.obligations.toArray(),
    journal: await db.decisionJournalEntries.toArray(),
    events: await db.events.where("type").anyOf(CHECKED_EVENT_TYPES).toArray(),
  }));
  return findRecordMismatches(snapshot);
}
