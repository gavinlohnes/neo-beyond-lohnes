import { z } from "zod";
import type { DomainEvent } from "../domain/common/types";
import { LEARNING_ACTIONS, NARROW_PRESETS, type LearningAction, type LearningEvidence, type LearningResponsePayload, type LearningState } from "../domain/learningLifecycle";
import type { Learning } from "./delta";

/**
 * GRAYSON C6.1: the learning lifecycle, derived. Delta's learnings come from records (delta.ts); his answers come
 * from LEARNING_RESPONDED. Pure and deterministic: the same records and answers always give the same states.
 *
 * States: OBSERVED (an unusual streak), HYPOTHESIZED (a pattern at its evidence floor), PROVISIONAL (an experiment on
 * it is running), CONFIRMED (his Keep, or his own reviewed experiment), CONTEXT_SPECIFIC (his Narrow), CONTESTED (his
 * Not true, or evidence that reversed after he kept it), OUTDATED (kept, but no fresh evidence for OUTDATED_DAYS or
 * no longer derivable), RETIRED (his Drop: never in Alfred's context or Delta's lines again).
 */
export const OUTDATED_DAYS = 56;
/** A kept TAG learning counts as reversed only past these gaps (the other way); smaller reads as about the same. */
export const SAME_BAND: Record<string, number> = { NEXT_SLEEP: 15, NEXT_ENERGY: 0.25, NEXT_MOOD: 0.25, TRAINED: 0.1 };
/** A kept sleep window counts as moved once its typical midpoint shifts this far (minutes). */
export const WINDOW_MOVED_MINUTES = 120;
export const WEEKLY_MAX = 3;

const DAY = 86_400_000;
const payloadSchema = z.object({
  learningId: z.string().min(1).max(200),
  action: z.enum(LEARNING_ACTIONS),
  statement: z.string().trim().min(1).max(400),
  evidence: z.object({
    kind: z.enum(["TAG", "SLEEP_WINDOW", "EXPERIMENT", "UNUSUAL"]), days: z.number().int().min(0),
    measure: z.string().max(40).optional(), direction: z.enum(["MORE", "LESS", "SAME"]).optional(), midpoint: z.number().min(0).max(1440).optional(),
  }).strict(),
  context: z.object({ preset: z.enum(NARROW_PRESETS).optional(), words: z.string().trim().min(1).max(140).optional() }).strict().optional(),
  supersedes: z.string().min(1).nullable(),
  via: z.literal("WEEKLY").optional(),
}).strict().refine((p) => p.action === "NARROW" ? Boolean(p.context?.preset || p.context?.words) : p.context === undefined, "NARROW needs a context; other answers have none.");
export { payloadSchema as learningResponseSchema };

export interface LearningResponse extends LearningResponsePayload { id: string; recordedAt: string }
/** His answers per learning, oldest first, in causal order. A broken chain is reported, never silently skipped. */
export function projectResponses(events: readonly DomainEvent[]): Map<string, LearningResponse[]> {
  const byLearning = new Map<string, LearningResponse[]>();
  for (const event of events) {
    if (event.type !== "LEARNING_RESPONDED") continue;
    const parsed = payloadSchema.safeParse(event.payload);
    if (!parsed.success || event.source !== "USER") throw new Error("Your answers to Delta's learnings are incomplete or conflicting. Nothing has been changed.");
    const list = byLearning.get(parsed.data.learningId) ?? [];
    list.push({ ...parsed.data, id: event.id, recordedAt: event.recordedAt });
    byLearning.set(parsed.data.learningId, list);
  }
  for (const [id, list] of byLearning) {
    const next = new Map(list.map((r) => [r.supersedes, r] as const));
    if (next.size !== list.length) throw new Error("Your answers to Delta's learnings are incomplete or conflicting. Nothing has been changed.");
    const ordered: LearningResponse[] = [];
    let previous: string | null = null;
    while (next.has(previous)) { const r: LearningResponse = next.get(previous)!; ordered.push(r); previous = r.id; }
    if (ordered.length !== list.length) throw new Error("Your answers to Delta's learnings are incomplete or conflicting. Nothing has been changed.");
    byLearning.set(id, ordered);
  }
  return byLearning;
}

