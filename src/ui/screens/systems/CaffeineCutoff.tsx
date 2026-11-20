import { useEffect, useState } from "react";
import { CAFFEINE_CUTOFF_HOURS, getCaffeineCutoffView, SOURCES as PLAN_SOURCES, type CaffeineCutoffView } from "../../../application/shiftSleepPlan";
import { CAFFEINE_CUTOFF_MAX_HOURS, CAFFEINE_CUTOFF_MIN_HOURS, setCaffeineCutoffHours } from "../../../application/sleepPlanSettings";

/** C4.2a narrowed by Gavin: owner editing only; no sleep-based proposal, confidence or experiment. */
type Outcome = { kind: "SAVED"; hours: number; undo: () => Promise<boolean> } | { kind: "UNDONE" } | { kind: "ERROR"; message: string };

export function describeCutoffSource(view: Pick<CaffeineCutoffView, "hours" | "setBy">): string {
  const origin = view.setBy === "DEFAULT" ? "BEYOND's starting default" : "you set it";
  return `${view.hours} h before sleep: ${origin}. Drake et al. studied 400 mg of caffeine at bedtime, 3 h and 6 h before bed; sleep was disrupted even at 6 h. This supports general caution, not a proven safe cutoff or a personalized benefit. BEYOND does not record your actual caffeine timing, dose or adherence.`;
}

export function CaffeineCutoff({ onChanged }: { onChanged?: () => void }) {
  const [view, setView] = useState<CaffeineCutoffView | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void getCaffeineCutoffView().then((v) => { if (live) setView(v); }).catch(() => { if (live) setView(null); });
    return () => { live = false; };
  }, [reload]);
  if (!view) return null;
  const run = async (fn: () => Promise<Outcome>) => {
    if (busy) return;
    setBusy(true);
    try { setOutcome(await fn()); setReload(r => r + 1); onChanged?.(); }
    catch { setOutcome({ kind: "ERROR", message: "That couldn't be saved. Nothing changed." }); }
    finally { setBusy(false); }
  };
  const save = (hours: number) => run(async () => {
    const result = await setCaffeineCutoffHours(hours);
    setEditing(null);
    return { kind: "SAVED", hours, undo: result.undo };
  });
  const undo = (fn: () => Promise<boolean>) => run(async () => (await fn()) ? { kind: "UNDONE" } : { kind: "ERROR", message: "The cut-off was changed again since, so UNDO did nothing." });
  return <div data-caffeine-cutoff="card" style={{ marginTop: 6 }}>
    <p className="meta" style={{ margin: 0 }} data-cutoff-source={view.setBy}>Cut-off: {describeCutoffSource(view)} <a href={PLAN_SOURCES.CAFFEINE.url} target="_blank" rel="noreferrer">Study source</a>.</p>
    {editing === null
      ? outcome?.kind !== "SAVED" && <button type="button" className="btn-secondary" style={{ marginTop: 6 }} disabled={busy} aria-label="Change the caffeine cut-off" onClick={() => setEditing(view.hours)}>CHANGE</button>
      : <div role="group" aria-label="Change the caffeine cut-off" style={{ marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" className="btn-secondary" aria-label="One hour less" disabled={busy || editing <= CAFFEINE_CUTOFF_MIN_HOURS} onClick={() => setEditing(editing - 1)}>−</button>
            <span className="meta-strong" aria-live="polite" style={{ color: "var(--text-1)" }}>{editing} h before sleep</span>
            <button type="button" className="btn-secondary" aria-label="One hour more" disabled={busy || editing >= CAFFEINE_CUTOFF_MAX_HOURS} onClick={() => setEditing(editing + 1)}>+</button>
          </div>
          {editing < CAFFEINE_CUTOFF_HOURS && <p className="meta" style={{ margin: "4px 0 0" }}>Below BEYOND's {CAFFEINE_CUTOFF_HOURS} h starting default; not a demonstrated safe threshold.</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" className="btn-primary" disabled={busy || editing === view.hours} onClick={() => void save(editing)}>SAVE {editing} H</button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setEditing(null)}>CANCEL</button>
          </div>
        </div>}
    {outcome?.kind === "SAVED" && <div role="status" style={{ marginTop: 6 }}>
      <p className="meta" style={{ margin: 0 }}>Saved. Your caffeine cut-off setting is {outcome.hours} h before sleep.</p>
      <button type="button" className="btn-secondary" style={{ marginTop: 6 }} disabled={busy} onClick={() => void undo(outcome.undo)}>UNDO</button>
    </div>}
    {outcome?.kind === "UNDONE" && <p role="status" className="meta">Undone. Your cut-off is back as it was.</p>}
    {outcome?.kind === "ERROR" && <p role="alert" className="meta">{outcome.message}</p>}
  </div>;
}
