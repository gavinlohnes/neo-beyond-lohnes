import { useEffect, useRef, useState } from "react";
import { importSleepSnapshot, previewSleepImport } from "../../../application/externalSleepCommands";
import { getSleepImportDays } from "../../../application/externalSleepQueries";
import { MAX_SLEEP_FILE_BYTES, sleepDurations, type SleepSnapshot } from "../../../domain/health/sleepImport";
import type { BeyondDay } from "../../../domain/common/types";
import { ImportedSleepEvidence } from "./ImportedSleepEvidence";
import { ImportedActivityEvidence } from "./ImportedActivityEvidence";
import { importActivitySnapshot, previewActivityImport } from "../../../application/externalActivityCommands";
import { ACTIVITY_IMPORT_FORMAT, MAX_ACTIVITY_FILE_BYTES, summarizeActivity, type ActivitySnapshot } from "../../../domain/health/activityImport";
import { heartRateLine, hoursMinutes, localDayTime, localTime } from "./healthFormat";

/** GARMIN-005: how many previewed hours carry calories (schema 2 files only). */
const calorieHours = (snapshot: ActivitySnapshot) => snapshot.hours.filter((h) => h.totalCaloriesKcal != null || h.activeCaloriesKcal != null).length;
import { takeSharedHealthFiles } from "./sharedHealthFiles";
import "./healthImport.css";