/** The answer in force: each UNDO cancels the answer before it. Null when none stands. */
export function verdictOf(chain: readonly LearningResponse[]): LearningResponse | null {
  const stack: LearningResponse[] = [];
  for (const r of chain) { if (r.action === "UNDO") stack.pop(); else stack.push(r); }
  return stack.at(-1) ?? null;
}

const lean = (measure: string, withTag: number, without: number): "MORE" | "LESS" | "SAME" => {
  const d = withTag - without, band = SAME_BAND[measure] ?? 0;
  return Math.abs(d) <= band ? "SAME" : d > 0 ? "MORE" : "LESS";
};
/** What a learning rests on right now. */
export function evidenceOf(l: Learning): LearningEvidence {
  switch (l.kind) {
    case "TAG": return { kind: "TAG", days: l.taggedDays, measure: l.comparison.id, direction: lean(l.comparison.id, l.comparison.withTag.value, l.comparison.without.value) };
    case "SLEEP_WINDOW": return { kind: "SLEEP_WINDOW", days: l.group.nights, midpoint: Math.round(l.group.midpoint) };
    case "EXPERIMENT": return { kind: "EXPERIMENT", days: l.days };
    case "UNUSUAL": return { kind: "UNUSUAL", days: l.reading.days.length };
  }
}
/** Whether evidence now points the other way from what he kept. */
export function reversed(kept: LearningEvidence, now: LearningEvidence): boolean {
  // #639 review: if the pattern now compares a different measure, it is no longer the sentence he kept.
  if (kept.kind === "TAG" && now.kind === "TAG" && kept.measure !== now.measure) return true;
  if (kept.kind === "TAG" && now.kind === "TAG")
    return (kept.direction === "MORE" && now.direction === "LESS") || (kept.direction === "LESS" && now.direction === "MORE");
  if (kept.kind === "SLEEP_WINDOW" && now.kind === "SLEEP_WINDOW" && kept.midpoint !== undefined && now.midpoint !== undefined) {
    const d = Math.abs(kept.midpoint - now.midpoint) % 1440;
    return Math.min(d, 1440 - d) >= WINDOW_MOVED_MINUTES;
  }
  return false;
}

export interface LifecycleItem {
  learningId: string;
  /** Null when the learning can no longer be derived from records (its words come from his last answer). */
  learning: Learning | null;
  statement: string | null;
  state: LearningState;
  /** Who put it in this state: Delta's records, his own answer, or newer evidence against his answer. */
  by: "RECORDS" | "YOU" | "EVIDENCE";
  verdict: LearningResponse | null;
  /** The latest answer of any kind (UNDO included), for the next answer's `supersedes`. */
  headId: string | null;
  lastEvidenceAt: string | null;
  /** C6.2: when the weekly check last asked about it (his latest answer given there), or null. */
  askedWeeklyAt: string | null;
}

const weeklyAt = (chain: readonly LearningResponse[]): string | null => chain.filter((r) => r.via === "WEEKLY").map((r) => r.recordedAt).sort().at(-1) ?? null;
const lastEvidence = (l: Learning): string => {
  const days = l.evidence && "days" in l.evidence ? l.evidence.days.map((d) => d.at) : [];
  return [l.learnedOn, ...days].sort().at(-1)!;
};

