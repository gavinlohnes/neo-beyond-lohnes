import { db } from "../persistence/db";
import { evaluate } from "../engine/evaluate";
import { computeDueRollover } from "../engine/dayRollover";
import { assertRedOverrideConfirmed } from "../engine/redOverride";
import { formatLocalDate } from "../engine/scheduledContext";
import { hasObligationRequiringArbitration } from "../engine/obligationRelevance";
import type {
  BeyondDay,
  CaptureItem,
  DomainEvent,
  Recommendation,
  SchedulePattern,
  StateCheckIn,
  WaterLogCorrectedPayload,
  WaterLoggedPayload,
} from "../domain/common/types";
import { schedulePatternInputSchema, type SchedulePatternInput } from "../persistence/schedulePatternValidation";
import { getWorkPeriodEnded, hasActivePlannedWork, hasUnresolvedPostShift } from "./queries";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";

/**
 * Deterministic tie-break for "most recent X" queries — redesigned after
 * the original CI-discovered fix (nudging occurredAt/recordedAt forward on
 * a collision) was correctly rejected for manufacturing historical time
 * that never actually happened. occurredAt/recordedAt/issuedAt stay real,
 * untouched `new Date().toISOString()` values everywhere in this file now;
 * a genuine same-millisecond tie (routine on a fast CI runner, rare under
 * real use) is resolved instead by this explicit, persisted `seq` field —
 * assigned here and reused for StateCheckIn/Recommendation wherever they're
 * stored, so all three share one ordering space.
 *
 * Seeded once per session from the current max `seq` already on disk
 * (events/checkIns/recommendations), never from the clock — immune to
 * system-clock rollback, and correct across restarts because it's
 * re-derived from what's actually stored rather than cached anywhere
 * fragile. Deliberately not a Dexie-indexed field: no schema version bump,
 * no migration: existing historical data simply has no `seq` and falls
 * back to whatever ordering it already had. dexie-export-import carries
 * the field automatically since it's just a plain property — no backup.ts/
 * restore.ts changes needed, same as SchedulePattern in Drop 02a.
 */
interface SeqBox {
  current: number;
}
let seqBoxPromise: Promise<SeqBox> | null = null;

async function currentMaxSeq(): Promise<number> {
  const [events, checkIns, recommendations] = await Promise.all([
    db.events.toArray(),
    db.checkIns.toArray(),
    db.recommendations.toArray(),
  ]);
  let max = 0;
  for (const row of [...events, ...checkIns, ...recommendations]) {
    if (typeof row.seq === "number" && row.seq > max) max = row.seq;
  }
  return max;
}

function seqBox(): Promise<SeqBox> {
  if (!seqBoxPromise) {
    seqBoxPromise = currentMaxSeq().then((max) => ({ current: max }));
  }
  return seqBoxPromise;
}

/**
 * No await between reading and mutating `box.current`, so concurrent
 * in-flight calls (all resolved from the same memoized seqBox()) each still
 * get a unique, strictly increasing value — safe in this single-threaded
 * JS environment without needing a lock.
 */
/** Exported for application/intentCommands.ts — Mission/Obligation events share this same ordering space (see doc comment above). */
export async function nextSeq(): Promise<number> {
  const box = await seqBox();
  box.current += 1;
  return box.current;
}

/** Exported for application/intentCommands.ts. */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Auto-close is a FALLBACK only, for when a new day starts while one is
 * still ACTIVE (Context & Safety Decisions, 2026-08-19). Calendar midnight
 * is explicitly rejected as a boundary; the primary mechanism is always
 * explicit endDay() (DAY-ROLLOVER-001, 2026-09-21, adds one more: the
 * automatic 16:30 boundary — see performDueDayRollover below). This never
 * fires on the normal path where the prior day was already ended before
 * the next one starts.
 *
 * `startedAtOverride` (DAY-ROLLOVER-001): every existing caller omits it
 * and gets the same real, unmodified `startedAt` as before.
 * performDueDayRollover passes the semantic 16:30 boundary instant here so
 * the new day's `startedAt` matches the old day's `DAY_ENDED.occurredAt`
 * exactly (the same-instant match the dayRolloverAmbiguity advisory
 * producer relies on) — `createdAt`/`updatedAt` always stay the real,
 * unmodified row-write instant regardless, same "never fabricate what
 * actually happened" doctrine as logEvent's `recordedAt`.
 */
export async function startDay(startedAtOverride?: string): Promise<BeyondDay> {
  const existingActive = await db.beyondDays.filter((d) => d.status === "ACTIVE").last();
  if (existingActive) {
    await endDay(existingActive.id, "AUTO_CLOSED_ON_NEW_DAY_START");
  }

  const now = new Date().toISOString();
  const day: BeyondDay = {
    id: newId(),
    startedAt: startedAtOverride ?? now,
    timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
    workContext: "UNKNOWN",
    status: "ACTIVE",
    // createdAt/updatedAt always stay the real, unmodified row-write
    // instant — only startedAt (the semantic "when did this lived day
    // begin") may be stamped at a rollover's boundary instant.
    createdAt: now,
    updatedAt: now,
  };
  await db.beyondDays.add(day);
  await logEvent(day.id, "DAY_STARTED", { dayId: day.id }, "USER", newId());
  return day;
}

