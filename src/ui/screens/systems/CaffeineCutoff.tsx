import { useEffect, useState } from "react";
import { CAFFEINE_CUTOFF_HOURS, getCaffeineCutoffView, SOURCES as PLAN_SOURCES, type CaffeineCutoffView } from "../../../application/shiftSleepPlan";
import { SOURCES, SHORT_SLEEP_MINUTES, type CutoffSuggestion } from "../../../application/cutoffProposal";
import { CAFFEINE_CUTOFF_MAX_HOURS, CAFFEINE_CUTOFF_MIN_HOURS, declineCutoffSuggestion, setCaffeineCutoffHours } from "../../../application/sleepPlanSettings";

/**
 * C4.2a (Gavin, 2026-11-20, "Start it"): the caffeine cut-off as his own number. On the CAFFEINE card in ROUTE: where
 * the number comes from, CHANGE to set it, and DELTA's suggestion when his own work-day sleeps point to a longer one.
 * In DELTA's panel: the suggestion alone. Nothing changes until he taps SAVE or APPROVE; both offer UNDO, and NOT NOW
 * only quiets DELTA for a while. Shift-work guidance, never an Engine input.
 */
type Outcome = { kind: "SAVED"; hours: number; by: "OWNER" | "DELTA"; undo: () => Promise<boolean> } | { kind: "UNDONE" } | { kind: "DECLINED" } | { kind: "ERROR"; message: string };

const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
const night = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function describeCutoffSource(view: Pick<CaffeineCutoffView, "hours" | "setBy">): string {
  if (view.setBy === "DEFAULT") return `${view.hours} h before sleep: the minimum a sleep study supports (${PLAN_SOURCES.CAFFEINE.label}).`;
  const whose = view.setBy === "DELTA" ? "DELTA suggested it and you approved" : "you set it";
  const below = view.hours < CAFFEINE_CUTOFF_HOURS ? ` That's under the study's ${CAFFEINE_CUTOFF_HOURS} h minimum.` : "";
  return `${view.hours} h before sleep: ${whose}. The study's minimum is ${CAFFEINE_CUTOFF_HOURS} h.${below}`;
}

export function describeSuggestion(s: Extract<CutoffSuggestion, { kind: "PROPOSAL" }>): string {
  return `Of your last ${s.nights} sleeps after a shift (Garmin), ${s.shortNights} were under ${SHORT_SLEEP_MINUTES / 60} h; a typical one was ${hm(s.medianMinutes)}. `
    + `A longer gap is a cheap thing to try: in a sleep study, caffeine ${CAFFEINE_CUTOFF_HOURS} h before bed still cut measured sleep by over an hour (a ${SOURCES.CAFFEINE_STILL_CUTS.doseMg} mg dose).`;
}

export function describeConfidence(s: Extract<CutoffSuggestion, { kind: "PROPOSAL" }>): string {
  return `Confidence: ${s.confidence === "MODERATE" ? "moderate" : "low"}, from ${s.nights} nights. BEYOND doesn't record caffeine, so this is a pattern in your sleep, not proof caffeine is the cause.`;
}

