import { db } from "../persistence/db";
import { quitHabitInputSchema, type QuitHabitInput } from "../persistence/quitHabitValidation";
import { logEvent, newId } from "./commands";
import { getQuitHabit } from "./quitQueries";
import type {
  CleanDayLoggedPayload,
  DomainEvent,
  QuitHabit,
  UrgeLoggedPayload,
  UrgePlanRespondedPayload,
  UrgeTrigger,
  UrgeUndonePayload,
} from "../domain/common/types";

/**
 * Drop 6 (quit tracker, owner approval 2026-09-30). The habit's settings row
 * is configuration (no event, like updateNutritionTargets); clean days and
 * urges are ordinary append-only events. Nothing here feeds the Engine,
 * recommendations, or the check-in's own alcohol-urge field.
 */
export async function saveQuitHabit(input: QuitHabitInput): Promise<QuitHabit> {
  const parsed = quitHabitInputSchema.parse(input);
  const existing = await db.quitHabits.get("current");
  const now = new Date().toISOString();
  const record: QuitHabit = {
    id: "current",
    name: parsed.name,
    ...(parsed.dailyCostUsd !== undefined ? { dailyCostUsd: parsed.dailyCostUsd } : {}),
    ...(parsed.postShiftPlan ? { postShiftPlan: parsed.postShiftPlan } : {}),
    ...(parsed.ifThenPlans && Object.keys(parsed.ifThenPlans).length > 0 ? { ifThenPlans: parsed.ifThenPlans } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.quitHabits.put(record);
  return record;
}

/**
 * Logs today as clean. Explicit only — BEYOND never infers a clean day — and
 * at most once per BeyondDay; a second call is a no-op returning the
 * existing event, so a double hold can't count a day twice.
 */
export async function logCleanDay(beyondDayId: string): Promise<string> {
  const habit = await getQuitHabit();
  if (!habit) throw new Error("QUIT_HABIT_NOT_SET: set up the habit in MORE → Settings first.");
  const existing = await db.events
    .where("beyondDayId")
    .equals(beyondDayId)
    .filter((e) => e.type === "CLEAN_DAY_LOGGED")
    .first();
  if (existing) return existing.id;
  const commandId = newId();
  const payload: CleanDayLoggedPayload = { commandId, habitName: habit.name };
  return logEvent(beyondDayId, "CLEAN_DAY_LOGGED", payload, "USER", commandId);
}

/** One tap: an urge, now, with what set it off. */
export async function logUrge(beyondDayId: string, trigger: UrgeTrigger): Promise<string> {
  const commandId = newId();
  const payload: UrgeLoggedPayload = { commandId, trigger };
  return logEvent(beyondDayId, "URGE_LOGGED", payload, "USER", commandId);
}

/** Undoes one logged urge by appending URGE_UNDONE; the original event is never touched. */
export async function undoUrge(beyondDayId: string, urgeEventId: string): Promise<void> {
  const target = (await db.events.get(urgeEventId)) as DomainEvent | undefined;
  if (!target || target.type !== "URGE_LOGGED") throw new Error(`URGE_NOT_FOUND: ${urgeEventId}`);
  const commandId = newId();
  const payload: UrgeUndonePayload = { commandId, urgeEventId };
  await logEvent(beyondDayId, "URGE_UNDONE", payload, "USER", commandId, urgeEventId);
}

/**
 * Drop 4 (urge if-then plans): records the operator's PLAN USED / NOT THIS
 * TIME for their own plan, shown after logging an urge. Only for a real,
 * logged urge whose trigger has a plan set.
 */
export async function respondToUrgePlan(beyondDayId: string, urgeEventId: string, used: boolean): Promise<string> {
  const target = (await db.events.get(urgeEventId)) as DomainEvent | undefined;
  if (!target || target.type !== "URGE_LOGGED" || target.beyondDayId !== beyondDayId) {
    throw new Error(`URGE_NOT_FOUND: ${urgeEventId}`);
  }
  const trigger = (target.payload as UrgeLoggedPayload).trigger;
  const plan = (await getQuitHabit())?.ifThenPlans?.[trigger];
  if (!plan) throw new Error("URGE_PLAN_NOT_SET: there's no plan for this trigger.");
  const commandId = newId();
  const payload: UrgePlanRespondedPayload = { commandId, urgeEventId, trigger, plan, used };
  return logEvent(beyondDayId, "URGE_PLAN_RESPONDED", payload, "USER", commandId, urgeEventId);
}
