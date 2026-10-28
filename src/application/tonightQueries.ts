import { db } from "../persistence/db";
import { getActiveDay, getDayProteinTotalG, getEffectiveHydrationTotal, getPlannedWorkDeclaration } from "./queries";
import { getMealEntries } from "./nutritionQueries";
import { getEffectiveProteinTargetG } from "./nutritionTargetQueries";
import { suggestTemplateForNextWorkout } from "./trainQueries";

/**
 * TONIGHT-001 (owner approval, 2026-10-19): read-only facts for TODAY's
 * morning call, wake card and night-closed summary. Nothing here writes,
 * infers a plan, or feeds the Engine; the answer the operator gives is
 * recorded through the existing planned-work and workout commands.
 */
export interface TrainedToday {
  templateId: string;
  sessionType: string;
  status: "COMPLETED" | "PARTIAL";
}

export interface TonightState {
  /** The day's latest PLANNED_WORK_SET answer; undefined when never answered. */
  planned: boolean | undefined;
  /** The most recent finished strength or recovery session recorded on this day. */
  trained: TrainedToday | null;
  /** Meals logged on this day (voided logs excluded). */
  mealsLogged: number;
  /** When the latest of those meals was recorded, or null. */
  lastMealAt: string | null;
}

export async function getTonightState(beyondDayId: string): Promise<TonightState> {
  const [planned, sessions, meals] = await Promise.all([
    getPlannedWorkDeclaration(beyondDayId),
    db.workoutSessions.where("beyondDayId").equals(beyondDayId).toArray(),
    getMealEntries(beyondDayId),
  ]);
  const finished = sessions
    .filter((session) => session.status === "COMPLETED" || session.status === "PARTIAL")
    .sort((a, b) => (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt))
    .at(-1);
  return {
    planned,
    trained: finished
      ? { templateId: finished.templateId, sessionType: finished.sessionType, status: finished.status as TrainedToday["status"] }
      : null,
    mealsLogged: meals.length,
    lastMealAt: [...meals].sort((a, b) => a.at.localeCompare(b.at)).at(-1)?.at ?? null,
  };
}

/** TONIGHT-001: the briefing's "Tonight so far": where the current lived day stands. */
export interface TonightPosition {
  proteinG: number;
  proteinTargetG: number | undefined;
  waterOz: number;
  lastMealAt: string | null;
  nextTemplateId: string;
}

export async function getTonightPosition(): Promise<TonightPosition | null> {
  const day = await getActiveDay();
  if (!day) return null;
  const [proteinG, proteinTargetG, waterOz, state, nextTemplateId] = await Promise.all([
    getDayProteinTotalG(day.id),
    getEffectiveProteinTargetG(),
    getEffectiveHydrationTotal(day.id),
    getTonightState(day.id),
    suggestTemplateForNextWorkout(),
  ]);
  return { proteinG, proteinTargetG, waterOz, lastMealAt: state.lastMealAt, nextTemplateId };
}