/**
 * Lazy day creation (P0): a meaningful action creates today's BeyondDay
 * automatically if none is active, rather than requiring an explicit
 * START DAY click first. Explicit startDay() remains available and
 * unchanged for anyone who prefers to start deliberately; this is just
 * the fallback every write command now goes through first.
 *
 * Stability Gate (Product Experience Sprint, Phase 0.1): the read
 * (check for an existing ACTIVE day) and the write (startDay() if none)
 * are not atomic, so two truly concurrent calls could previously both
 * observe "none exists" before either wrote, creating two ACTIVE days.
 * Fixed with a shared in-flight promise: the first call's read+write is
 * memoized synchronously, so any call landing while it's still pending
 * joins the same promise instead of racing it. This only protects
 * concurrency within one JS context (i.e. one browser tab) — the only
 * kind that's actually reachable here, since ensureActiveDay is called
 * from application code, never across tabs/workers.
 */
let ensureActiveDayInFlight: Promise<BeyondDay> | null = null;

export async function ensureActiveDay(): Promise<BeyondDay> {
  if (ensureActiveDayInFlight) return ensureActiveDayInFlight;
  ensureActiveDayInFlight = (async () => {
    try {
      const existing = await db.beyondDays.filter((d) => d.status === "ACTIVE").last();
      if (existing) return existing;
      return await startDay();
    } finally {
      ensureActiveDayInFlight = null;
    }
  })();
  return ensureActiveDayInFlight;
}

/**
 * Explicit END DAY. Closes silently — no recap (Context & Safety
 * Decisions, 2026-08-19). The Engine may SUGGEST calling this right after
 * primary sleep is logged (see queries.shouldSuggestEndDay), but ending is
 * always a distinct user (or fallback) action, never automatic on its own
 * — except the one deliberate DAY-ROLLOVER-001 exception, which still
 * closes through this exact same function/guard, never a parallel path.
 *
 * `occurredAtOverride` (DAY-ROLLOVER-001): every existing caller omits it
 * and gets the same real, unmodified `DAY_ENDED.occurredAt`/`updatedAt` as
 * before. performDueDayRollover passes the semantic 16:30 boundary instant
 * here — `updatedAt` (the row) and `recordedAt` (the event, inside
 * logEvent) always stay real regardless.
 */
export async function endDay(
  beyondDayId: string,
  reason: "EXPLICIT_END_DAY" | "AUTO_CLOSED_ON_NEW_DAY_START" | "AUTO_CLOSED_DAY_ROLLOVER" = "EXPLICIT_END_DAY",
  occurredAtOverride?: string,
): Promise<void> {
  const activeWorkout = await db.workoutSessions
    .where("beyondDayId")
    .equals(beyondDayId)
    .filter((session) => session.status === "ACTIVE")
    .first();
  if (activeWorkout) {
    throw new ActiveWorkoutBlocksDayEndError(activeWorkout.id);
  }
  await db.beyondDays.update(beyondDayId, {
    status: "ENDED",
    updatedAt: new Date().toISOString(),
  });
  await logEvent(
    beyondDayId,
    "DAY_ENDED",
    { reason },
    reason === "EXPLICIT_END_DAY" ? "USER" : "SYSTEM",
    newId(),
    undefined,
    occurredAtOverride,
  );
}

/**
 * CONTINUITY-001: an unresolved workout belongs to its original
 * BeyondDay. Ending that day first would make the session inaccessible
 * to the normal TRAIN resume path and allow a conflicting workout on a
 * later day. The command boundary therefore fails before either the day
 * row or event history is changed. The operator retains all existing
 * choices on TRAIN: complete, save partial, or stop.
 */
export class ActiveWorkoutBlocksDayEndError extends Error {
  readonly code = "ACTIVE_WORKOUT_UNRESOLVED";

  constructor(readonly sessionId: string) {
    super("ACTIVE_WORKOUT_UNRESOLVED: resolve the active workout on TRAIN before ending this BeyondDay.");
    this.name = "ActiveWorkoutBlocksDayEndError";
  }
}

