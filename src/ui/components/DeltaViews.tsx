import { useEffect, useState } from "react";
import { getDeltaKnowledge, newLearnings, type DeltaKnowledge, type ExperimentSuggestion, type Learning, type Topic } from "../../application/delta";
import { startExperiment } from "../../application/tryExperiment";
import { hoursMinutes } from "../screens/health/healthFormat";
import { describeError } from "../errorMessage";
import { describeUnusual } from "../screens/today/unusualCopy";
import { describeGroup } from "../screens/today/SleepRhythm";
import { describeComparison } from "../screens/more/TagPatternsSection";

/**
 * DELTA-GROWS-001: DELTA's notebook (what it learned, and when) and its map (what it knows, what it is still
 * learning and what would teach it more). Calm, exact, counted. Patterns, not causes. Read only.
 */
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function describeLearning(l: Learning): string {
  if (l.kind === "SLEEP_WINDOW") return `Learned when you sleep. ${describeGroup(l.group)}`;
  if (l.kind === "UNUSUAL") { const c = describeUnusual(l.metric, l.reading); return `Noticed: ${c.headline} ${c.basis}`; }
  if (l.kind === "EXPERIMENT") return `Learned from your experiment "${l.what}" (${l.days} days): ${l.outcome}.${l.lesson ? ` Your lesson: ${l.lesson}` : ""}`;
  return `Learned what #${l.tag} lines up with, over ${l.taggedDays} tagged days. ${describeComparison(l.comparison)}`;
}

function describeTopic(t: Topic): string {
  if (t.state === "KNOWN") return `${t.have} ${t.unit}.`;
  if (t.state === "LEARNING") return `Still learning: ${t.have} of ${t.need} ${t.unit}.`;
  return `Not started. ${t.need} ${t.unit} would teach me.`;
}

export function useDeltaKnowledge(active: boolean, refresh = 0): DeltaKnowledge | null | "ERROR" {
  const [knowledge, setKnowledge] = useState<DeltaKnowledge | null | "ERROR">(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void getDeltaKnowledge().then((k) => { if (live) setKnowledge(k); }).catch(() => { if (live) setKnowledge("ERROR"); });
    return () => { live = false; };
  }, [active, refresh]);
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
    {knowledge.suggestion && <ExperimentOffer suggestion={knowledge.suggestion} />}
    <h2 className="tool-label">DELTA'S NOTEBOOK</h2>
    {knowledge.learnings.length
      ? <ol className="delta-notebook" aria-label="What DELTA learned, newest first">{knowledge.learnings.map((l) => <li key={l.id}><span className="meta">{l.kind === "UNUSUAL" ? `Noticed ${day(l.learnedOn)}:` : `Learned ${day(l.learnedOn)} · now:`}</span> {describeLearning(l)}</li>)}</ol>
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
      <p className="meta backup-due__text">{fresh.every((l) => l.kind === "UNUSUAL") ? "DELTA noticed something unusual for you" : "DELTA learned something new about you"}</p>
      <button type="button" className="btn-secondary backup-due__action" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "LESS" : "READ"}</button>
      <button type="button" className="backup-due__later" onClick={() => { try { localStorage.setItem(SEEN, fresh[0]!.learnedOn); } catch { /* shows again */ } setHidden(true); }}>GOT IT</button>
    </div>
    {open && fresh.map((l) => <p key={l.id} className="card-body" style={{ margin: "4px 0 0" }}>{describeLearning(l)}</p>)}
  </section>;
}

/**
 * DELTA-EXPERIMENTS: when a tag lines up with shorter next-day sleep, DELTA offers to test it. START writes a
 * personal experiment through the existing LOOP command (a "Try:" journal entry) — only on that tap.
 */
/** The counts behind the sleep figure itself, and what it was shorter than. */
export function describeOffer(s: ExperimentSuggestion): string {
  return `After ${s.withDays} days with #${s.tag}, the sleep you logged the next day was ${hoursMinutes(s.minutesLess)} shorter than after ${s.withoutDays} other noted days. That lines up; it doesn't prove a cause. Want to test it for ${s.days} days?`;
}

export function ExperimentOffer({ suggestion }: { suggestion: ExperimentSuggestion }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return <section className="equipment-row delta-offer" aria-label="DELTA suggests an experiment">
    <p className="tool-label" style={{ marginBottom: 4 }}>DELTA SUGGESTS A TEST</p>
    <p className="card-body" style={{ margin: "0 0 6px" }}>
      {describeOffer(suggestion)}
    </p>
    {message ? <p role="status" className="meta">{message}</p> : <button type="button" className="btn-secondary" disabled={busy} onClick={() => {
      setBusy(true);
      void startExperiment({ what: suggestion.what, days: suggestion.days, scope: "ALL", expect: "Longer sleep the next day" })
        .then(() => { setMessage(`Started: "${suggestion.what}" for ${suggestion.days} days. It's in your Journal; TODAY shows it while it runs.`); },
          (e) => setMessage(describeError(e, "The experiment couldn't be started.")))
        .finally(() => setBusy(false));
    }}>START {suggestion.days}-DAY TEST</button>}
  </section>;
}

/**
 * DELTA-NEXT 5: in the weekly review, what DELTA learned or noticed during that week — the counted notebook
 * lines dated inside it. "Nothing new this week" is a valid answer.
 */
export function DeltaWeek({ active, week }: { active: boolean; week: { start: string; end: string } }) {
  const knowledge = useDeltaKnowledge(active);
  if (!knowledge || knowledge === "ERROR") return null;
  const from = Date.parse(week.start), to = Date.parse(week.end);
  const lines = knowledge.learnings.filter((l) => { const at = Date.parse(l.learnedOn); return at >= from && at < to; });
  return <div className="weekly-dashboard__panel delta-week" aria-label="DELTA this week">
    <h3 className="tool-label">DELTA · WHAT CHANGED THIS WEEK</h3>
    {lines.length
      ? lines.slice(0, 3).map((l) => <p key={l.id} className="card-body" style={{ margin: "0 0 6px" }}>{describeLearning(l)}</p>)
      : <p className="meta">Nothing new this week. DELTA only speaks when your records show something.</p>}
    {lines.length > 3 && <p className="meta">{lines.length - 3} more in DELTA's notebook (Review → Personal Understanding).</p>}
  </div>;
}
