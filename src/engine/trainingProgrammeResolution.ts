import { WEEK_PLAN_EMPTY, WEEK_PLAN_REST, type TrainingProgramme, type WeekPlanTrainingProgramme } from "../domain/workout/trainingProgramme";

/**
 * GRAYSON-WEEK-PLAN-001: a week plan's day: its one-day override first, then the plan for that week of his cycle and
 * that weekday. `weekIndex` comes from his saved schedule's anchor (0 when there's no saved schedule).
 */
export function resolveWeekPlanDay(programme: WeekPlanTrainingProgramme, date: Date, weekIndex: number): { value: string; source: "OVERRIDE" | "WEEK" } {
  const override = programme.overrides?.[localDate(date)];
  if (override !== undefined) return { value: override, source: "OVERRIDE" };
  const week = programme.weeks[weekIndex % Math.max(1, programme.weeks.length)] ?? programme.weeks[0] ?? {};
  return { value: week[String(date.getDay())] ?? WEEK_PLAN_REST, source: "WEEK" };
}

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Pure selection of an operator assignment, not a recommendation or progression rule. */
export function resolveProgrammeSlot(programme: TrainingProgramme | null, date: Date, contextForDate: (date: Date) => "WORK" | "OFF", weekIndexFor: (date: Date) => number = () => 0) {
  if (!programme) return { key: null, templateId: null };
  if (programme.mode === "SEQUENCE") return { key: null, templateId: null };
  if (programme.mode === "WEEK_PLAN") {
    const day = resolveWeekPlanDay(programme, date, weekIndexFor(date));
    // Rest plans nothing; an empty workout plans a session with no routine ("").
    return { key: day.source === "OVERRIDE" ? localDate(date) : String(date.getDay()), templateId: day.value === WEEK_PLAN_REST ? null : day.value === WEEK_PLAN_EMPTY ? "" : day.value };
  }
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
