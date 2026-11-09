import { db } from "../persistence/db";
import { getImportedSleep } from "./externalSleepQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { deriveSleepRhythm, RHYTHM_MIN_NIGHTS, type RhythmGroup } from "../engine/sleepRhythm";
import { compareTags, dayFacts, MIN_TAGGED_DAYS, type MeasureComparison } from "./tagPatterns";
import type { DaySummary } from "../engine/dayLedger";
import type { StateCheckIn } from "../domain/common/types";
import type { ExternalSleep } from "../domain/health/sleepImport";
import { activeExperiments, getExperiments, type Experiment } from "./tryExperiment";
import { getMeasuredSnapshot } from "./measuredQueries";
import type { UnusualReading } from "../domain/health/unusual";

/**
 * DELTA-GROWS-001: DELTA's view of what BEYOND has learned about you, and how it grew. Everything is derived
 * from records already on this phone — nothing new is stored. A learning's date is the day enough evidence
 * first existed (e.g. the 3rd measured work-day night), so the notebook can be rebuilt from history at any
 * time. Patterns, not causes; every line carries its count. Read only; nothing feeds the Engine.
 */
export type TopicState = "KNOWN" | "LEARNING" | "NOT_STARTED";
export interface Topic { id: string; label: string; state: TopicState; have: number; need: number; unit: string }
export type Learning =
  | { id: string; kind: "SLEEP_WINDOW"; learnedOn: string; group: RhythmGroup }
  | { id: string; kind: "TAG"; learnedOn: string; tag: string; taggedDays: number; comparison: MeasureComparison }
  | { id: string; kind: "EXPERIMENT"; learnedOn: string; what: string; days: number; outcome: string; lesson?: string }
  /** DELTA-NEXT 1: noticed, not learned — a run of days outside your own usual range, while it lasts. */
  | { id: string; kind: "UNUSUAL"; learnedOn: string; metric: UnusualMetric; reading: UnusualReading };
export type UnusualMetric = "resting" | "sleep" | "steps";
/** DELTA's offer to test a tag that lines up with shorter sleep. Starting it is the existing experiment command, on a tap. */
export interface ExperimentSuggestion { tag: string; what: string; days: number; minutesLess: number; taggedDays: number; withDays: number; withoutDays: number }
export interface DeltaKnowledge { topics: Topic[]; learnings: Learning[]; suggestion: ExperimentSuggestion | null }
/** A gap this size (next-day sleep) is worth testing; smaller reads as about the same. */
export const SUGGEST_SLEEP_GAP_MINUTES = 30;
export const SUGGESTED_EXPERIMENT_DAYS = 14;

export const CHECK_INS_NEEDED = 7;
export const WORKOUTS_NEEDED = 3;

interface Inputs { sleeps: readonly ExternalSleep[]; summaries: readonly DaySummary[]; notes: readonly { dayId: string; text: string }[]; checkIns: readonly StateCheckIn[]; experiments?: readonly Experiment[]; unusual?: Partial<Record<UnusualMetric, UnusualReading | null>>; now: Date }

