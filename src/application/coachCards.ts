import { getActiveDay, hasActivePlannedWork } from "./queries";
import { getActiveWorkoutSession, getLastAdvancingTemplate, getProgressionSuggestion, getUndoneSetIds } from "./trainQueries";
import { getProgrammeView } from "./trainingProgrammeQueries";
import { resolveTemplateExercises } from "./customTemplateQueries";
import { suggestNextTemplate } from "../engine/trainSuggestion";
import { getExperiments } from "./tryExperiment";
import { getWeeklySummary } from "./weeklyQueries";
import { getDeltaKnowledge } from "./delta";
import { db } from "../persistence/db";
import type { PerformedSet } from "../domain/workout/types";
import { isWorkingSet } from "../domain/workout/types";

export type CoachDestination = "TRAIN" | "JOURNAL" | "WEEKLY" | "DELTA";
export interface CoachCard { key: string; title: string; evidence: string; destination: CoachDestination }
const key = (kind: string, evidence: unknown) => JSON.stringify([kind, evidence]);

/** Approved 4.0-b order; reads only. Existing feature screens own confirmation and writes. */
export async function getCoachCards(now = new Date()): Promise<CoachCard[]> {
  const cards: CoachCard[] = [];
  const [day, active, programme] = await Promise.all([getActiveDay(), getActiveWorkoutSession(), getProgrammeView(now)]);
  const declared = day ? await hasActivePlannedWork(day.id) : false;
  const template = active?.templateId ?? programme.planned.templateId ?? (declared ? suggestNextTemplate(await getLastAdvancingTemplate()) : null);
  if (template && active?.sessionType !== "RECOVERY") {
    const variant = active?.sessionType === "REDUCED" ? "REDUCED" : "STANDARD";
    const [exercises, undone, sessions] = await Promise.all([resolveTemplateExercises(template, variant), getUndoneSetIds(), db.workoutSessions.toArray()]);
    const finished = new Set(sessions.filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL").map((s) => s.id));
    for (const ex of exercises) {
      const advice = await getProgressionSuggestion(template, variant, ex.exerciseId, now);
      if (!["DELOAD", "RE_ENTRY", "REDUCE"].includes(advice.recommendation)) continue;
      const sets = (await db.performedSets.where("exerciseId").equals(ex.exerciseId).toArray() as unknown as PerformedSet[])
        .filter((s) => finished.has(s.sessionId) && !undone.has(s.id) && isWorkingSet(s) && !s.substitutedName && s.reps > 0)
        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id));
      cards.push({ key: key("TRAIN", [template, variant, ex.exerciseId, advice, sets.slice(-16).map((s) => [s.id, s.weight, s.reps])]), title: ex.name, evidence: advice.reason, destination: "TRAIN" });
    }
  }
  const experiments = await getExperiments();
  for (const experiment of experiments.filter((e) => e.entry.status === "OPEN" && now >= e.to).sort((a, b) => a.to.getTime() - b.to.getTime() || a.entry.id.localeCompare(b.entry.id))) {
    cards.push({ key: key("JOURNAL", experiment.entry), title: `Review your test: ${experiment.what}`, evidence: `Your ${experiment.days}-day test ended ${experiment.to.toLocaleDateString()}. Review the recorded results and choose your verdict in Journal.`, destination: "JOURNAL" });
  }
  const weekly = await getWeeklySummary(now);
  if (weekly.calorieProposal.kind === "PROPOSAL") {
    const p = weekly.calorieProposal;
    cards.push({ key: key("WEEKLY", p), title: `Review ${p.kcal} kcal a day`, evidence: `Your existing weekly proposal uses a burn estimate of ${p.maintenance.lowKcal}–${p.maintenance.highKcal} kcal and your goal of ${p.goalWeightLbs} lb. Review its evidence and limits before saving.`, destination: "WEEKLY" });
  }
  const delta = await getDeltaKnowledge(now);
  if (delta.suggestion) {
    const s = delta.suggestion;
    cards.push({ key: key("DELTA", s), title: s.what, evidence: `After ${s.withDays} noted days with #${s.tag}, next-day sleep was ${s.minutesLess} minutes shorter than after ${s.withoutDays} other noted days. A pattern, not proof of a cause. Review the ${s.days}-day test before starting.`, destination: "DELTA" });
  }
  return cards;
}

const SKIPS = "beyond.coach.skips.v1";
export function readCoachSkips(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(SKIPS) ?? "[]"); return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []; } catch { return []; }
}
export function skipCoachCard(card: CoachCard, current: CoachCard[]): void {
  // Keep only current evidence, so this device's dismissal store cannot grow with history.
  const old = new Set(readCoachSkips()); old.add(card.key);
  localStorage.setItem(SKIPS, JSON.stringify(current.filter((c) => old.has(c.key)).map((c) => c.key)));
}
