import { useEffect, useState } from "react";
import { getImportedSleep, getSleepRevisionHistory, getUnfiledGarminSleep } from "../../../application/externalSleepQueries";
import { sleepDurations, type ExternalSleepRevision, type GarminSleepUnfiled } from "../../../domain/health/sleepImport";
import { hoursMinutes, localDayTime, localTime } from "./healthFormat";

export function SleepEvidence({ revision, unfiled }: { revision: ExternalSleepRevision; unfiled?: GarminSleepUnfiled | undefined }) {
  const [history, setHistory] = useState<ExternalSleepRevision[] | null>(null);
  const [error, setError] = useState(false);
  const r = revision.evidence, duration = sleepDurations(r);
  return <article aria-label="Imported Garmin sleep">
    <h3>{new Date(r.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</h3>
    <p>{duration.asleepMinutes === null ? `${hoursMinutes(duration.spanMinutes)} session · asleep unavailable` : `${hoursMinutes(duration.asleepMinutes)} asleep`} · Garmin</p>
    {/* SLEEP-FILING-001: say when a Garmin "sleep" isn't counted, instead of leaving it silently out. */}
    {unfiled?.reason === "DURING_SHIFT" && <p className="meta" data-unfiled="DURING_SHIFT">During your shift, so BEYOND didn't count it as sleep. If you did sleep, log it in DATA → Sleep.</p>}
    {unfiled?.reason === "NO_DAY" && <p className="meta" data-unfiled="NO_DAY">No BEYOND day was open then, so it isn't counted as sleep.</p>}
    <details><summary>Source details and revisions</summary>
      <p>{localDayTime(r.startTime)} → {localTime(r.endTime)}</p>
      <p>{revision.associatedDayId ? "Matched to your BEYOND day." : "Garmin measurement without a matching BEYOND day."}</p>
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
  const [unfiled, setUnfiled] = useState<Map<string, GarminSleepUnfiled>>(new Map());
  const [attempt, setAttempt] = useState(0), [limit, setLimit] = useState(10);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    // The notes are extra: if they can't be read, the list still shows.
    void Promise.all([getImportedSleep(), getUnfiledGarminSleep().catch(() => new Map<string, GarminSleepUnfiled>())]).then(([next, notCounted]) => { if (!cancelled) { setRows(next); setUnfiled(notCounted); setError(false); } }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [active, refreshKey, attempt]);
  if (!error && !rows.length) return null;
  return <section aria-label="Imported sleep evidence" className="health-import">
    <h2>GARMIN SLEEP</h2><p>Recent watch measurements. Select a night for source detail.</p>
    {error ? <><p role="alert">Imported sleep could not be loaded.</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>RETRY</button></> : rows.slice(0, limit).map((row) => <SleepEvidence key={row.id} revision={row} unfiled={unfiled.get(row.recordKey)} />)}
    {rows.length > limit && <button type="button" onClick={() => setLimit((n) => n + 10)}>SHOW MORE SLEEP RECORDS</button>}
  </section>;
}
