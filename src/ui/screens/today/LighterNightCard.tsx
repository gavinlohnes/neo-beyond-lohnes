import { useEffect, useRef, useState } from "react";
import { getLighterNight, type LighterNight } from "../../../application/lighterNightQueries";
import { dismissLighterNight, takeLighterNight, undoLighterFood, undoLighterHome, undoLighterLift } from "../../../application/lighterNightCommands";
import { captureCommitFeedback } from "../../feel/feedback";
import "./lighterNight.css";

/**
 * GRAYSON-LIGHTER-NIGHT-001 (Gavin, 2026-11-26): on the last night of a run, from his work-night wake until the shift
 * starts, one card under the Engine's recommendation: the SHORT lift, his work-night usuals first, and tonight's home
 * jobs moved to his first day off. TAKE IT does all three and folds the card to one line; each part keeps its own
 * UNDO. NOT TONIGHT hides it for the lived day. Calm: no colour, never says he's tired.
 *
 * It reads for itself and reports presence, so TODAY can count it in the attention budget (attentionPolicy.ts);
 * `tucked` keeps it mounted but hidden when the budget is full.
 */
export function LighterNightCard({ now, refreshKey, busy, tucked = false, onPresence, onChanged }: {
  now: number;
  refreshKey: unknown;
  busy: boolean;
  tucked?: boolean;
  onPresence?: (present: boolean) => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<LighterNight | null>(null);
  const [tick, setTick] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const [writingState, setWritingState] = useState(false);
  const foldedRef = useRef<HTMLParagraphElement>(null);
  const focusFolded = useRef(false);
  // The minute clock matters only to whether the shift has started.
  const minute = Math.floor(now / 60_000);

  useEffect(() => {
    let live = true;
    void getLighterNight(new Date()).then((v) => { if (live) setData(v); }, () => { if (live) setData(null); });
    return () => { live = false; };
  }, [refreshKey, tick, minute]);
  useEffect(() => { onPresence?.(!!data); }, [!!data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onPresence?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focusFolded.current && data?.view.kind === "TAKEN") { focusFolded.current = false; foldedRef.current?.focus(); }
  }, [data]);

  async function run(action: () => Promise<string | null | void>, fold = false) {
    const acknowledge = captureCommitFeedback();
    if (writing.current || busy) return;
    writing.current = true; setWritingState(true);
    setError(null);
    try {
      const said = await action();
      acknowledge("LIGHT");
      setNote(said ?? null);
      if (fold) focusFolded.current = true;
      setTick((n) => n + 1);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That didn't save. Try again.");
      setTick((n) => n + 1);
    } finally {
      writing.current = false; setWritingState(false);
    }
  }

  if (tucked) return null;
  const disabled = busy || writingState;
  if (!data) return note ? <p className="meta lighter-night__note" role="status">{note}</p> : null;
  const { view, plan } = data;

  if (view.kind === "TAKEN") {
    const undo = (part: "lift" | "food" | "home") => void run(async () => {
      if (part === "lift") {
        const { answerKept } = await undoLighterLift(plan.dayId);
        return answerKept ? "SHORT taken off. Your plan to train tonight stays; TRAIN changes it." : "Lift put back.";
      }
      if (part === "food") { undoLighterFood(plan.dayId); return "Fits now is back to its usual order."; }
      const { changedElsewhere } = await undoLighterHome(plan.dayId);
      return changedElsewhere.length
        ? `${changedElsewhere.join(", ")}: changed elsewhere, left as it is.`
        : "Home jobs are back on tonight.";
    });
    return (
      <section className="equipment-row lighter-night lighter-night--taken" aria-label="Lighter night">
        <p className="tool-label" style={{ marginBottom: 4 }}>LAST SHIFT</p>
        <p ref={foldedRef} tabIndex={-1} className="card-title" style={{ margin: 0 }} data-lighter-folded>{view.folded}</p>
        <ul className="lighter-night__parts">
          {(["lift", "food", "home"] as const).map((part) => view.parts[part] && (
            <li key={part} className="lighter-night__part">
              <span className="meta">{view.parts[part]}</span>
              <button type="button" className="btn-secondary" disabled={disabled} aria-label={`Undo ${part}`} onClick={() => undo(part)}>UNDO</button>
            </li>
          ))}
        </ul>
        {note && <p className="meta lighter-night__note" role="status">{note}</p>}
        {error && <p className="meta meta--error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="equipment-row lighter-night" aria-labelledby={`lighter-night-${plan.dayId}`}>
      <p className="tool-label" style={{ marginBottom: 4 }}>LAST SHIFT</p>
      <h2 id={`lighter-night-${plan.dayId}`} className="card-title" style={{ marginBottom: 2 }}>Lighter last night?</h2>
      <p className="meta" style={{ marginBottom: 8 }}>{view.why}</p>
      <ul className="lighter-night__lines">
        {(["lift", "food", "home"] as const).map((part) => view.lines[part] && <li key={part}>{view.lines[part]}</li>)}
      </ul>
      <div className="lighter-night__actions">
        <button type="button" className="btn-primary" disabled={disabled} onClick={() => void run(async () => { await takeLighterNight(plan, new Date()); }, true)}>TAKE IT</button>
        <button type="button" className="btn-secondary" disabled={disabled} onClick={() => void run(async () => { dismissLighterNight(plan.dayId); return null; })}>NOT TONIGHT</button>
      </div>
      {error && <p className="meta meta--error" role="alert">{error}</p>}
    </section>
  );
}
