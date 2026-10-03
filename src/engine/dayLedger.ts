import type {
  BeyondDay,
  Capacity,
  DomainEvent,
  DomainEventType,
  MealLogVoidedPayload,
  RecommendationKind,
  SchedulePattern,
  StateCheckIn,
  UrgeTrigger,
  WorkContextSetPayload,
  WorkContextSource,
  WorkoutSession,
} from "../domain/common/types";
import type { PerformedSet } from "../domain/workout/types";
import { deriveCapacity } from "./capacity";
import { mostRecentBoundaryAtOrBefore } from "./dayRollover";
import { findSessionRecords } from "./personalRecords";
import { deriveScheduledContext, scheduledWorkContextForLivedDay, type SchedulePhase } from "./scheduledContext";

/**
 * DAY LEDGER (Drop 1, owner brief 2026-10-03). One derived record per
 * BeyondDay — the shared foundation later read-only views (Ribbon, findings,
 * expenditure) are built on. Pure: the same input always gives the same
 * records, nothing is stored, nothing feeds the Engine.
 *
 * Doctrine carried by every field (NO_FAKE_PRECISION): missing data stays
 * missing. A value is present only when something was actually logged; a
 * day with no water logs has no `waterOz`, never 0. Correction chains and
 * voids resolve exactly as the BODY/quit/TRAIN queries already resolve them,
 * so the ledger never disagrees with what the screens showed.
 *
 * Lived days: since DAY-ROLLOVER-001 a BeyondDay runs 16:30 → 16:30, so a
 * night shift that crosses midnight belongs to one record by construction —
 * events carry the BeyondDay they happened on. `livedDayStart` names the
 * 16:30 window each day began in. Days from before the rollover existed can
 * run longer than one window; they stay one record each, as recorded.
 *
 * Schedule-derived fields (`work.scheduled`, each urge's `phase`) read the
 * schedule passed in — today's saved schedule — applied to past dates.
 */

export interface DayLedgerInput {
  days: readonly BeyondDay[];
  events: readonly DomainEvent[];
  workoutSessions: readonly WorkoutSession[];
  performedSets: readonly PerformedSet[];
  schedule: SchedulePattern;
}

export interface LedgerWorkout {
  sessionId: string;
  templateId: string;
  sessionType: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  /** Whole minutes from start to end; absent while the session is still active. */
  durationMinutes?: number;
  /**
   * PRs this session set, judged against earlier finished sessions — the same
   * rule the finish summary and weekly check-in use. Present only for
   * COMPLETED/PARTIAL sessions (an abandoned or active one isn't judged).
   */
  prCount?: number;
  /** Sets logged in this session (skipped sets included, undone sets not). */
  setsLogged: number;
}

export interface LedgerUrge {
  at: string;
  trigger: UrgeTrigger;
  /** Where the urge fell against the schedule (before / during / just after a shift, or off hours). */
  phase: SchedulePhase;
}

export type LedgerDecision = "ACCEPTED" | "DECLINED" | "NO_ACTION_RECORDED";

/** Burden Meter inputs for one day — see BURDEN below for exactly what counts. */
export interface LedgerBurden {
  /** Things the operator recorded or answered by hand (training sets counted separately). */
  manualEntries: number;
  /** Fixes to earlier entries: corrections, deletions, undone urges, and changing an already-set work context. */
  corrections: number;
  /** Sets logged during workouts — the workout itself, kept apart from the day's overhead. */
  trainingSets: number;
  /** When the first manual entry of the day happened, if any. */
  firstEntryAt?: string;
}