export function HealthImportScreen({ active = true }: { active?: boolean }) {
  const [snapshot, setSnapshot] = useState<SleepSnapshot | null>(null), [days, setDays] = useState<BeyondDay[]>([]);
  const [associations, setAssociations] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [activity, setActivity] = useState<ActivitySnapshot | null>(null);
  const locked = useRef(false), selection = useRef(0), result = useRef<HTMLParagraphElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { selection.current++; }, []);
  // GARMIN-002 SEND TO BEYOND: preview any files the share sheet parked; they are removed once read.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void takeSharedHealthFiles().then((files) => { if (!cancelled && files.length) void chooseMany(files); });
    return () => { cancelled = true; };
  }, [active]);
  async function choose(file?: File) { await chooseMany(file ? [file] : []); }
  /** Each file fills its own preview: one sleep and one steps/heart-rate file can be reviewed together. */
  async function chooseMany(files: File[]) {
    const request = ++selection.current;
    setSnapshot(null); setActivity(null); setAssociations({}); setMessage(""); setError("");
    if (!files.length) return;
    setBusy(true);
    const ready: string[] = [];
    try {
      for (const file of files) {
        if (file.size > Math.max(MAX_ACTIVITY_FILE_BYTES, MAX_SLEEP_FILE_BYTES)) throw new Error("This file is too large for a BEYOND Health Bridge export. Nothing was imported.");
        const raw = await file.text();
        // The helper saves sleep and steps/heart rate as separate files; either can be chosen here.
        if (raw.includes(`"${ACTIVITY_IMPORT_FORMAT}"`)) {
          const next = await previewActivityImport({ size: file.size, text: async () => raw });
          if (request !== selection.current) return;
          setActivity(next); ready.push(`${next.hours.length} hours of Garmin steps and heart rate`);
        } else {
          const [next, choices] = await Promise.all([previewSleepImport({ size: file.size, text: async () => raw }), getSleepImportDays()]);
          if (request !== selection.current) return;
          setSnapshot(next); setDays(choices); ready.push(`${next.records.length} Garmin sleep records`);
        }
      }
      if (request === selection.current) setMessage(`Preview ready: ${ready.join(" and ")}. Nothing has been imported.`);
    } catch (e) { if (request === selection.current) setError(e instanceof Error ? e.message : "This file could not be read. Nothing was imported."); }
    finally { if (request === selection.current) setBusy(false); }
  }
  async function confirmActivity() {
    if (!activity || locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      const counts = await importActivitySnapshot(activity);
      setActivity(null); setRefresh((n) => n + 1);
      setMessage(`Imported ${counts.inserted} new, ${counts.revised} updated; ${counts.skipped} unchanged or older. Manual logs and guidance are unchanged.`);
      requestAnimationFrame(() => result.current?.focus());
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed. Nothing was changed."); }
    finally { locked.current = false; setBusy(false); }
  }
  async function confirm() {
    if (!snapshot || locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      const counts = await importSleepSnapshot(snapshot, associations);
      setSnapshot(null); setRefresh((n) => n + 1);
      // GARMIN-003: say what Garmin filled in; the owner's own entries are never replaced.
      const filled = counts.logged || counts.corrected
        ? ` Sleep filled in from Garmin: ${counts.logged} new, ${counts.corrected} updated. Your own sleep entries always win.`
        : " Your own sleep entries are unchanged.";
      setMessage(`Imported ${counts.inserted} new, ${counts.revised} revised; ${counts.skipped} unchanged or older.${filled}`);
      requestAnimationFrame(() => result.current?.focus());
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed. Nothing was changed."); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section aria-label="Import health data" className="health-import">
    <h2>IMPORT HEALTH DATA</h2>
    <p>Choose a sleep or a steps and heart rate file from BEYOND Health Bridge. Review it before saving. Garmin measurements stay on this device.</p>
    <p>No account or upload. Imported measurements never change your own logs or TODAY guidance.</p>
    <label>Health export file<input ref={fileInput} type="file" disabled={busy} onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} /></label>
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
          <h4>Garmin sleep {i + 1} · {localDayTime(r.startTime)} → {localTime(r.endTime)}</h4>
          <p>{hoursMinutes(duration.spanMinutes)} in session · {duration.asleepMinutes === null ? "asleep total unavailable" : `${hoursMinutes(duration.asleepMinutes)} asleep`}</p>
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
      <button type="button" disabled={busy} onClick={() => { selection.current++; setSnapshot(null); setAssociations({}); setMessage("Preview cancelled. Nothing was imported."); fileInput.current?.focus(); }}>CANCEL PREVIEW</button>
    </section>}
    {activity && (() => {
      const total = summarizeActivity(activity.hours, Date.parse(activity.window.startTime), Date.parse(activity.window.endTime));
      return <section aria-label="Steps and heart rate import preview">
        <h3>REVIEW STEPS AND HEART RATE</h3>
        <p>Garmin Connect · exported {activity.exportedAt}</p>
        <p>Window: {activity.window.startTime} → {activity.window.endTime} (UTC)</p>
        <p>{activity.hours.length} measured hours · {total.steps === null ? "no steps" : `${total.steps.toLocaleString("en-US")} steps`} · {heartRateLine(total.heartRateMinBpm, total.heartRateAvgBpm, total.heartRateMaxBpm).replace(/^Heart rate/, "heart rate")} · {activity.restingHeartRate.length} resting heart rate readings{calorieHours(activity) ? ` · ${calorieHours(activity)} hours with calories burned` : ""}</p>
        <p>A newer export replaces the same hour. Older or repeated files change nothing.</p>
        {!activity.hours.length && !activity.restingHeartRate.length && <p>No Garmin steps or heart rate in this export. Nothing will be saved.</p>}
        <button type="button" disabled={busy || (!activity.hours.length && !activity.restingHeartRate.length)} onClick={() => void confirmActivity()}>CONFIRM STEPS AND HEART RATE IMPORT</button>
        <button type="button" disabled={busy} onClick={() => { selection.current++; setActivity(null); setMessage("Preview cancelled. Nothing was imported."); fileInput.current?.focus(); }}>CANCEL PREVIEW</button>
      </section>;
    })()}
    <ImportedActivityEvidence active={active} refreshKey={refresh} />
    <ImportedSleepEvidence active={active} refreshKey={refresh} />
  </section>;
}
