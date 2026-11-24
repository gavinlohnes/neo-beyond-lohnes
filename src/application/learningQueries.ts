import { db } from "../persistence/db";
import { getDeltaKnowledge, type DeltaKnowledge } from "./delta";
import { activeExperiments, getExperiments } from "./tryExperiment";
import { noteTags } from "./noteTags";
import { deriveLifecycle, projectResponses, weeklyLearnings, type LifecycleItem } from "./learningLifecycle";

/** GRAYSON C6.1: every learning with its lifecycle state. Read only. */
export async function getLearningLifecycle(now = new Date(), knowledge?: DeltaKnowledge): Promise<LifecycleItem[]> {
  const [k, events, experiments] = await Promise.all([knowledge ? Promise.resolve(knowledge) : getDeltaKnowledge(now), db.events.where("type").equals("LEARNING_RESPONDED").toArray(), getExperiments()]);
  // An experiment "running on" a tag names it, e.g. "Skip #caffeine" (delta.ts's own suggestion wording).
  const runningTags = new Set(activeExperiments(experiments, now).flatMap((e) => noteTags(e.what)));
  return deriveLifecycle({ learnings: k.learnings, responses: projectResponses(events), runningTags, now });
}

/** GRAYSON C6.2: this week's "What I think I'm learning" (at most three). */
export async function getWeeklyLearnings(now = new Date()): Promise<LifecycleItem[]> {
  return weeklyLearnings(await getLearningLifecycle(now));
}

/**
 * GRAYSON C6.1: Delta's knowledge as Alfred, coach cards and TODAY may use it. RETIRED learnings are gone, the experiment
 * offer never targets a tag he dropped or said isn't true, and each remaining learning carries its state, so a line
 * can say whether he confirmed it. If his answers can't be read, Delta's knowledge is withheld rather than shown
 * without them: a dropped learning must never come back by accident.
 */
export interface ReasoningKnowledge extends DeltaKnowledge { states: ReadonlyMap<string, LifecycleItem> }
export async function getReasoningKnowledge(now = new Date()): Promise<ReasoningKnowledge> {
  const k = await getDeltaKnowledge(now);
  const items = await getLearningLifecycle(now, k);
  const states = new Map(items.map((i) => [i.learningId, i] as const));
  const out = (id: string) => { const s = states.get(id)?.state; return s === "RETIRED"; };
  const disputed = (id: string) => { const i = states.get(id); return i?.state === "RETIRED" || (i?.state === "CONTESTED" && i.by === "YOU"); };
  return {
    ...k, states,
    learnings: k.learnings.filter((l) => !out(l.id)),
    suggestion: k.suggestion && !disputed(`tag-${k.suggestion.tag}`) ? k.suggestion : null,
  };
}