export interface DaySummary {
  beyondDayId: string;
  startedAt: string;
  /** When the day ended (its DAY_ENDED event); absent while it is still active. */
  endedAt?: string;
  /** The 16:30 boundary at or before `startedAt` — the lived-day window this day began in. */
  livedDayStart: string;
  work: {
    /** The day's work context as it stands (UNKNOWN when never answered). */
    declared: "WORK" | "OFF" | "UNKNOWN";
    /** Where the standing value came from — the latest WORK_CONTEXT_SET's source. */
    declaredSource?: WorkContextSource;
    /** What the schedule says for this lived day, whatever was declared. */
    scheduled: "WORK" | "OFF";
    /** When MARK WORK ENDED was recorded, if it was. */
    workEndedAt?: string;
  };
  sleep: {
    /** Total effective main sleep logged on this day; absent when none was logged. */
    primaryMinutes?: number;
    /**
     * Each main-sleep log behind that total (when it was logged, effective
     * minutes), in logged order; absent when none was logged. Lets read-only
     * findings place a sleep before a workout by time, not just by day.
     */
    primaryLogs?: { at: string; minutes: number }[];
    /** Total effective naps logged on this day; absent when none was logged. */
    napMinutes?: number;
  };
  /** Effective water logged; absent when none was logged. */
  waterOz?: number;
  /** Protein logs plus meal protein; absent when neither was logged. */
  proteinG?: number;
  /** Meal calories; absent when no meal was logged. */
  kcal?: number;
  workouts: LedgerWorkout[];
  urges: LedgerUrge[];
  /** A clean day was logged (hold-to-confirm) on this day. Never inferred. */
  cleanDay: boolean;
  /** The day's latest check-in, run through the locked capacity rule; absent when no check-in. */
  checkIn?: { capacity: Capacity; reasonCodes: string[]; count: number; at: string };
  /** The latest recommendation issued this day; `decision` absent while undecided. */
  recommendation?: { recommendationId: string; kind: RecommendationKind; issuedAt: string; decision?: LedgerDecision };
  burden: LedgerBurden;
}

// ---- BURDEN ----
//
// Manual entries: facts and answers the operator records by hand — body
// logs, check-ins, answers to BEYOND's questions, routine completions, quit
// tracker entries. Not counted: starting/finishing operations (a workout,
// RESET, SHIFT DOWN, ending the day), anything the Engine or system wrote,
// and planning records (missions, obligations, journal), which are chosen
// work rather than daily upkeep. WORK_CONTEXT_SET counts only when the
// operator set it (never SCHEDULE_STANDING); changing an already-set value
// counts as a correction instead.
const MANUAL_ENTRY_TYPES: ReadonlySet<DomainEventType> = new Set<DomainEventType>([
  "WATER_LOGGED",
  "SLEEP_LOGGED",
  "BODYWEIGHT_LOGGED",
  "PROTEIN_LOGGED",
  "MEAL_LOGGED",
  "STATE_CHECKED_IN",
  "WORK_PERIOD_ENDED",
  "PLANNED_WORK_SET",
  "RECOMMENDATION_ACCEPTED",
  "RECOMMENDATION_DECLINED",
  "NO_ACTION_RECORDED",
  "OUTCOME_RATED",
  "MINIMUM_DAY_ENABLED",
  "MEDS_COMPLETED",
  "HYGIENE_COMPLETED",
  "MOVE_COMPLETED",
  "RECOVER_CONNECT_COMPLETED",
  "URGE_LOGGED",
  "CLEAN_DAY_LOGGED",
]);

const CORRECTION_TYPES: ReadonlySet<DomainEventType> = new Set<DomainEventType>([
  "WATER_LOG_CORRECTED",
  "SLEEP_LOG_CORRECTED",
  "BODYWEIGHT_LOG_CORRECTED",
  "PROTEIN_LOG_CORRECTED",
  "MEAL_LOG_CORRECTED",
  "MEAL_LOG_VOIDED",
  "URGE_UNDONE",
]);

const TRAINING_SET_TYPES: ReadonlySet<DomainEventType> = new Set<DomainEventType>(["SET_LOGGED", "SET_SKIPPED"]);