/**
 * DAY-ROLLOVER-001 (direct owner mission + doctrine-override ruling,
 * 2026-09-21): the one entry point that turns engine/dayRollover.ts's
 * pure boundary math into a real close-and-reopen. No-ops (returns
 * undefined) whenever there is nothing to do — no active day at all
 * (never spontaneously creates one, preserving Lazy day creation
 * doctrine), no boundary crossed yet, or an active workout still blocks
 * the close (the exact same ActiveWorkoutBlocksDayEndError guard endDay()
 * already enforces — "don't interrupt it, roll over when it ends" is
 * satisfied by simply calling this again once the workout ends, not by a
 * separate guard here).
 *
 * Both the closing DAY_ENDED event's `occurredAt` and the new day's
 * `startedAt` are stamped at the exact same computed boundary instant
 * (never the real call-time "now") — "stamped 16:30, not the open time,"
 * and the exact-instant match engine/advisory.ts's
 * composeAdvisoryNoteFromDayRolloverAmbiguity relies on to detect a
 * rollover-created day. A stretch with the app closed across several
 * 16:30s still only ever produces one rollover: computeDueRollover always
 * returns the single most recent elapsed boundary, never a list.
 *
 * ROLLOVER-ON-RESUME (direct owner mission, 2026-09-21): now called from
 * three places — App.tsx's mount-time gate, App.tsx's new visibilitychange/
 * pageshow resume listener, and TrainScreen.tsx's post-workout-completion
 * hooks — any of which can genuinely fire in quick succession (a real
 * browser can dispatch both visibilitychange and pageshow for the same
 * resume). The same in-flight-promise memoization ensureActiveDay() above
 * already established for its own concurrent-call hazard is reused here:
 * every call arriving while one is still pending joins that same promise
 * rather than racing it, so two near-simultaneous resume events can never
 * independently read "still ACTIVE" and each perform their own close+
 * reopen. Only the first caller's `now` is actually used for a given
 * in-flight burst — callers close enough in time to overlap don't need
 * meaningfully different answers.
 *
 * ATOMICITY (PR #111 review finding, 2026-09-21): closing the old day and
 * creating the replacement are two independent writes each — a plain
 * `await endDay(...); await startDay(...)` sequence would leave BEYOND
 * with no ACTIVE day at all if the process died, threw, or IndexedDB
 * failed between them (e.g. a quota error on the second write), and a
 * later performDueDayRollover() call would see no active day and silently
 * no-op forever, unable to self-heal. Wrapping both calls in a single
 * Dexie `db.transaction("rw", ...)` makes them commit or roll back
 * together — the old day is never durably marked ENDED unless the new day
 * is also durably created, so the interrupted-partway state this bug
 * described can no longer occur at all, rather than needing to be
 * detected and healed after the fact. endDay/startDay themselves are
 * unchanged (still exported, still independently callable for their own
 * existing callers) — only this one call site composes them atomically.
 * Every Dexie table either function might touch (including
 * ActiveWorkoutBlocksDayEndError's own pre-write read, and nextSeq's
 * cold-start fallback read, which in practice never actually fires this
 * late — a prior startDay() call for the day being rolled over has always
 * already primed it) is declared so nothing implicitly escapes the
 * transaction's scope.
 */
let performDueDayRolloverInFlight: Promise<BeyondDay | undefined> | null = null;

export async function performDueDayRollover(now: Date = new Date()): Promise<BeyondDay | undefined> {
  if (performDueDayRolloverInFlight) return performDueDayRolloverInFlight;
  performDueDayRolloverInFlight = (async () => {
    try {
      const activeDay = await db.beyondDays.filter((d) => d.status === "ACTIVE").last();
      if (!activeDay) return undefined;

      const boundary = computeDueRollover(new Date(activeDay.startedAt), now);
      if (!boundary) return undefined;

      const boundaryIso = boundary.toISOString();
      try {
        return await db.transaction(
          "rw",
          [db.beyondDays, db.events, db.workoutSessions, db.checkIns, db.recommendations],
          async () => {
            await endDay(activeDay.id, "AUTO_CLOSED_DAY_ROLLOVER", boundaryIso);
            return await startDay(boundaryIso);
          },
        );
      } catch (e) {
        if (e instanceof ActiveWorkoutBlocksDayEndError) return undefined;
        throw e;
      }
    } finally {
      performDueDayRolloverInFlight = null;
    }
  })();
  return performDueDayRolloverInFlight;
}

/**
 * Sleep logging: duration only, no goal/target (Decision Register,
 * BODY/SLEEP — goals remain deferred; confirmed again in the 2026-08-19
 * authority reconciliation, which rejected a fixed 7-hour target). No
 * dedicated table; stored as event history only.
 *
 * `kind` defaults to PRIMARY, matching the only kind that existed before
 * the Sleep/Day-Ownership Model DECISION (2026-08-19) — callers that
 * genuinely mean a nap must pass "SUPPLEMENTAL" explicitly; the UI's
 * one-tap Main Sleep / Nap classification always does.
 */
export async function logSleep(
  beyondDayId: string,
  durationMinutes: number,
  kind: "PRIMARY" | "SUPPLEMENTAL" = "PRIMARY",
): Promise<string> {
  const correlationId = newId();
  return logEvent(
    beyondDayId,
    "SLEEP_LOGGED",
    { commandId: correlationId, durationMinutes, kind },
    "USER",
    correlationId,
  );
}

