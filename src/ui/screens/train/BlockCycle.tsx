import { useEffect, useId, useRef, useState } from "react";
import {
  acceptBlockSuggestion, changeBlock, endBlock, getBlockReview, getBlockView, nextBlock, resetBlockSettings, saveBlockSettings,
  setNormalThisWeek, startBlock, undoBlockChange, undoBlockSuggestion, type AcceptUndo, type BlockReviewView, type BlockView,
} from "../../../application/trainingBlock";
import { BLOCK_FOCUS_MAX, BLOCK_WEEKS_MAX, BLOCK_WEEKS_MIN, type BlockSettings } from "../../../domain/workout/trainingBlock";
import { TRAINING_FOCUS_OPTIONS } from "../../../domain/workout/graysonPlanDraft";
import { feedback } from "../../feel/feedback";
import { describeError } from "../../errorMessage";
import "./routineEditor.css";

/**
 * GRAYSON-BLOCK-CYCLE-001 (Gavin, 2026-11-25): TRAIN · PROGRESS's block. START A BLOCK (5 weeks, no focus, lighter last
 * week by default), the running block's line, and its review: lines with their numbers and 2 to 3 suggestions he
 * accepts or skips by tap. Every change has UNDO; every threshold is his (BLOCK SETTINGS).
 */
type Mode = "VIEW" | "SETUP" | "CHANGE" | "REVIEW" | "SETTINGS";

export function BlockCycle({ onChanged }: { onChanged?: () => void }) {
  const [view, setView] = useState<BlockView | null>(null);
  const [mode, setMode] = useState<Mode>("VIEW");
  const [saved, setSaved] = useState<{ text: string; eventId: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const reload = async () => setView(await getBlockView());
  useEffect(() => { void reload().catch((e) => setError(describeError(e, "Your block is unavailable."))); }, []);

  const act = async (text: string, fn: () => Promise<string | null>) => {
    setBusy(true); setError(null);
    try { const eventId = await fn(); feedback("MEDIUM"); setSaved({ text, eventId }); setMode("VIEW"); await reload(); onChanged?.(); }
    catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); }
    finally { setBusy(false); }
  };

  if (!view) return <p className="meta">{error ?? "Reading your block…"}</p>;
  if (mode === "SETUP" || mode === "CHANGE") return <BlockSetup view={view} changing={mode === "CHANGE"} busy={busy} error={error}
    onCancel={() => setMode("VIEW")}
    onSave={(input) => void act(mode === "CHANGE" ? "Block changed." : `Block saved: ${input.weeks} weeks.`, () => (mode === "CHANGE" ? changeBlock(input) : startBlock(input)))} />;
  if (mode === "SETTINGS") return <BlockSettingsSheet settings={view.settings} busy={busy} error={error} onCancel={() => setMode("VIEW")}
    onSave={(s) => void act("Block settings saved.", () => saveBlockSettings(s))} onReset={() => void act("Block settings are back to the defaults.", resetBlockSettings)} />;
  if (mode === "REVIEW") return <BlockReviewScreen onClose={() => { setMode("VIEW"); void reload(); }}
    onNext={() => void act("Next block saved.", () => nextBlock())} busy={busy} />;

  return <section className="card block-cycle" aria-labelledby={`${id}-title`} data-block-cycle>
    <h3 id={`${id}-title`} className="card-title">{view.line ?? "No block running"}</h3>
    {view.block ? <p className="meta">{view.block.weeks} weeks{view.block.focus.length ? ` · focus ${view.block.focus.join(", ")}` : " · no focus"}{view.block.lightLastWeek ? " · lighter last week" : ""}</p>
      : <p className="meta">A block is 4 to 6 weeks of your routines, an optional focus, and a review at the end you decide by tap.</p>}
    {view.lightToday && <p className="card-body">Light week: same weights, fewer sets.</p>}
    {saved && <p className="routine-saved" role="status">{saved.text}{" "}
      {saved.eventId && <button type="button" className="btn-secondary routine-inline" disabled={busy}
        onClick={() => void act("Undone.", async () => { await undoBlockChange(saved.eventId!); return null; })}>UNDO</button>}</p>}
    {error && <p className="meta meta--error" role="alert">{error}</p>}
    <div className="routine-list__acts">
      {!view.block || view.line === "Block finished" ? <button type="button" className="btn-secondary" disabled={busy} onClick={() => setMode("SETUP")}>START A BLOCK</button> : <>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => setMode("CHANGE")}>CHANGE</button>
        {view.lightToday && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void act("Full sets this week.", () => setNormalThisWeek())}>NORMAL THIS WEEK</button>}
        {!view.reviewReady && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void act("Block ended today.", () => endBlock())}>END EARLY</button>}
      </>}
      {view.block && view.reviewReady && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setMode("REVIEW")}>REVIEW THE BLOCK</button>}
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setMode("SETTINGS")}>BLOCK SETTINGS</button>
    </div>
  </section>;
}

