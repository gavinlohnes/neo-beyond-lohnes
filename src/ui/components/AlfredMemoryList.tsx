import { useEffect, useState } from "react";
import { forgetFact, getMemories, rememberFact } from "../../application/alfred/alfredMemory";
import { MEMORY_TOPICS, type AlfredMemory, type MemoryTopic } from "../../domain/alfred/types";
import "./alfred.css";

/**
 * ALFRED-006 (ideas 14 and 15 in full): what Alfred remembers, in MORE → MEMORY beside MEMORY-001's
 * prep and recovery notes — grouped as People, Money, Health, Home, Work and Other. Add a fact here
 * directly or by telling Alfred; Forget removes it.
 */
const LABEL: Record<MemoryTopic, string> = { PERSON: "People", MONEY: "Money and bills", HEALTH: "Health", HOME: "Home", WORK: "Work", OTHER: "Other" };

export function AlfredMemoryList({ active }: { active: boolean }) {
  const [facts, setFacts] = useState<AlfredMemory[] | null>(null);
  const [topic, setTopic] = useState<MemoryTopic>("PERSON");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = () => getMemories().then(setFacts).catch(() => setError("Couldn't read what Alfred remembers."));
  useEffect(() => { if (active) void load(); }, [active]);

  async function add() {
    if (!text.trim()) return;
    try { await rememberFact(text, topic); setText(""); await load(); } catch { setError("That didn't save. Nothing changed."); }
  }

  return <section className="alfred-memory-page" aria-labelledby="alfred-memory-heading">
    <h2 id="alfred-memory-heading" className="tool-label">ALFRED REMEMBERS</h2>
    <p className="meta">Facts you've asked Alfred to keep: birthdays, sizes, bills and their amounts. He reads them in every answer. A bill or birthday can also be a repeating reminder in COMMITMENTS.</p>
    {error && <p role="alert">{error}</p>}
    {facts && MEMORY_TOPICS.map((t) => {
      const group = facts.filter((f) => f.topic === t);
      return group.length ? <div key={t} className="alfred-memory" role="group" aria-label={LABEL[t]}>
        <p className="alfred-turn__who">{LABEL[t].toUpperCase()}</p>
        <ul>{group.map((m) => <li key={m.id}><span>{m.text}</span><button type="button" className="alfred-link" aria-label={`Forget: ${m.text}`} onClick={() => void forgetFact(m.id).then(load)}>Forget</button></li>)}</ul>
      </div> : null;
    })}
    {facts?.length === 0 && <p className="meta">Nothing yet.</p>}
    <form className="alfred-memory-add" onSubmit={(e) => { e.preventDefault(); void add(); }}>
      <label className="field">About<select className="input" value={topic} onChange={(e) => setTopic(e.target.value as MemoryTopic)}>{MEMORY_TOPICS.map((t) => <option key={t} value={t}>{LABEL[t]}</option>)}</select></label>
      <label className="field">Remember<input className="input" value={text} maxLength={280} placeholder="Car payment $412, due the 15th" onChange={(e) => setText(e.target.value)} /></label>
      <button type="submit" className="btn-secondary" disabled={!text.trim()}>REMEMBER</button>
    </form>
  </section>;
}
