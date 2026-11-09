import { useEffect, useState } from "react";
import { getTagPatterns, MIN_TAGGED_DAYS, type MeasureComparison, type TagPatterns } from "../../../application/tagPatterns";
import { hoursMinutes } from "../health/healthFormat";

/**
 * JOURNAL-LEARN-001 (part 2): what each #tag lines up with, in plain words with the number of days behind
 * every figure. Describes only: "these line up; they don't prove a cause". Read only.
 */
export function TagPatternsSection({ active }: { active: boolean }) {
  const [patterns, setPatterns] = useState<TagPatterns | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void getTagPatterns().then((p) => { if (live) { setPatterns(p); setFailed(false); } }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [active]);
  if (failed) return <p className="meta">Tag patterns couldn't be read. Your notes are unchanged.</p>;
  if (!patterns) return null;
  if (!patterns.ready.length && !patterns.learning.length) return <p className="meta">Tag a few days in your daily note and BEYOND will show what each tag lines up with.</p>;
  return <section className="tag-patterns" aria-label="What your tags line up with">
    {patterns.ready.map((p) => <article key={p.tag} className="equipment-row" aria-label={`#${p.tag}`}>
      <p className="tool-label" style={{ marginBottom: 4 }}>#{p.tag.toUpperCase()} · {p.taggedDays} DAYS</p>
      {p.comparisons.length
        ? p.comparisons.map((c) => <p key={c.id} className="card-body" style={{ margin: "0 0 4px" }}>{describeComparison(c)}</p>)
        : <p className="meta">Not enough days with the same records on both sides yet.</p>}
    </article>)}
    {patterns.learning.length > 0 && <p className="meta">Still learning: {patterns.learning.map((l) => `#${l.tag} (${l.taggedDays} of ${MIN_TAGGED_DAYS} days)`).join(", ")}.</p>}
    <p className="meta">Compared with your other days that have a note. These line up; they don't prove a cause. Nothing here changes advice.</p>
  </section>;
}

const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function describeComparison(c: MeasureComparison): string {
  const a = c.withTag, b = c.without;
  switch (c.id) {
    case "NEXT_SLEEP": return `Sleep logged the next day: ${hoursMinutes(a.value)} on average (${a.days} days), against ${hoursMinutes(b.value)} (${b.days}).`;
    case "NEXT_ENERGY": return `Next day's energy: ${one(a.value)} of 5 (${a.days} days), against ${one(b.value)} (${b.days}).`;
    case "NEXT_MOOD": return `Next day's mood: ${one(a.value)} of 5 (${a.days} days), against ${one(b.value)} (${b.days}).`;
    case "TRAINED": return `Trained that day: ${Math.round(a.value * a.days)} of ${a.days} days, against ${Math.round(b.value * b.days)} of ${b.days}.`;
  }
}
