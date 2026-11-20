import { getDaySummaries } from "./dayLedgerQueries";
import { getActiveDay } from "./queries";
import { deriveShortSleepStreak, type ShortSleepNight } from "../engine/sleepStreak";

/**
 * DRAFT-REC-001 (Gavin, 2026-11-19: HARVEST-003 part 2, "Honest preview"): what is already certain before you check
 * in. The Engine's own short-sleep rule (SLEEP-ENGINE-001) caps today at a reduced session whatever the check-in says
 * (GREEN → REDUCED; YELLOW → REDUCED; RED → RESET). So when it applies, BEYOND can say so first. It calls the same
 * Engine function the check-in will use, with the same inputs; nothing is recorded, and the locked capacity rule is
 * untouched. Null when the rule doesn't apply (still learning, unknown context, a missing night, or sleep in range).
 */
export interface PreCheckInPreview { nights: ShortSleepNight[] }
export async function getPreCheckInPreview(now = new Date()): Promise<PreCheckInPreview | null> {
  const day = await getActiveDay();
  if (!day) return null;
  const streak = deriveShortSleepStreak(await getDaySummaries(), day.id, now);
  return streak.streak ? { nights: streak.nights } : null;
}
