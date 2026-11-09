import { useEffect, useState } from "react";
import { getDeltaKnowledge, newLearnings, type DeltaKnowledge, type Learning, type Topic } from "../../application/delta";
import { describeGroup } from "../screens/today/SleepRhythm";
import { describeComparison } from "../screens/more/TagPatternsSection";

/**
 * DELTA-GROWS-001: DELTA's notebook (what it learned, and when) and its map (what it knows, what it is still
 * learning and what would teach it more). Calm, exact, counted. Patterns, not causes. Read only.
 */
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function describeLearning(l: Learning): string {
  if (l.kind === "SLEEP_WINDOW") return `Learned when you sleep. ${describeGroup(l.group)}`;
  return `Learned what #${l.tag} lines up with, over ${l.taggedDays} tagged days. ${describeComparison(l.comparison)}`;
}

function describeTopic(t: Topic): string {
  if (t.state === "KNOWN") return `${t.have} ${t.unit}.`;
  if (t.state === "LEARNING") return `Still learning: ${t.have} of ${t.need} ${t.unit}.`;
  return `Not started. ${t.need} ${t.unit} would teach me.`;
}

export function useDeltaKnowledge(active: boolean): DeltaKnowledge | null | "ERROR" {
  const [knowledge, setKnowledge] = useState<DeltaKnowledge | null | "ERROR">(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void getDeltaKnowledge().then((k) => { if (live) setKnowledge(k); }).catch(() => { if (live) setKnowledge("ERROR"); });
    return () => { live = false; };
  }, [active]);
  return knowledge;
}

export function DeltaPanel({ active }: { active: boolean }) {
  const knowledge = useDeltaKnowledge(active);
  if (knowledge === "ERROR") return <p className="meta">DELTA couldn't read your records. Nothing was changed.</p>;
  if (!knowledge) return <p className="meta" role="status">DELTA is reading…</p>;
  const known = knowledge.topics.filter((t) => t.state === "KNOWN").length;
  return <section className="delta-panel" aria-label="DELTA">
    <h2 className="tool-label">DELTA · WHAT I KNOW ABOUT YOU</h2>
    <p className="card-body">I know {known} of {knowledge.topics.length} things so far. I learn from what you log; I never guess.</p>
    <ul className="delta-topics" aria-label="What DELTA knows">
      {knowledge.topics.map((t) => <li key={t.id} data-state={t.state}><strong>{t.label}</strong><span className="meta"> · {describeTopic(t)}</span></li>)}
    </ul>
    <h2 className="tool-label">DELTA'S NOTEBOOK</h2>
    {knowledge.learnings.length
      ? <ol className="delta-notebook" aria-label="What DELTA learned, newest first">{knowledge.learnings.map((l) => <li key={l.id}><span className="meta">Learned {day(l.learnedOn)} · now:</span> {describeLearning(l)}</li>)}</ol>
      : <p className="meta">Nothing learned yet. Measured sleep, tags in your daily note and check-ins teach me.</p>}
    <p className="meta">Patterns from your records, not causes. Each date is the day enough evidence first existed; the numbers are as they stand now. Nothing here changes advice.</p>
  </section>;
}

const SEEN = "beyond:deltaSeen";
const readSeen = () => { try { return localStorage.getItem(SEEN); } catch { return null; } };

/** TODAY: one quiet line only on days DELTA learned something new. READ opens it inline; GOT IT hides it. */
export function DeltaNewsLine({ active }: { active: boolean }) {
  const knowledge = useDeltaKnowledge(active);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden || !knowledge || knowledge === "ERROR") return null;
  const since = readSeen() ?? new Date(Date.now() - 2 * 86_400_000).toISOString();
  const fresh = newLearnings(knowledge, since);
  if (!fresh.length) return null;
  return <section className="backup-due delta-news" aria-label="DELTA learned something new">
    <div className="backup-due__row">
      <p className="meta backup-due__text">DELTA learned something new about you</p>
      <button type="button" className="btn-secondary backup-due__action" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "LESS" : "READ"}</button>
      <button type="button" className="backup-due__later" onClick={() => { try { localStorage.setItem(SEEN, fresh[0]!.learnedOn); } catch { /* shows again */ } setHidden(true); }}>GOT IT</button>
    </div>
    {open && fresh.map((l) => <p key={l.id} className="card-body" style={{ margin: "4px 0 0" }}>{describeLearning(l)}</p>)}
  </section>;
}
