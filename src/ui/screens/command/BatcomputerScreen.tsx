import { useEffect, useState } from "react";
import { describeTonightReading, getCaveTonight, type CaveTonight } from "../../../application/caveTonight";
import { getSchedulePattern } from "../../../application/queries";
import { shiftRun, type ShiftRun } from "../../../application/shiftRun";
import { getWholePicture, type WholePictureData } from "../../../application/wholePictureQueries";
import { askAlfred, PLAN_MY_WEEK_ASK } from "../../components/AlfredSheet";
import { describePlainRecommendationTitle } from "../today/recommendationCopy";
import "./batcomputer.css";

type CommandRead = { picture: WholePictureData; tonight: CaveTonight; run: ShiftRun | null };
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const runLabel = (run: ShiftRun | null) => !run ? "ROTATION POSITION UNKNOWN" : run.kind === "WORK" ? `NIGHT ${run.position} OF ${run.length}` : `DAY OFF ${run.position} OF ${run.length}`;

export function BatcomputerScreen({ active, onInspectSources, onReturnToField }: { active: boolean; onInspectSources: () => void; onReturnToField: () => void }) {
  const [read, setRead] = useState<CommandRead | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active) return;
    let current = true; const now = new Date(); setFailed(false);
    void Promise.all([getWholePicture(now), getCaveTonight(now), getSchedulePattern()]).then(([picture, tonight, schedule]) => {
      if (current) setRead({ picture, tonight, run: shiftRun(now, schedule) });
    }, () => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [active, retry]);
  if (failed) return <section className="batcomputer-state"><p className="batcomputer-kicker">BEYOND / COMMAND</p><h1>COMMAND could not read your records.</h1><p>Your data was not replaced or guessed.</p><button className="btn-primary" onClick={() => setRetry((n) => n + 1)}>TRY AGAIN</button></section>;
  if (!read) return <section className="batcomputer-state" aria-live="polite"><p className="batcomputer-kicker">BEYOND / COMMAND</p><h1>Reconstructing the rotation…</h1></section>;

  const rec = read.tonight.recommendation;
  const recTitle = rec ? describePlainRecommendationTitle(rec.kind, rec.title) : "No current Engine recommendation";
  const days = read.picture.weekAhead.days.slice(0, 7);
  const evidence = [...read.tonight.off, ...read.tonight.steady].slice(0, 4);
  const recordedDays = read.picture.rows.filter((row) => row.dayIds.length).length;
  return <section className="batcomputer" aria-labelledby="batcomputer-title">
    <div className="batcomputer-mobile" role="note"><p className="batcomputer-kicker">COMMAND / WIDE DISPLAY</p><h1>Deep work has a bigger surface.</h1><p>Rotation Command is deliberately built for a wider screen. FIELD stays fast here.</p><button className="btn-primary" onClick={onReturnToField}>RETURN TO FIELD</button></div>
    <div className="batcomputer-desktop">
      <header className="batcomputer-head"><div><p className="batcomputer-kicker">BEYOND / COMMAND</p><h1 id="batcomputer-title">ROTATION COMMAND</h1></div><div className="batcomputer-authority"><span>BEYOND / ENGINE</span><small>PRIMARY AUTHORITY</small></div><div className="batcomputer-authority is-alfred"><span>ALFRED / COACH</span><small>EXPLAINS + DRAFTS</small></div></header>
      <div className="batcomputer-grid">
        <aside className="batcomputer-rail" aria-label="Current rotation position"><p className="batcomputer-kicker">CURRENT POSITION</p><strong>{runLabel(read.run)}</strong><ol>{days.map((day, index) => <li key={day.date} className={index === 0 ? "is-now" : ""}><span>{index === 0 ? "NOW" : day.work === "WORK" ? "NEXT SHIFT" : "DAY OFF"}</span><small>{date(day.date)}</small></li>)}</ol></aside>
        <div className="batcomputer-main">
          <section className="batcomputer-call" aria-labelledby="engine-call"><div><p className="batcomputer-kicker">ENGINE / CURRENT CALL</p><h2 id="engine-call">{recTitle}</h2></div><span className={`batcomputer-status ${rec?.kind === "NO_ACTION_REQUIRED" ? "is-clear" : ""}`}>{rec?.kind.replaceAll("_", " ") ?? "NOT RECORDED"}</span><p>{rec?.rationale ?? "Check in on FIELD to produce a current deterministic recommendation."}</p><small>{rec ? `Issued ${new Date(rec.issuedAt).toLocaleString()} · ${read.tonight.decision ? `decision ${read.tonight.decision.toLowerCase().replaceAll("_", " ")}` : "decision open"}` : "No recommendation is not an all-clear claim."}</small></section>
          <section><div className="batcomputer-section-head"><div><p className="batcomputer-kicker">FORECAST / SAVED SCHEDULE + WEEK AHEAD</p><h2>YOUR ROTATION</h2></div><span>{days.length} DAY VIEW</span></div>{days.length ? <ol className="batcomputer-track">{days.map((day, index) => <li key={day.date} className={`${day.work === "WORK" ? "is-work" : "is-off"}${index === 0 ? " is-current" : ""}`}><i aria-hidden="true" /><strong>{day.work === "WORK" ? "SHIFT" : "OFF"}</strong><small>{date(day.date)}</small><em>{day.suggestedTemplate ? `Workout ${day.suggestedTemplate}` : day.afterShift ? "Post-shift window" : "No workout suggested"}</em></li>)}</ol> : <p className="batcomputer-empty">No schedule forecast is available. Unknown time is not called free.</p>}</section>
          <section><div className="batcomputer-section-head"><div><p className="batcomputer-kicker">RECORDED REALITY</p><h2>WHAT CHANGED</h2></div><span>NO SCORE</span></div>{read.tonight.since?.length ? <ul className="batcomputer-changes">{read.tonight.since.map((fact) => <li key={fact.key}><strong>{fact.key}</strong><span>{fact.text}</span><small>{fact.why}</small></li>)}</ul> : <p className="batcomputer-empty">No finished shift is recorded yet. Nothing inferred.</p>}</section>
        </div>
        <aside className="batcomputer-evidence"><p className="batcomputer-kicker">EVIDENCE / PERSONAL RANGE</p><h2>READINGS</h2>{evidence.length ? <ul>{evidence.map((item) => <li key={item.id}><strong>{item.id.toUpperCase()}</strong><span className={item.verdict === "INSIDE" ? "is-inside" : "is-outside"}>{item.verdict}</span><p>{describeTonightReading(item)}</p></li>)}</ul> : <p className="batcomputer-empty">No supported personal-range comparison yet.</p>}<div className="batcomputer-confidence"><strong>SOURCE COVERAGE</strong><p>{recordedDays} completed lived day{recordedDays === 1 ? "" : "s"} in view. {read.tonight.learning.length ? `${read.tonight.learning.length} signals still learning your range.` : "Ranges appear only where supported."}</p><small>Missing stays missing. Forecasts are not confirmed calendar time. Patterns are not causes.</small></div></aside>
      </div>
      <footer className="batcomputer-actions"><button onClick={() => askAlfred("Explain BEYOND's current Engine recommendation using its recorded evidence and limits. Do not create or rank a different recommendation.")}><span>01</span><strong>EXPLAIN</strong><small>Ask Alfred about the Engine call</small></button><button onClick={() => askAlfred(PLAN_MY_WEEK_ASK)}><span>02</span><strong>DRAFT THE WEEK</strong><small>Proposals only; save each choice</small></button><button onClick={onInspectSources}><span>03</span><strong>INSPECT SOURCES</strong><small>Open Whole Picture evidence</small></button><button onClick={onReturnToField}><span>04</span><strong>RETURN TO FIELD</strong><small>Back to TODAY</small></button></footer>
    </div>
  </section>;
}
