import { captureFeedback } from "../feel/feedback";
import { useEffect, useId, useRef, useState } from "react";
import { getMemoryWorkspace, recordMemory } from "../../application/memory";
import { MEMORY_KINDS, MEMORY_LABELS, type MemoryFact, type MemoryKind, type MemoryAction } from "../../domain/memory";
import { useSessionDraft } from "../sessionDrafts";
import { useUndoWindow } from "../hooks/useUndoWindow";
import { ConfirmBanner } from "./ConfirmBanner";
import { describeError } from "../errorMessage";
import "./memory.css";

type Scope = "ALL" | "PREP" | "RECOVERY";
type Draft = { factId: string; previous: string | null; dayId: string | null; kind: MemoryKind; statement: string };
const starters: Record<MemoryKind, string> = {
  PREP_FOOD: "Frozen meals are a good backup for me.", PREP_BOTTLE: "I prefer to fill my bottle before leaving for work.",
  PREP_OTHER: "Keeping my work essentials by the door helps me prepare.", RECOVERY: "I prefer quiet first after work.",
};
const date = (value: string) => new Date(value).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const includes = (scope: Scope, kind: MemoryKind) => scope === "ALL" || (scope === "RECOVERY" ? kind === "RECOVERY" : kind !== "RECOVERY");

