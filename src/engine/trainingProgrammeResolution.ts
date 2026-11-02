import type { TrainingProgramme } from "../domain/workout/trainingProgramme";

/** Pure selection of an operator assignment, not a recommendation or progression rule. */
export function resolveProgrammeSlot(programme: TrainingProgramme | null, date: Date, contextForDate: (date: Date) => "WORK" | "OFF") {
  if (!programme) return { key: null, templateId: null };
  let key: string;
  if (programme.mode === "WEEKDAYS") key = String(date.getDay());
  else {
    const kind = contextForDate(date);
    let position = 1;
    // A longer saved work/off block has no slot beyond day 3; it remains unassigned.
    while (position <= 3) {
      const prior = new Date(date.getFullYear(), date.getMonth(), date.getDate() - position, 16, 30);
      if (contextForDate(prior) !== kind) break;
      position++;
    }
    key = `${kind}${position}`;
  }
  return { key, templateId: programme.slots[key] ?? null };
}
