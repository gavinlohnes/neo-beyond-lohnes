import { useEffect, useRef, useState } from "react";
import type { CustomWorkoutTemplate } from "../../../domain/workout/customTemplate";
import {
  getTrainingHistory,
  getWorkoutSessionRecord,
  type TrainingHistoryEntry,
  type WorkoutSessionRecord,
} from "../../../application/trainHistoryQueries";
import { describePersonalRecord } from "../../../application/personalRecordQueries";
import { describeError } from "../../errorMessage";
import { describeHistoryFacts, describeHistoryTitle, describeRecordedSet, TRAINING_HISTORY_EMPTY } from "./trainCopy";

/**
 * ULTIMATE-FOUNDATION-002 (Training Record, owner-approved 2026-10-17):
 * TRAIN → HISTORY. Every strength session no longer in progress, newest
 * first, each opening its own record — sets in logged order, skipped and
 * substituted sets labelled, records set and volume. Read only; opened
 * from TRAIN's pre-workout rows like RECORDS, closed with BACK. Re-reads
 * each time TRAIN becomes active again, keeping an open record open.
 */
export function TrainingHistory({
  active,
  customTemplates,
  onClose,
}: {
  active: boolean;
  customTemplates: readonly CustomWorkoutTemplate[];
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<TrainingHistoryEntry[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const returnFocusId = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let current = true;
    setReadError(null);
    getTrainingHistory().then(
      (next) => current && setEntries(next),
      (error) => current && setReadError(describeError(error, "Training history is unavailable. Please retry.")),
    );
    return () => {
      current = false;
    };
  }, [active]);

  // BACK from a record returns focus to the row it was opened from.
  useEffect(() => {
    if (openId || !entries || !returnFocusId.current) return;
    document.getElementById(historyRowId(returnFocusId.current))?.focus();
    returnFocusId.current = null;
  }, [openId, entries]);

  if (openId) {
    return (
      <SessionRecordView
        sessionId={openId}
        active={active}
        customTemplates={customTemplates}
        onBack={() => {
          returnFocusId.current = openId;
          setOpenId(null);
        }}
      />
    );
  }

  return (
    <section aria-labelledby="training-history-heading">
      <h2 id="training-history-heading" className="section-label">History</h2>
      {readError ? (
        <p className="meta" role="alert">{readError}</p>
      ) : entries === null ? (
        <p className="meta">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="empty-state">{TRAINING_HISTORY_EMPTY}</p>
      ) : (
        <ul className="record-cards">
          {entries.map((entry) => (
            <li key={entry.id} className="card record-card">
              <button
                id={historyRowId(entry.id)}
                type="button"
                className="record-card__open"
                aria-label={`${describeHistoryTitle(entry, customTemplates)}, ${formatSessionDate(entry.startedAt)}. ${describeHistoryFacts(entry)}`}
                onClick={() => setOpenId(entry.id)}
              >
                <span className="record-card__head">
                  <span className="card-title">{describeHistoryTitle(entry, customTemplates)}</span>
                  <span className="record-card__date meta">{formatSessionDate(entry.startedAt)}</span>
                </span>
                <span className="card-body" style={{ display: "block", marginTop: 4 }}>{describeHistoryFacts(entry)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={onClose}>
        BACK
      </button>
    </section>
  );
}

function SessionRecordView({
  sessionId,
  active,
  customTemplates,
  onBack,
}: {
  sessionId: string;
  active: boolean;
  customTemplates: readonly CustomWorkoutTemplate[];
  onBack: () => void;
}) {
  // undefined while reading; null when the session is no longer a history session.
  const [record, setRecord] = useState<WorkoutSessionRecord | null | undefined>(undefined);
  const [readError, setReadError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    let current = true;
    setReadError(null);
    getWorkoutSessionRecord(sessionId).then(
      (next) => current && setRecord(next),
      (error) => current && setReadError(describeError(error, "This session is unavailable. Please retry.")),
    );
    return () => {
      current = false;
    };
  }, [sessionId, active]);

  useEffect(() => {
    if (record === undefined || focusedRef.current) return;
    focusedRef.current = true;
    headingRef.current?.focus();
  }, [record]);

  const title = record ? `${describeHistoryTitle(record.entry, customTemplates)} · ${formatSessionDate(record.entry.startedAt)}` : "Session";
  return (
    <section aria-labelledby="session-record-heading">
      <h2 id="session-record-heading" ref={headingRef} tabIndex={-1} className="section-label">{title}</h2>
      {readError ? (
        <p className="meta" role="alert">{readError}</p>
      ) : record === undefined ? (
        <p className="meta">Loading…</p>
      ) : record === null ? (
        <p className="empty-state">This session is no longer in your history.</p>
      ) : (
        <>
          <p className="card-body" style={{ marginBottom: 12 }}>{describeHistoryFacts(record.entry)}</p>
          {record.exercises.length === 0 ? (
            <p className="empty-state">No sets were recorded in this session.</p>
          ) : (
            record.exercises.map((exercise) => (
              <div key={exercise.exerciseId} className="equipment-row">
                <h3 className="tool-label" style={{ marginBottom: 4 }}>{exercise.name}</h3>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {exercise.sets.map((set) => (
                    <li key={set.id} className={set.skipped ? "meta" : "card-body"} style={{ marginBottom: 2 }}>
                      <span>{describeRecordedSet(set)}</span>
                      {set.record && (
                        <span className="pr-line">
                          <span className="pr-tag">PR</span>
                          <span className="meta">{describePersonalRecord(set.record).replace("NEW PR — ", "")}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </>
      )}
      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px", marginTop: 12 }} onClick={onBack}>
        BACK
      </button>
    </section>
  );
}

function historyRowId(sessionId: string): string {
  return `training-history-${sessionId}`;
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
