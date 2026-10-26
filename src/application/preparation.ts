import { z } from "zod";
import { db } from "../persistence/db";
import type { PreparationItem, PreparationState, PreparationValue } from "../domain/preparation";
import { writeAtomically } from "./atomicWrite";
import { logEvent } from "./commands";
import { byTimeThenSeq, getActiveDay } from "./queries";
import { computeDueRollover } from "../engine/dayRollover";

const payloadSchema = z.object({
  item: z.enum(["FOOD", "BOTTLE"]),
  value: z.enum(["UNCONFIRMED", "READY", "HOMEMADE", "FROZEN", "OTHER", "NOT_NEEDED"]),
  supersedes: z.string().nullable(),
}).strict().refine((p) => p.item === "FOOD" || ["UNCONFIRMED", "READY", "NOT_NEEDED"].includes(p.value));

/** Read only. Missing is unconfirmed; unreadable preparation is an error, never an empty checklist. */
export async function getPreparation(dayId: string): Promise<PreparationState> {
  const state: PreparationState = {
    FOOD: { id: null, value: "UNCONFIRMED", recordedAt: null },
    BOTTLE: { id: null, value: "UNCONFIRMED", recordedAt: null },
  };
  const events = (await db.events.where("beyondDayId").equals(dayId).toArray())
    .filter((e) => e.type === "PREPARATION_RECORDED")
    .sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq));
  for (const event of events) {
    const payload = payloadSchema.safeParse(event.payload);
    if (!payload.success) throw new Error("Preparation history could not be read. Your records are unchanged.");
    state[payload.data.item] = { id: event.id, value: payload.data.value, recordedAt: event.recordedAt };
  }
  return state;
}

/** Atomic item revision; undo is another revision with ownership of the head it reverses. */
export async function recordPreparation(input: { dayId: string; item: PreparationItem; value: PreparationValue; expectedPreviousId: string | null }) {
  const payload = payloadSchema.safeParse({ item: input.item, value: input.value, supersedes: input.expectedPreviousId });
  if (!payload.success) throw new Error("Choose a valid preparation option. Nothing was saved.");
  return writeAtomically(["beyondDays"], async () => {
    const day = await getActiveDay();
    if (!day || day.id !== input.dayId || computeDueRollover(new Date(day.startedAt), new Date())) {
      throw new Error("Your day changed. Reopen preparation for the current day. Nothing was saved.");
    }
    const state = await getPreparation(day.id);
    const previous = state[input.item];
    if (previous.value === input.value) return { id: previous.id, previousValue: previous.value, changed: false, state };
    if (previous.id !== input.expectedPreviousId) throw new Error("Preparation changed elsewhere. Reload its saved version before changing it.");
    const id = await logEvent(day.id, "PREPARATION_RECORDED", payload.data, "USER", crypto.randomUUID(), previous.id ?? undefined);
    return { id, previousValue: previous.value, changed: true, state: await getPreparation(day.id) };
  });
}
