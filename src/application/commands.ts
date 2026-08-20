import { db } from "../persistence/db";
import { evaluate } from "../engine/evaluate";
import { assertRedOverrideConfirmed } from "../engine/redOverride";
import type {
  BeyondDay,
  DomainEvent,
  Recommendation,
  StateCheckIn,
  WaterLogCorrectedPayload,
  WaterLoggedPayload,
} from "../domain/common/types";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Auto-close is a FALLBACK only, for when a new day starts while one is
 * still ACTIVE (Context & Safety Decisions, 2026-08-19). Calendar midnight
 * is explicitly rejected as a boundary; the primary mechanism is always
 * explicit endDay(). This never fires on the normal path where the prior
 * day was already ended before the next one starts.
 */
export async function startDay(): Promise<BeyondDay> {
  const existingActive = await db.beyondDays.filter((d) => d.status === "ACTIVE").last();
  if (existingActive) {
    await endDay(existingActive.id, "AUTO_CLOSED_ON_NEW_DAY_START");
  }

  const now = new Date().toISOString();
  const day: BeyondDay = {
    id: newId(),
    startedAt: now,
    timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
    workContext: "UNKNOWN",
    status: "ACTIVE",
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
 * always a distinct user (or fallback) action, never automatic on its own.
 */
export async function endDay(
  beyondDayId: string,
  reason: "EXPLICIT_END_DAY" | "AUTO_CLOSED_ON_NEW_DAY_START" = "EXPLICIT_END_DAY",
): Promise<void> {
  await db.beyondDays.update(beyondDayId, {
    status: "ENDED",
    updatedAt: new Date().toISOString(),
  });
  await logEvent(beyondDayId, "DAY_ENDED", { reason }, reason === "EXPLICIT_END_DAY" ? "USER" : "SYSTEM", newId());
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
  values: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt">,
): Promise<{ checkIn: StateCheckIn; recommendation: Recommendation }> {
  const checkIn: StateCheckIn = {
    id: newId(),
    beyondDayId,
    recordedAt: new Date().toISOString(),
    ...values,
  };
  const correlationId = newId();
  await db.checkIns.add(checkIn);
  await logEvent(beyondDayId, "STATE_CHECKED_IN", checkIn, "USER", correlationId);

  // Engine reassesses immediately after new evidence. Issuing a
  // recommendation is automatic; RECORDING it (accept / no-action) is a
  // separate, explicit user step — see recordRecommendation below.
  const recommendation = evaluate({
    beyondDayId,
    checkIn,
    hasPlannedWork: false,
  });
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
 * verbatim ("SHIFT_DOWN_COMPLETED clears the post-shift requirement") so
 * that hook is ready to wire up whenever the workContext/post-shift
 * mechanism is built — not implemented by this command itself.
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

export async function logEvent(
  beyondDayId: string,
  type: DomainEvent["type"],
  payload: unknown,
  source: DomainEvent["source"],
  correlationId: string,
  causationId?: string,
): Promise<string> {
  const event: DomainEvent = {
    id: newId(),
    type,
    beyondDayId,
    occurredAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
    payload,
    source,
    correlationId,
    ...(causationId ? { causationId } : {}),
  };
  await db.events.add(event);
  return event.id;
}
