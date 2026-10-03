import { db } from "../persistence/db";
import type { PerformedSet } from "../domain/workout/types";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";
import { getUndoneSetIds } from "./trainQueries";
import { byLoggedOrder, findSessionRecords, type PersonalRecord } from "./personalRecordQueries";
import { getBodyweightHistory, projectGoalDate, type GoalProjection } from "./bodyTrendQueries";
import { getEffectiveProteinTargetG, getNutritionTargets } from "./nutritionTargetQueries";
import { getQuitHabit } from "./quitQueries";
import { getTotalProteinGrams } from "./queries";
import { getTotalMealProteinGrams } from "./nutritionQueries";
import { getCustomExercises } from "./exerciseLibraryQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { summarizeBurden, type BurdenSummary } from "../engine/dayLedger";
import { projectRibbon, type RibbonDay } from "../engine/ribbon";
import { getCustomTemplates } from "./customTemplateQueries";

/**
 * Drop 7 (weekly check-in, owner approval 2026-10-01). One read-only summary
 * of the last 7 days (rolling, which fits shift work better than Mon–Sun),
 * derived entirely from what's already logged: nothing stored, nothing fed
 * to the Engine. Adherence-neutral: every section reports facts, and a
 * section with too little data says so instead of grading anything.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeeklySummary {
  weight: {
    avgLbs?: number;
    /** This week's average minus last week's, when both weeks have weigh-ins. */
    changeLbs?: number;
    weighIns: number;
    goalWeightLbs?: number;
    projection: GoalProjection;
  };
  training: {
    workouts: number;
    records: { exerciseName: string; record: PersonalRecord }[];
  };
  quit?: {
    habitName: string;
    cleanDays: number;
    savedUsd?: number;
  };
  protein: {
    /** Average over days in the window that logged any protein. */
    avgGrams?: number;
    daysLogged: number;
    targetGrams?: number;
  };
  /** Burden Meter (Drop 1): what BEYOND asked for this week, from the Day Ledger. */
  burden: BurdenSummary;
  /**
   * The Ribbon (2026-10-03): the last 28 lived days from the Day Ledger, with
   * the display name for each workout template that appears, and the protein
   * target the Ribbon's protein row is drawn against (today's, labelled).
   */
  ribbon: { days: RibbonDay[]; templateLabels: Record<string, string>; proteinTargetG?: number };
}

function inWindow(iso: string | undefined, start: number, end: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t > start && t <= end;
}

function average(values: number[]): number | undefined {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
}

