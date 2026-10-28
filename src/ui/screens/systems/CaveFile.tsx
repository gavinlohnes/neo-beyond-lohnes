import { useEffect, useRef, useState } from "react";
import { formatRunEnergy, formatRunSleep, getCaveFile, type CaveFile } from "../../../application/caveFile";
import { describeError } from "../../errorMessage";

/**
 * SUIT-ALIVE S7 — the cave, File. The case file (findings that met their own evidence floor),
 * calibration (how firm each usual range is, and what BEYOND does not know) and the whole run.
 * Depth stays in Personal Understanding, one tap away: one knowledge view, not two. Read-only.
 */
export function CaveFileView({ onOpenUnderstanding }: { onOpenUnderstanding?: (() => void) | undefined }) {
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

    <section className="cave__block" aria-labelledby="file-run">
      <h3 id="file-run" className="cave__cap">Whole run</h3>
      {file.wholeRun.length ? file.wholeRun.map((r) => (
        <div key={r.context} className="file__run-wrap" tabIndex={0} role="region" aria-label={`${r.context === "WORK" ? "Work runs" : "Stretches off"}, place by place`}>
          <table className="file__run">
            <thead><tr><th scope="col">{r.context === "WORK" ? "SHIFT" : "DAY OFF"}</th>{r.columns.map((c) => <th scope="col" key={c.position}>{r.context === "WORK" ? "S" : "D"}{c.position}</th>)}</tr></thead>
            <tbody>
              <tr><th scope="row">SLEEP</th>{r.columns.map((c) => <td key={c.position}>{formatRunSleep(c)}</td>)}</tr>
              <tr><th scope="row">ENERGY</th>{r.columns.map((c) => <td key={c.position}>{formatRunEnergy(c)}</td>)}</tr>
              <tr><th scope="row">TRAINED</th>{r.columns.map((c) => <td key={c.position}>{c.trained.days}/{c.trained.of}</td>)}</tr>
              <tr><th scope="row">RUNS</th>{r.columns.map((c) => <td key={c.position}>{c.runs}</td>)}</tr>
            </tbody>
          </table>
        </div>
      )) : <p className="cave__sum">No whole runs on file yet. Mark work days and days off as you go.</p>}
      <p className="meta">Averages need 3 measured days; below that the count shows in brackets.</p>
    </section>

    {onOpenUnderstanding && <button type="button" className="btn-secondary" onClick={onOpenUnderstanding}>OPEN PERSONAL UNDERSTANDING</button>}
  </>;
}