export function CaffeineCutoff({ now, mode, onChanged }: { now?: Date | undefined; mode: "card" | "delta"; onChanged?: () => void }) {
  const [view, setView] = useState<CaffeineCutoffView | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [showNights, setShowNights] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void getCaffeineCutoffView(now).then((v) => { if (live) setView(v); }).catch(() => { if (live) setView(null); });
    return () => { live = false; };
  }, [now, reload]);
  if (!view) return null;
  const suggestion = view.suggestion.kind === "PROPOSAL" ? view.suggestion : null;
  if (mode === "delta" && !suggestion && outcome === null) return null;

  const run = async (fn: () => Promise<Outcome>) => {
    if (busy) return;
    setBusy(true);
    try { setOutcome(await fn()); setReload((r) => r + 1); onChanged?.(); }
    catch { setOutcome({ kind: "ERROR", message: "That couldn't be saved. Nothing changed." }); }
    finally { setBusy(false); }
  };
  const save = (hours: number, by: "OWNER" | "DELTA") => run(async () => {
    const result = await setCaffeineCutoffHours(hours, by);
    setEditing(null);
    return { kind: "SAVED", hours, by, undo: result.undo };
  });
  const undo = (fn: () => Promise<boolean>) => run(async () => ((await fn()) ? { kind: "UNDONE" } : { kind: "ERROR", message: "The cut-off was changed again since, so UNDO did nothing." }));
  const decline = () => run(async () => { await declineCutoffSuggestion(); return { kind: "DECLINED" }; });

  const status = outcome && outcome.kind !== "ERROR" && <div role="status" style={{ marginTop: 6 }}>
    {outcome.kind === "SAVED"
      ? <p className="meta" style={{ margin: 0 }}>{outcome.by === "DELTA" ? "Approved." : "Saved."} No substantial caffeine for {outcome.hours} h before sleep.{" "}
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void undo(outcome.undo)}>UNDO</button></p>
      : outcome.kind === "UNDONE" ? <p className="meta" style={{ margin: 0 }}>Undone. Your cut-off is back as it was.</p>
      : <p className="meta" style={{ margin: 0 }}>Kept {view.hours} h. DELTA won't suggest this again for two weeks.</p>}
  </div>;

  return <div data-caffeine-cutoff={mode} style={{ marginTop: 6 }}>
    {mode === "card" && <>
      <p className="meta" style={{ margin: 0 }} data-cutoff-source={view.setBy}>Cut-off: {describeCutoffSource(view)}</p>
      {editing === null
        ? outcome?.kind !== "SAVED" && <button type="button" className="btn-secondary" style={{ marginTop: 6 }} disabled={busy} aria-label="Change the caffeine cut-off" onClick={() => setEditing(view.hours)}>CHANGE</button>
        : <div role="group" aria-label="Change the caffeine cut-off" style={{ marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" className="btn-secondary" aria-label="One hour less" disabled={busy || editing <= CAFFEINE_CUTOFF_MIN_HOURS} onClick={() => setEditing(editing - 1)}>−</button>
              <span className="meta-strong" aria-live="polite" style={{ color: "var(--text-1)" }}>{editing} h before sleep</span>
              <button type="button" className="btn-secondary" aria-label="One hour more" disabled={busy || editing >= CAFFEINE_CUTOFF_MAX_HOURS} onClick={() => setEditing(editing + 1)}>+</button>
            </div>
            {editing < CAFFEINE_CUTOFF_HOURS && <p className="meta" style={{ margin: "4px 0 0" }}>Under the study's {CAFFEINE_CUTOFF_HOURS} h minimum.</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button type="button" className="btn-primary" disabled={busy || editing === view.hours} onClick={() => void save(editing, "OWNER")}>SAVE {editing} H</button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => setEditing(null)}>CANCEL</button>
            </div>
          </div>}
    </>}
    {suggestion && editing === null && !outcome && <div data-cutoff-suggestion role="group" aria-label="DELTA's suggestion" className={mode === "delta" ? "equipment-row" : undefined} style={{ marginTop: 8, ...(mode === "delta" ? { padding: "10px 12px" } : {}) }}>
      <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>DELTA SUGGESTS · caffeine cut-off {suggestion.hours} h before sleep (now {suggestion.currentHours} h)</p>
      <p className="meta" style={{ margin: "2px 0 0" }}>{describeSuggestion(suggestion)}</p>
      <p className="meta" style={{ margin: "2px 0 0" }}>{describeConfidence(suggestion)}</p>
      <p className="meta" style={{ margin: "2px 0 0" }}>Sources: <a href={SOURCES.SHORT_SLEEP.url} target="_blank" rel="noreferrer">{SOURCES.SHORT_SLEEP.label}</a>; <a href={SOURCES.CAFFEINE_STILL_CUTS.url} target="_blank" rel="noreferrer">{SOURCES.CAFFEINE_STILL_CUTS.label}</a></p>
      <button type="button" className="btn-secondary" style={{ marginTop: 6 }} aria-expanded={showNights} onClick={() => setShowNights((v) => !v)}>{showNights ? "HIDE NIGHTS" : `SHOW ${suggestion.nights} NIGHTS`}</button>
      {showNights && <ul className="meta" data-cutoff-nights style={{ margin: "4px 0 0", paddingLeft: 18 }}>
        {suggestion.evidence.map((n) => <li key={n.livedDayStart}>{night(n.livedDayStart)} shift: {hm(n.asleepMinutes)}{n.asleepMinutes < SHORT_SLEEP_MINUTES ? " (under 7 h)" : ""}</li>)}
      </ul>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void save(suggestion.hours, "DELTA")}>APPROVE {suggestion.hours} H</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void decline()}>NOT NOW</button>
      </div>
      <p className="meta" style={{ margin: "6px 0 0" }}>Your choice: nothing changes until you approve, and you can undo it.</p>
    </div>}
    {status}
    {outcome?.kind === "ERROR" && <p role="alert" className="meta" style={{ margin: "6px 0 0" }}>{outcome.message}</p>}
  </div>;
}
