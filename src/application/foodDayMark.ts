import { z } from "zod";
import { db } from "../persistence/db";
import { logEvent, newId } from "./commands";
import { writeAtomically } from "./atomicWrite";

/**
 * GRAYSON-MISSION-REVIEW-001 slice A (HONEST-BURN; Gavin, 2026-11-24): "Not fully logged" on a lived day. An event on
 * the day (FOOD_DAY_PARTIAL_SET), so it can be undone and backs up like every other fact; the newest one for a day wins,
 * and unmarking is the same event with `partial: false`. A marked day leaves the burn estimate's intake (weigh-ins on it
 * still count), so the weekly proposal follows. Nothing is marked without his tap.
 */
export const foodDayPartialSchema = z.object({ commandId: z.string().min(1), partial: z.boolean() }).strict();
export type FoodDayPartialPayload = z.infer<typeof foodDayPartialSchema>;

async function marks(): Promise<Map<string, boolean>> {
  const events = await db.events.where("type").equals("FOOD_DAY_PARTIAL_SET").toArray();
  const newest = new Map<string, { partial: boolean; seq: number; at: string }>();
  for (const e of events) {
    const parsed = foodDayPartialSchema.safeParse(e.payload);
    if (!parsed.success || !e.beyondDayId) continue;
    const prev = newest.get(e.beyondDayId);
    const seq = e.seq ?? 0;
    if (!prev || e.recordedAt > prev.at || (e.recordedAt === prev.at && seq > prev.seq)) newest.set(e.beyondDayId, { partial: parsed.data.partial, seq, at: e.recordedAt });
  }
  return new Map([...newest].map(([id, v]) => [id, v.partial]));
}

/** Days marked not fully logged (newest mark true). */
export async function getPartialDayIds(): Promise<Set<string>> {
  return new Set([...(await marks())].filter(([, partial]) => partial).map(([id]) => id));
}

/** Days he has answered either way (any mark), so a suggestion never asks about them again. */
export async function getAnsweredDayIds(): Promise<Set<string>> {
  return new Set((await marks()).keys());
}

export async function isDayPartial(beyondDayId: string): Promise<boolean> {
  return (await marks()).get(beyondDayId) === true;
}

/** His mark (or unmark) on one day. */
export async function setFoodDayPartial(beyondDayId: string, partial: boolean): Promise<void> {
  if (!(await db.beyondDays.get(beyondDayId))) throw new Error("FOOD_DAY_NOT_FOUND: That day isn't in your records.");
  const commandId = newId();
  await logEvent(beyondDayId, "FOOD_DAY_PARTIAL_SET", foodDayPartialSchema.parse({ commandId, partial }), "USER", commandId);
}

/** DONE on the monthly suggestion: each shown day gets his answer, marked or not, in one write. */
export async function answerShortDays(answers: readonly { beyondDayId: string; partial: boolean }[]): Promise<void> {
  await writeAtomically(["beyondDays"], async () => {
    for (const a of answers) await setFoodDayPartial(a.beyondDayId, a.partial);
  });
}