function BlockSetup({ view, changing, busy, error, onSave, onCancel }: {
  view: BlockView; changing: boolean; busy: boolean; error: string | null;
  onSave: (input: { weeks: number; focus: string[]; lightLastWeek: boolean }) => void; onCancel: () => void;
}) {
  const [weeks, setWeeks] = useState(view.block?.weeks ?? 5);
  const [focus, setFocus] = useState<string[]>(view.block?.focus ?? []);
  const [light, setLight] = useState(view.block?.lightLastWeek ?? true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { headingRef.current?.focus(); }, []);
  return <section className="card block-cycle" aria-labelledby={`${id}-title`} data-block-setup>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">{changing ? "Change your block" : "Start a block"}</h3>
    {!changing && <p className="meta">It starts on the coming Monday.</p>}
    <fieldset className="block-cycle__set"><legend className="section-label">Length</legend>
      <div className="block-cycle__chips">{Array.from({ length: BLOCK_WEEKS_MAX - BLOCK_WEEKS_MIN + 1 }, (_, i) => BLOCK_WEEKS_MIN + i).map((n) =>
        <button key={n} type="button" className={`chip ${weeks === n ? "chip--selected" : ""}`} aria-pressed={weeks === n} disabled={busy} onClick={() => setWeeks(n)}>{n} WEEKS</button>)}</div>
    </fieldset>
    <fieldset className="block-cycle__set"><legend className="section-label">Focus (up to {BLOCK_FOCUS_MAX})</legend>
      <div className="block-cycle__chips">{TRAINING_FOCUS_OPTIONS.map((f) => { const on = focus.includes(f); return <button key={f} type="button" className={`chip ${on ? "chip--selected" : ""}`} aria-pressed={on}
        disabled={busy || (!on && focus.length >= BLOCK_FOCUS_MAX)} onClick={() => setFocus((all) => (on ? all.filter((x) => x !== f) : [...all, f]))}>{f.toUpperCase()}</button>; })}</div>
    </fieldset>
    <label className="routine-option"><input type="checkbox" checked={light} disabled={busy} onChange={(e) => setLight(e.target.checked)} /> Lighter last week: same weights, about a third fewer sets</label>
    {error && <p className="meta meta--error" role="alert">{error}</p>}
    <div className="routine-list__acts">
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => onSave({ weeks, focus, lightLastWeek: light })}>{changing ? "SAVE" : "START"}</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>CANCEL</button>
    </div>
  </section>;
}

