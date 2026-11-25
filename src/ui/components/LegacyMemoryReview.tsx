import { useEffect, useId, useRef, useState } from "react";
import { convertLegacyMemory, declineLegacyMemory, getUnreviewedLegacyMemories, keepLegacyMemories, MEMORY_MAX, restoreMemory, undoLegacyFix } from "../../application/alfred/alfredMemory";
import { MEMORY_TOPICS, type AlfredMemory, type MemoryTopic } from "../../domain/alfred/types";
import type { MemoryFact } from "../../domain/memory";
import { useUndoWindow } from "../hooks/useUndoWindow";
import { ConfirmBanner } from "./ConfirmBanner";
import { describeError } from "../errorMessage";
import { useSessionDraft } from "../sessionDrafts";

const TOPIC: Record<MemoryTopic, string> = { PERSON: "People", MONEY: "Money and bills", HEALTH: "Health", HOME: "Home", WORK: "Work", OTHER: "Other" };
const date = (v: string) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * GRAYSON-ONE-MEMORY-001 (C6.7): the old Delta entries, reviewed once so Delta has one memory. KEEP converts as written
 * (one tap), FIX rewords, DON'T KEEP stops it (restorable, never deleted); FIX and DON'T KEEP can be undone. KEEP THE
 * REST AS WRITTEN appears only once he has reached the end of the list. Nothing changes until he taps.
 */
