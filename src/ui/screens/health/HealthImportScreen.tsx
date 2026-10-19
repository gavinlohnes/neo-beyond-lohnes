import { useEffect, useRef, useState } from "react";
import { importSleepSnapshot, previewSleepImport } from "../../../application/externalSleepCommands";
import { getSleepImportDays } from "../../../application/externalSleepQueries";
import { sleepDurations, type SleepSnapshot } from "../../../domain/health/sleepImport";
import type { BeyondDay } from "../../../domain/common/types";
import { ImportedSleepEvidence } from "./ImportedSleepEvidence";
import "./healthImport.css";

export function HealthImportScreen({ active = true }: { active?: boolean }) {
  const [snapshot, setSnapshot] = useState<SleepSnapshot | null>(null), [days, setDays] = useState<BeyondDay[]>([]);
  const [associations, setAssociations] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const locked = useRef(false), selection = useRef(0), result = useRef<HTMLParagraphElement>(null);
  useEffect(() => () => { selection.current++; }, []);
  async function choose(file?: File) {
    const request = ++selection.current;
    setSnapshot(null); setAssociations({}); setMessage(""); setError("");
    if (!file) return;
    setBusy(true);
    try {
      const [next, choices] = await Promise.all([previewSleepImport(file), getSleepImportDays()]);
      if (request === selection.current) { setSnapshot(next); setDays(choices); }
    } catch (e) { if (request === selection.current) setError(e instanceof Error ? e.message : "This file could not be read. Nothing was imported."); }
    finally { if (request === selection.current) setBusy(false); }
  }
  async function confirm() {
    if (!snapshot || locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      const counts = await importSleepSnapshot(snapshot, associations);
      setSnapshot(null); setRefresh((n) => n + 1);
      setMessage(`Imported ${counts.inserted} new, ${counts.revised} revised; ${counts.skipped} unchanged or older. Manual logs and guidance are unchanged.`);
      requestAnimationFrame(() => result.current?.focus());
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed. Nothing was changed."); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section aria-label="Import health data" className="health-import">
    <h2>IMPORT HEALTH DATA</h2>
    <p>Choose a sleep export from BEYOND Health Bridge. Review it before saving. This imports Garmin sleep evidence only, on this device.</p>
    <p>No account or upload. Other health data, automatic sync and changes to TODAY guidance are outside this first version.</p>
    <label>Sleep export file<input type="file" accept="application/json,text/json,.json" disabled={busy} onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} /></label>
    {busy && <p role="status">Working…</p>}
    {error && <p role="alert">{error}</p>}
    <p ref={result} tabIndex={-1} role="status">{message}</p>
    {snapshot && <section aria-label="Sleep import preview">
      <h3>REVIEW SLEEP IMPORT</h3>
      <p>Garmin Connect · {snapshot.records.length} records · exported {snapshot.exportedAt}</p>
      <p>Window: {snapshot.window.startTime} → {snapshot.window.endTime} (UTC). Only complete sessions inside this window are included.</p>
      <p>Repeated records are skipped. Newer source revisions retain earlier versions. An omitted source record is never treated as a deletion.</p>
      {snapshot.records.map((r, i) => {
        const duration = sleepDurations(r);
        return <article key={r.id} aria-label={`Sleep preview ${i + 1}`}>
          <h4>Garmin sleep {i + 1}</h4><p>{r.startTime} → {r.endTime} (UTC)</p>
          <p>{Math.round(duration.spanMinutes)} minutes in session · {duration.asleepMinutes === null ? "asleep total unavailable" : `${Math.round(duration.asleepMinutes)} minutes asleep`}</p>
          <p>Source modified: {r.lastModifiedTime} · {r.stages.length} stages</p>
          <label>Associate sleep {i + 1} with a lived day
            <select value={associations[r.id] ?? ""} disabled={busy} onChange={(e) => setAssociations((old) => ({ ...old, [r.id]: e.target.value || null }))}>
              <option value="">Source dates only (keep existing link on a revision)</option>
              {days.map((day) => <option key={day.id} value={day.id}>{day.startedAt} · {day.workContext} · {day.status}</option>)}
            </select>
          </label>
        </article>;
      })}
      {!snapshot.records.length && <p>No Garmin sleep records in this export. Nothing will be saved.</p>}
      <button type="button" disabled={busy || !snapshot.records.length} onClick={() => void confirm()}>CONFIRM SLEEP IMPORT</button>
      <button type="button" disabled={busy} onClick={() => { selection.current++; setSnapshot(null); setAssociations({}); }}>CANCEL PREVIEW</button>
    </section>}
    <ImportedSleepEvidence active={active} refreshKey={refresh} />
  </section>;
}