export async function submitCheckIn(
  beyondDayId: string,
  values: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq">,
): Promise<{ checkIn: StateCheckIn; recommendation: Recommendation }> {
  const checkIn: StateCheckIn = {
    id: newId(),
    beyondDayId,
    recordedAt: new Date().toISOString(),
    seq: await nextSeq(),
    ...values,
  };
  const correlationId = newId();
  await db.checkIns.add(checkIn);
  await logEvent(beyondDayId, "STATE_CHECKED_IN", checkIn, "USER", correlationId);

  // Engine reassesses immediately after new evidence. Issuing a
  // recommendation is automatic; RECORDING it (accept / no-action) is a
  // separate, explicit user step — see recordRecommendation below.
  // evaluate() stays pure (no I/O, no seq assignment) — seq is stamped
  // here, at the one place its result is actually persisted.
  // INTENT-ARBITRATION-001: same pattern as hasUnresolvedPostShift above —
  // the application layer decides current eligibility (today's date, which
  // obligations are unresolved) and passes the Engine only the one derived
  // boolean it needs to arbitrate with.
  const eligibleObligations = await getCurrentlyEligibleUnresolvedObligations();
  const recommendation: Recommendation = {
    ...evaluate({
      beyondDayId,
      checkIn,
      // PLANNED-WORK-001: derived from an explicit PLANNED_WORK_SET
      // declaration (setPlannedWork), never inferred from capacity,
      // schedule, or TRAIN's rotation state — see hasActivePlannedWork's
      // own doc comment.
      hasPlannedWork: await hasActivePlannedWork(beyondDayId),
      // Drop 02b: derived from event history (WORK_PERIOD_ENDED, cleared by
      // a later SHIFT_DOWN_COMPLETED), never from clock/schedule — the
      // Engine only ever sees what queries.ts already determined is true.
      hasUnresolvedPostShift: await hasUnresolvedPostShift(beyondDayId),
      hasEligibleObligationDueOrOverdue: hasObligationRequiringArbitration(
        eligibleObligations,
        formatLocalDate(new Date()),
      ),
    }),
    seq: await nextSeq(),
  };
  await db.recommendations.add(recommendation);
  await logEvent(
    beyondDayId,
    "RECOMMENDATION_ISSUED",
    { recommendationId: recommendation.id, kind: recommendation.kind },
    "ENGINE",
    correlationId,
  );

  return { checkIn, recommendation };
}

/**
 * Explicit user confirmation that a recommendation was seen and is being
 * committed to history — either as an accepted action, or, for
 * NO_ACTION_REQUIRED, as a recorded no-action. Matches the real app's
 * "RECORD NO ACTION" button: recommendations are not silently logged as
 * acted-upon just because the Engine issued them.
 */
export async function recordRecommendation(
  beyondDayId: string,
  recommendation: Recommendation,
): Promise<void> {
  const type = recommendation.kind === "NO_ACTION_REQUIRED"
    ? "NO_ACTION_RECORDED"
    : "RECOMMENDATION_ACCEPTED";
  await logEvent(
    beyondDayId,
    type,
    { recommendationId: recommendation.id, kind: recommendation.kind },
    "USER",
    newId(),
  );
}

/**
 * Explicit "I'm not doing this" for an ACTION-kind recommendation
 * (STABILIZE/RECOVER/EXECUTE_PLANNED_WORK) — distinct from both
 * RECOMMENDATION_ACCEPTED and NO_ACTION_RECORDED. NO_ACTION_REQUIRED has
 * no decline path: there's nothing being declined, only acknowledged, so
 * that kind must go through recordRecommendation instead.
 *
 * A STABILIZE recommendation is only ever issued when capacity is RED
 * (engine/evaluate.ts's only path to that kind) — declining it is
 * therefore always an override of RED-tier guidance, so it goes through
 * the same shared confirm-every-time mechanism TRAIN uses for overriding
 * RED with a STANDARD session (engine/redOverride.ts), enforced here at
 * the command layer so a UI bug can't silently bypass it. RECOVER
 * (YELLOW) and EXECUTE_PLANNED_WORK (GREEN) never need this — RED never
 * produces those kinds.
 *
 * Purely a historical/outcome record, same philosophy as rateOutcome:
 * declining does not change future Engine behavior or suppress
 * re-issuance. The Engine will issue STABILIZE again on the next RED
 * check-in regardless of any prior decline — "rules provide consistency,
 * outcomes provide correction," not silent rule adjustment.
 */
export async function declineRecommendation(
  beyondDayId: string,
  recommendation: Recommendation,
  options: { overrideConfirmed?: boolean } = {},
): Promise<void> {
  if (recommendation.kind === "NO_ACTION_REQUIRED") {
    throw new Error(
      "CANNOT_DECLINE_NO_ACTION_REQUIRED: NO_ACTION_REQUIRED has nothing to decline — use recordRecommendation instead.",
    );
  }
  if (recommendation.kind === "STABILIZE") {
    assertRedOverrideConfirmed("RED", options.overrideConfirmed ?? false);
  }
  await logEvent(
    beyondDayId,
    "RECOMMENDATION_DECLINED",
    { recommendationId: recommendation.id, kind: recommendation.kind },
    "USER",
    newId(),
  );
}

export async function startReset(
  beyondDayId: string,
  intensity: 1 | 2 | 3 | 4 | 5,
): Promise<string> {
  const correlationId = newId();
  const eventId = await logEvent(
    beyondDayId,
    "RESET_STARTED",
    { intensity },
    "USER",
    correlationId,
  );
  return eventId;
}

export async function completeReset(
  beyondDayId: string,
  resetStartedEventId: string,
): Promise<void> {
  await logEvent(
    beyondDayId,
    "RESET_COMPLETED",
    { resetStartedEventId },
    "USER",
    newId(),
    resetStartedEventId,
  );
}

