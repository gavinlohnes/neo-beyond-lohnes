import { useEffect, useState } from "react";
import { describeRecordCard, getAllRecords, type RecordCard } from "../../../application/personalRecordQueries";

/**
 * PR-CARDS-001 (owner brief 2026-10-04): TRAIN → RECORDS. One card per
 * personal record, newest first, each with the quiet outlined PR tag. Read
 * only; opened from TRAIN's pre-workout rows, closed with BACK.
 */
export function RecordsList({ onClose }: { onClose: () => void }) {
  const [records, setRecords] = useState<RecordCard[] | null>(null);

  useEffect(() => {
    let current = true;
    void getAllRecords().then((next) => {
      if (current) setRecords(next);
    });
    return () => {
      current = false;
    };
  }, []);

  return (
    <section aria-labelledby="records-heading">
      <h2 id="records-heading" className="section-label">Records</h2>
      {records === null ? (
        <p className="meta">Loading…</p>
      ) : records.length === 0 ? (
        <p className="empty-state">No records yet. A set that beats your earlier ones lands here.</p>
      ) : (
        <ul className="record-cards">
          {records.map((r) => (
            <li key={r.setId} className="card record-card">
              <div className="record-card__head">
                <span className="pr-tag">PR</span>
                <span className="record-card__date meta">{formatRecordDate(r.recordedAt)}</span>
              </div>
              <p className="card-title" style={{ margin: "6px 0 2px" }}>{r.exerciseName}</p>
              <p className="card-body">{describeRecordCard(r.record)}</p>
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

function formatRecordDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
