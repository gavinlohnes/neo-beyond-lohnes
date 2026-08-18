import type { Capacity, StateCheckIn } from "../domain/common/types";

export interface CapacityResult {
  capacity: Capacity;
  reasonCodes: string[];
}

/**
 * LOCKED capacity rule. Do not replace with a weighted score or AI
 * interpretation without an explicit product decision — see
 * BEYOND — DECISION REGISTER.
 */
export function deriveCapacity(checkIn: StateCheckIn): CapacityResult {
  const redReasons: string[] = [];
  if (checkIn.energy === 1) redReasons.push("energy == 1");
  if (checkIn.stress === 5) redReasons.push("stress == 5");
  if (checkIn.mood === 1) redReasons.push("mood == 1");
  if (checkIn.alcoholUrge >= 4) redReasons.push("alcoholUrge >= 4");

  if (redReasons.length > 0) {
    return { capacity: "RED", reasonCodes: redReasons };
  }

  const yellowReasons: string[] = [];
  if (checkIn.energy <= 2) yellowReasons.push("energy <= 2");
  if (checkIn.stress >= 4) yellowReasons.push("stress >= 4");
  if (checkIn.mood <= 2) yellowReasons.push("mood <= 2");
  if (checkIn.soreness >= 4) yellowReasons.push("soreness >= 4");
  if (checkIn.alcoholUrge >= 2) yellowReasons.push("alcoholUrge >= 2");

  if (yellowReasons.length > 0) {
    return { capacity: "YELLOW", reasonCodes: yellowReasons };
  }

  return { capacity: "GREEN", reasonCodes: ["no severe or constrained condition"] };
}