/**
 * Phase 4 (guided RESET/SHIFT DOWN experience): a distinct terminal fact
 * from RESET_COMPLETED — "I started this but didn't go through with it"
 * is not the same historical claim as "I did this." Same causationId
 * linkage as completeReset, so getOpenReset (application/queries.ts)
 * treats either one as closing out the open RESET.
 */
export async function cancelReset(
  beyondDayId: string,
  resetStartedEventId: string,
): Promise<void> {
  await logEvent(
    beyondDayId,
    "RESET_CANCELLED",
    { resetStartedEventId },
    "USER",
    newId(),
    resetStartedEventId,
  );
}

/**
 * SHIFT DOWN needs its own duration input, same shape as RESET (BEYOND —
 * Context & Safety Decisions, 2026-08-19): a value chosen up front, then an
 * explicit START/COMPLETE two-step, rather than a single one-tap action.
 */
export async function startShiftDown(
  beyondDayId: string,
  durationMinutes: number,
): Promise<string> {
  const correlationId = newId();
  const eventId = await logEvent(
    beyondDayId,
    "SHIFT_DOWN_STARTED",
    { commandId: correlationId, durationMinutes },
    "USER",
    correlationId,
  );
  return eventId;
}

/**
 * Event type name matches the Decision Register's WORK TRANSITION section
 * verbatim ("SHIFT_DOWN_COMPLETED clears the post-shift requirement").
 * Drop 02b wires that up entirely on the read side — queries.ts's
 * hasUnresolvedPostShift treats any SHIFT_DOWN_COMPLETED after a
 * WORK_PERIOD_ENDED fact as clearing it — so this command itself needs no
 * changes to satisfy that doctrine.
 */
export async function completeShiftDown(
  beyondDayId: string,
  shiftDownStartedEventId: string,
): Promise<void> {
  await logEvent(
    beyondDayId,
    "SHIFT_DOWN_COMPLETED",
    { commandId: newId(), shiftDownStartedEventId },
    "USER",
    newId(),
    shiftDownStartedEventId,
  );
}

/** Distinct terminal fact from SHIFT_DOWN_COMPLETED — see cancelReset's doc comment for the same reasoning. */
export async function cancelShiftDown(
  beyondDayId: string,
  shiftDownStartedEventId: string,
): Promise<void> {
  await logEvent(
    beyondDayId,
    "SHIFT_DOWN_CANCELLED",
    { commandId: newId(), shiftDownStartedEventId },
    "USER",
    newId(),
    shiftDownStartedEventId,
  );
}

/**
 * Bodyweight logging (BODY & Backup / Context & Safety Decisions,
 * 2026-08-19): a fact only — no goal/target in this checkpoint.
 */
export async function logBodyweight(beyondDayId: string, weightLbs: number): Promise<string> {
  const correlationId = newId();
  return logEvent(
    beyondDayId,
    "BODYWEIGHT_LOGGED",
    { commandId: correlationId, weightLbs },
    "USER",
    correlationId,
  );
}

/**
 * Protein logging (BODY & Backup Decisions, 2026-08-19, locked): amount
 * only, explicitly no daily target — "not carrying over the old legacy
 * mockup's 165g+ target."
 */
export async function logProtein(beyondDayId: string, grams: number): Promise<string> {
  const correlationId = newId();
  return logEvent(
    beyondDayId,
    "PROTEIN_LOGGED",
    { commandId: correlationId, grams },
    "USER",
    correlationId,
  );
}

/**
 * Outcome rating (Context & Safety Decisions, 2026-08-19, locked): a
 * light explicit signal (GOOD/NEUTRAL/BAD), tied to the recommendation
 * lifecycle rather than folded into quick check-in. BEYOND records the
 * fact and never silently adjusts its own rules from it — that's a
 * BATCAVE pattern-surfacing concern for later, explicitly out of scope
 * here.
 */
export async function rateOutcome(
  beyondDayId: string,
  recommendationId: string,
  rating: "GOOD" | "NEUTRAL" | "BAD",
): Promise<void> {
  const correlationId = newId();
  await db.outcomes.add({
    id: newId(),
    beyondDayId,
    recordedAt: new Date().toISOString(),
    result: "UNKNOWN",
    recommendationId,
    rating,
  });
  await logEvent(
    beyondDayId,
    "OUTCOME_RATED",
    { commandId: correlationId, recommendationId, rating },
    "USER",
    correlationId,
  );
}

/**
 * The ONLY way BeyondDay.workContext ever changes (Decision Register,
 * WORK SCHEDULE / CONTEXT reconciliation, 2026-08-19). Schedule/time may
 * SUGGEST a context via engine/scheduledContext.ts, but nothing writes
 * workContext except this explicit, confirmed command — whether the
 * trigger was typing it manually or accepting a schedule suggestion.
 * Manual corrections/overrides beat generated schedule context by
 * construction: this command has no memory of "where the value came
 * from" beyond the source label on the event, and always simply sets
 * whatever value the caller passed.
 */
