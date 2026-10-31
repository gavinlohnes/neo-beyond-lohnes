import { useEffect, useRef, useState, type ReactElement } from "react";
import { LogSheet } from "./LogSheet";
import { buildPlanningContext, personalContextVersion, type PlanningContext, type ContextSource } from "../../application/alfred/personalContext";
import { confirmContextProposal } from "../../application/alfred/contextActions";
import { AlfredContextPanel } from "./AlfredContextPanel";
// The Claude SDK loads only when Alfred is first used, so it stays out of BEYOND's start-up bundle.
import type { AlfredDepth, AlfredSession, AlfredTurn } from "../../application/alfred/alfredClient";
const loadClient = () => import("../../application/alfred/alfredClient");
import { confirmLabel, describeConfirmError, describeProposal } from "../../application/alfred/alfredActions";
import { forgetFact, getMemories } from "../../application/alfred/alfredMemory";
import { addSpend, getMonthSpend } from "../../application/alfred/alfredSpend";
import type { AlfredMemory } from "../../domain/alfred/types";
import { captureCommitFeedback } from "../feel/feedback";
import "./alfred.css";

/**
 * ALFRED-001 (owner ruling RULES-2026-10-31): the man in the chair. Say or type anything; Alfred
 * answers from BEYOND's records and proposes records as cards. SAVE runs BEYOND's own command; SKIP
 * leaves nothing. The Claude key is the owner's, kept on this phone (never in backups or the code).
 */
const KEY = "beyond.alfredKey";
/** ALFRED-004 #11 "Ask about this": any screen opens Alfred with a question ready to send. */
export const ASK_ALFRED_EVENT = "beyond:ask-alfred";
export function askAlfred(question: string) { window.dispatchEvent(new CustomEvent<string>(ASK_ALFRED_EVENT, { detail: question })); }