function deriveBurden(dayEvents: readonly DomainEvent[]): LedgerBurden {
  let manualEntries = 0;
  let corrections = 0;
  let trainingSets = 0;
  let firstEntryAt: string | undefined;
  let workContextAlreadySet = false;
  for (const e of dayEvents) {
    if (e.source !== "USER" && e.type !== "WORK_CONTEXT_SET") continue;
    if (e.type === "WORK_CONTEXT_SET") {
      const source = (e.payload as WorkContextSetPayload).source;
      if (source !== "SCHEDULE_STANDING") {
        if (workContextAlreadySet) corrections += 1;
        else {
          manualEntries += 1;
          firstEntryAt ??= e.occurredAt;
        }
      }
      workContextAlreadySet = true;
      continue;
    }
    if (MANUAL_ENTRY_TYPES.has(e.type)) {
      manualEntries += 1;
      firstEntryAt ??= e.occurredAt;
    } else if (CORRECTION_TYPES.has(e.type)) corrections += 1;
    else if (TRAINING_SET_TYPES.has(e.type)) trainingSets += 1;
    else if (e.type === "SET_UNDONE") trainingSets -= 1;
  }
  return { manualEntries, corrections, trainingSets: Math.max(0, trainingSets), ...(firstEntryAt ? { firstEntryAt } : {}) };
}

// ---- helpers ----

/** Time, then seq — the same order every event list in the app uses. */
function byOccurrence(a: DomainEvent, b: DomainEvent): number {
  return a.occurredAt.localeCompare(b.occurredAt) || (a.seq ?? 0) - (b.seq ?? 0);
}

/**
 * The effective value of a logged → corrected chain: follow each correction
 * that supersedes the current head, same walk as application/queries.ts's
 * walkCorrectionChain. Corrections are tried in id order, the order the app's
 * own queries read them in.
 */
function effectiveValue<T>(root: DomainEvent, corrections: readonly DomainEvent[], read: (payload: unknown) => T): T {
  let head = root;
  let next = corrections.find((c) => (c.payload as { supersedesEventId?: string }).supersedesEventId === head.id);
  while (next) {
    head = next;
    next = corrections.find((c) => (c.payload as { supersedesEventId?: string }).supersedesEventId === head.id);
  }
  return read(head.payload);
}

function sumOrUndefined(values: readonly number[]): number | undefined {
  return values.length === 0 ? undefined : values.reduce((a, b) => a + b, 0);
}

function ofType(events: readonly DomainEvent[], type: DomainEventType): DomainEvent[] {
  return events.filter((e) => e.type === type);
}

function correctionsOf(events: readonly DomainEvent[], type: DomainEventType): DomainEvent[] {
  return ofType(events, type).sort((a, b) => a.id.localeCompare(b.id));
}

function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

// ---- the ledger ----

export function projectDaySummaries(input: DayLedgerInput): DaySummary[] {
  const eventsByDay = new Map<string, DomainEvent[]>();
  for (const e of input.events) {
    if (!e.beyondDayId) continue;
    const list = eventsByDay.get(e.beyondDayId) ?? [];
    list.push(e);
    eventsByDay.set(e.beyondDayId, list);
  }
  for (const list of eventsByDay.values()) list.sort(byOccurrence);

  const undoneSetIds = new Set(
    input.events
      .filter((e) => e.type === "SET_UNDONE")
      .map((e) => (e.payload as { performedSetId?: string }).performedSetId)
      .filter((id): id is string => id !== undefined),
  );
  const setsBySession = new Map<string, PerformedSet[]>();
  for (const set of input.performedSets) {
    if (undoneSetIds.has(set.id)) continue;
    const list = setsBySession.get(set.sessionId) ?? [];
    list.push(set);
    setsBySession.set(set.sessionId, list);
  }
  const prCountBySession = countSessionRecords(input.workoutSessions, setsBySession);

  return [...input.days]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((day) => summarizeDay(day, eventsByDay.get(day.id) ?? [], input, setsBySession, prCountBySession));
}

/** Same judging as the weekly check-in: finished sessions in start order, each against the earlier finished ones. */
function countSessionRecords(
  sessions: readonly WorkoutSession[],
  setsBySession: ReadonlyMap<string, PerformedSet[]>,
): Map<string, number> {
  const finished = sessions
    .filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const prior: PerformedSet[] = [];
  const counts = new Map<string, number>();
  for (const session of finished) {
    const sets = setsBySession.get(session.id) ?? [];
    counts.set(session.id, findSessionRecords(prior, sets).size);
    prior.push(...sets);
  }
  return counts;
}

