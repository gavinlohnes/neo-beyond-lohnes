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
    <DeltaAhead active={active} />
    {knowledge.needle.ready && <section className="delta-needle" aria-label="What lines up with your good weeks">
      <h2 className="tool-label">DELTA · WHAT LINES UP WITH YOUR GOOD WEEKS</h2>
      <p className="meta">Your good weeks are your top third by check-in energy ({knowledge.needle.goodWeeks} of {knowledge.needle.judgedWeeks} weeks with 3+ check-ins).</p>
      {knowledge.needle.habits.length
        ? knowledge.needle.habits.map((h) => <p key={h.habit} className="card-body" style={{ margin: "0 0 6px" }}>{describeNeedle(h)}</p>)
        : <p className="meta">Nothing you tag or train differs much between your good weeks and the rest yet.</p>}
      <p className="meta">Patterns across your weeks, not proof. Ranked by the size of the difference. Nothing here changes advice.</p>
    </section>}
    <h2 className="tool-label">DELTA'S NOTEBOOK</h2>
    {knowledge.learnings.length
      ? <ol className="delta-notebook" aria-label="What DELTA learned, newest first">{knowledge.learnings.map((l) => <li key={l.id}><span className="meta">{l.kind === "UNUSUAL" ? `Noticed ${day(l.learnedOn)} · now:` : `Learned ${day(l.learnedOn)} · now:`}</span> {describeLearning(l)}</li>)}</ol>
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


const perWeek = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
export function describeNeedle(h: { habit: string; unit: "DAYS_PER_WEEK" | "SHARE_OF_NOTED_DAYS"; good: number; other: number; goodWeeks: number; otherWeeks: number }): string {
  if (h.unit === "DAYS_PER_WEEK") return `Training: ${perWeek(h.good)} days a week in your good weeks (${h.goodWeeks}), against ${perWeek(h.other)} in your other weeks (${h.otherWeeks}).`;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return `${h.habit}: on ${pct(h.good)} of your noted days in good weeks (${h.goodWeeks} weeks with notes), against ${pct(h.other)} in your other weeks (${h.otherWeeks}).`;
}

/** The counts behind the sleep figure itself, and what it was shorter than. */
export function describeOffer(s: ExperimentSuggestion): string {
  return `After ${s.withDays} days with #${s.tag}, the sleep you logged the next day was ${hoursMinutes(s.minutesLess)} shorter than after ${s.withoutDays} other noted days. That lines up; it doesn't prove a cause. Want to test it for ${s.days} days?`;
}

/**
 * DELTA-EXPERIMENTS: when a tag lines up with shorter next-day sleep, DELTA offers to test it. START writes a
 * personal experiment through the existing LOOP command (a "Try:" journal entry) — only on that tap.
 */
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

/**
 * DELTA-NEXT 2 + 3: looking ahead. The next run forecast from your saved schedule, what your past runs looked
 * like at each place (shift 1, shift 2…), and your best window on days off (where you trained most). A forecast
 * and your own records — it suggests, it never schedules, and it never changes advice. Reuses ROTATION-001.
 */
export function DeltaAhead({ active }: { active: boolean }) {
  const [ahead, setAhead] = useState<{ lines: string[] } | null | "ERROR">(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void (async () => {
      const [{ getWholePicture }, rotation, copy] = await Promise.all([import("../../application/wholePictureQueries"), import("../../application/rotationProjection"), import("../screens/review/rotationCopy")]);
      const picture = await getWholePicture();
      const positions = rotation.runPositions(picture.rows);
      const next = rotation.nextForecastRun(picture.weekAhead.days), off = rotation.nextDaysOff(picture.weekAhead.days);
      const lines: string[] = [];
      const when = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      if (next?.work === "WORK") {
        lines.push(`Your next work run is forecast from ${when(next.from)} · ${next.days} ${next.days === 1 ? "shift" : "shifts"}.`);
        for (const place of positions.filter((p) => p.context === "WORK").slice(0, Math.min(next.days, 3))) lines.push(`Past runs, ${copy.positionName(place).toLowerCase()}: ${copy.describePosition(place)}.`);
      }
      if (off) {
        lines.push(off.now ? "You're in days off now." : `Days off are forecast from ${when(off.from)} · ${off.days} ${off.days === 1 ? "day" : "days"}.`);
        const best = copy.mostTrainedDayOff(positions);
        if (best) lines.push(`Your best training window on days off has been ${copy.positionName(best).toLowerCase()}: trained on ${best.trained.days} of ${best.trained.of}.`);
      }
      if (live) setAhead({ lines });
    })().catch(() => { if (live) setAhead("ERROR"); });
    return () => { live = false; };
  }, [active]);
  if (ahead === "ERROR") return <p className="meta">DELTA couldn't read your rotation. Nothing was changed.</p>;
  if (!ahead) return null;
  return <section className="delta-ahead" aria-label="DELTA looking ahead">
    <h2 className="tool-label">DELTA · LOOKING AHEAD</h2>
    {ahead.lines.length ? ahead.lines.map((l) => <p key={l} className="card-body" style={{ margin: "0 0 6px" }}>{l}</p>)
      : <p className="meta">Save your work schedule and I can look ahead at your next run.</p>}
    <p className="meta">A forecast from your schedule and your own records. I suggest; I never book anything or change advice.</p>
  </section>;
}