/** Pure. Every learning Delta derives, plus any he answered that can no longer be derived. */
export function deriveLifecycle(input: { learnings: readonly Learning[]; responses: ReadonlyMap<string, readonly LearningResponse[]>; runningTags: ReadonlySet<string>; now: Date }): LifecycleItem[] {
  const items: LifecycleItem[] = [];
  const seen = new Set<string>();
  for (const l of input.learnings) {
    seen.add(l.id);
    const chain = input.responses.get(l.id) ?? [];
    const verdict = verdictOf(chain);
    const base = { learningId: l.id, learning: l, statement: null, verdict, headId: chain.at(-1)?.id ?? null, lastEvidenceAt: lastEvidence(l), askedWeeklyAt: weeklyAt(chain) };
    if (verdict?.action === "DROP") { items.push({ ...base, state: "RETIRED", by: "YOU" }); continue; }
    if (verdict?.action === "NOT_TRUE") { items.push({ ...base, state: "CONTESTED", by: "YOU" }); continue; }
    if (verdict?.action === "KEEP" || verdict?.action === "NARROW") {
      if (reversed(verdict.evidence, evidenceOf(l))) items.push({ ...base, state: "CONTESTED", by: "EVIDENCE" });
      else if (input.now.getTime() - Date.parse(base.lastEvidenceAt) > OUTDATED_DAYS * DAY) items.push({ ...base, state: "OUTDATED", by: "EVIDENCE" });
      else items.push({ ...base, state: verdict.action === "KEEP" ? "CONFIRMED" : "CONTEXT_SPECIFIC", by: "YOU" });
      continue;
    }
    if (l.kind === "UNUSUAL") items.push({ ...base, state: "OBSERVED", by: "RECORDS" });
    else if (l.kind === "EXPERIMENT") items.push({ ...base, state: "CONFIRMED", by: "YOU" }); // his own reviewed outcome
    else if (l.kind === "TAG" && input.runningTags.has(l.tag)) items.push({ ...base, state: "PROVISIONAL", by: "RECORDS" });
    else items.push({ ...base, state: "HYPOTHESIZED", by: "RECORDS" });
  }
  // Answered learnings the records no longer support: kept ones are out of date; others keep his answer.
  for (const [id, chain] of input.responses) {
    if (seen.has(id)) continue;
    const verdict = verdictOf(chain);
    if (!verdict) continue;
    const state: LearningState = verdict.action === "DROP" ? "RETIRED" : verdict.action === "NOT_TRUE" ? "CONTESTED" : "OUTDATED";
    items.push({ learningId: id, learning: null, statement: verdict.statement, state, by: state === "OUTDATED" ? "EVIDENCE" : "YOU", verdict, headId: chain.at(-1)!.id, lastEvidenceAt: null, askedWeeklyAt: weeklyAt(chain) });
  }
  return items;
}

/** Retired learnings never reach Alfred's context or Delta's lines. */
export const inReasoning = (item: LifecycleItem) => item.state !== "RETIRED";

/**
 * C6.2: the week's "What I think I'm learning", at most WEEKLY_MAX in any WEEK_DAYS. What the weekly check already
 * asked in that window stays (shown with his answer and UNDO) and counts toward the three; only the rest of the
 * three are new picks (#639 review: a cap per visit let a backlog through on repeat visits). New picks are only
 * patterns Delta derived (never an observation, never his own experiment), only at their evidence floor (delta.ts
 * only derives them there), only unanswered ones or ones newer evidence turned against. Reversed first, then newest.
 */
export const WEEK_DAYS = 7;
export function weeklyLearnings(items: readonly LifecycleItem[], now: Date): LifecycleItem[] {
  const since = now.getTime() - WEEK_DAYS * DAY;
  const asked = items.filter((i) => i.learning && i.askedWeeklyAt && Date.parse(i.askedWeeklyAt) > since)
    .sort((a, b) => a.askedWeeklyAt!.localeCompare(b.askedWeeklyAt!) || a.learningId.localeCompare(b.learningId)).slice(0, WEEKLY_MAX);
  const room = WEEKLY_MAX - asked.length;
  const ask = items.filter((i) => !asked.includes(i) && i.learning && (i.learning.kind === "TAG" || i.learning.kind === "SLEEP_WINDOW")
    && (i.state === "HYPOTHESIZED" || i.state === "PROVISIONAL" || (i.by === "EVIDENCE" && (i.state === "CONTESTED" || i.state === "OUTDATED"))));
  const rank = (i: LifecycleItem) => (i.by === "EVIDENCE" ? 0 : 1);
  const fresh = [...ask].sort((a, b) => rank(a) - rank(b) || b.learning!.learnedOn.localeCompare(a.learning!.learnedOn) || a.learningId.localeCompare(b.learningId)).slice(0, Math.max(0, room));
  return [...asked, ...fresh];
}

export type { LearningAction };