export function readAlfredKey(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
function writeAlfredKey(value: string | null) { try { if (value) localStorage.setItem(KEY, value); else localStorage.removeItem(KEY); } catch { /* not kept */ } }

// ALFRED-004: the starters are the ideas the owner asked for; each is one question Alfred already knows how to answer.
const STARTERS: { label: string; ask?: string; fill?: string }[] = [
  { label: "Plan my next days off", ask: "Help me plan my next days off around what matters to me. Use recorded context, say what is unknown, and offer a draft I can choose from." },
  { label: "How am I doing?" },
  { label: "What am I forgetting?" },
  { label: "Weekly review", ask: "Give me my weekly review: my last 7 lived days against the 7 before (sleep against shifts, protein, water, training, urges and clean days). What slipped, and one thing to try this week." },
  { label: "Plan my flip", ask: "Plan my next flip between nights and days from my schedule: when to sleep, when to stop caffeine, when to eat and when to get light. Offer reminders for the parts I want." },
  { label: "Meal plan + grocery list", ask: "Plan my meals for the next 3 days around my shifts from my saved meals and protein target (pre-shift, mid-shift, after I wake), then a grocery list I can save as a note." },
  { label: "When did I last…?", fill: "When did I last " },
];
const SPEAK = "beyond.alfredSpeak";
const usd = (v: number) => (v > 0 && v < 0.01 ? v.toFixed(3) : v.toFixed(2));
const plain = (text: string) => text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/^\s*[-*•]\s+/gm, "");
type Recognition = { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
function speechRecognition(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AlfredSheet({ open, onClose, onSaved, onOpenTrain, onOpenRecord, draft }: { open: boolean; onClose: () => void; onSaved: () => void; onOpenTrain?: () => void; onOpenRecord?: ((source: ContextSource) => void) | undefined; draft?: { key: number; text: string } | undefined }) {
  const [key, setKey] = useState<string | null>(() => readAlfredKey());
  const [draftKey, setDraftKey] = useState("");
  const [included, setIncluded] = useState(false);
  const [snapshot, setSnapshot] = useState<PlanningContext | null>(null);
  const [selectedSource, setSelectedSource] = useState<ContextSource | null>(null);
  const [contextNotice, setContextNotice] = useState<string | null>(null);
  const lastContext = useRef<PlanningContext | null>(null), working = useRef(false);
  const [turns, setTurns] = useState<AlfredTurn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spent, setSpent] = useState(0);
  const [monthSpent, setMonthSpent] = useState(() => getMonthSpend());
  const [listening, setListening] = useState(false);
  // ALFRED-004 talk mode: Alfred reads his answers aloud, and a spoken message sends itself.
  const [speak, setSpeak] = useState(() => { try { return localStorage.getItem(SPEAK) === "1"; } catch { return false; } });
  const [memories, setMemories] = useState<AlfredMemory[] | null>(null);
  const heard = useRef("");
  const prefix = useRef("");
  const session = useRef<AlfredSession | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const end = useRef<HTMLDivElement>(null);

  // A fresh conversation (and a fresh read of the records) each time the sheet opens.
  useEffect(() => { if (open) { session.current = null; setTurns([]); setError(null); setSpent(0); setMonthSpent(getMonthSpend()); setIncluded(false); setSnapshot(null); setSelectedSource(null); lastContext.current = null; setContextNotice(null); } }, [open]);
  useEffect(() => { if (open && draft) setText(draft.text); }, [open, draft?.key]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [turns, busy]);

  async function ask(question: string, depth: AlfredDepth = "everyday") {
    const q = question.trim();
    if (!q || busy || working.current || !key) return;
    working.current = true;
    setBusy(true); setError(null); setText("");
    const decisions = Object.fromEntries(turns.flatMap((t) => t.proposals ?? []).map((p) => [p.id, p.state]));
    setTurns((all) => [...all, { role: "user", text: q, ...(depth === "deep" ? { deep: true } : {}) }]);
    let meteredSession: AlfredSession | null = null, usageBefore = 0;
    try {
      const next = await buildPlanningContext(included).catch(() => { throw new Error("CONTEXT_UNAVAILABLE"); });
      const changed = lastContext.current !== null && lastContext.current.personalVersion !== next.personalVersion;
      const policy = { includePersonal: included, assertFresh: async () => {
        if (await personalContextVersion(included) !== next.personalVersion) throw new Error("CONTEXT_CHANGED");
      } };
      if (changed) {
        session.current = null; setTurns([{ role: "user", text: q }]);
        setContextNotice("Personal context changed. This request starts a fresh model conversation. Earlier requests cannot be recalled.");
      }
      if (!session.current) { const { AlfredSession } = await loadClient(); session.current = new AlfredSession(key, next.text, policy); }
      else session.current.updateContext(next.text, policy);
      lastContext.current = next; setSnapshot(next);
      meteredSession = session.current; usageBefore = meteredSession.usageUsd;
      const reply = await session.current.send(q, decisions, depth);
      setTurns((all) => [...all, { role: "alfred", text: reply.text, sources: next.sources, context: { personalVersion: next.personalVersion, actionVersion: next.actionVersion, taskVersions: next.taskVersions }, proposals: reply.proposals.map((p) => ({ ...p, state: "pending" as const })) }]);
      if (speak && reply.text && typeof speechSynthesis !== "undefined") { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(plain(reply.text))); }
    } catch (e) {
      session.current = null;
      setError((await loadClient()).describeAlfredError(e));
      setTurns((all) => all.slice(0, -1)); setText(q);
    } finally {
      const charged = meteredSession ? meteredSession.usageUsd - usageBefore : 0;
      if (charged > 0) { setSpent((s) => s + charged); setMonthSpent(addSpend(charged)); }
      working.current = false; setBusy(false);
    }
  }

  async function decide(turnIndex: number, id: string, save: boolean) {
    const turn = turns[turnIndex]; const card = turn?.proposals?.find((p) => p.id === id);
    if (!turn || !card || card.state !== "pending" || working.current) return;
    working.current = true; setBusy(true);
    const acknowledge = captureCommitFeedback();
    try {
      if (save && !turn.context) throw new Error("CONTEXT_CHANGED");
      const result = save ? await confirmContextProposal(card.proposal, turn.context!, included) : {};
      if (save) { acknowledge("LIGHT"); onSaved(); if (memories) setMemories(await getMemories()); }
      setTurns((all) => all.map((t, i) => i !== turnIndex ? t : { ...t, proposals: t.proposals!.map((p) => p.id === id ? { ...p, state: save ? "saved" : "skipped" } : p) }));
      if (result.open === "TRAIN" && onOpenTrain) { onClose(); onOpenTrain(); }
    } catch (e) {
      setError(e instanceof Error && e.message === "CONTEXT_CHANGED" ? "Your context changed. Ask again before saving this proposal. Nothing changed." : describeConfirmError(e));
    } finally { working.current = false; setBusy(false); }
  }

  function talk(lead = "") {
    const Ctor = speechRecognition();
    if (!Ctor) { setError("Voice isn't available in this browser. Type instead."); return; }
    if (listening) { recognition.current?.stop(); return; }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    prefix.current = lead; heard.current = "";
    const r = new Ctor(); r.lang = "en-US"; r.interimResults = true;
    r.onresult = (e) => { heard.current = Array.from(e.results).map((res) => res[0]!.transcript).join(" "); setText(lead + heard.current); };
    r.onend = () => { setListening(false); if ((speak || lead) && heard.current.trim()) void ask(prefix.current + heard.current); };
    r.onerror = () => setListening(false);
    recognition.current = r; setListening(true); r.start();
  }

  function chooseContext(value: boolean) {
    recognition.current?.stop();
    setIncluded(value); session.current = null; lastContext.current = null;
    setTurns([]); setSnapshot(null); setSelectedSource(null);
    setContextNotice("Fresh conversation. Earlier requests sent to Claude cannot be recalled.");
  }
  async function forget(id: string) {
    if (working.current) return;
    working.current = true; setBusy(true); setError(null);
    try {
      await forgetFact(id); setMemories(await getMemories());
      session.current = null; lastContext.current = null; setTurns([]); setSnapshot(null); setSelectedSource(null);
      setContextNotice("Forgotten on this phone. Fresh conversation; earlier Claude requests and older backups cannot be recalled.");
    } catch { setError("That memory could not be forgotten. Try again."); }
    finally { working.current = false; setBusy(false); }
  }

  function toggleSpeak() {
    const next = !speak; setSpeak(next);
    try { localStorage.setItem(SPEAK, next ? "1" : "0"); } catch { /* not kept */ }
    if (!next && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  return <LogSheet open={open} title="ALFRED" onClose={onClose} canClose={() => !busy}>
    <AlfredContextPanel included={included} onIncluded={chooseContext} busy={busy} snapshot={snapshot} selected={selectedSource} onSelected={setSelectedSource} onOpenRecord={(s) => {
      if (s.kind === "ALFRED_MEMORY") void getMemories().then(setMemories).catch(() => setError("Alfred memory is unavailable."));
      else onOpenRecord?.(s);
    }} />
    {contextNotice && <p role="status" className="meta">{contextNotice}</p>}
    {!key ? <div className="alfred-setup">
      <p>Alfred is BEYOND's man in the chair. He answers from your records and logs things for you; you confirm every record.</p>
      <p className="meta">He runs on Claude. Paste your key from console.anthropic.com → API Keys. It stays on this phone and is sent only to Anthropic.</p>
      <label className="field">Claude API key<input className="input" type="password" autoComplete="off" aria-label="Claude API key" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} /></label>
      <button type="button" className="btn-primary" disabled={!draftKey.trim().startsWith("sk-")} onClick={() => { writeAlfredKey(draftKey.trim()); setKey(draftKey.trim()); setDraftKey(""); }}>SAVE KEY</button>
    </div> : <>
      <div className="alfred-log" aria-live="polite">
        {turns.length === 0 && <div className="alfred-starters">
          <p className="meta">Say or type anything: what you ate, how you slept, something to remember. Or ask.</p>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => talk("Shift debrief: ")}>DEBRIEF MY SHIFT</button>
          {STARTERS.map((q) => <button type="button" key={q.label} className="btn-secondary" disabled={busy} onClick={() => (q.fill ? setText(q.fill) : void ask(q.ask ?? q.label))}>{q.label}</button>)}
        </div>}
        {turns.map((t, i) => <div key={i} className={`alfred-turn alfred-turn--${t.role}`}>
          <p className="alfred-turn__who">{t.role === "user" ? (t.deep ? "YOU · THINK HARDER" : "YOU") : "ALFRED"}</p>
          {t.text && <AlfredText text={t.text} sources={t.sources} onSource={setSelectedSource} />}
          {t.proposals?.map((p) => <div key={p.id} className="alfred-card" role="group" aria-label={describeProposal(p.proposal)}>
            <p>{describeProposal(p.proposal)}</p>
            {p.state === "pending" ? <div className="alfred-card__row">
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void decide(i, p.id, true)}>{confirmLabel(p.proposal)}</button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => void decide(i, p.id, false)}>SKIP</button>
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
          <button type="button" className="btn-secondary" aria-pressed={listening} onClick={() => talk()}>{listening ? "STOP" : "TALK"}</button>
          {/* ALFRED-003: everyday answers are quick and cheap; this one question goes to the deeper model. */}
          <button type="button" className="btn-secondary" disabled={busy || !text.trim()} onClick={() => void ask(text, "deep")}>THINK HARDER</button>
          <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>SEND</button>
        </div>
      </form>
      {memories && <div className="alfred-memory" role="group" aria-label="What Alfred remembers">
        {memories.length === 0 ? <p className="meta">Nothing yet. Say "remember…" and confirm the card.</p>
          : <ul>{memories.map((m) => <li key={m.id}><span>{m.text}</span><button type="button" className="alfred-link" aria-label={`Forget: ${m.text}`} disabled={busy} onClick={() => void forget(m.id)}>Forget</button></li>)}</ul>}
      </div>}
      <p className="meta alfred-foot"><button type="button" className="alfred-link" aria-pressed={speak} onClick={toggleSpeak}>{speak ? "Speaking answers" : "Speak answers"}</button>{" · "}<button type="button" className="alfred-link" aria-expanded={!!memories} onClick={() => void (memories ? Promise.resolve(setMemories(null)) : getMemories().then(setMemories))}>Memory</button>{" · "}This conversation ≈ ${usd(spent)} · this month ≈ ${usd(monthSpent)} · <button type="button" className="alfred-link" onClick={() => { writeAlfredKey(null); setKey(null); }}>Remove key</button></p>
    </>}
  </LogSheet>;
}

/**
 * ALFRED-001: Alfred writes light Markdown (bold, "- " lists, short headings). Rendered as React
 * elements, never as HTML, so nothing he writes can inject markup.
 */
function inline(line: string, sources?: ContextSource[], onSource?: (source: ContextSource) => void) {
  return line.split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("[[")) {
      const source = sources?.find((s) => s.key === part.slice(2, -2));
      return source && onSource ? <button key={i} type="button" className="alfred-link" onClick={() => onSource(source)}>Source: {source.title}</button> : <span key={i}>[Source unavailable]</span>;
    }
    return part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : part; });
}
export function AlfredText({ text, sources, onSource }: { text: string; sources?: ContextSource[] | undefined; onSource?: ((source: ContextSource) => void) | undefined }) {
  const blocks: ReactElement[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={blocks.length}>{list.map((item, i) => <li key={i}>{inline(item, sources, onSource)}</li>)}</ul>); list = []; } };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const item = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/.exec(line);
    if (item) { list.push(item[1]!); continue; }
    flush();
    if (!line.trim()) continue;
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    blocks.push(heading ? <p key={blocks.length} className="alfred-turn__head">{inline(heading[1]!, sources, onSource)}</p> : <p key={blocks.length}>{inline(line, sources, onSource)}</p>);
  }
  flush();
  return <div className="alfred-turn__text">{blocks}</div>;
}
