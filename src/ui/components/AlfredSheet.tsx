import { useEffect, useRef, useState, type ReactElement } from "react";
import { LogSheet } from "./LogSheet";
import { buildAlfredContext } from "../../application/alfred/alfredContext";
// The Claude SDK loads only when Alfred is first used, so it stays out of BEYOND's start-up bundle.
import type { AlfredDepth, AlfredSession, AlfredTurn } from "../../application/alfred/alfredClient";
const loadClient = () => import("../../application/alfred/alfredClient");
import { confirmLabel, confirmProposal, describeConfirmError, describeProposal } from "../../application/alfred/alfredActions";
import { captureCommitFeedback } from "../feel/feedback";
import "./alfred.css";

/**
 * ALFRED-001 (owner ruling RULES-2026-10-31): the man in the chair. Say or type anything; Alfred
 * answers from BEYOND's records and proposes records as cards. SAVE runs BEYOND's own command; SKIP
 * leaves nothing. The Claude key is the owner's, kept on this phone (never in backups or the code).
 */
const KEY = "beyond.alfredKey";
export function readAlfredKey(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
function writeAlfredKey(value: string | null) { try { if (value) localStorage.setItem(KEY, value); else localStorage.removeItem(KEY); } catch { /* not kept */ } }

const STARTERS = ["How am I doing?", "What am I forgetting?", "What should I eat before my shift?"];
type Recognition = { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
function speechRecognition(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AlfredSheet({ open, onClose, onSaved, onOpenTrain }: { open: boolean; onClose: () => void; onSaved: () => void; onOpenTrain?: () => void }) {
  const [key, setKey] = useState<string | null>(() => readAlfredKey());
  const [draftKey, setDraftKey] = useState("");
  const [turns, setTurns] = useState<AlfredTurn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spent, setSpent] = useState(0);
  const [listening, setListening] = useState(false);
  const session = useRef<AlfredSession | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const end = useRef<HTMLDivElement>(null);

  // A fresh conversation (and a fresh read of the records) each time the sheet opens.
  useEffect(() => { if (open) { session.current = null; setTurns([]); setError(null); setSpent(0); } }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [turns, busy]);

  async function ask(question: string, depth: AlfredDepth = "everyday") {
    const q = question.trim();
    if (!q || busy || !key) return;
    setBusy(true); setError(null); setText("");
    const decisions = Object.fromEntries(turns.flatMap((t) => t.proposals ?? []).map((p) => [p.id, p.state]));
    setTurns((all) => [...all, { role: "user", text: q, ...(depth === "deep" ? { deep: true } : {}) }]);
    try {
      if (!session.current) { const { AlfredSession } = await loadClient(); session.current = new AlfredSession(key, await buildAlfredContext()); }
      const reply = await session.current.send(q, decisions, depth);
      setSpent((s) => s + reply.costUsd);
      setTurns((all) => [...all, { role: "alfred", text: reply.text, proposals: reply.proposals.map((p) => ({ ...p, state: "pending" as const })) }]);
    } catch (e) {
      setError((await loadClient()).describeAlfredError(e));
      setTurns((all) => all.slice(0, -1)); setText(q);
    } finally { setBusy(false); }
  }

  async function decide(turnIndex: number, id: string, save: boolean) {
    const turn = turns[turnIndex]; const card = turn?.proposals?.find((p) => p.id === id);
    if (!card || card.state !== "pending") return;
    const acknowledge = captureCommitFeedback();
    try {
      const result = save ? await confirmProposal(card.proposal) : {};
      if (save) { acknowledge("LIGHT"); onSaved(); }
      setTurns((all) => all.map((t, i) => i !== turnIndex ? t : { ...t, proposals: t.proposals!.map((p) => p.id === id ? { ...p, state: save ? "saved" : "skipped" } : p) }));
      if (result.open === "TRAIN" && onOpenTrain) { onClose(); onOpenTrain(); }
    } catch (e) { setError(describeConfirmError(e)); }
  }

  function talk() {
    const Ctor = speechRecognition();
    if (!Ctor) { setError("Voice isn't available in this browser. Type instead."); return; }
    if (listening) { recognition.current?.stop(); return; }
    const r = new Ctor(); r.lang = "en-US"; r.interimResults = true;
    r.onresult = (e) => setText(Array.from(e.results).map((res) => res[0]!.transcript).join(" "));
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    recognition.current = r; setListening(true); r.start();
  }

  return <LogSheet open={open} title="ALFRED" onClose={onClose} canClose={() => !busy}>
    {!key ? <div className="alfred-setup">
      <p>Alfred is BEYOND's man in the chair. He answers from your records and logs things for you; you confirm every record.</p>
      <p className="meta">He runs on Claude. Paste your key from console.anthropic.com → API Keys. It stays on this phone and is sent only to Anthropic.</p>
      <label className="field">Claude API key<input className="input" type="password" autoComplete="off" aria-label="Claude API key" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} /></label>
      <button type="button" className="btn-primary" disabled={!draftKey.trim().startsWith("sk-")} onClick={() => { writeAlfredKey(draftKey.trim()); setKey(draftKey.trim()); setDraftKey(""); }}>SAVE KEY</button>
    </div> : <>
      <div className="alfred-log" aria-live="polite">
        {turns.length === 0 && <div className="alfred-starters">
          <p className="meta">Say or type anything: what you ate, how you slept, something to remember. Or ask.</p>
          {STARTERS.map((q) => <button type="button" key={q} className="btn-secondary" disabled={busy} onClick={() => void ask(q)}>{q}</button>)}
        </div>}
        {turns.map((t, i) => <div key={i} className={`alfred-turn alfred-turn--${t.role}`}>
          <p className="alfred-turn__who">{t.role === "user" ? "YOU" : "ALFRED"}</p>
          {t.text && <AlfredText text={t.text} />}
          {t.proposals?.map((p) => <div key={p.id} className="alfred-card" role="group" aria-label={describeProposal(p.proposal)}>
            <p>{describeProposal(p.proposal)}</p>
            {p.state === "pending" ? <div className="alfred-card__row">
              <button type="button" className="btn-primary" onClick={() => void decide(i, p.id, true)}>{confirmLabel(p.proposal)}</button>
              <button type="button" className="btn-secondary" onClick={() => void decide(i, p.id, false)}>SKIP</button>
            </div> : <p className="meta">{p.state === "saved" ? (p.proposal.kind === "open_training" ? "Opened." : "Saved.") : "Skipped."}</p>}
          </div>)}
        </div>)}
        {busy && <p className="meta" role="status">Alfred is reading your records…</p>}
        <div ref={end} />
      </div>
      {error && <p role="alert">{error}</p>}
      <form className="alfred-input" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <textarea className="input" rows={2} aria-label="Message Alfred" placeholder="Ate a McGriddle, remind me to call CPAP after I wake…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="alfred-input__row">
          <button type="button" className="btn-secondary" aria-pressed={listening} onClick={talk}>{listening ? "STOP" : "TALK"}</button>
          {/* ALFRED-003: everyday answers are quick and cheap; this one question goes to the deeper model. */}
          <button type="button" className="btn-secondary" disabled={busy || !text.trim()} onClick={() => void ask(text, "deep")}>THINK HARDER</button>
          <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>SEND</button>
        </div>
      </form>
      <p className="meta alfred-foot">This conversation ≈ ${spent < 0.01 && spent > 0 ? spent.toFixed(3) : spent.toFixed(2)} · <button type="button" className="alfred-link" onClick={() => { writeAlfredKey(null); setKey(null); }}>Remove key</button></p>
    </>}
  </LogSheet>;
}

/**
 * ALFRED-001: Alfred writes light Markdown (bold, "- " lists, short headings). Rendered as React
 * elements, never as HTML, so nothing he writes can inject markup.
 */
function inline(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
}
export function AlfredText({ text }: { text: string }) {
  const blocks: ReactElement[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={blocks.length}>{list.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>); list = []; } };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const item = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/.exec(line);
    if (item) { list.push(item[1]!); continue; }
    flush();
    if (!line.trim()) continue;
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    blocks.push(heading ? <p key={blocks.length} className="alfred-turn__head">{inline(heading[1]!)}</p> : <p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="alfred-turn__text">{blocks}</div>;
}
