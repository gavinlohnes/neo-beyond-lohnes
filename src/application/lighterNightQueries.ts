import { db } from "../persistence/db";
import { readFitsNowOn } from "../persistence/fitsNowPreference";
import { lighterLiftFor, readLighterNightDay, readLighterNightSettings, type LighterNightDay } from "../persistence/lighterNightPreference";
import { lighterNight, type LighterNightView } from "../engine/lighterNight";
import { formatLocalDate, livedDayShiftWindow } from "../engine/scheduledContext";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";
import type { WorkoutTemplateId } from "../domain/workout/types";
import type { BeyondDay } from "../domain/common/types";
import { getActiveDay, getMinimumDayStatus, getPlannedWorkDeclaration, getSchedulePattern, getWorkContextSource } from "./queries";
import { getRecordedDayBefore, getRecordedYesterday, deriveLifeState, lifeStateInput } from "./lifeState";
import { deriveLifeMoment, lifeMomentInput } from "./lifeTransition";
import { getConfirmedKinds } from "./scheduleExceptions";
import { recordedBy } from "./workContextResolution";
import { livedReadAt } from "./earlyDayStart";
import { livedDayStartOf } from "./reflect";
import { shiftRun } from "./shiftRun";
import { getWeekEnergyForecast } from "./weekEnergyForecast";
import { RUN_MEAN_FLOOR } from "./rotationProjection";
import { getTonightState } from "./tonightQueries";
import { getSessionMinutesEstimate, suggestTemplateForNextWorkout } from "./trainQueries";
import { getCustomTemplates } from "./customTemplateQueries";
import { getProgrammeView } from "./trainingProgrammeQueries";
import { usesOnKind } from "./fitsNowQueries";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { HOME_PREFIX } from "./homeCommands";
import { plannerDates } from "./weekPlannerQueries";

/**
 * GRAYSON-LIGHTER-NIGHT-001 (Gavin, 2026-11-26): read only. On the last night of a run of two or more, from his
 * work-night wake until the shift starts, the three pieces that already exist for an easier night: tonight's SHORT lift,
 * his work-night usuals in Fits now, and the home jobs planned for tonight moved to his first day off. Nothing here
 * writes; lighterNightCommands.ts takes and undoes each part through the existing commands.
 */
export interface LighterNightPlan {
  dayId: string;
  /** Tonight's calendar date (the lived day's start) and his first day off. */
  tonight: string;
  firstOff: string | null;
  lift: { name: string; form: "REDUCED" | "LINKED"; minutes: number | undefined } | null;
  food: boolean;
  homeJobs: { id: string; title: string; updatedAt: string; plannedAt: string; dueTonight: boolean }[];
  toLabel: string;
}
export interface LighterNight { view: LighterNightView; plan: LighterNightPlan; day: LighterNightDay }

const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" });

/** Tonight's SHORT lift: the programme's linked SHORT for a sequence member, else TRAIN's REDUCED form of tonight's lift. */
async function tonightsShortLift(day: BeyondDay, at: Date): Promise<LighterNightPlan["lift"]> {
  const [tonight, active] = await Promise.all([
    getTonightState(day.id),
    db.workoutSessions.where("status").equals("ACTIVE").count(),
  ]);
  // Already trained, a workout running, or he already said not tonight: there's nothing to make lighter.
  if (tonight.trained || active > 0 || tonight.planned === false) return null;
  const programme = await getProgrammeView(at);
  const mode = programme.revision.programme?.mode ?? null;
  if (mode === "SEQUENCE") {
    const next = programme.sequence?.status === "READY" ? programme.sequence.nextMember : null;
    if (!next || next.issue) return null;
    if (next.short && !next.short.issue) {
      return { name: `SHORT ${next.key}`, form: "LINKED", minutes: await getSessionMinutesEstimate(next.short.templateId, "STANDARD") };
    }
    return { name: `SHORT ${next.key}`, form: "REDUCED", minutes: await getSessionMinutesEstimate(next.templateId, "REDUCED") };
  }
  // A day or rotation programme names tonight's lift; a rest slot has none. With no programme, TRAIN's next workout.
  const templateId = (mode ? programme.planned.templateId : await suggestTemplateForNextWorkout()) as WorkoutTemplateId | null;
  if (!templateId) return null;
  const custom = await getCustomTemplates();
  const label = WORKOUT_TEMPLATES[templateId] ? templateId : custom.find((t) => t.id === templateId)?.name;
  if (!label) return null;
  return { name: `SHORT ${label}`, form: "REDUCED", minutes: await getSessionMinutesEstimate(templateId, "REDUCED") };
}