/** Shared operator editor and contextual hints. Opening a view never records a fact. */
export function MemoryPanel({ active = true, scope = "ALL", contextual = false, blocked = false }: { active?: boolean; scope?: Scope; contextual?: boolean; blocked?: boolean }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getMemoryWorkspace>> | null>(null);
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0), [busy, setBusy] = useState(false), [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"ACTIVE" | "IRRELEVANT">("ACTIVE"), [limit, setLimit] = useState(5);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [undo, setUndo] = useUndoWindow<MemoryFact>();
  const writing = useRef(false), sequence = useRef(0), lifecycle = useRef(0);
  const uid = useId();
  useSessionDraft(`memory-${uid}`, draft !== null && draft.statement.length > 0);
  useEffect(() => { lifecycle.current++; return () => { lifecycle.current++; }; }, [active, scope]);
  useEffect(() => {
    if (!active) return;
    const update = () => setRefresh((n) => n + 1);
    window.addEventListener("beyond:memory-changed", update); window.addEventListener("focus", update);
    return () => { window.removeEventListener("beyond:memory-changed", update); window.removeEventListener("focus", update); };
  }, [active]);
  useEffect(() => {
    const request = ++sequence.current; let alive = true;
    if (!active) return;
    setData(null); setLoading(true); setError(null);
    void getMemoryWorkspace().then((next) => { if (alive && sequence.current === request) setData(next); })
      .catch((cause: unknown) => { if (alive && sequence.current === request) setError(describeError(cause, "Memory could not be read.")); })
      .finally(() => { if (alive && sequence.current === request) setLoading(false); });
    return () => { alive = false; sequence.current++; };
  }, [active, refresh]);
  const disabled = busy || blocked || loading || !data;
  function edit(fact?: MemoryFact) {
    setNotice(null); setError(null);
    setDraft({ factId: fact?.factId ?? crypto.randomUUID(), previous: fact?.id ?? null, dayId: data?.dayId ?? null,
      kind: fact?.kind ?? (scope === "RECOVERY" ? "RECOVERY" : "PREP_FOOD"), statement: fact?.statement ?? "" });
  }
  async function write(action: MemoryAction, fact?: MemoryFact) {
    if (writing.current || disabled) return;
    const subject = fact ?? draft;
    if (!subject) return;
    const dayId = fact ? data?.dayId : draft?.dayId;
    if (!dayId) { setError("Start a day before saving memory. Your draft is kept."); return; }
    writing.current = true; setBusy(true); setError(null); setNotice(null);
    const request = lifecycle.current;
    const acknowledge = captureFeedback(), receipt = { changed: false };
    try {
      const saved = await recordMemory({ action, dayId, factId: subject.factId,
        expectedPreviousId: fact?.id ?? draft!.previous,
        ...(fact ? {} : { kind: draft!.kind, statement: draft!.statement }) }, receipt);
      if (receipt.changed) acknowledge(action === "IRRELEVANT" ? "HEAVY" : "LIGHT");
      if (lifecycle.current !== request) return;
      if (!fact) setDraft(null);
      setUndo(action === "IRRELEVANT" ? saved : null);
      setNotice(action === "IRRELEVANT" ? "Marked no longer relevant. Kept in memory history." : action === "CONFIRMED" ? "Confirmed again." : action === "RESTORED" ? "Restored and confirmed." : "Memory saved.");
      window.dispatchEvent(new Event("beyond:memory-changed"));
    } catch (cause) { if (lifecycle.current === request) setError(describeError(cause, "Memory didn't save. Your draft is kept.")); }
    finally { writing.current = false; setBusy(false); }
  }
  if (!active) return null;
  const facts = data?.facts.filter((fact) => includes(scope, fact.kind) && fact.status === status) ?? [];
  return <section className="memory-panel" aria-label={contextual ? scope === "RECOVERY" ? "Your recovery memory" : "Your preparation memory" : "What BEYOND should remember"}>
    {!contextual && <><h2 className="tool-label">WHAT BEYOND SHOULD REMEMBER</h2><p>Your words. Prep and recovery only. Nothing here changes your plan or BEYOND’s advice.</p></>}
    {loading && <p role="status" className="meta">Reading memory…</p>}
    {error && <div><p role="alert">{error} Unreadable memory is not empty memory.</p><button type="button" className="btn-secondary" disabled={busy} onClick={() => setRefresh((n) => n + 1)}>RELOAD MEMORY LIST</button></div>}
    {notice && !undo && <p role="status" className="meta confirm-banner">{notice}</p>}
    {undo && <ConfirmBanner message="Marked no longer relevant." actionLabel="RESTORE & CONFIRM" disabled={disabled} onAction={() => void write("RESTORED", undo)} />}
    {data && !loading && <>
      {!contextual && <div className="memory-actions" role="group" aria-label="Memory status">
        {(["ACTIVE", "IRRELEVANT"] as const).map((value) => <button type="button" className="btn-secondary" key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setLimit(5); }}>{value === "ACTIVE" ? "ACTIVE" : "NO LONGER RELEVANT"}</button>)}
      </div>}
      {!facts.length && !contextual && <p className="meta">{status === "ACTIVE" ? "No active memories yet. Add only what you want BEYOND to remember." : "No memories marked irrelevant."}</p>}
      {facts.slice(0, limit).map((fact) => <article className="memory-fact" key={fact.factId}>
        <p className="memory-statement">{fact.statement}</p>
        <p className="meta">{MEMORY_LABELS[fact.kind]} · OPERATOR · confirmed {date(fact.lastConfirmedAt)}</p>
        <details><summary>Inspect or fix this memory</summary>
          <p className="meta">Source: OPERATOR · created {date(fact.createdAt)} · {fact.status === "ACTIVE" ? "Active" : "No longer relevant"}</p>
          <div className="memory-actions">
            <button type="button" className="btn-secondary" disabled={disabled || draft !== null} onClick={() => edit(fact)}>CORRECT MEMORY</button>
            <button type="button" className="btn-secondary" disabled={disabled} onClick={() => void write(fact.status === "ACTIVE" ? "CONFIRMED" : "RESTORED", fact)}>{fact.status === "ACTIVE" ? "CONFIRM AGAIN" : "RESTORE & CONFIRM"}</button>
            {fact.status === "ACTIVE" && <button type="button" className="btn-secondary" disabled={disabled} onClick={() => void write("IRRELEVANT", fact)}>NO LONGER RELEVANT</button>}
          </div>
          <MemoryHistory fact={fact} />
        </details>
      </article>)}
      {facts.length > limit && <button className="btn-secondary" type="button" onClick={() => setLimit((n) => n + 5)}>SHOW MORE MEMORIES</button>}
      {!draft && <button type="button" className="btn-secondary" disabled={disabled} onClick={() => edit()}>{contextual ? scope === "RECOVERY" ? "REMEMBER FOR RECOVERY" : "REMEMBER FOR PREPARATION" : "ADD MEMORY"}</button>}
      {!data.dayId && <p className="meta">Start a day to save changes. Your saved memories remain available.</p>}
    </>}
    {draft && <form className="memory-editor" aria-label="Memory editor" onSubmit={(event) => { event.preventDefault(); void write(draft.previous === null ? "CREATED" : "CORRECTED"); }}>
      <h3>{draft.previous === null ? "Add a memory" : "Correct your memory"}</h3>
      <label htmlFor={`${uid}-kind`}>Applies to</label>
      <select className="input" id={`${uid}-kind`} value={draft.kind} disabled={busy} onChange={(event) => setDraft({ ...draft, kind: event.target.value as MemoryKind })}>
        {MEMORY_KINDS.filter((kind) => includes(scope, kind)).map((kind) => <option value={kind} key={kind}>{MEMORY_LABELS[kind]}</option>)}
      </select>
      {draft.previous === null && <button type="button" className="btn-secondary" disabled={busy || Boolean(draft.statement)} onClick={() => setDraft({ ...draft, statement: starters[draft.kind] })}>USE AN EDITABLE STARTER</button>}
      <label htmlFor={`${uid}-statement`}>What should BEYOND remember?</label>
      <textarea className="input" id={`${uid}-statement`} maxLength={280} value={draft.statement} disabled={busy} onChange={(event) => setDraft({ ...draft, statement: event.target.value })} />
      <p className="meta">{draft.statement.length}/280 · Saving confirms these words. Closing keeps this draft in this session; reloading clears unsaved text.</p>
      <div className="memory-actions"><button className="btn-secondary" type="submit" disabled={disabled || !draft.statement.trim()}>SAVE & CONFIRM MEMORY</button>
        <button className="btn-secondary" type="button" disabled={busy} onClick={() => setDraft(null)}>DISCARD DRAFT</button></div>
      {data && draft.dayId !== data.dayId && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setDraft({ ...draft, dayId: data.dayId })}>USE CURRENT DAY — KEEP MY WORDS</button>}
      {data && draft.previous && data.facts.find((fact) => fact.factId === draft.factId)?.id !== draft.previous && <button type="button" className="btn-secondary" disabled={busy} onClick={() => { const saved = data.facts.find((fact) => fact.factId === draft.factId); if (saved) edit(saved); }}>REPLACE DRAFT WITH SAVED VERSION</button>}
    </form>}
  </section>;
}
function MemoryHistory({ fact }: { fact: MemoryFact }) {
  const [limit, setLimit] = useState(5);
  return <details><summary>Memory history ({fact.history.length})</summary>
    {[...fact.history].reverse().slice(0, limit).map((revision) => <div className="memory-history" key={revision.id}><p className="meta">{revision.action.toLowerCase()} · {date(revision.recordedAt)} · OPERATOR</p><p>{revision.statement}</p><p className="meta">{MEMORY_LABELS[revision.kind]} · {revision.status === "ACTIVE" ? "Active" : "No longer relevant"}</p></div>)}
    {fact.history.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 5)}>SHOW MORE HISTORY</button>}
  </details>;
}
