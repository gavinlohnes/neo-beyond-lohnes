import { useEffect, useRef, useState } from "react";
import { getCaveFile, type CaveFile } from "../../../application/caveFile";
import { RotationMap } from "../review/RotationMap";
import "../review/wholePicture.css";
import { describeError } from "../../errorMessage";

/**
 * SUIT-ALIVE S7 — the cave, File. The case file (findings that met their own evidence floor) and
 * calibration (how firm each usual range is, and what BEYOND does not know). CAVE-DATA D3: the whole run
 * is YOUR ROTATION itself, the same view Whole Picture shows.
 * Depth stays in Personal Understanding, one tap away: one knowledge view, not two. Read-only.
 */
export function CaveFileView({ onOpenUnderstanding, onOpenWholePicture, onInspectDay, focusRotation = 0 }: {
  onOpenUnderstanding?: (() => void) | undefined;
  /** CAVE-DATA D3: Whole Picture stays in REVIEW, one tap from here. */
  onOpenWholePicture?: (() => void) | undefined;
  /** A day tapped in the rotation opens its records in DATA. */
  onInspectDay?: ((dayId: string) => void) | undefined;
  /** A new value scrolls to YOUR ROTATION once it is read (NUMBERS' YOUR ROTATION button). */
  focusRotation?: number;
}) {
  const [file, setFile] = useState<CaveFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  async function load() {
    const request = ++sequence.current;
    setError(null);
    try {
      const f = await getCaveFile();
      if (request === sequence.current) setFile(f);
    } catch (e) {
      if (request === sequence.current) setError(describeError(e, "Could not read the file."));
    }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!file || !focusRotation) return;
    // After the rotation has painted, so the scroll lands on it.
    const frame = requestAnimationFrame(() => {
      const rotation = document.querySelector<HTMLElement>('.cave section[aria-label="Your rotation"]');
      const heading = rotation?.querySelector<HTMLElement>("h2");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      rotation?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [file, focusRotation]);

  if (error) return <div role="alert"><p className="meta meta--error">{error} The file is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void load()}>RETRY</button></div>;
  if (!file) return <p className="meta" role="status">Reading…</p>;
  return <>
    <div className="file__head">
      <p className="file__stamp">CASE FILE</p>
      <p className="cave__sum">{file.daysOnFile} finished days on file in the last 56 · {file.runs.work} work run{file.runs.work === 1 ? "" : "s"} · {file.runs.off} stretch{file.runs.off === 1 ? "" : "es"} off.</p>
    </div>

    <section className="cave__block" aria-labelledby="file-findings">
      <h3 id="file-findings" className="cave__cap">Findings</h3>
      {file.findings.length ? <ul className="file__findings">{file.findings.map((f) => (
        <li key={f.key}><span className="file__label">{f.label}</span><span className="file__text">{f.text}</span><span className="file__src">{f.source}</span></li>
      ))}</ul> : <p className="cave__sum">Nothing has met its evidence floor yet. Findings appear as runs and lessons build up.</p>}
      <p className="meta">Patterns from your records, never causes or predictions.</p>
    </section>

    {/* CAVE-DATA D3: YOUR ROTATION lives here now — runs, patterns, flips and the next window. */}
    {file.rotation && <div className="whole-picture file__rotation"><RotationMap rows={file.rotation.rows} weekAhead={file.rotation.weekAhead} readAt={file.rotation.readAt}
      onInspect={(row) => { const id = row.dayIds[0]; if (id && onInspectDay) onInspectDay(id); }} /></div>}

    <section className="cave__block" aria-labelledby="file-cal">
      <h3 id="file-cal" className="cave__cap">Calibration</h3>
      <ul className="file__cal">{file.calibration.map((c) => (
        <li key={c.key} className={`file__cal-row file__cal-row--${c.firmness.toLowerCase()}`}>
          <span className="file__cal-name">{c.label}</span>
          <span className="file__firm">{c.firmness}</span>
          <span className="file__cal-days">{c.days} {c.key.startsWith("runs") ? "on file" : "days"} · needs {c.need}</span>
        </li>
      ))}</ul>
      <p className="meta">THIN: under the minimum, so BEYOND says it's still learning. BUILDING: enough to judge. FIRM: twice the minimum.</p>
      <h4 className="cave__cap">Not known</h4>
      <ul className="cave__facts">{file.notKnown.map((n) => <li key={n}>{n}</li>)}</ul>
    </section>

    {onOpenWholePicture && <button type="button" className="btn-secondary" onClick={onOpenWholePicture}>OPEN WHOLE PICTURE</button>}
    {onOpenUnderstanding && <button type="button" className="btn-secondary" onClick={onOpenUnderstanding}>OPEN PERSONAL UNDERSTANDING</button>}
  </>;
}