export async function getWeeklySummary(now: Date = new Date()): Promise<WeeklySummary> {
  const end = now.getTime();
  const start = end - 7 * DAY_MS;
  const prevStart = start - 7 * DAY_MS;

  // Weight
  const history = await getBodyweightHistory();
  const thisWeek = history.filter((w) => inWindow(w.recordedAt, start, end)).map((w) => w.weightLbs);
  const lastWeek = history.filter((w) => inWindow(w.recordedAt, prevStart, start)).map((w) => w.weightLbs);
  const avgLbs = average(thisWeek);
  const prevAvg = average(lastWeek);
  const targets = await getNutritionTargets();
  const goalWeightLbs = targets.goalWeightLbs;

  // Training: sessions finished in the window, and the records they set,
  // judged against everything logged in earlier sessions only.
  const sessions = (await db.workoutSessions.toArray())
    .filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const undone = await getUndoneSetIds();
  const allSets = ((await db.performedSets.toArray()) as unknown as PerformedSet[]).filter((s) => !undone.has(s.id));
  const setsBySession = new Map<string, PerformedSet[]>();
  for (const set of allSets) {
    const list = setsBySession.get(set.sessionId) ?? [];
    list.push(set);
    setsBySession.set(set.sessionId, list);
  }
  const names = new Map<string, string>();
  for (const template of Object.values(WORKOUT_TEMPLATES)) {
    for (const ex of template.exercises) names.set(ex.exerciseId, ex.name);
  }
  for (const ex of await getCustomExercises({ includeArchived: true })) names.set(ex.id, ex.name);
  const priorSets: PerformedSet[] = [];
  let workouts = 0;
  const records: WeeklySummary["training"]["records"] = [];
  for (const session of sessions) {
    const sets = setsBySession.get(session.id) ?? [];
    if (inWindow(session.endedAt ?? session.startedAt, start, end)) {
      workouts += 1;
      const found = findSessionRecords(priorSets, sets);
      for (const set of [...sets].sort(byLoggedOrder)) {
        const record = found.get(set.id);
        if (record) records.push({ exerciseName: names.get(set.exerciseId) ?? set.exerciseId, record });
      }
    }
    priorSets.push(...sets);
  }
  // One line per exercise: each later record beats the earlier ones, so the latest is the week's best.
  const bestPerExercise = new Map<string, WeeklySummary["training"]["records"][number]>();
  for (const r of records) {
    bestPerExercise.delete(r.exerciseName);
    bestPerExercise.set(r.exerciseName, r);
  }

  // Quit tracker
  const habit = await getQuitHabit();
  let quit: WeeklySummary["quit"];
  if (habit) {
    const cleanEvents = await db.events.where("type").equals("CLEAN_DAY_LOGGED").toArray();
    const dayIds = [...new Set(cleanEvents.flatMap((e) => (e.beyondDayId ? [e.beyondDayId] : [])))];
    const days = await db.beyondDays.bulkGet(dayIds);
    const cleanDays = days.filter((d) => d && inWindow(d.startedAt, start, end)).length;
    quit = {
      habitName: habit.name,
      cleanDays,
      ...(habit.dailyCostUsd !== undefined ? { savedUsd: habit.dailyCostUsd * cleanDays } : {}),
    };
  }

  // Protein: protein-only logs plus meal protein, per BeyondDay begun in the window.
  const windowDays = (await db.beyondDays.toArray()).filter((d) => inWindow(d.startedAt, start, end));
  const dailyProtein: number[] = [];
  for (const day of windowDays) {
    const grams = (await getTotalProteinGrams(day.id)) + (await getTotalMealProteinGrams(day.id));
    if (grams > 0) dailyProtein.push(grams);
  }
  const avgGrams = average(dailyProtein);
  const targetGrams = await getEffectiveProteinTargetG();

  // Burden Meter: the same BeyondDays begun in the window, read from the Day Ledger.
  const daySummaries = await getDaySummaries();
  const burden = summarizeBurden(daySummaries.filter((d) => inWindow(d.startedAt, start, end)));

  // The Ribbon: built-in templates show as A/B/C, custom ones by their own name.
  const ribbonDays = projectRibbon(daySummaries, now);
  const templateLabels: Record<string, string> = {};
  for (const id of Object.keys(WORKOUT_TEMPLATES)) templateLabels[id] = id;
  for (const t of await getCustomTemplates({ includeArchived: true })) templateLabels[t.id] = t.name;

  return {
    weight: {
      ...(avgLbs !== undefined ? { avgLbs } : {}),
      ...(avgLbs !== undefined && prevAvg !== undefined ? { changeLbs: avgLbs - prevAvg } : {}),
      weighIns: thisWeek.length,
      ...(goalWeightLbs !== undefined ? { goalWeightLbs } : {}),
      projection: projectGoalDate(history, goalWeightLbs),
    },
    training: { workouts, records: [...bestPerExercise.values()] },
    ...(quit ? { quit } : {}),
    protein: {
      ...(avgGrams !== undefined ? { avgGrams } : {}),
      daysLogged: dailyProtein.length,
      ...(targetGrams !== undefined ? { targetGrams } : {}),
    },
    burden,
    ribbon: {
      days: ribbonDays,
      templateLabels,
      ...(targetGrams !== undefined ? { proteinTargetG: targetGrams } : {}),
    },
  };
}
