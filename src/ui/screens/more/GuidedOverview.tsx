import { useEffect, useMemo, useRef, useState } from "react";
import { GENERIC_MORE_STARTS, getGuidedMoreStarts, type MoreStarts, type MoreStart } from "../../../application/guidedMoreQueries";
import { getMemoryFacts, recordMemory } from "../../../application/memory";
import type { MemoryFact } from "../../../domain/memory";
import type { MemoryTopic } from "../../../domain/alfred/types";
import { describeError } from "../../errorMessage";

type SubjectId = "BEFORE_WORK" | "FOOD" | "TRAINING" | "DAYS_OFF" | "STRUGGLING" | "FREE";
type Subject = { id: SubjectId; label: string; question: string; why: string; topic: MemoryTopic };
const SUBJECTS: readonly Subject[] = [
  { id: "BEFORE_WORK", label: "BEFORE WORK", question: "What should I help you protect before a shift?", why: "This can make future preparation more relevant.", topic: "WORK" },
  { id: "FOOD", label: "FOOD", question: "What will you reliably eat during a difficult work week?", why: "Reliable food matters more than an ideal plan you will not use.", topic: "HEALTH" },
  { id: "TRAINING", label: "TRAINING", question: "What usually causes a planned workout not to happen?", why: "A realistic fallback starts with the obstacle you actually encounter.", topic: "HEALTH" },
  { id: "DAYS_OFF", label: "DAYS OFF", question: "What makes a day off feel well used to you?", why: "Time off should reflect what matters to you, not a generic productivity score.", topic: "OTHER" },
  { id: "STRUGGLING", label: "WHEN I AM STRUGGLING", question: "When you are overwhelmed, what should become smaller before it disappears?", why: "This gives Delta an explicit preference without deciding for you.", topic: "HEALTH" },
  { id: "FREE", label: "TELL DELTA SOMETHING", question: "What would you like Delta to understand?", why: "Use your own words. Nothing is saved until you confirm it.", topic: "OTHER" },
] as const;