export async function getLighterNight(now: Date = new Date()): Promise<LighterNight | null> {
  const settings = readLighterNightSettings();
  if (!settings.on) return null;
  const day = await getActiveDay();
  if (!day) return null;
  const at = livedReadAt(day, now);
  const [pattern, source, yesterday, dayBefore, confirmed, minimum] = await Promise.all([
    getSchedulePattern(), getWorkContextSource(day.id), getRecordedYesterday(at), getRecordedDayBefore(at, 2),
    getConfirmedKinds(), getMinimumDayStatus(day.id),
  ]);
  const recorded = day.workContext === "UNKNOWN" ? null : day.workContext;
  // The same reading TODAY's band makes (todayView.ts): the life state at the lived read time, the moment against now.
  const input = lifeStateInput(at, pattern, recorded, yesterday, source ? recordedBy(source) : undefined, confirmed);
  const moment = deriveLifeMoment(lifeMomentInput(now, pattern, input, dayBefore, confirmed), deriveLifeState(input));
  const stored = readLighterNightDay(day.id);
  if (moment?.moment !== "LAST_SHIFT") return null;
  const run = shiftRun(at, pattern, 21, confirmed);
  const shift = livedDayShiftWindow(new Date(day.startedAt), pattern);
  const beforeShift = !!shift && now.getTime() < shift.start.getTime();
  const tonightStart = livedDayStartOf(at);
  const tonight = formatLocalDate(tonightStart);
  const firstOff = run && run.kind === "WORK" ? formatLocalDate(run.next) : null;
  const toLabel = run ? weekday(run.next) : "";

  const offering = beforeShift && !stored.dismissed && !minimum.enabled;
  const [lift, usuals, obligations, forecast] = offering ? await Promise.all([
    settings.lift ? tonightsShortLift(day, at) : Promise.resolve(null),
    settings.food && readFitsNowOn() ? usesOnKind("WORK", now) : Promise.resolve(new Map<string, number>()),
    settings.home && firstOff && plannerDates(now).includes(firstOff) ? getCurrentlyEligibleUnresolvedObligations() : Promise.resolve([]),
    getWeekEnergyForecast(at).catch(() => null),
  ]) : [null, new Map<string, number>(), [], null] as const;
  const homeJobs = obligations
    .filter((o) => o.title.startsWith(HOME_PREFIX) && o.plannedAt === tonight)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((o) => ({ id: o.id, title: o.title, updatedAt: o.updatedAt, plannedAt: o.plannedAt!, dueTonight: o.dueAt === tonight }));
  const energyDay = forecast?.days.find((d) => d.date === tonight && d.work === "WORK") ?? null;
  const food = [...usuals.values()].some((n) => n > 0);

  const view = lighterNight({
    moment: moment.moment,
    // The moment already says yesterday was a work night too, so this is night 2 or later even when the run's start
    // is past the schedule's horizon.
    run: run && run.kind === "WORK" ? { position: run.position, length: run.length } : { position: 2, length: undefined },
    beforeShift, minimumDay: minimum.enabled, switches: settings, dismissed: !!stored.dismissed,
    energy: energyDay ? { mean: energyDay.energy.mean, days: energyDay.energy.days, basis: energyDay.basis } : null,
    floor: RUN_MEAN_FLOOR,
    lift, food,
    home: homeJobs.length ? { jobs: homeJobs, toLabel } : null,
    taken: {
      lift: stored.lift?.name,
      food: stored.food,
      home: stored.home ? { titles: stored.home.moves.map((m) => m.title), toLabel: stored.home.toLabel } : undefined,
    },
  });
  if (!view) return null;
  return { view, day: stored, plan: { dayId: day.id, tonight, firstOff, lift, food, homeJobs, toLabel } };
}

/** For UNDO's line: the plan answer before TAKE IT. */
export const getPlannedAnswer = (dayId: string) => getPlannedWorkDeclaration(dayId);

/** TRAIN reads this: the SHORT form he took on tonight's lighter night, or null. */
export const getLighterLift = (dayId: string) => lighterLiftFor(dayId);
export { readLighterNightSettings, writeLighterNightSettings, type LighterNightSettings } from "../persistence/lighterNightPreference";
