import { getCustomTemplates } from "./customTemplateQueries";
import { getSchedulePattern } from "./queries";
import { getTrainingProgrammeHistory, saveTrainingProgramme } from "./trainingProgramme";
import { getProgrammeView } from "./trainingProgrammeQueries";
import { suggestTemplateForNextWorkout } from "./trainQueries";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { formatLocalDate, isOperatorSavedSchedule, scheduleWeekIndex, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { resolveProgrammeSlot, resolveWeekPlanDay } from "../engine/trainingProgrammeResolution";
import { WORKOUT_TEMPLATE_ORDER, WORKOUT_TEMPLATES } from "../domain/workout/types";
import { WEEK_PLAN_EMPTY, WEEK_PLAN_REST, WEEKDAY_SLOTS, type ProgrammeRevision, type TrainingProgramme, type WeekPlanTrainingProgramme } from "../domain/workout/trainingProgramme";
import type { CustomWorkoutTemplate } from "../domain/workout/customTemplate";
import type { SchedulePattern } from "../domain/common/types";

/**
 * GRAYSON-WEEK-PLAN-001 (Gavin, 2026-11-25): his training week on his saved Week A and Week B. Every change is a new
 * programme revision (TRAIN_PROGRAM_SET), so UNDO puts the previous one back and the old modes stay restorable.
 *
 * Gavin, 2026-11-26 (the brief's stop-and-ask, "Keep today as now"): converting his current setup saves a one-day
 * override for today with what TRAIN plans right now, so today never changes; the week takes over from tomorrow.
 */

const DAY_MS = 86_400_000;
const atBoundary = (y: number, m: number, d: number) => new Date(y, m, d, 16, 30);
const addDays = (date: Date, days: number) => atBoundary(date.getFullYear(), date.getMonth(), date.getDate() + days);
const mondayOf = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface WeekPlanDayView {
  date: string;
  weekday: string;
  work: "WORK" | "OFF" | null;
  value: string;
  name: string;
  source: "OVERRIDE" | "WEEK";
  today: boolean;
  past: boolean;
  /** Which week of his cycle (0 = Week A). */
  weekIndex: number;
}
export interface WeekPlanWeekView { title: "THIS WEEK" | "NEXT WEEK"; letter: string | null; days: WeekPlanDayView[] }
export interface WeekPlanChoice { value: string; name: string }

export interface WeekPlanView {
  revisionId: string | null;
  /** The plan in force, or null when he hasn't started one. */
  plan: WeekPlanTrainingProgramme | null;
  /** When there's no plan yet: his current setup laid on the week, to look at before saving. */
  draft: { plan: WeekPlanTrainingProgramme; from: string; today: string } | null;
  scheduleSaved: boolean;
  weeks: WeekPlanWeekView[];
  choices: WeekPlanChoice[];
  today: string;
}

export function weekLetter(index: number, cycle: number): string | null {
  return cycle > 1 ? String.fromCharCode(65 + index) : null;
}

function nameOf(value: string, custom: readonly CustomWorkoutTemplate[]): string {
  if (value === WEEK_PLAN_REST) return "Rest";
  if (value === WEEK_PLAN_EMPTY) return "Empty workout";
  if (Object.hasOwn(WORKOUT_TEMPLATES, value)) return `Workout ${value}`;
  return custom.find((t) => t.id === value)?.name ?? "Routine no longer available";
}

interface Context { schedule: SchedulePattern; saved: boolean; cycle: number; today: Date }
async function context(now: Date): Promise<Context> {
  const schedule = await getSchedulePattern();
  const saved = isOperatorSavedSchedule(schedule);
  return { schedule, saved, cycle: saved ? Math.max(1, schedule.weeks.length) : 1, today: mostRecentBoundaryAtOrBefore(now) };
}
const weekIndexOf = (ctx: Context, date: Date) => (ctx.saved ? scheduleWeekIndex(date, ctx.schedule) : 0);
const workOf = (ctx: Context, date: Date) => (ctx.saved ? scheduledWorkContextForLivedDay(date, ctx.schedule) : null);

/** The first day of each week of his current cycle (Week A's Monday first). */
function cycleMondays(ctx: Context): Date[] {
  const thisMonday = mondayOf(ctx.today);
  const start = addDays(thisMonday, -7 * weekIndexOf(ctx, ctx.today));
  return Array.from({ length: ctx.cycle }, (_, w) => addDays(start, 7 * w));
}

const emptyWeek = () => Object.fromEntries(WEEKDAY_SLOTS.map((d) => [d, WEEK_PLAN_REST])) as Record<string, string>;

/**
 * Pure apart from reads: his current setup laid on the week, day by day.
 * - WEEKDAYS: each weekday's routine, every week.
 * - ROTATION: each day of his cycle resolved from the saved schedule, as TRAIN resolves it.
 * - SEQUENCE: A, B and C in turn, three a week, on his days off first, then work days, carrying on from the member
 *   after the one TRAIN plans today.
 * - Nothing set: every day Rest.
 * Today is kept as TRAIN plans it now (Gavin, 2026-11-26).
 */
export async function draftWeekPlan(now = new Date()): Promise<{ plan: WeekPlanTrainingProgramme; from: string; today: string }> {
  const ctx = await context(now);
  const view = await getProgrammeView(now);
  const programme: TrainingProgramme | null = view.revision.programme;
  const mondays = cycleMondays(ctx);
  const weeks = mondays.map(() => emptyWeek());
  let from = "Nothing was planned, so every day starts as Rest.";

  if (programme?.mode === "WEEKDAYS") {
    for (const week of weeks) for (const d of WEEKDAY_SLOTS) week[d] = programme.slots[d] ?? WEEK_PLAN_REST;
    from = "From your weekday assignments.";
  } else if (programme?.mode === "ROTATION" && ctx.saved) {
    const contextFor = (day: Date) => scheduledWorkContextForLivedDay(day, ctx.schedule);
    mondays.forEach((monday, w) => {
      for (let i = 0; i < 7; i++) {
        const day = addDays(monday, i);
        weeks[w]![String(day.getDay())] = resolveProgrammeSlot(programme, day, contextFor).templateId ?? WEEK_PLAN_REST;
      }
    });
    from = "From your work-day and day-off assignments, on your saved schedule.";
  } else if (programme?.mode === "SEQUENCE") {
    const members = programme.members.map((m) => m.templateId);
    const nextId = view.sequence?.nextMember?.templateId ?? programme.startTemplateId;
    let turn = (members.indexOf(nextId) + 1) % members.length;
    // Three a week: days off first (Monday to Sunday), then work days. Start after today, wrap round the cycle.
    const slots = mondays.flatMap((monday, w) => {
      const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
      const off = days.filter((day) => workOf(ctx, day) !== "WORK");
      const work = days.filter((day) => workOf(ctx, day) === "WORK");
      return [...off, ...work].slice(0, members.length).sort((a, b) => a.getTime() - b.getTime()).map((day) => ({ w, day }));
    });
    const after = slots.filter((s) => s.day.getTime() > ctx.today.getTime() + DAY_MS / 2);
    for (const s of [...after, ...slots.filter((x) => !after.includes(x))]) {
      weeks[s.w]![String(s.day.getDay())] = members[turn]!;
      turn = (turn + 1) % members.length;
    }
    from = "From your A → B → C sequence: three a week, days off first, carrying on after today's.";
  } else if (programme?.mode === "WEEK_PLAN") {
    return { plan: programme, from: "Your current week plan.", today: formatLocalDate(ctx.today) };
  }

  // Today stays what TRAIN plans right now.
  const todayPlan = view.sequence?.status === "READY" && view.sequence.nextMember ? view.sequence.nextMember.templateId : await suggestTemplateForNextWorkout();
  const today = formatLocalDate(ctx.today);
  return { plan: { mode: "WEEK_PLAN", weeks, overrides: { [today]: todayPlan } }, from, today };
}

export async function getWeekPlanView(now = new Date()): Promise<WeekPlanView> {
  const ctx = await context(now);
  const [view, custom] = await Promise.all([getProgrammeView(now), getCustomTemplates()]);
  const current = view.revision.programme?.mode === "WEEK_PLAN" ? view.revision.programme : null;
  const draft = current ? null : await draftWeekPlan(now);
  const plan = current ?? draft!.plan;
  const thisMonday = mondayOf(ctx.today);
  const todayKey = formatLocalDate(ctx.today);
  const weeks = (["THIS WEEK", "NEXT WEEK"] as const).map((title, offset): WeekPlanWeekView => {
    const monday = addDays(thisMonday, 7 * offset);
    const index = weekIndexOf(ctx, monday);
    return {
      title, letter: ctx.saved ? weekLetter(index, ctx.cycle) : null,
      days: Array.from({ length: 7 }, (_, i) => {
        const day = addDays(monday, i);
        const resolved = resolveWeekPlanDay(plan, day, index);
        const date = formatLocalDate(day);
        return { date, weekday: WEEKDAY_NAMES[day.getDay()]!, work: workOf(ctx, day), value: resolved.value, name: nameOf(resolved.value, custom),
          source: resolved.source, today: date === todayKey, past: date < todayKey, weekIndex: index };
      }),
    };
  });
  const choices: WeekPlanChoice[] = [
    ...WORKOUT_TEMPLATE_ORDER.map((id) => ({ value: id, name: `Workout ${id}` })),
    ...custom.map((t) => ({ value: t.id, name: t.name })),
    { value: WEEK_PLAN_EMPTY, name: "Empty workout" },
    { value: WEEK_PLAN_REST, name: "Rest" },
  ];
  return { revisionId: view.revision.id, plan: current, draft, scheduleSaved: ctx.saved, weeks, choices, today: todayKey };
}

// ---- Changes (each a new programme revision; UNDO puts the previous back) ------------------------------------------

export interface WeekPlanChange { revisionId: string; previousId: string | null }

async function save(plan: WeekPlanTrainingProgramme, expectedPreviousId: string | null): Promise<WeekPlanChange> {
  // Overrides for days already gone are dropped as the plan is saved (they ended after their day).
  const ctx = await context(new Date());
  const today = formatLocalDate(ctx.today);
  const overrides = Object.fromEntries(Object.entries(plan.overrides ?? {}).filter(([date]) => date >= today));
  const next: WeekPlanTrainingProgramme = { mode: "WEEK_PLAN", weeks: plan.weeks, ...(Object.keys(overrides).length ? { overrides } : {}) };
  const saved = await saveTrainingProgramme(next, expectedPreviousId);
  return { revisionId: saved.id!, previousId: expectedPreviousId };
}

async function currentPlan(): Promise<{ id: string | null; plan: WeekPlanTrainingProgramme }> {
  const history = await getTrainingProgrammeHistory();
  const revision: ProgrammeRevision = history.at(-1) ?? { id: null, programme: null };
  if (revision.programme?.mode !== "WEEK_PLAN") throw new Error("WEEK_PLAN_NOT_STARTED: Start your week first.");
  return { id: revision.id, plan: structuredClone(revision.programme) };
}

/** USE THIS WEEK: the plan he looked at (his current setup converted, or his own edit of it). */
export function useWeekPlan(plan: WeekPlanTrainingProgramme, expectedPreviousId: string | null): Promise<WeekPlanChange> {
  return save(plan, expectedPreviousId);
}

/** A day changed: JUST THIS DAY (a dated override) or EVERY week like it (Week A or Week B, by its week index). */
export async function setWeekPlanDay(date: string, value: string, scope: "DAY" | "EVERY_WEEK", now = new Date()): Promise<WeekPlanChange> {
  const { id, plan } = await currentPlan();
  if (scope === "DAY") {
    plan.overrides = { ...(plan.overrides ?? {}), [date]: value };
  } else {
    const ctx = await context(now);
    const [y, m, d] = date.split("-").map(Number);
    const day = atBoundary(y!, m! - 1, d!);
    const week = plan.weeks[weekIndexOf(ctx, day) % plan.weeks.length]!;
    week[String(day.getDay())] = value;
    // EVERY WEEK replaces this day's own one-day change too, so what he picked is what he sees.
    if (plan.overrides) delete plan.overrides[date];
  }
  return save(plan, id);
}

/** Move to…: the day's workout goes to another day this week, and Rest stays behind. Both are one-day changes. */
export async function moveWeekPlanDay(fromDate: string, toDate: string, now = new Date()): Promise<WeekPlanChange> {
  if (fromDate === toDate) throw new Error("WEEK_PLAN_SAME_DAY: Pick another day.");
  const { id, plan } = await currentPlan();
  const ctx = await context(now);
  const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return atBoundary(y!, m! - 1, d!); };
  const value = resolveWeekPlanDay(plan, parse(fromDate), weekIndexOf(ctx, parse(fromDate))).value;
  if (value === WEEK_PLAN_REST) throw new Error("WEEK_PLAN_NOTHING_TO_MOVE: That day is already Rest.");
  plan.overrides = { ...(plan.overrides ?? {}), [toDate]: value, [fromDate]: WEEK_PLAN_REST };
  return save(plan, id);
}

/** UNDO: the programme goes back to the revision before this change (the old setup, after USE THIS WEEK). */
export async function undoWeekPlanChange(change: WeekPlanChange): Promise<void> {
  const history = await getTrainingProgrammeHistory();
  const current = history.at(-1);
  if (current?.id !== change.revisionId) throw new Error("WEEK_PLAN_UNDO_STALE: Your week has changed since. Change the day directly instead.");
  const previous = change.previousId ? history.find((r) => r.id === change.previousId)?.programme ?? null : null;
  await saveTrainingProgramme(previous, change.revisionId);
}
