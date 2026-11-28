import { useEffect, useRef, useState } from "react";
import { getHomeMoveChoices, getHomeTwinView, proposeHomeTwin, saveHomeTwin, type HomeTwinView } from "../../../application/homeTwin";
import { gapLine, type TwinRow } from "../../../domain/workout/homeTwin";
import type { SwapCandidate } from "../../../domain/workout/workoutChanges";
import "./homeTwin.css";

/**
 * GRAYSON-HOME-STRETCH-001 slice C: a gym routine's HOME TWIN, in the routine editor. The line shows the twin it has;
 * BUILD TWIN proposes a bodyweight move per lift ("Barbell Bench Press → Incline Push-Up"), each changeable from the
 * home moves or droppable, and says plainly where there's no home move yet. SAVE TWIN saves it; nothing saves
 * without that tap. `update` opens straight into the review (UPDATE TWIN after an edit).
 */
type Pick = TwinRow & { dropped: boolean };

export function HomeTwin({ templateId, busy, refreshKey, openReview = false, onSaved }: {
  templateId: string;
  busy: boolean;
  refreshKey?: unknown;
  openReview?: boolean;
  onSaved?: (text: string) => void;
}) {
  const [view, setView] = useState<HomeTwinView | null>(null);
  const [rows, setRows] = useState<Pick[] | null>(null);
  const [moves, setMoves] = useState<SwapCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [tick, setTick] = useState(0);
  const headRef = useRef<HTMLHeadingElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    let live = true;
    void getHomeTwinView(templateId).then((v) => { if (live) setView(v); }, () => { if (live) setView(null); });
    return () => { live = false; };
  }, [templateId, refreshKey, tick]);
  useEffect(() => { if (rows) headRef.current?.focus(); }, [rows === null]); // eslint-disable-line react-hooks/exhaustive-deps

  async function build() {
    if (working || busy) return;
    setWorking(true); setError(null); setNote(null);
    try {
      const [proposal, choices] = await Promise.all([proposeHomeTwin(templateId), getHomeMoveChoices()]);
      setMoves(choices);
      setRows(proposal.map((r) => ({ ...r, dropped: false })));
    } catch (e) { setError(e instanceof Error && e.message ? e.message : "The twin couldn't be built."); }
    finally { setWorking(false); }
  }
  useEffect(() => { if (openReview && view && !opened.current) { opened.current = true; void build(); } }, [openReview, view]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!rows || working) return;
    setWorking(true); setError(null);
    try {
      const { text } = await saveHomeTwin(templateId, rows.filter((r) => !r.dropped));
      setRows(null); setNote(text); setTick((n) => n + 1);
      onSaved?.(text);
    } catch (e) { setError(e instanceof Error && e.message ? e.message.replace(/^[A-Z_]+: /, "") : "The twin didn't save. Nothing changed."); }
    finally { setWorking(false); }
  }

  if (!view) return null;
  const disabled = busy || working;

  if (rows) {
    const kept = rows.filter((r) => !r.dropped && r.to);
    return (
      <section className="home-twin home-twin--review" aria-labelledby={`home-twin-${templateId}`}>
        <h4 id={`home-twin-${templateId}`} ref={headRef} tabIndex={-1} className="card-title">Home twin of {view.routine.label}</h4>
        <p className="meta">One bodyweight move per lift, for the same muscles. Sets carry over. Change or drop any; nothing saves until SAVE TWIN.</p>
        <ol className="home-twin__rows">
          {rows.map((row, i) => (
            <li key={`${row.from.exerciseId}-${i}`} className={`home-twin__row${row.dropped ? " home-twin__row--dropped" : ""}`}>
              <p className="home-twin__line">{row.from.name} → {row.to ? `${row.to.name} · ${row.to.sets} × ${row.to.repRangeLow}–${row.to.repRangeHigh}` : <span className="meta">{gapLine(row)}</span>}</p>
              {row.to && !row.dropped && (
                <label className="home-twin__pick"><span className="visually-hidden">Home move for {row.from.name}</span>
                  <select aria-label={`Home move for ${row.from.name}`} value={row.to.exerciseId} disabled={disabled} onChange={(e) => {
                    const m = moves.find((c) => c.exerciseId === e.target.value);
                    if (!m) return;
                    setRows((all) => all!.map((r, j) => (j === i ? { ...r, to: { exerciseId: m.exerciseId, name: m.name, sets: r.from.sets, repRangeLow: m.repRangeLow, repRangeHigh: m.repRangeHigh, incrementLbs: 0 } } : r)));
                  }}>
                    {moves.map((m) => <option key={m.exerciseId} value={m.exerciseId}>{m.name} ({m.muscleGroup.toLowerCase()})</option>)}
                  </select>
                </label>
              )}
              {row.to && <button type="button" className="btn-secondary" disabled={disabled} aria-label={`${row.dropped ? "Keep" : "Drop"} ${row.from.name}'s home move`}
                onClick={() => setRows((all) => all!.map((r, j) => (j === i ? { ...r, dropped: !r.dropped } : r)))}>{row.dropped ? "KEEP" : "DROP"}</button>}
            </li>
          ))}
        </ol>
        {kept.length === 0 && <p className="meta">Keep at least one home move to save a twin.</p>}
        <div className="home-twin__actions">
          <button type="button" className="btn-primary" disabled={disabled || kept.length === 0} onClick={() => void save()}>SAVE TWIN</button>
          <button type="button" className="btn-secondary" disabled={working} onClick={() => setRows(null)}>CANCEL</button>
        </div>
        {error && <p className="meta meta--error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="home-twin" aria-label="Home twin">
      <p className="home-twin__line"><span className="tool-label">HOME TWIN</span>{" "}
        {view.twin ? <>{view.twin.name}{view.twin.linked && view.memberKey ? ` · your HOME ${view.memberKey}` : ""}: {view.twin.exercises.map((e) => e.name).join(", ")}</> : "None yet."}</p>
      <button type="button" className="btn-secondary" disabled={disabled} onClick={() => void build()}>{view.twin ? "UPDATE TWIN" : "BUILD TWIN"}</button>
      {note && <p className="meta" role="status">{note}</p>}
      {error && <p className="meta meta--error" role="alert">{error}</p>}
    </section>
  );
}

/** After he saves a change to a routine that has a twin: one line, and UPDATE TWIN opens the same review. */
export function HomeTwinNudge({ templateId, busy }: { templateId: string; busy: boolean }) {
  const [view, setView] = useState<HomeTwinView | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let live = true;
    setOpen(false);
    void getHomeTwinView(templateId).then((v) => { if (live) setView(v); }, () => { if (live) setView(null); });
    return () => { live = false; };
  }, [templateId]);
  if (!view?.twin) return null;
  if (open) return <HomeTwin templateId={templateId} busy={busy} openReview />;
  return <p className="meta home-twin__nudge">Your home twin still has the old lifts.{" "}
    <button type="button" className="btn-secondary" disabled={busy} onClick={() => setOpen(true)}>UPDATE TWIN</button></p>;
}
