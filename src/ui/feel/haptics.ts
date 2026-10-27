import { feedback } from "./feedback";

/** Legacy TRAIN callers share the SUIT semantic feedback path. */
export type HapticMeaning = "SET_LOGGED" | "CONFIRMED";
export function haptic(meaning: HapticMeaning): void {
  feedback(meaning === "SET_LOGGED" ? "MEDIUM" : "HEAVY");
}
