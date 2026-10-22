import { useEffect, useState } from "react";
import { getImportedSleep, getSleepRevisionHistory } from "../../../application/externalSleepQueries";
import { sleepDurations, type ExternalSleepRevision } from "../../../domain/health/sleepImport";
import { hoursMinutes, localDayTime, localTime } from "./healthFormat";

export function SleepEvidence({ revision }: { revision: ExternalSleepRevision }) {
  const [history, setHistory] = useState<ExternalSleepRevision[] | null>(null);
  const [error, setError] = useState(false);
  const r = revision.evidence, duration = sleepDurations(r);
  return <article aria-label="Imported Garmin sleep">
    <h3>Garmin sleep · {localDayTime(r.startTime)} → {localTime(r.endTime)}</h3>
    <p>{duration.asleepMinutes === null ? `${hoursMinutes(duration.spanMinutes)} in session · asleep total unavailable (stages missing or incomplete)` : `${hoursMinutes(duration.asleepMinutes)} asleep · ${hoursMinutes(duration.spanMinutes)} in session`}</p>
    <p>{revision.associatedDayId ? `Linked to lived day ${revision.associatedDayId}` : "Source dates only · no lived day assigned"}</p>
    <details><summary>Source details and revisions</summary>
      <p>Source times (UTC): {r.startTime} → {r.endTime}</p>
      <p>Source: {r.dataOriginPackage}</p><p>Record: {r.id}</p>
      <p>Source modified: {r.lastModifiedTime}</p><p>Imported: {revision.importedAt}</p>
      <p>Source UTC offsets (seconds): start {r.startZoneOffsetSeconds ?? "unavailable"}, end {r.endZoneOffsetSeconds ?? "unavailable"}.</p>
      <p>{r.stages.length} source stages. Session intervals and stage evidence are preserved.</p>
      <button type="button" onClick={() => { setError(false); void getSleepRevisionHistory(revision.recordKey).then(setHistory).catch(() => setError(true)); }}>SHOW REVISION HISTORY</button>
      {error && <p role="alert">History could not be loaded. Try again.</p>}
      {history && <ul>{history.map((r) => <li key={r.id}>{r.sourceVersion} · imported {r.importedAt} · {r.evidence.startTime} → {r.evidence.endTime}</li>)}</ul>}
    </details>
  </article>;
}

export function ImportedSleepEvidence({ active = true, refreshKey = 0 }: { active?: boolean; refreshKey?: number }) {
  const [rows, setRows] = useState<ExternalSleepRevision[]>([]), [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0), [limit, setLimit] = useState(10);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void getImportedSleep().then((next) => { if (!cancelled) { setRows(next); setError(false); } }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [active, refreshKey, attempt]);
  if (!error && !rows.length) return null;
  return <section aria-label="Imported sleep evidence" className="health-import">
    <h2>IMPORTED SLEEP</h2><p>Source records by date. Separate from manual sleep logs and TODAY guidance.</p>
    {error ? <><p role="alert">Imported sleep could not be loaded.</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>RETRY</button></> : rows.slice(0, limit).map((row) => <SleepEvidence key={row.id} revision={row} />)}
    {rows.length > limit && <button type="button" onClick={() => setLimit((n) => n + 10)}>SHOW MORE SLEEP RECORDS</button>}
  </section>;
}