function BlockSettingsSheet({ settings, busy, error, onSave, onReset, onCancel }: {
  settings: BlockSettings; busy: boolean; error: string | null; onSave: (s: BlockSettings) => void; onReset: () => void; onCancel: () => void;
}) {
  const [share, setShare] = useState(Math.round(settings.sessionsShare * 100));
  const [drop, setDrop] = useState(settings.weightDropPercent);
  const [lightPct, setLightPct] = useState(Math.round(settings.lightFraction * 100));
  const [ranges, setRanges] = useState<Record<string, [number, number]>>(structuredClone(settings.focusRanges));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { headingRef.current?.focus(); }, []);
  const num = (label: string, value: number, set: (n: number) => void, suffix: string) => <label className="routine-field">{label}
    <span className="block-cycle__num"><input type="number" inputMode="numeric" className="input" value={value} disabled={busy} onChange={(e) => set(Number(e.target.value))} /><span className="meta">{suffix}</span></span></label>;
  return <section className="card block-cycle" aria-labelledby={`${id}-title`} data-block-settings>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">Block settings</h3>
    {num("Suggest one fewer day when sessions done are under", share, setShare, "% of planned")}
    {num("A stalled lift's suggested weight drop", drop, setDrop, "%")}
    {num("Light week: sets left out", lightPct, setLightPct, "% (rounded down, at least 1 set stays)")}
    <fieldset className="block-cycle__set"><legend className="section-label">Focus ranges (direct sets a week)</legend>
      {TRAINING_FOCUS_OPTIONS.map((area) => { const r = ranges[area]; return <div key={area} className="block-cycle__range">
        <span>{area}</span>
        <input type="number" className="input" aria-label={`${area}: low`} value={r?.[0] ?? ""} placeholder="—" disabled={busy}
          onChange={(e) => setRanges((all) => { const next = { ...all }; const lo = e.target.value === "" ? null : Number(e.target.value); if (lo === null) delete next[area]; else next[area] = [lo, Math.max(lo, all[area]?.[1] ?? lo)]; return next; })} />
        <input type="number" className="input" aria-label={`${area}: high`} value={r?.[1] ?? ""} placeholder="—" disabled={busy || !r}
          onChange={(e) => setRanges((all) => ({ ...all, [area]: [all[area]![0], Number(e.target.value)] }))} />
      </div>; })}
    </fieldset>
    {error && <p className="meta meta--error" role="alert">{error}</p>}
    <div className="routine-list__acts">
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => onSave({ sessionsShare: share / 100, weightDropPercent: drop, lightFraction: lightPct / 100, focusRanges: ranges })}>SAVE</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={onReset}>RESET TO DEFAULTS</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>CANCEL</button>
    </div>
  </section>;
}

/** The block review: lines with their numbers, then each suggestion with ACCEPT or SKIP. Nothing changes unless he taps. */
export function BlockReviewScreen({ onClose, onNext, busy: outerBusy }: { onClose: () => void; onNext: () => void; busy: boolean }) {
  const [review, setReview] = useState<BlockReviewView | null>(null);
  const [decided, setDecided] = useState<Record<string, { state: "ACCEPTED" | "SKIPPED"; undo?: AcceptUndo }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { void getBlockReview().then((r) => { setReview(r); requestAnimationFrame(() => headingRef.current?.focus()); }).catch((e) => setError(describeError(e, "The review is unavailable."))); }, []);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); feedback("MEDIUM"); } catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); } finally { setBusy(false); }
  };
  if (!review) return <p className="meta">{error ?? "Preparing your block review…"}</p>;
  return <section className="card block-cycle block-review" aria-labelledby={`${id}-title`} data-block-review>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">Your block review</h3>
    <ul className="block-review__lines">{review.lines.map((l) => <li key={l.kind}>{l.text}</li>)}</ul>
    {review.suggestions.length === 0 ? <p className="card-body">No changes suggested. Your routines carry on as they are.</p>
      : <ol className="block-review__suggestions" aria-label="Suggested changes">{review.suggestions.map((s) => {
        const d = decided[s.id];
        return <li key={s.id} className="block-review__suggestion">
          <p className="card-body" style={{ margin: 0 }}>{s.text}</p>
          <p className="meta" style={{ margin: 0 }}>Why: {s.why}</p>
          {d ? <p className="routine-saved" role="status">{d.state === "ACCEPTED" ? "Accepted." : "Skipped."}{" "}
            {d.state === "ACCEPTED" && d.undo && d.undo.kind !== "NONE" && <button type="button" className="btn-secondary routine-inline" disabled={busy}
              onClick={() => void run(async () => { await undoBlockSuggestion(d.undo!); setDecided((all) => { const next = { ...all }; delete next[s.id]; return next; }); })}>UNDO</button>}</p>
            : <div className="routine-list__acts">
              <button type="button" className="btn-secondary" disabled={busy} aria-label={`Accept: ${s.text}`}
                onClick={() => void run(async () => { const undo = await acceptBlockSuggestion(s); setDecided((all) => ({ ...all, [s.id]: { state: "ACCEPTED", undo } })); })}>ACCEPT</button>
              <button type="button" className="btn-secondary" disabled={busy} aria-label={`Skip: ${s.text}`}
                onClick={() => setDecided((all) => ({ ...all, [s.id]: { state: "SKIPPED" } }))}>SKIP</button>
            </div>}
        </li>; })}</ol>}
    {error && <p className="meta meta--error" role="alert">{error}</p>}
    <div className="routine-list__acts">
      <button type="button" className="btn-secondary" disabled={busy || outerBusy} onClick={onNext}>NEXT BLOCK</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>BACK</button>
    </div>
  </section>;
}
