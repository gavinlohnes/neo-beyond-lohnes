import { useEffect, useState, useId, useRef } from "react";
import { convertLegacyMemory, stopUsingMemory, getMemories, rememberFact } from "../../application/alfred/alfredMemory";
import { MEMORY_TOPICS, type AlfredMemory, type MemoryTopic } from "../../domain/alfred/types";
import { useSessionDraft } from "../sessionDrafts";
import { describeError } from "../errorMessage";
import "./alfred.css";

const LABEL: Record<MemoryTopic, string> = { PERSON: "People", MONEY: "Money and bills", HEALTH: "Health", HOME: "Home", WORK: "Work", OTHER: "Other" };
/** Legacy is an explicit transition view. Canonical correction/history lives in MemoryPanel. */
export function AlfredMemoryList({ active }: { active: boolean }) {
  const [facts, setFacts] = useState<AlfredMemory[] | null>(null);
  const uid = useId(), working = useRef(false);
  const [topic, setTopic] = useState<MemoryTopic>("PERSON"), [text, setText] = useState("");
  const [preview, setPreview] = useState<{ source: AlfredMemory; text: string; topic: MemoryTopic } | null>(null);
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [limit, setLimit] = useState(5);
  useSessionDraft(`legacy-memory-${uid}`, Boolean(text || preview));
  const load = () => getMemories().then(setFacts).catch(() => setError("Couldn't read what Alfred remembers."));
  useEffect(() => {
    if (!active) return;
    void load(); const update = () => { void load(); };
    window.addEventListener("beyond:memory-changed", update);
    return () => window.removeEventListener("beyond:memory-changed", update);
  }, [active]);
  async function write(action: () => Promise<unknown>, message: string) {
    if (working.current) return;
    working.current = true; setBusy(true); setError(null); setNotice(null);
    try { await action(); setNotice(message); window.dispatchEvent(new Event("beyond:memory-changed")); await load(); }
    catch (cause) { setError(describeError(cause, "That didn't save. Your draft is kept.")); await load(); }
    finally { working.current = false; setBusy(false); }
  }
  if (!active) return null;
  const legacy = facts?.filter((f) => f.reference?.source === "ALFRED_MEMORY") ?? [];
  return <section className="alfred-memory-page" aria-labelledby={`${uid}-heading`}>
    <h2 id={`${uid}-heading`} className="tool-label">PERSONAL FACTS FOR ALFRED</h2>
    <p className="meta">New facts use the memory editor above for corrections, history and restore. Alfred reads active personal facts in every answer. Stop using keeps history; it does not erase records. A bill or birthday can also be a repeating reminder in COMMITMENTS.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {legacy.length > 0 && <details><summary>Original Alfred entries ({legacy.length})</summary>
      <p className="meta">These entries have no correction history. Forget deletes the local entry. Convert individually to keep future corrections; no automatic conversion.</p>
      {legacy.slice(0, limit).map((m) => <article key={m.id} className="alfred-memory"><p>{m.text}</p><p className="meta">{LABEL[m.topic]} · saved {new Date(m.savedAt).toLocaleString()}</p>
        <button type="button" className="btn-secondary" disabled={busy || !!preview} onClick={() => { setPreview({ source: m, text: m.text, topic: m.topic }); setError(null); }}>REVIEW CONVERSION</button>
        <button type="button" className="alfred-link" disabled={busy} aria-label={`Forget: ${m.text}`} onClick={() => void write(async () => { if (!m.reference) throw new Error("Source unavailable"); await stopUsingMemory(m.reference); }, "Forgotten locally. Old exports and earlier external requests cannot be recalled.")}>Forget</button>
      </article>)}
      {legacy.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 5)}>SHOW MORE ORIGINAL ENTRIES</button>}
    </details>}
    {preview && <form aria-label="Convert legacy memory" onSubmit={(event) => { event.preventDefault(); void write(async () => { await convertLegacyMemory(preview.source, preview.text, preview.topic); setPreview(null); }, "Converted. Original evidence retained; correction history is available in the memory editor."); }}>
      <h3>Review one conversion</h3><p>Source ID: {preview.source.id}</p><p>Originally saved: {preview.source.savedAt}</p><p>Original wording: {preview.source.text}</p>
      <label className="field">Destination topic<select className="input" value={preview.topic} disabled={busy} onChange={(e) => setPreview({ ...preview, topic: e.target.value as MemoryTopic })}>{MEMORY_TOPICS.map((t) => <option key={t} value={t}>{LABEL[t]}</option>)}</select></label>
      <label className="field">Destination wording<textarea className="input" value={preview.text} disabled={busy} onChange={(e) => setPreview({ ...preview, text: e.target.value })} /></label>
      <p className="meta">{preview.text.length}/280. Long originals stay intact until you choose shorter wording. No automatic truncation.</p>
      <p className="meta">Confirming keeps the original entry as local evidence and starts correction history now. Alfred receives only the active destination wording. Stop using keeps history. Old backups and previous external requests cannot be recalled. Restore new exports with this build or newer; older builds cannot interpret personal fact history.</p>
      <button type="submit" className="btn-secondary" disabled={busy || !preview.text.trim() || preview.text.trim().length > 280}>CONVERT & CONFIRM THIS ENTRY</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPreview(null)}>DISCARD CONVERSION DRAFT</button>
    </form>}
    <form className="alfred-memory-add" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void write(async () => { await rememberFact(text, topic); setText(""); }, "Personal fact saved. Inspect or correct it in the memory editor."); }}>
      <label className="field">About<select className="input" disabled={busy} value={topic} onChange={(e) => setTopic(e.target.value as MemoryTopic)}>{MEMORY_TOPICS.map((t) => <option key={t} value={t}>{LABEL[t]}</option>)}</select></label>
      <label className="field">Remember<input className="input" value={text} disabled={busy} maxLength={280} placeholder="Car payment $412, due the 15th" onChange={(e) => setText(e.target.value)} /></label>
      <button type="submit" className="btn-secondary" disabled={busy || !text.trim()}>REMEMBER</button>
    </form>
  </section>;
}
