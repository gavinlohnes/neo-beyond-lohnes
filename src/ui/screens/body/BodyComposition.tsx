import { useEffect, useRef, useState, type ReactNode } from "react";
import { getMeasurements, type MeasurementEntry } from "../../../application/measurementQueries";
import { correctMeasurement, logMeasurement } from "../../../application/measurementCommands";
import { MEASUREMENT_SITES, MEASUREMENT_MIN_INCHES, MEASUREMENT_MAX_INCHES, type MeasurementSite } from "../../../domain/body/types";
import type { WeighIn } from "../../../application/bodyTrendQueries";
import { describeError } from "../../errorMessage";
import { useSessionDraft } from "../../sessionDrafts";
import { ProgressPhotos } from "./ProgressPhotos";
import "./bodyProgress.css";

type ProgressView = "trends" | "measurements" | "photos";
import { localProgressDate, progressDate, siteLabel } from "./progressCopy";

export function BodyComposition({ active, refreshKey, metricRequest, viewRequest, weights, onWeight, children }: {
  active: boolean; refreshKey: number; metricRequest?: object | null | undefined; viewRequest?: { key: number; view: "photos" | "measurements" } | null | undefined; onWeight: () => void; weights: readonly WeighIn[]; children: ReactNode;
}) {
  useEffect(() => { if (viewRequest) setView(viewRequest.view); }, [viewRequest]);
  const [view, setView] = useState<ProgressView>("trends");
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [reading, setReading] = useState(false);
  const readingVersion = useRef(0);
  useEffect(() => { if (metricRequest) setView("trends"); }, [metricRequest]);
  useEffect(() => {
    if (!active) return;
    const version = ++readingVersion.current;
    setReading(true);
    void getMeasurements().then((rows) => {
      if (version === readingVersion.current) { setMeasurements(rows); setReady(true); setFailed(false); }
    }).catch(() => { if (version === readingVersion.current) setFailed(true); })
      .finally(() => { if (version === readingVersion.current) setReading(false); });
    return () => { readingVersion.current++; };
  }, [active, refreshKey, revision]);
  const latestWaist = measurements.filter((row) => row.site === "WAIST").at(-1);
  const latestWeight = weights.at(-1);
  function select(next: ProgressView, fromOverview = false) {
    setView(next);
    if (fromOverview) requestAnimationFrame(() => document.getElementById(next === "measurements" ? "measurements-heading" : "photos-heading")?.focus({ preventScroll: true }));
  }
  return <div className="body-progress-shell">
    <p className="meta" hidden={view !== "trends"}>Your records over time.</p>
    <div className="progress-overview" hidden={view !== "trends"} role="group" aria-label="Recorded progress overview">
      <button type="button" onClick={() => { onWeight(); select("trends"); }} aria-label="Open weight trends">
        <span className="tool-label">LAST WEIGHT</span><strong>{latestWeight ? `${latestWeight.weightLbs} lb` : "Not logged"}</strong>
        <span className="meta">{latestWeight ? new Date(latestWeight.recordedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Explore trends"}</span>
      </button>
      <button type="button" onClick={() => select("measurements", true)} aria-label="Open measurements">
        <span className="tool-label">WAIST</span><strong>{failed ? "Unavailable" : !ready ? "Reading…" : latestWaist ? `${latestWaist.inches} in` : "Not logged"}</strong>
        <span className="meta">{!failed && latestWaist ? progressDate(latestWaist.measuredOn) : "Tape measurements"}</span>
      </button>
      <button type="button" onClick={() => select("photos", true)} aria-label="Open progress photos">
        <span className="tool-label">PHOTOS</span><strong>Compare</strong><span className="meta">Your visual record</span>
      </button>
    </div>
    <nav className="progress-nav" aria-label="Progress views">
      {([['trends', 'TRENDS'], ['measurements', 'MEASUREMENTS'], ['photos', 'PHOTOS']] as const).map(([key, label]) =>
        <button key={key} type="button" aria-pressed={view === key} aria-controls={`progress-${key}`} onClick={() => select(key)}>{label}</button>)}
    </nav>
    <div id="progress-trends" hidden={view !== "trends"}>{children}</div>
    <section id="progress-measurements" hidden={view !== "measurements"} aria-labelledby="measurements-heading">
      <Measurements entries={measurements} ready={ready && !failed} reading={reading} failed={failed} onRefresh={() => setRevision((value) => value + 1)} />
    </section>
    <section id="progress-photos" hidden={view !== "photos"} aria-labelledby="photos-heading">
      <ProgressPhotos active={active && view === "photos"} />
    </section>
  </div>;
}

function Measurements({ entries, ready, reading, failed, onRefresh }: {
  entries: MeasurementEntry[]; ready: boolean; reading: boolean; failed: boolean; onRefresh: () => void;
}) {
  const [site, setSite] = useState<MeasurementSite>("WAIST");
  const [inches, setInches] = useState("");
  const [date, setDate] = useState(localProgressDate);
  const [editing, setEditing] = useState<MeasurementEntry | null>(null);
  const [correction, setCorrection] = useState({ inches: "", date: "" });
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [filter, setFilter] = useState<MeasurementSite | "ALL">("ALL");
  const restoreRetryFocus = useRef(false);
  // Focus after a save waits for busy=false to commit; a disabled input can't take focus,
  // and a frame callback can run before that commit on a cold page.
  const [focusAfterSave, setFocusAfterSave] = useState<string | null>(null);
  useEffect(() => {
    if (busy || !focusAfterSave) return;
    document.getElementById(focusAfterSave)?.focus();
    setFocusAfterSave(null);
  }, [busy, focusAfterSave]);
  useEffect(() => {
    if (!ready || reading || !restoreRetryFocus.current) return;
    restoreRetryFocus.current = false;
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) document.getElementById("measurements-heading")?.focus({ preventScroll: true });
    });
  }, [ready, reading]);
  useSessionDraft("body-measurements", inches !== "" || !!editing);
  async function save(correcting = false) {
    if (lock.current) return;
    const value = Number(correcting ? correction.inches : inches);
    if (!Number.isFinite(value) || value < MEASUREMENT_MIN_INCHES || value > MEASUREMENT_MAX_INCHES) {
      setError(`Enter a measurement from ${MEASUREMENT_MIN_INCHES} to ${MEASUREMENT_MAX_INCHES} inches.`); return;
    }
    lock.current = true; setBusy(true); setError(null); setReceipt(null);
    try {
      if (correcting && editing) {
        await correctMeasurement(editing.headEventId, { inches: value, measuredOn: correction.date });
        setReceipt(`${siteLabel(editing.site)} corrected to ${value} in · ${progressDate(correction.date)}. Original record retained.`);
        const root = editing.rootEventId; setEditing(null);
        setFocusAfterSave(`measurement-edit-${root}`);
      } else {
        await logMeasurement({ site, inches: value, measuredOn: date });
        setReceipt(`${siteLabel(site)} saved · ${value} in · ${progressDate(date)}.`);
        setInches("");
        setFocusAfterSave("measurement-inches");
      }
      onRefresh();
    } catch (cause) { setError(describeError(cause, "Could not save the measurement. Your input is still here.")); }
    finally { lock.current = false; setBusy(false); }
  }
  function edit(entry: MeasurementEntry) {
    setEditing(entry); setCorrection({ inches: String(entry.inches), date: entry.measuredOn }); setError(null);
    requestAnimationFrame(() => document.getElementById("measurement-correction-inches")?.focus());
  }
  const latest = new Map(entries.map((entry) => [entry.site, entry]));
  return <>
    <h3 id="measurements-heading" tabIndex={-1} className="progress-section-title">Measurements</h3>
    <p className="meta">Waist first. Other measurements are optional. Use the date you measured.</p>
    {failed && <div role="alert"><p>Could not read measurements. Your records are unchanged.</p><button className="btn-secondary" disabled={reading} onClick={() => { restoreRetryFocus.current = true; onRefresh(); }}>RETRY MEASUREMENTS</button></div>}
    {!ready && !failed && <p role="status" className="meta">Reading measurements…</p>}
    <form className="progress-form" onSubmit={(event) => { event.preventDefault(); void save(); }} aria-label="Record a measurement">
      <div className="field"><label htmlFor="measurement-site">Measurement</label><select id="measurement-site" className="input" value={site} disabled={busy} onChange={(event) => setSite(event.target.value as MeasurementSite)}>{MEASUREMENT_SITES.map((key) => <option value={key} key={key}>{siteLabel(key)}</option>)}</select></div>
      <div className="progress-fields">
        <div className="field"><label htmlFor="measurement-inches">Inches</label><input id="measurement-inches" className="input" type="number" inputMode="decimal" min={MEASUREMENT_MIN_INCHES} max={MEASUREMENT_MAX_INCHES} step="any" required value={inches} disabled={busy} onChange={(event) => setInches(event.target.value)} /></div>
        <div className="field"><label htmlFor="measurement-date">Measured on</label><input id="measurement-date" className="input" type="date" required max={localProgressDate()} value={date} disabled={busy} onChange={(event) => setDate(event.target.value)} /></div>
      </div>
      <button className="btn-primary" disabled={busy || !inches}>{busy ? "SAVING…" : "SAVE MEASUREMENT"}</button>
    </form>
    {receipt && <p role="status" className="progress-receipt">{receipt}</p>}
    {error && <p role="alert">{error}</p>}
    {editing && <form className="progress-form" aria-label={`Correct ${siteLabel(editing.site)} measurement`} onSubmit={(event) => { event.preventDefault(); void save(true); }}>
      <h4>Correct {siteLabel(editing.site)}</h4><p className="meta">Recorded {progressDate(editing.measuredOn)} · original {editing.originalInches} in. Corrections preserve the original.</p>
      <div className="progress-fields"><div className="field"><label htmlFor="measurement-correction-inches">Corrected inches</label><input id="measurement-correction-inches" className="input" type="number" inputMode="decimal" required min={MEASUREMENT_MIN_INCHES} max={MEASUREMENT_MAX_INCHES} step="any" value={correction.inches} disabled={busy} onChange={(event) => setCorrection({ ...correction, inches: event.target.value })} /></div>
        <div className="field"><label htmlFor="measurement-correction-date">Corrected measurement date</label><input id="measurement-correction-date" className="input" type="date" required max={localProgressDate()} value={correction.date} disabled={busy} onChange={(event) => setCorrection({ ...correction, date: event.target.value })} /></div></div>
      <div className="progress-actions"><button className="btn-primary" disabled={busy}>SAVE CORRECTION</button><button type="button" className="btn-secondary" disabled={busy} onClick={() => { const id = editing.rootEventId; setEditing(null); requestAnimationFrame(() => document.getElementById(`measurement-edit-${id}`)?.focus()); }}>CANCEL CORRECTION</button></div>
    </form>}
    {ready && <section className="measurement-overview" aria-label="Latest measurements">{MEASUREMENT_SITES.map((key) => {
      const entry = latest.get(key);
      const first = entries.find((row) => row.site === key);
      const delta = entry && first && entry.rootEventId !== first.rootEventId ? Math.round((entry.inches - first.inches) * 100) / 100 : null;
      return <div key={key}><span className="tool-label">{siteLabel(key)}</span><strong>{entry ? `${entry.inches} in` : "Not logged"}</strong>
        <p className="meta">{entry ? progressDate(entry.measuredOn) : key === "WAIST" ? "Start here when useful" : "Optional"}</p>
        {delta !== null && first && <p className="meta">{delta > 0 ? "+" : ""}{delta} in since {progressDate(first.measuredOn)}</p>}</div>;
    })}</section>}
    <h4>Measurement history</h4>
    <div className="field"><label htmlFor="measurement-filter">Show measurements</label><select id="measurement-filter" className="input" value={filter} onChange={(event) => setFilter(event.target.value as MeasurementSite | "ALL")}><option value="ALL">All measurements</option>{MEASUREMENT_SITES.map((key) => <option value={key} key={key}>{siteLabel(key)}</option>)}</select></div>
    {ready && <ul className="progress-records">{entries.filter((entry) => filter === "ALL" || entry.site === filter).slice().reverse().map((entry) => <li key={entry.rootEventId}>
      <div className="progress-record-heading"><div><p>{siteLabel(entry.site)} · <strong>{entry.inches} in</strong></p><p className="meta">{progressDate(entry.measuredOn)}</p></div><button id={`measurement-edit-${entry.rootEventId}`} className="btn-secondary" disabled={busy || editing !== null} aria-label={`Correct ${siteLabel(entry.site)} ${entry.inches} inches measured ${entry.measuredOn}`} onClick={() => edit(entry)}>CORRECT</button></div>
      {entry.correctionCount > 0 && <p className="meta">Corrected {entry.correctionCount}× · originally {entry.originalInches} in on {progressDate(entry.originalMeasuredOn)}</p>}
    </li>)}</ul>}
    {ready && !entries.some((entry) => filter === "ALL" || entry.site === filter) && <p className="meta">No measurements recorded here yet.</p>}
  </>;
}
