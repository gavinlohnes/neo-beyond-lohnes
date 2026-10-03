import { findSameFood, type SameFoodPair } from "../engine/sameFood";
import { getProteinEntries } from "./queries";
import { getMealEntries } from "./nutritionQueries";

/**
 * "Same food?" (Drop 1.5): reads the day's protein-only logs and meals
 * (deleted ones already excluded) and asks the pure engine/sameFood.ts rule
 * whether the log just written looks like a duplicate of the other kind.
 * Read-only; the answer only ever prompts a question.
 */
export async function getSameFoodCheck(
  beyondDayId: string,
  justLogged: { kind: "PROTEIN" | "MEAL"; id: string },
): Promise<SameFoodPair | undefined> {
  const proteinLogs = (await getProteinEntries(beyondDayId)).map((e) => ({ id: e.rootEventId, grams: e.effectiveGrams, at: e.recordedAt }));
  const meals = (await getMealEntries(beyondDayId)).map((m) => ({ id: m.rootEventId, name: m.name, proteinG: m.effectiveProteinG, at: m.recordedAt }));
  return findSameFood(proteinLogs, meals, justLogged);
}