export function LegacyMemoryReview({ active }: { active: boolean }) {
  const uid = useId();
  const [entries, setEntries] = useState<AlfredMemory[] | null>(null);
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(10);
  const [fix, setFix] = useState<{ source: AlfredMemory; text: string; topic: MemoryTopic } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [undo, setUndo] = useUndoWindow<{ kind: "FIX" | "DECLINE"; fact: MemoryFact }>();
  const [reachedEnd, setReachedEnd] = useState(false), [confirmRest, setConfirmRest] = useState(false);
  useSessionDraft(`legacy-review-${uid}`, Boolean(fix));
  const end = useRef<HTMLDivElement | null>(null), working = useRef(false);
  const load = () => getUnreviewedLegacyMemories().then((e) => { setEntries(e); }).catch(() => setError("Old entries couldn't be read. Nothing changed."));
  useEffect(() => {
    if (!active) return;
    void load();
    const update = () => { void load(); };
    window.addEventListener("beyond:memory-changed", update);
    return () => window.removeEventListener("beyond:memory-changed", update);
  }, [active]);
  const shown = entries?.slice(0, limit) ?? [];
  useEffect(() => {
    if (!open || !end.current || !entries || shown.length < entries.length) return;
    const observer = new IntersectionObserver((seen) => { if (seen.some((e) => e.isIntersecting)) setReachedEnd(true); });
    observer.observe(end.current);
    return () => observer.disconnect();
  }, [open, entries, shown.length]);
  async function run(action: () => Promise<unknown>, message: string, after?: (result: unknown) => void) {
    if (working.current) return;
    working.current = true; setBusy(true); setError(null); setNotice(null);
    try { const result = await action(); after?.(result); setNotice(message); window.dispatchEvent(new Event("beyond:memory-changed")); await load(); }
    catch (cause) { setError(describeError(cause, "That didn't save. Nothing changed.")); await load(); }
    finally { working.current = false; setBusy(false); }
  }
  if (!active || !entries) return null;
  if (!entries.length && !undo && !notice) return null;
  const fits = (m: AlfredMemory) => m.text.trim().length <= MEMORY_MAX;
  const rest = entries.filter(fits);
  return <section className="legacy-review" aria-labelledby={`${uid}-heading`} data-legacy-review>
    {entries.length > 0 && <div className="legacy-review__head">
      <p id={`${uid}-heading`} className="legacy-review__count">{entries.length} old Delta {entries.length === 1 ? "entry" : "entries"} to review</p>
      <button type="button" className="btn-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "CLOSE REVIEW" : "REVIEW"}</button>
    </div>}
    {error && <p role="alert">{error}</p>}
    {undo ? <ConfirmBanner message={undo.kind === "FIX" ? "Kept with your words." : "Not kept. It's under Stopped if you want it back."} actionLabel="UNDO" disabled={busy}
      onAction={() => void run(() => undo.kind === "FIX" ? undoLegacyFix(undo.fact) : restoreMemory({ source: "PERSONAL_FACT", id: undo.fact.factId, revision: undo.fact.id }), undo.kind === "FIX" ? "Back to the old words." : "Restored. Delta uses it again.", () => setUndo(null))} />
      : notice && <p role="status" className="meta">{notice}</p>}
    {open && entries.length > 0 && <>
      <p className="meta">Saved before Delta kept one memory. Keep what's still true. Nothing changes until you tap, and Delta keeps using these until you do.</p>
      <ol className="legacy-review__list">
        {shown.map((m) => {
          const fixing = fix?.source.id === m.id;
          return <li key={m.id} className="legacy-review__entry" data-legacy-id={m.id}>
            <p className="memory-statement">{m.text}</p>
            <p className="meta">{TOPIC[m.topic]} · saved {date(m.savedAt)} · Old Delta entry, not reviewed</p>
            {!fits(m) && <p className="meta">Too long to keep as written ({m.text.trim().length}/{MEMORY_MAX}). Fix it shorter, or don't keep it.</p>}
            {!fixing && <div className="memory-actions" role="group" aria-label={`Review: ${m.text.slice(0, 60)}`}>
              {fits(m) && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(() => convertLegacyMemory(m, m.text.trim(), m.topic), "Kept as written.")}>KEEP</button>}
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setFix({ source: m, text: m.text.trim(), topic: m.topic }); setError(null); }}>FIX</button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(() => declineLegacyMemory(m), "Not kept.", (f) => setUndo({ kind: "DECLINE", fact: f as MemoryFact }))}>DON'T KEEP</button>
            </div>}
            {fixing && fix && <form className="memory-editor" aria-label="Fix this old entry" onSubmit={(e) => { e.preventDefault(); void run(() => convertLegacyMemory(fix.source, fix.text, fix.topic), "Kept with your words.", (f) => { setFix(null); if (fits(fix.source)) setUndo({ kind: "FIX", fact: f as MemoryFact }); }); }}>
              <label>About<select className="input" value={fix.topic} disabled={busy} onChange={(e) => setFix({ ...fix, topic: e.target.value as MemoryTopic })}>{MEMORY_TOPICS.map((t) => <option key={t} value={t}>{TOPIC[t]}</option>)}</select></label>
              <label>Your words<textarea className="input" value={fix.text} disabled={busy} onChange={(e) => setFix({ ...fix, text: e.target.value })} /></label>
              <p className="meta">{fix.text.trim().length}/{MEMORY_MAX}. The old words stay as evidence; nothing is cut for you.</p>
              <div className="memory-actions">
                <button type="submit" className="btn-secondary" disabled={busy || !fix.text.trim() || fix.text.trim().length > MEMORY_MAX}>SAVE</button>
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => setFix(null)}>CANCEL</button>
              </div>
            </form>}
          </li>;
        })}
      </ol>
      {entries.length > shown.length && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 10)}>SHOW MORE OLD ENTRIES</button>}
      <div ref={end} aria-hidden="true" />
      {reachedEnd && shown.length === entries.length && rest.length > 0 && (confirmRest
        ? <div className="memory-actions" role="group" aria-label="Keep the rest">
          <p className="meta">Keep {rest.length} {rest.length === 1 ? "entry" : "entries"} as written?</p>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(() => keepLegacyMemories(rest), `Kept ${rest.length} as written.`, () => setConfirmRest(false))}>YES, KEEP THEM</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmRest(false)}>NOT YET</button>
        </div>
        : <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmRest(true)}>KEEP THE REST AS WRITTEN</button>)}
    </>}
  </section>;
}
