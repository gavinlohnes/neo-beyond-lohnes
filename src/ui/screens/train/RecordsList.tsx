import { useEffect, useState } from "react";
import { describeRecordCard, getAllRecords, getBestRecords, type RecordCard } from "../../../application/personalRecordQueries";
import { LiftHistory } from "./LiftHistory";
import { getExerciseNames } from "../../../application/exerciseLibraryQueries";

/**
 * PR-CARDS-001 (owner brief 2026-10-04): TRAIN → RECORDS. One card per
 * personal record, newest first, each with the quiet outlined PR tag. Read
 * only; opened from TRAIN's pre-workout rows, closed with BACK.
 *
 * VIEWS-001: tapping a card opens that lift's strength curve in place.
 */
export function RecordsList({ onClose, focusExerciseId = null, active = true }: { onClose: () => void; focusExerciseId?: string | null; active?: boolean }) {
  const [allRecords, setAllRecords] = useState<RecordCard[]>([]);
  const [readError, setReadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [records, setRecords] = useState<RecordCard[] | null>(null);
  const [curve, setCurve] = useState<{ exerciseId: string; exerciseName: string } | null>(null);
  // FIND-001: a LIFT or PR search result opens straight at that lift's curve.
  const [focusExerciseName, setFocusExerciseName] = useState<string | null>(null);
  useEffect(() => {
    if (!focusExerciseId) return;
    let current = true;
    void getExerciseNames().then((names) => {
      if (current) setFocusExerciseName(names[focusExerciseId] ?? focusExerciseId);
    });
    return () => {
      current = false;
    };
  }, [focusExerciseId]);
  useEffect(() => {
    if (focusExerciseId && focusExerciseName) setCurve({ exerciseId: focusExerciseId, exerciseName: focusExerciseName });
  }, [focusExerciseId, focusExerciseName]);

  useEffect(() => {
    if (!active) return;
    let current = true;
    setReadError(false);
    void getAllRecords().then(async (all) => {
      const best = await getBestRecords(all);
      if (current) { setRecords(best); setAllRecords(all); }
    }, () => { if (current) setReadError(true); });
    return () => { current = false; };
  }, [active, retry]);

  if (curve) return <LiftHistory exerciseId={curve.exerciseId} exerciseName={curve.exerciseName} onClose={() => setCurve(null)} />;

  return (
    <section aria-labelledby="records-heading">
      <h2 id="records-heading" className="section-label">Records</h2>
      {readError && <div role="alert"><p className="meta">Records could not be read.</p><button className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY RECORDS</button></div>}
      {records === null ? (
        <p className="meta">Loading…</p>
      ) : records.length === 0 ? (
        <p className="empty-state">No records yet. A set that beats your earlier ones lands here.</p>
      ) : (
        <ul className="record-cards">
          {records.map((r) => (
            <li key={r.setId} className="card record-card">
              <button
                type="button"
                className="record-card__open"
                aria-label={`${r.exerciseName}: ${describeRecordCard(r.record)}. Show its strength curve`}
                onClick={() => setCurve({ exerciseId: r.exerciseId, exerciseName: r.exerciseName })}
              >
                <span className="record-card__head">
                  <span className="pr-tag">PR</span>
                  <span className="record-card__date meta">{formatRecordDate(r.recordedAt)}</span>
                </span>
                <span className="card-title" style={{ display: "block", margin: "6px 0 2px" }}>{r.exerciseName}</span>
                <span className="card-body" style={{ display: "block" }}>{describeRecordCard(r.record)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {allRecords.length > 0 && <details><summary className="disclosure-row">Every personal record · {allRecords.length}</summary>
        <ul className="record-cards">{allRecords.map((r) => <li key={r.setId}><button className="record-card__open" onClick={() => setCurve({ exerciseId: r.exerciseId, exerciseName: r.exerciseName })}>
          {r.exerciseName} · {describeRecordCard(r.record)} · {formatRecordDate(r.recordedAt)}
        </button></li>)}</ul>
      </details>}
      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={onClose}>
        BACK TO WORKOUT
      </button>
    </section>
  );
}

function formatRecordDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