export async function setWorkContext(
  beyondDayId: string,
  workContext: "WORK" | "OFF",
  source: "MANUAL" | "SCHEDULE_SUGGESTION_ACCEPTED",
): Promise<void> {
  await db.beyondDays.update(beyondDayId, {
    workContext,
    updatedAt: new Date().toISOString(),
  });
  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "WORK_CONTEXT_SET",
    { commandId: correlationId, workContext, source },
    "USER",
    correlationId,
  );
}

/**
 * Drop 02b (Explicit Work Transition, Decision Register "WORK TRANSITION",
 * 2026-08-19 locked). The only writer of WORK_PERIOD_ENDED — the one
 * historical fact marking a work shift as actually over. Created solely
 * on this explicit user action; schedule/time may predict a shift has
 * probably ended (engine/scheduledContext.ts's EXPECTED_POST_WORK phase)
 * but nothing infers this fact automatically. "Shift end is never
 * inferred from time, schedule, GPS, inactivity, or other hidden
 * signals."
 *
 * Only valid on the active BeyondDay while workContext is WORK — throws
 * otherwise rather than silently doing nothing, so a UI bug surfaces
 * immediately instead of quietly failing to record a real transition.
 *
 * "Exactly one effective work-ended fact": idempotent by construction — a
 * day that already has a WORK_PERIOD_ENDED event is left untouched rather
 * than logging a duplicate, so rapid double-taps or a retried request
 * can't fork the history. This is not a correction chain (see
 * WorkPeriodEndedPayload's doc comment) — there is nothing to correct
 * about "did the shift end," only whether it has been marked yet.
 */
export async function markWorkEnded(beyondDayId: string): Promise<void> {
  const day = await db.beyondDays.get(beyondDayId);
  if (!day || day.status !== "ACTIVE" || day.workContext !== "WORK") {
    throw new Error(
      "NOT_AN_ACTIVE_WORK_DAY: markWorkEnded requires the active BeyondDay to have workContext WORK.",
    );
  }
  const existing = await getWorkPeriodEnded(beyondDayId);
  if (existing) return;
  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "WORK_PERIOD_ENDED",
    { commandId: correlationId },
    "USER",
    correlationId,
  );
}

/**
 * PLANNED-WORK-001 (direct owner ruling, 2026-09-20): the ONLY way
 * `hasActivePlannedWork` (application/queries.ts) can ever resolve true —
 * see PlannedWorkSetPayload's own doc comment (domain/common/types.ts) for
 * the full "explicit, never inferred" doctrine this implements. No
 * BeyondDay field is written (unlike setWorkContext) — this fact is purely
 * event-derived, same treatment as WORK_PERIOD_ENDED. Not idempotent-
 * guarded like markWorkEnded: re-declaring the same value, or toggling
 * back and forth, is a legitimate real history (the operator changing
 * their mind during the day), not a duplicate to suppress.
 */
export async function setPlannedWork(
  beyondDayId: string,
  planned: boolean,
  kind: "WORKOUT" = "WORKOUT",
): Promise<void> {
  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "PLANNED_WORK_SET",
    { commandId: correlationId, planned, kind },
    "USER",
    correlationId,
  );
}

/**
 * Drop 02a (Daily Intelligence / Context, first slice): the only writer of
 * the schedulePatterns "current" row. This is configuration, not domain
 * history — same treatment as BeyondDay's own directly-mutated fields
 * (createdAt/updatedAt bookkeeping, no per-edit DomainEvent) rather than
 * the correction-chain/event-sourced treatment given to facts like
 * hydration or work context. It isn't day-scoped (DomainEvent requires a
 * beyondDayId; a schedule edit has no natural one), and it isn't a
 * historical fact about what happened in the user's day — it's what the
 * prediction layer should now assume going forward. Explicit rejection on
 * malformed input (unlike the read path's silent DEFAULT_SCHEDULE_PATTERN
 * fallback) because this is the user's own live edit, not a possibly-
 * corrupted imported file — a mistake here should surface immediately,
 * not silently substitute a different schedule.
 */
export async function updateSchedulePattern(input: SchedulePatternInput): Promise<SchedulePattern> {
  const parsed = schedulePatternInputSchema.parse(input);
  const existing = await db.schedulePatterns.get("current");
  const now = new Date().toISOString();
  const record: SchedulePattern = {
    id: "current",
    ...parsed,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.schedulePatterns.put(record);
  return record;
}

/**
 * Overdrive Phase 10 (first connective capability). The only writer of a
 * new CaptureItem — "capture first, organize second, act only when
 * earned." Deliberately does nothing else: no classification, no
 * deduplication, no linking to any other domain, no AI. Rejects empty/
 * whitespace-only text outright (nothing meaningful was actually
 * captured) rather than silently creating a blank record.
 */
export async function captureItem(text: string): Promise<CaptureItem> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("EMPTY_CAPTURE: capture text cannot be empty.");
  }
  const item: CaptureItem = {
    id: newId(),
    text: trimmed,
    capturedAt: new Date().toISOString(),
    status: "OPEN",
    seq: await nextSeq(),
  };
  await db.captureItems.add(item);
  return item;
}