function summarizeDay(
  day: BeyondDay,
  events: readonly DomainEvent[],
  input: DayLedgerInput,
  setsBySession: ReadonlyMap<string, PerformedSet[]>,
  prCountBySession: ReadonlyMap<string, number>,
): DaySummary {
  const startedAt = new Date(day.startedAt);

  // Work
  const workContextEvents = ofType(events, "WORK_CONTEXT_SET");
  const latestWorkContext = workContextEvents[workContextEvents.length - 1];
  const workEnded = ofType(events, "WORK_PERIOD_ENDED")[0];
  const dayEnded = ofType(events, "DAY_ENDED")[0];

  // Sleep
  const sleepCorrections = correctionsOf(events, "SLEEP_LOG_CORRECTED");
  const primary: number[] = [];
  const primaryLogs: { at: string; minutes: number }[] = [];
  const naps: number[] = [];
  for (const root of ofType(events, "SLEEP_LOGGED")) {
    const minutes = effectiveValue(root, sleepCorrections, (p) => (p as { durationMinutes: number }).durationMinutes);
    if ((root.payload as { kind?: string }).kind === "SUPPLEMENTAL") naps.push(minutes);
    else {
      primary.push(minutes);
      primaryLogs.push({ at: root.occurredAt, minutes });
    }
  }

  // Water
  const waterCorrections = correctionsOf(events, "WATER_LOG_CORRECTED");
  const water = ofType(events, "WATER_LOGGED").map((root) =>
    effectiveValue(root, waterCorrections, (p) => (p as { amountOz: number }).amountOz),
  );

  // Protein + meals (voided meals leave every total, same as getMealEntries)
  const proteinCorrections = correctionsOf(events, "PROTEIN_LOG_CORRECTED");
  const proteinLogs = ofType(events, "PROTEIN_LOGGED").map((root) =>
    effectiveValue(root, proteinCorrections, (p) => (p as { grams: number }).grams),
  );
  const voided = new Set(ofType(events, "MEAL_LOG_VOIDED").map((e) => (e.payload as MealLogVoidedPayload).mealEventId));
  const mealCorrections = correctionsOf(events, "MEAL_LOG_CORRECTED");
  const meals = ofType(events, "MEAL_LOGGED")
    .filter((e) => !voided.has(e.id))
    .map((root) => effectiveValue(root, mealCorrections, (p) => p as { calories: number; proteinG: number }));
  const mealProtein = meals.map((m) => m.proteinG);

  // Workouts started on this day
  const workouts = input.workoutSessions
    .filter((s) => s.beyondDayId === day.id)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((s): LedgerWorkout => {
      const prCount = prCountBySession.get(s.id);
      return {
        sessionId: s.id,
        templateId: s.templateId,
        sessionType: s.sessionType,
        status: s.status,
        startedAt: s.startedAt,
        ...(s.endedAt ? { endedAt: s.endedAt, durationMinutes: minutesBetween(s.startedAt, s.endedAt) } : {}),
        ...(prCount !== undefined ? { prCount } : {}),
        setsLogged: (setsBySession.get(s.id) ?? []).length,
      };
    });

  // Urges (undone ones removed), each placed against the schedule
  const undoneUrges = new Set(ofType(events, "URGE_UNDONE").map((e) => (e.payload as { urgeEventId: string }).urgeEventId));
  const urges = ofType(events, "URGE_LOGGED")
    .filter((e) => !undoneUrges.has(e.id))
    .map(
      (e): LedgerUrge => ({
        at: e.occurredAt,
        trigger: (e.payload as { trigger: UrgeTrigger }).trigger,
        phase: deriveScheduledContext(new Date(e.occurredAt), input.schedule).phase,
      }),
    );

  // Check-in → the locked capacity rule
  const checkIns = ofType(events, "STATE_CHECKED_IN");
  const latestCheckIn = checkIns[checkIns.length - 1];
  const capacity = latestCheckIn ? deriveCapacity(latestCheckIn.payload as StateCheckIn) : undefined;

  // Latest recommendation and the operator's decision on it
  const issued = ofType(events, "RECOMMENDATION_ISSUED");
  const latestIssued = issued[issued.length - 1];
  let recommendation: DaySummary["recommendation"];
  if (latestIssued) {
    const { recommendationId, kind } = latestIssued.payload as { recommendationId: string; kind: RecommendationKind };
    const decisionEvent = events.find(
      (e) =>
        (e.type === "RECOMMENDATION_ACCEPTED" || e.type === "RECOMMENDATION_DECLINED" || e.type === "NO_ACTION_RECORDED") &&
        (e.payload as { recommendationId?: string }).recommendationId === recommendationId,
    );
    const decision: LedgerDecision | undefined = !decisionEvent
      ? undefined
      : decisionEvent.type === "RECOMMENDATION_ACCEPTED"
        ? "ACCEPTED"
        : decisionEvent.type === "RECOMMENDATION_DECLINED"
          ? "DECLINED"
          : "NO_ACTION_RECORDED";
    recommendation = { recommendationId, kind, issuedAt: latestIssued.occurredAt, ...(decision ? { decision } : {}) };
  }

  const primaryMinutes = sumOrUndefined(primary);
  const napMinutes = sumOrUndefined(naps);
  const waterOz = sumOrUndefined(water);
  const proteinG = sumOrUndefined([...proteinLogs, ...mealProtein]);
  const kcal = sumOrUndefined(meals.map((m) => m.calories));
  const declaredSource = latestWorkContext ? (latestWorkContext.payload as WorkContextSetPayload).source : undefined;

  return {
    beyondDayId: day.id,
    startedAt: day.startedAt,
    ...(dayEnded ? { endedAt: dayEnded.occurredAt } : {}),
    livedDayStart: mostRecentBoundaryAtOrBefore(startedAt).toISOString(),
    work: {
      declared: day.workContext,
      ...(declaredSource ? { declaredSource } : {}),
      scheduled: scheduledWorkContextForLivedDay(startedAt, input.schedule),
      ...(workEnded ? { workEndedAt: workEnded.occurredAt } : {}),
    },
    sleep: {
      ...(primaryMinutes !== undefined ? { primaryMinutes, primaryLogs } : {}),
      ...(napMinutes !== undefined ? { napMinutes } : {}),
    },
    ...(waterOz !== undefined ? { waterOz } : {}),
    ...(proteinG !== undefined ? { proteinG } : {}),
    ...(kcal !== undefined ? { kcal } : {}),
    workouts,
    urges,
    cleanDay: events.some((e) => e.type === "CLEAN_DAY_LOGGED"),
    ...(latestCheckIn && capacity
      ? {
          checkIn: {
            capacity: capacity.capacity,
            reasonCodes: capacity.reasonCodes,
            count: checkIns.length,
            at: latestCheckIn.occurredAt,
          },
        }
      : {}),
    ...(recommendation ? { recommendation } : {}),
    burden: deriveBurden(events),
  };
}

// ---- weekly burden line ----

export interface BurdenSummary {
  /** BeyondDays the figures cover. */
  days: number;
  /** Average manual entries per day; absent when there are no days. */
  entriesPerDay?: number;
  /** Total corrections across those days. */
  corrections: number;
}

/** Pure roll-up for the Weekly line: averages entries over the given days, totals corrections. */
export function summarizeBurden(summaries: readonly DaySummary[]): BurdenSummary {
  const entries = summaries.reduce((sum, d) => sum + d.burden.manualEntries, 0);
  const corrections = summaries.reduce((sum, d) => sum + d.burden.corrections, 0);
  return {
    days: summaries.length,
    ...(summaries.length > 0 ? { entriesPerDay: entries / summaries.length } : {}),
    corrections,
  };
}
