import type { DeltaKnowledge, Learning } from "./delta";

/**
 * SUPERCHARGE-001 (item 2): DELTA's learnings as plain, counted facts for Alfred's context, so Alfred uses
 * what BEYOND has learned instead of starting from scratch. Patterns, not causes — said in every line.
 * `personal` says whether a fact rests on daily notes or the journal (the personal opt-in decides).
 */
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
const hm = (n: number) => `${Math.floor(n / 60)}h${String(Math.round(n % 60)).padStart(2, "0")}`;
const MEASURE: Record<string, { name: string; value: (v: number) => string }> = {
  NEXT_SLEEP: { name: "sleep logged the next day", value: hm },
  NEXT_ENERGY: { name: "next day's check-in energy (of 5)", value: (v) => v.toFixed(1) },
  NEXT_MOOD: { name: "next day's check-in mood (of 5)", value: (v) => v.toFixed(1) },
  TRAINED: { name: "share of days with a workout", value: (v) => `${Math.round(v * 100)}%` },
};

export function deltaFact(l: Learning): { text: string; personal: boolean } {
  switch (l.kind) {
    case "SLEEP_WINDOW": {
      const g = l.group;
      return { personal: false, text: `DELTA LEARNED (sleep timing, ${g.kind === "WORK" ? "work days" : "days off"}, ${g.nights} Garmin-measured nights, last 4 weeks): usually asleep ${clock(g.start)}, up ${clock(g.end)}; half of nights within ${g.spread} min of the typical midpoint.` };
    }
    case "TAG": {
      const m = MEASURE[l.comparison.id]!, c = l.comparison;
      return { personal: true, text: `DELTA LEARNED (#${l.tag}, ${l.taggedDays} tagged days): ${m.name} was ${m.value(c.withTag.value)} on tagged days (${c.withTag.days}) against ${m.value(c.without.value)} on other noted days (${c.without.days}). A pattern, not a cause.` };
    }
    case "UNUSUAL": {
      const latest = l.reading.days.at(-1)!;
      return { personal: false, text: `DELTA NOTICED: ${l.metric === "resting" ? "resting heart rate" : l.metric === "sleep" ? "Garmin main sleep" : "steps"} ${l.reading.direction === "ABOVE" ? "above" : "below"} his usual range for ${l.reading.days.length} days running (latest ${l.metric === "sleep" ? hm(latest.value) : Math.round(latest.value)}, usual ${l.metric === "sleep" ? `${hm(latest.low)}–${hm(latest.high)}` : `${latest.low}–${latest.high}`}). A reading, not a diagnosis.` };
    }
    case "EXPERIMENT":
      return { personal: true, text: `DELTA LEARNED (finished experiment "${l.what}", ${l.days} days): his own outcome "${l.outcome}"${l.lesson ? `; his lesson: "${l.lesson}"` : ""}.` };
  }
}

/** The facts Alfred may see: measured ones always, note- and journal-based ones only with the personal opt-in. */
export function deltaFacts(k: DeltaKnowledge, includePersonal: boolean): { id: string; text: string; at: string }[] {
  const facts = k.learnings.map((l) => ({ id: l.id, at: l.learnedOn, ...deltaFact(l) })).filter((f) => includePersonal || !f.personal);
  if (includePersonal && k.needle.ready) for (const h of k.needle.habits) facts.push({
    id: `needle-${h.habit}`, at: new Date().toISOString(), personal: true,
    text: `DELTA (good weeks = top third by check-in energy, ${k.needle.goodWeeks} of ${k.needle.judgedWeeks} weeks): ${h.habit} ${h.unit === "DAYS_PER_WEEK" ? `${h.good.toFixed(1)} vs ${h.other.toFixed(1)} days a week` : `on ${Math.round(h.good * 100)}% vs ${Math.round(h.other * 100)}% of noted days`} (${h.goodWeeks} vs ${h.otherWeeks} weeks). A pattern, not proof.`,
  });
  return facts.map(({ id, text, at }) => ({ id, text, at }));
}