/**
 * Marks a capture resolved — the user decided it, acted on it elsewhere,
 * or it no longer needs attention. Does not delete or reclassify it;
 * "resolved" is a state, not an erasure, so it stays in getAllCaptureItems
 * (just not getOpenCaptureItems) for as long as the rest of BEYOND's
 * history does.
 */
export async function resolveCaptureItem(id: string): Promise<void> {
  await db.captureItems.update(id, { status: "RESOLVED", resolvedAt: new Date().toISOString() });
}

/** Undoes an accidental resolve — same reasoning as RESET/SHIFT DOWN's cancel path having a real undo, not a one-way door. */
export async function reopenCaptureItem(id: string): Promise<void> {
  const existing = await db.captureItems.get(id);
  if (!existing) return;
  const { resolvedAt: _resolvedAt, ...withoutResolvedAt } = existing;
  await db.captureItems.put({ ...withoutResolvedAt, status: "OPEN" });
}

/**
 * MINIMUM DAY (Decision Register, RESET/CAPACITY, locked six-item
 * baseline — reconfirmed, not the simplified "any check-in + any BODY
 * log" version that was explicitly rejected in the 2026-08-19 authority
 * reconciliation). Enabling is an explicit user action, not automatic;
 * it lowers execution expectations rather than adding work, is scoped to
 * the active BeyondDay, and ends with it — there is no separate "disable"
 * command, since it simply stops applying once the day ends.
 */
export async function enableMinimumDay(beyondDayId: string): Promise<void> {
  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "MINIMUM_DAY_ENABLED",
    { commandId: correlationId },
    "USER",
    correlationId,
  );
}

/**
 * Generic completion only — no medication names or doses stored, per the
 * locked MEDS minimum's privacy constraint.
 */
export async function markMedsCompleted(beyondDayId: string): Promise<void> {
  const correlationId = newId();
  await logEvent(beyondDayId, "MEDS_COMPLETED", { commandId: correlationId }, "USER", correlationId);
}

/** Generic completion only — no private detail stored, per the locked HYGIENE minimum. */
export async function markHygieneCompleted(beyondDayId: string): Promise<void> {
  const correlationId = newId();
  await logEvent(beyondDayId, "HYGIENE_COMPLETED", { commandId: correlationId }, "USER", correlationId);
}

/**
 * Manual fallback for MOVE (>=5min intentional movement) — used when no
 * RECOVERY session already proves it (see queries.getMinimumDayStatus,
 * which checks RECOVERY session duration first per the locked doctrine
 * that "existing domain events may satisfy a minimum automatically").
 */
export async function markMoveCompleted(beyondDayId: string): Promise<void> {
  const correlationId = newId();
  await logEvent(beyondDayId, "MOVE_COMPLETED", { commandId: correlationId }, "USER", correlationId);
}

/**
 * Manual fallback for RECOVER/CONNECT (>=10min) — same pattern as
 * markMoveCompleted. `activity` (Phase 3) records which of the two
 * distinct choices the UI now offers the user actually made; it's
 * optional and doesn't change what's required — either value (or none,
 * for the automatic RECOVERY-session-duration path) satisfies the same
 * single recoverConnect boolean in getMinimumDayStatus.
 */
export async function markRecoverConnectCompleted(
  beyondDayId: string,
  activity?: "RECOVER" | "CONNECT",
): Promise<void> {
  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "RECOVER_CONNECT_COMPLETED",
    { commandId: correlationId, ...(activity ? { activity } : {}) },
    "USER",
    correlationId,
  );
}

export async function logWater(
  beyondDayId: string,
  amountOz: number,
): Promise<string> {
  const correlationId = newId();
  return logEvent(
    beyondDayId,
    "WATER_LOGGED",
    { commandId: correlationId, amountOz },
    "USER",
    correlationId,
  );
}

/**
 * Correction/supersession, not overwrite. The original WATER_LOGGED fact
 * is never touched. targetEventId must be the current HEAD of its
 * correction chain (the original log, or the most recent correction) —
 * correcting a stale/already-superseded entry is rejected to prevent a
 * forked chain, per the proven Android acceptance behavior.
 *
 * Payload field names (originalEventId, supersedesEventId) are confirmed
 * against the real historical app's backup export — see
 * WaterLogCorrectedPayload in domain/common/types.ts.
 */
export async function correctWater(
  beyondDayId: string,
  targetEventId: string,
  newAmountOz: number,
): Promise<void> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const corrections = events.filter(
    (e): e is DomainEvent<WaterLogCorrectedPayload> => e.type === "WATER_LOG_CORRECTED",
  );
  const alreadySuperseded = corrections.some((c) => c.payload.supersedesEventId === targetEventId);
  if (alreadySuperseded) {
    throw new Error(
      "STALE_CORRECTION_TARGET: this entry has already been corrected — correct the latest value instead.",
    );
  }
  const target = events.find((e) => e.id === targetEventId);
  if (!target) {
    throw new Error("CORRECTION_TARGET_NOT_FOUND");
  }
  if (target.type !== "WATER_LOGGED" && target.type !== "WATER_LOG_CORRECTED") {
    throw new Error("CORRECTION_TARGET_INVALID_TYPE");
  }
  const currentAmount =
    target.type === "WATER_LOGGED"
      ? (target.payload as WaterLoggedPayload).amountOz
      : (target.payload as WaterLogCorrectedPayload).amountOz;
  if (currentAmount === newAmountOz) {
    throw new Error("NO_OP_CORRECTION: new value matches current effective value — no event created.");
  }
  const originalEventId =
    target.type === "WATER_LOGGED"
      ? target.id
      : (target.payload as WaterLogCorrectedPayload).originalEventId;

  const correlationId = newId();
  await logEvent(
    beyondDayId,
    "WATER_LOG_CORRECTED",
    { commandId: correlationId, originalEventId, supersedesEventId: targetEventId, amountOz: newAmountOz },
    "USER",
    correlationId,
    targetEventId,
  );
}

