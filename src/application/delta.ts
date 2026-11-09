import { db } from "../persistence/db";
import { getImportedSleep } from "./externalSleepQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { deriveSleepRhythm, RHYTHM_MIN_NIGHTS, type RhythmGroup } from "../engine/sleepRhythm";
import { noteTags } from "./noteTags";
import { compareTags, dayFacts, MIN_TAGGED_DAYS, type MeasureComparison } from "./tagPatterns";
import type { DaySummary } from "../engine/dayLedger";
import type { StateCheckIn } from "../domain/common/types";
import type { ExternalSleep } from "../domain/health/sleepImport";

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
  | { id: string; kind: "TAG"; learnedOn: string; tag: string; taggedDays: number; comparison: MeasureComparison };
export interface DeltaKnowledge { topics: Topic[]; learnings: Learning[] }

export const CHECK_INS_NEEDED = 7;
export const WORKOUTS_NEEDED = 3;

interface Inputs { sleeps: readonly ExternalSleep[]; summaries: readonly DaySummary[]; notes: readonly { dayId: string; text: string }[]; checkIns: readonly StateCheckIn[]; now: Date }

/** Pure. */
export function deriveDelta({ sleeps, summaries, notes, checkIns, now }: Inputs): DeltaKnowledge {
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

  const startedAt = new Map(summaries.map((s) => [s.beyondDayId, s.startedAt]));
  const { ready, learning } = compareTags(dayFacts(notes, summaries, checkIns));
  for (const p of ready) {
    const dates = notes.filter((n) => noteTags(n.text).includes(p.tag)).flatMap((n) => { const at = startedAt.get(n.dayId); return at ? [at] : []; }).sort();
    topics.push({ id: `tag-${p.tag}`, label: `What #${p.tag} lines up with`, state: p.comparisons.length ? "KNOWN" : "LEARNING", have: p.taggedDays, need: MIN_TAGGED_DAYS, unit: "tagged days" });
    const first = p.comparisons[0];
    if (first && dates[MIN_TAGGED_DAYS - 1]) learnings.push({ id: `tag-${p.tag}`, kind: "TAG", learnedOn: dates[MIN_TAGGED_DAYS - 1]!, tag: p.tag, taggedDays: p.taggedDays, comparison: first });
  }
  for (const l of learning) topics.push({ id: `tag-${l.tag}`, label: `What #${l.tag} lines up with`, state: "LEARNING", have: l.taggedDays, need: MIN_TAGGED_DAYS, unit: "tagged days" });
  if (!ready.length && !learning.length) topics.push({ id: "tags", label: "What your tags line up with", state: "NOT_STARTED", have: 0, need: MIN_TAGGED_DAYS, unit: "tagged days" });

  topics.push({ id: "check-ins", label: "Your energy and mood", state: checkIns.length >= CHECK_INS_NEEDED ? "KNOWN" : checkIns.length ? "LEARNING" : "NOT_STARTED", have: checkIns.length, need: CHECK_INS_NEEDED, unit: "check-ins" });
  const workouts = summaries.reduce((n, s) => n + s.workouts.length, 0);
  topics.push({ id: "training", label: "How you train", state: workouts >= WORKOUTS_NEEDED ? "KNOWN" : workouts ? "LEARNING" : "NOT_STARTED", have: workouts, need: WORKOUTS_NEEDED, unit: "workouts" });

  learnings.sort((a, b) => b.learnedOn.localeCompare(a.learnedOn));
  return { topics, learnings };
}

export async function getDeltaKnowledge(now = new Date()): Promise<DeltaKnowledge> {
  const [records, summaries, notes, checkIns] = await Promise.all([getImportedSleep(), getDaySummaries(), db.dailyNotes.toArray(), db.checkIns.toArray()]);
  return deriveDelta({ sleeps: records.map((r) => r.evidence), summaries, notes, checkIns, now });
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