export function GuidedOverview({ active, canOpenCapture, onOpen, onOpenMemory }: { active: boolean; canOpenCapture: boolean; onOpen: (destination: MoreStart["destination"]) => void; onOpenMemory: () => void }) {
  const [starts, setStarts] = useState<MoreStarts>(GENERIC_MORE_STARTS);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    async function read() {
      const request = ++sequence.current;
      setState("loading");
      setError("");
      try {
        const next = await getGuidedMoreStarts();
        if (disposed || request !== sequence.current) return;
        // Record-driven, not daily churn. Unchanged canonical context keeps its
        // existing values; reads never rotate prompts or disturb navigation drafts.
        setStarts((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
        setState("ready");
      } catch (cause) {
        if (disposed || request !== sequence.current) return;
        setError(describeError(cause, "Could not read starting context."));
        setState("error");
      }
    }
    void read();
    function onVisible() { if (document.visibilityState === "visible") void read(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => { disposed = true; document.removeEventListener("visibilitychange", onVisible); };
  }, [active, retry]);
  const visible = state === "ready" ? starts : GENERIC_MORE_STARTS;
  return <section className="guided-overview" aria-labelledby="guided-more-heading">
    <h2 id="guided-more-heading" className="guided-title">A place to start</h2>
    <GuidedTeaching active={active} onOpenMemory={onOpenMemory} />
    <h3 className="guided-paths-title">OTHER PLACES TO START</h3>
    <p className="meta">Optional paths—not recommendations.</p>
    <ol className="guided-starts">{visible.map((start) => <li key={start.id}>
      <h3>{start.title}</h3><p className="meta">{start.basis}</p>
      <button type="button" className="btn-secondary" disabled={start.destination === "CAPTURE" && !canOpenCapture} onClick={() => onOpen(start.destination)}>{start.action}</button>
      {start.destination === "CAPTURE" && !canOpenCapture && <p className="meta">Open Capture on TODAY.</p>}
    </li>)}</ol>
    {state === "loading" && <p role="status" className="meta">Reading context… Generic starts are available meanwhile.</p>}
    {state === "error" && <div><p role="alert" className="meta">{error} Context is unavailable; these are generic starts, not findings about your records.</p><button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY STARTING CONTEXT</button></div>}
    <details className="more-inspection"><summary>Why these starts?</summary><p className="meta">Fixed reflection and direction slots use counts of unresolved Capture notes, open Journal decisions, current-eligible commitments and active Missions. They change with relevant records, not the date. No due-date ranking or inference. Opening a path records nothing; TODAY keeps the Engine’s one primary recommendation.</p></details>
  </section>;
}

function GuidedTeaching({ active, onOpenMemory }: { active: boolean; onOpenMemory: () => void }) {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [subjectId, setSubjectId] = useState<SubjectId | null>(null);
  const [answers, setAnswers] = useState<Partial<Record<SubjectId, string>>>({});
  const [proposal, setProposal] = useState("");
  const [stage, setStage] = useState<"choose" | "answer" | "confirm" | "saved">("choose");
  const [postponed, setPostponed] = useState<SubjectId[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const subject = SUBJECTS.find((item) => item.id === subjectId) ?? null;
  const related = useMemo(() => subject ? facts.filter((fact) => fact.status === "ACTIVE" && fact.kind === "PERSONAL_FACT" && fact.topic === subject.topic).slice(0, 2) : [], [facts, subject]);

  async function readFacts() {
    const request = ++sequence.current;
    setState("loading"); setError("");
    try {
      const next = await getMemoryFacts();
      if (request !== sequence.current) return;
      setFacts(next); setState("ready");
    } catch (cause) {
      if (request !== sequence.current) return;
      setError(describeError(cause, "Confirmed memory could not be read.")); setState("error");
    }
  }
  // Returning from the canonical memory editor must re-read corrections,
  // retirements and additions; a prior successful read is never a cache contract.
  useEffect(() => {
    if (active) void readFacts();
    return () => { sequence.current++; };
  }, [active]);
  function choose(next: Subject) {
    setSubjectId(next.id); setProposal(""); setError(""); setStage("answer");
  }
  function review() {
    if (!subject) return;
    const answer = answers[subject.id]?.trim();
    if (!answer) return;
    setProposal(answer); setStage("confirm");
  }
  function notNow() {
    if (subjectId && !postponed.includes(subjectId)) setPostponed((current) => [...current, subjectId]);
    setSubjectId(null); setProposal(""); setStage("choose");
  }
  async function confirm() {
    if (!subject || !proposal.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await recordMemory({ factId: crypto.randomUUID(), expectedPreviousId: null, action: "CREATED", kind: "PERSONAL_FACT", topic: subject.topic, statement: proposal.trim(), via: "GUIDED" });
      window.dispatchEvent(new Event("beyond:memory-changed"));
      await readFacts(); setStage("saved");
    } catch (cause) { setError(describeError(cause, "That understanding was not saved. Your words are still here.")); }
    finally { setBusy(false); }
  }
  function another() { setSubjectId(null); setProposal(""); setStage("choose"); }

  return <section className="guided-teaching" aria-labelledby="teach-delta-heading">
    <p className="section-label">TEACH DELTA</p>
    <h3 id="teach-delta-heading">I can learn a little at a time.</h3>
    <p>Choose one part of life. I will ask one useful question, show you exactly what I understood, and wait for your confirmation.</p>
    <p className="meta">Optional. Leave whenever you want. This never blocks the rest of BEYOND or changes your plan.</p>
    {state === "loading" && <p role="status" className="meta">Reading what you have already confirmed…</p>}
    {state === "error" && <p role="alert">{error} You can still draft an answer, but saving is unavailable until memory reloads. <button type="button" className="btn-secondary" onClick={() => void readFacts()}>RETRY MEMORY</button></p>}
    {stage === "choose" && <div className="guided-subjects" role="group" aria-label="Choose what Delta should learn about">
      {SUBJECTS.map((item) => <button type="button" className="btn-secondary" key={item.id} onClick={() => choose(item)}>{item.label}{postponed.includes(item.id) ? " · NOT NOW" : ""}</button>)}
    </div>}
    {stage === "answer" && subject && <div className="guided-question">
      <p className="section-label">ONE QUESTION · {subject.label}</p>
      <h4>{subject.question}</h4>
      <p className="meta">Why I am asking: {subject.why}</p>
      {related.length > 0 && <details><summary>You already confirmed something related</summary>{related.map((fact) => <p key={fact.factId}>{fact.statement}<br /><span className="meta">OPERATOR · confirmed memory</span></p>)}</details>}
      <label htmlFor="guided-teaching-answer">Your answer</label>
      <textarea id="guided-teaching-answer" className="input" maxLength={280} autoFocus value={answers[subject.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [subject.id]: event.target.value }))} />
      <p className="meta">{(answers[subject.id] ?? "").length}/280 · Draft only. Not saved.</p>
      <div className="guided-actions"><button type="button" className="btn-secondary" disabled={!(answers[subject.id] ?? "").trim()} onClick={review}>REVIEW UNDERSTANDING</button><button type="button" className="btn-secondary" onClick={notNow}>NOT NOW</button></div>
    </div>}
    {stage === "confirm" && subject && <div className="guided-proposal">
      <p className="section-label">WHAT I UNDERSTOOD</p>
      <label htmlFor="guided-teaching-proposal">These are the exact words Delta will remember</label>
      <textarea id="guided-teaching-proposal" className="input" maxLength={280} value={proposal} disabled={busy} onChange={(event) => setProposal(event.target.value)} />
      <p className="meta">Source: your answer · proposed, not saved · available to existing personal-memory context only. It will not change Engine guidance or a plan.</p>
      {error && <p role="alert">{error}</p>}
      <div className="guided-actions"><button type="button" className="btn-secondary" disabled={busy || state !== "ready" || !proposal.trim()} onClick={() => void confirm()}>CONFIRM & REMEMBER</button><button type="button" className="btn-secondary" disabled={busy} onClick={() => setStage("answer")}>CHANGE ANSWER</button><button type="button" className="btn-secondary" disabled={busy} onClick={notNow}>NOT NOW</button></div>
    </div>}
    {stage === "saved" && subject && <div className="guided-saved" role="status">
      <p className="section-label">CONFIRMED UNDERSTANDING</p>
      <p>{proposal}</p>
      <p className="meta">OPERATOR · explicitly confirmed now · correction history retained. This does not automatically change a plan or recommendation.</p>
      <div className="guided-actions"><button type="button" className="btn-secondary" onClick={another}>TEACH DELTA ANOTHER THING</button><button type="button" className="btn-secondary" onClick={onOpenMemory}>REVIEW ALL MEMORY</button></div>
    </div>}
    {stage !== "saved" && <button type="button" className="guided-memory-link" onClick={onOpenMemory}>Review or correct what BEYOND remembers</button>}
  </section>;
}