/**
 * Phase 5 (BODY logging): shared correction-chain mechanism for the
 * single-value logs (sleep, protein, bodyweight) that gained correction
 * support this phase — same rules as correctWater (which is left
 * untouched, not routed through this): target must be the current chain
 * HEAD, a no-op new value is rejected, the original fact is never
 * touched. One implementation shared across all three rather than three
 * hand-copies that could quietly drift from each other or from water's
 * proven behavior.
 */
async function correctSingleValueLog(params: {
  beyondDayId: string;
  targetEventId: string;
  newValue: number;
  loggedType: DomainEvent["type"];
  correctedType: DomainEvent["type"];
  valueKey: string;
}): Promise<void> {
  const { beyondDayId, targetEventId, newValue, loggedType, correctedType, valueKey } = params;
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const corrections = events.filter((e) => e.type === correctedType);
  const alreadySuperseded = corrections.some(
    (c) => (c.payload as { supersedesEventId: string }).supersedesEventId === targetEventId,
  );
  if (alreadySuperseded) {
    throw new Error(
      "STALE_CORRECTION_TARGET: this entry has already been corrected — correct the latest value instead.",
    );
  }
  const target = events.find((e) => e.id === targetEventId);
  if (!target) {
    throw new Error("CORRECTION_TARGET_NOT_FOUND");
  }
  if (target.type !== loggedType && target.type !== correctedType) {
    throw new Error("CORRECTION_TARGET_INVALID_TYPE");
  }
  const currentValue = (target.payload as Record<string, number>)[valueKey];
  if (currentValue === newValue) {
    throw new Error("NO_OP_CORRECTION: new value matches current effective value — no event created.");
  }
  const originalEventId =
    target.type === loggedType ? target.id : (target.payload as { originalEventId: string }).originalEventId;

  const correlationId = newId();
  await logEvent(
    beyondDayId,
    correctedType,
    { commandId: correlationId, originalEventId, supersedesEventId: targetEventId, [valueKey]: newValue },
    "USER",
    correlationId,
    targetEventId,
  );
}

export async function correctSleep(
  beyondDayId: string,
  targetEventId: string,
  newDurationMinutes: number,
): Promise<void> {
  return correctSingleValueLog({
    beyondDayId,
    targetEventId,
    newValue: newDurationMinutes,
    loggedType: "SLEEP_LOGGED",
    correctedType: "SLEEP_LOG_CORRECTED",
    valueKey: "durationMinutes",
  });
}

export async function correctProtein(
  beyondDayId: string,
  targetEventId: string,
  newGrams: number,
): Promise<void> {
  return correctSingleValueLog({
    beyondDayId,
    targetEventId,
    newValue: newGrams,
    loggedType: "PROTEIN_LOGGED",
    correctedType: "PROTEIN_LOG_CORRECTED",
    valueKey: "grams",
  });
}

export async function correctBodyweight(
  beyondDayId: string,
  targetEventId: string,
  newWeightLbs: number,
): Promise<void> {
  return correctSingleValueLog({
    beyondDayId,
    targetEventId,
    newValue: newWeightLbs,
    loggedType: "BODYWEIGHT_LOGGED",
    correctedType: "BODYWEIGHT_LOG_CORRECTED",
    valueKey: "weightLbs",
  });
}

/**
 * `occurredAtOverride` (DAY-ROLLOVER-001): every existing caller omits it
 * and gets the same real, unmodified `occurredAt`/`recordedAt` pair as
 * before. The one caller that passes it (performDueDayRollover, via
 * endDay's own override param) stamps `occurredAt` at the semantic 16:30
 * boundary instant while `recordedAt` still stays the real, unmodified
 * moment this event was actually written — the same split
 * StateCheckIn.seq's doc comment already establishes as doctrine
 * ("recordedAt stays the real, unmodified moment"), never fabricated.
 */
export async function logEvent(
  beyondDayId: string,
  type: DomainEvent["type"],
  payload: unknown,
  source: DomainEvent["source"],
  correlationId: string,
  causationId?: string,
  occurredAtOverride?: string,
): Promise<string> {
  const recordedAt = new Date().toISOString();
  const event: DomainEvent = {
    id: newId(),
    type,
    beyondDayId,
    occurredAt: occurredAtOverride ?? recordedAt,
    recordedAt,
    payload,
    source,
    correlationId,
    seq: await nextSeq(),
    ...(causationId ? { causationId } : {}),
  };
  await db.events.add(event);
  return event.id;
}