/** Pure. */
export function deriveDelta({ sleeps, summaries, notes, checkIns, experiments = [], unusual = {}, now }: Inputs): DeltaKnowledge {
  const all = deriveSleepRhythm(sleeps, summaries, now, 100_000);
  const recent = deriveSleepRhythm(sleeps, summaries, now);
  const topics: Topic[] = [];
  const learnings: Learning[] = [];

  for (const kind of ["WORK", "OFF"] as const) {
    const nights = all.nights.filter((n) => n.kind === kind).sort((a, b) => a.livedDayStart.localeCompare(b.livedDayStart));
    const label = kind === "WORK" ? "When you sleep on work days" : "When you sleep on days off";
    topics.push({ id: `sleep-${kind}`, label, state: nights.length >= RHYTHM_MIN_NIGHTS ? "KNOWN" : nights.length ? "LEARNING" : "NOT_STARTED", have: nights.length, need: RHYTHM_MIN_NIGHTS, unit: "measured nights" });
    const group = recent.groups.find((g) => g.kind === kind) ?? all.groups.find((g) => g.kind === kind);
    if (group && nights.length >= RHYTHM_MIN_NIGHTS) learnings.push({ id: `sleep-${kind}`, kind: "SLEEP_WINDOW", learnedOn: nights[RHYTHM_MIN_NIGHTS - 1]!.livedDayStart, group });
  }

  const { ready, learning } = compareTags(dayFacts(notes, summaries, checkIns));
  const learnedOnFor = tagLearnedOn(notes, summaries, checkIns);
  for (const p of ready) {
    topics.push({ id: `tag-${p.tag}`, label: `What #${p.tag} lines up with`, state: p.comparisons.length ? "KNOWN" : "LEARNING", have: p.taggedDays, need: MIN_TAGGED_DAYS, unit: "tagged days" });
    const first = p.comparisons[0], learnedOn = learnedOnFor(p.tag);
    if (first && learnedOn) learnings.push({ id: `tag-${p.tag}`, kind: "TAG", learnedOn, tag: p.tag, taggedDays: p.taggedDays, comparison: first });
  }
  for (const l of learning) topics.push({ id: `tag-${l.tag}`, label: `What #${l.tag} lines up with`, state: "LEARNING", have: l.taggedDays, need: MIN_TAGGED_DAYS, unit: "tagged days" });
  if (!ready.length && !learning.length) topics.push({ id: "tags", label: "What your tags line up with", state: "NOT_STARTED", have: 0, need: MIN_TAGGED_DAYS, unit: "tagged days" });

  topics.push({ id: "check-ins", label: "Your energy and mood", state: checkIns.length >= CHECK_INS_NEEDED ? "KNOWN" : checkIns.length ? "LEARNING" : "NOT_STARTED", have: checkIns.length, need: CHECK_INS_NEEDED, unit: "check-ins" });
  const workouts = summaries.reduce((n, s) => n + s.workouts.length, 0);
  topics.push({ id: "training", label: "How you train", state: workouts >= WORKOUTS_NEEDED ? "KNOWN" : workouts ? "LEARNING" : "NOT_STARTED", have: workouts, need: WORKOUTS_NEEDED, unit: "workouts" });

  // DELTA-EXPERIMENTS: a finished experiment is something learned, in your own words (the outcome you chose).
  const finished = experiments.filter((e) => e.entry.status === "REVIEWED" && e.entry.outcome);
  const running = activeExperiments(experiments, now);
  for (const e of finished) learnings.push({ id: `exp-${e.entry.id}`, kind: "EXPERIMENT", learnedOn: e.entry.reviewedAt ?? e.to.toISOString(), what: e.what, days: e.days, outcome: e.entry.outcome!, ...(e.entry.lesson ? { lesson: e.entry.lesson } : {}) });
  topics.push({ id: "experiments", label: "What your experiments showed", state: finished.length ? "KNOWN" : running.length ? "LEARNING" : "NOT_STARTED", have: finished.length, need: 1, unit: finished.length === 1 ? "finished experiment" : "finished experiments" });

  // Offer to test the tag with the biggest next-day sleep gap, once, while no experiment is running.
  const candidates = ready.flatMap((p) => {
    const sleep = p.comparisons.find((c) => c.id === "NEXT_SLEEP");
    const gap = sleep ? sleep.without.value - sleep.withTag.value : 0;
    const tested = experiments.some((e) => e.what.toLowerCase().includes(`#${p.tag}`));
    return gap >= SUGGEST_SLEEP_GAP_MINUTES && !tested ? [{ tag: p.tag, what: `Skip #${p.tag}`, days: SUGGESTED_EXPERIMENT_DAYS, minutesLess: Math.round(gap), taggedDays: p.taggedDays, withDays: sleep!.withTag.days, withoutDays: sleep!.without.days }] : [];
  }).sort((a, b) => b.minutesLess - a.minutesLess);
  const suggestion = running.length ? null : candidates[0] ?? null;

  // DELTA-NEXT 1: the measured sheets' "unusual for you" streaks, while they last. Silent otherwise.
  for (const metric of ["resting", "sleep", "steps"] as const) {
    const reading = unusual[metric];
    // Dated at the run's FIRST day, so a run is announced once and an ongoing run doesn't return after GOT IT.
    if (reading?.days.length) learnings.push({ id: `unusual-${metric}-${reading.days[0]!.from}`, kind: "UNUSUAL", learnedOn: new Date(reading.days[0]!.from).toISOString(), metric, reading });
  }

  learnings.sort((a, b) => b.learnedOn.localeCompare(a.learnedOn));
  return { topics, learnings, suggestion };
}