/**
 * SUPERCHARGE-001 item 1: ask DELTA in plain words, answered free and offline from what it has learned. Returns
 * null for anything else, so the free helper and Alfred keep their usual routes. Same counted words as the
 * notebook; "not yet" is a valid answer.
 */
export async function deltaAnswer(question: string): Promise<string | null> {
  const q = question.toLowerCase().replace(/[?!.]+$/, "").trim();
  const asksLearned = /\b(what (have you|has delta|did you) learn(ed|t)?|what do(es)? (you|delta) know about me|what has beyond learned)\b/.test(q);
  const asksUnusual = /\b(anything unusual|what'?s unusual|anything off|out of (my )?(usual )?range)\b/.test(q);
  const tagAsk = /#([a-z][a-z0-9-]{0,31})/.exec(q) ?? (/\bwhat does (?:my )?([a-z][a-z0-9-]{1,31}) (?:line up with|do to me|affect)\b/.exec(q));
  const asksSleepTime = /\bwhen do i (usually )?(sleep|go to (bed|sleep)|fall asleep|wake( up)?)\b/.test(q);
  const asksExperiment = /\b(my )?experiments?\b/.test(q) && /\b(how|what|did|show|go|went|result)\b/.test(q);
  const asksNeedle = /\b(good weeks|moves? the needle|best weeks)\b/.test(q);
  if (!asksLearned && !asksUnusual && !tagAsk && !asksSleepTime && !asksExperiment && !asksNeedle) return null;
  const k = await getDeltaKnowledge();
  const line = (l: Learning) => describeLearning(l);
  if (asksLearned) {
    const known = k.topics.filter((t) => t.state === "KNOWN").length;
    return [`DELTA knows ${known} of ${k.topics.length} things so far.`, ...k.learnings.slice(0, 3).map(line), k.learnings.length > 3 ? `${k.learnings.length - 3} more in DELTA's notebook (Review → Personal Understanding).` : ""].filter(Boolean).join("\n");
  }
  if (asksUnusual) {
    const u = k.learnings.filter((l) => l.kind === "UNUSUAL");
    return u.length ? u.map(line).join("\n") : "Nothing unusual for you right now. DELTA only speaks when a reading stays outside your usual range for several days.";
  }
  if (tagAsk) {
    const tag = tagAsk[1]!.replace(/-/g, "").length ? tagAsk[1]! : "";
    const learned = k.learnings.find((l) => l.kind === "TAG" && l.tag === tag);
    if (learned) return line(learned);
    const topic = k.topics.find((t) => t.id === `tag-${tag}`);
    return topic ? `Still learning #${tag}: ${topic.have} of ${topic.need} ${topic.unit}.` : `You haven't tagged #${tag} yet. Tag it in your daily note and DELTA will compare.`;
  }
  if (asksSleepTime) {
    const s = k.learnings.filter((l) => l.kind === "SLEEP_WINDOW");
    return s.length ? s.map(line).join("\n") : "Not enough measured Garmin nights yet. DELTA needs 3 on work days or days off.";
  }
  if (asksExperiment) {
    const done = k.learnings.filter((l) => l.kind === "EXPERIMENT");
    const t = k.topics.find((x) => x.id === "experiments");
    return done.length ? done.map(line).join("\n") : t?.state === "LEARNING" ? "Your experiment is still running. Its results show in your Journal when it ends." : "No finished experiments yet. Start one from your Journal, or from DELTA's suggestion.";
  }
  const n = k.needle;
  return n.ready ? (n.habits.length ? n.habits.map(describeNeedle).join("\n") : "Nothing you tag or train differs much between your good weeks and the rest yet.")
    : `Not enough weeks yet: ${n.judgedWeeks} of ${n.need} weeks with 3+ check-ins.`;
}
