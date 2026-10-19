import { readStealth, writeStealth } from "../persistence/stealth";
import { getActiveDay, getDayProteinTotalG, getEffectiveHydrationTotal } from "./queries";
import { getEffectiveProteinTargetG } from "./nutritionTargetQueries";
import { getActiveWorkoutSession } from "./trainQueries";

/**
 * SUIT-001: stealth hides the screen, not the data. Its on/off state stays on
 * this phone until Gavin exits it; it is not an event and not in backups.
 */
export function getStealth(): boolean {
  return readStealth();
}

export function setStealth(on: boolean): void {
  writeStealth(on);
}

/** The two readings stealth can peek at, from the same totals TODAY and BODY show. */
export async function getStealthReadings(): Promise<{
  dayId: string | null;
  proteinG: number | null;
  proteinTargetG: number | undefined;
  waterOz: number | null;
  workoutActive: boolean;
}> {
  const [day, target, workout] = await Promise.all([getActiveDay(), getEffectiveProteinTargetG(), getActiveWorkoutSession()]);
  if (!day) return { dayId: null, proteinG: null, proteinTargetG: target, waterOz: null, workoutActive: !!workout };
  const [proteinG, waterOz] = await Promise.all([getDayProteinTotalG(day.id), getEffectiveHydrationTotal(day.id)]);
  return { dayId: day.id, proteinG, proteinTargetG: target, waterOz, workoutActive: !!workout };
}