/**
 * When a tag was first learned: replay history day by day and return the start of the first recorded day by
 * which a comparison existed for it — both sides need enough values, and a next-day value exists only once
 * that next day is recorded. So the date is when the evidence truly existed, not just the 3rd tagged day.
 */
function tagLearnedOn(notes: Inputs["notes"], summaries: readonly DaySummary[], checkIns: readonly StateCheckIn[]) {
  const ordered = [...summaries].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const cache = new Map<string, string | null>();
  let replayed: { through: string; ready: Set<string> }[] | null = null;
  const replay = () => {
    if (replayed) return replayed;
    replayed = ordered.map((day, i) => {
      const known = new Set(ordered.slice(0, i + 1).map((d) => d.beyondDayId));
      const facts = dayFacts(notes.filter((n) => known.has(n.dayId)), ordered.slice(0, i + 1), checkIns.filter((c) => known.has(c.beyondDayId)));
      return { through: day.startedAt, ready: new Set(compareTags(facts).ready.filter((p) => p.comparisons.length).map((p) => p.tag)) };
    });
    return replayed;
  };
  return (tag: string): string | null => {
    if (!cache.has(tag)) cache.set(tag, replay().find((r) => r.ready.has(tag))?.through ?? null);
    return cache.get(tag)!;
  };
}

export async function getDeltaKnowledge(now = new Date()): Promise<DeltaKnowledge> {
  const [records, summaries, notes, checkIns, experiments, snapshot] = await Promise.all([getImportedSleep(), getDaySummaries(), db.dailyNotes.toArray(), db.checkIns.toArray(), getExperiments(), getMeasuredSnapshot(now.getTime()).catch(() => null)]);
  return deriveDelta({ sleeps: records.map((r) => r.evidence), summaries, notes, checkIns, experiments, unusual: snapshot?.unusual ?? {}, now });
}

/**
 * DELTA's one question for today: aimed at the least-known topic, so answering teaches it. Deterministic.
 * Days off get a day-off question when DELTA is still learning your days off.
 */
export function deltaQuestion(knowledge: DeltaKnowledge, workContext: string | undefined): { text: string; teaches: string } {
  const state = (id: string) => knowledge.topics.find((t) => t.id === id)?.state;
  if (workContext === "OFF" && state("sleep-OFF") !== "KNOWN") return { text: "What did you do for yourself today?", teaches: "your days off" };
  if (!knowledge.topics.some((t) => t.id.startsWith("tag-"))) return { text: "What's one thing that shaped today? Tag it below.", teaches: "what your days line up with" };
  if (state("check-ins") !== "KNOWN") return { text: "How is your energy right now, and why?", teaches: "your energy and mood" };
  if (workContext === "WORK") return { text: "What took the most out of you this shift?", teaches: "your work days" };
  return { text: "What's one thing you'd want to remember about today?", teaches: "what matters to you" };
}

/** New learnings since `since` (ISO), newest first — for TODAY's one quiet line. */
export function newLearnings(knowledge: DeltaKnowledge, since: string | null): Learning[] {
  return knowledge.learnings.filter((l) => !since || l.learnedOn > since);
}
