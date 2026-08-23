import { db } from "../persistence/db";
import type {
  BeyondDay,
  CaptureItem,
  DomainEvent,
  HydrationEntry,
  Outcome,
  Recommendation,
  SchedulePattern,
  StateCheckIn,
  WaterLogCorrectedPayload,
  WaterLoggedPayload,
} from "../domain/common/types";
import { DEFAULT_SCHEDULE_PATTERN, deriveScheduledContext, type ScheduledContext } from "../engine/scheduledContext";
import { parseSchedulePattern } from "../persistence/schedulePatternValidation";

/**
 * Deterministic "most recent" comparator, shared by every query in this
 * file that needs one. Real recorded/occurred/issued time is always the
 * primary sort key; `seq` (application/commands.ts's nextSeq) is only a
 * tie-break for a genuine same-instant collision — never itself a stand-in
 * for time. Records without a seq (all pre-existing historical data, which
 * predates this field) simply compare as equal on the tie-break, identical
 * to this app's original sort behavior for them — no migration, no
 * reinterpretation of old history.
 */
export function byTimeThenSeq(timeA: string, seqA: number | undefined, timeB: string, seqB: number | undefined): number {
  const byTime = timeA.localeCompare(timeB);
  if (byTime !== 0) return byTime;
  return (seqA ?? 0) - (seqB ?? 0);
}

/**
 * Only one BeyondDay should ever be ACTIVE at a time (startDay() closes
 * any prior ACTIVE day first). Sorted by startedAt rather than relying on
 * Dexie's .last() (primary-key order, not time) for defense in depth if
 * that invariant is ever violated.
 *
 * Leverage Implementation 001 (deterministic ordering hardening,
 * 2026-08-22): audited and deliberately left on raw startedAt comparison.
 * BeyondDay carries no `seq` field (unlike StateCheckIn/Recommendation/
 * DomainEvent) — adding one would be a schema-adjacent type change this
 * checkpoint's scope explicitly excludes. In practice this path only
 * runs at all when the "one ACTIVE day" invariant above has already been
 * violated (a defense-in-depth branch, not the normal path), so a
 * same-instant collision here would require two BeyondDay.startedAt
 * values equal to the millisecond AND ensureActiveDay's in-flight-promise
 * guard already having failed — a compound, currently-unobserved
 * scenario. Documented as a residual, currently-unaddressable risk, not
 * silently fixed.
 */
export async function getActiveDay(): Promise<BeyondDay | undefined> {
  const days = await db.beyondDays.filter((d: BeyondDay) => d.status === "ACTIVE").toArray();
  return days.sort((a, b) => a.startedAt.localeCompare(b.startedAt)).at(-1);
}

/**
 * NOTE: intentionally does not use Dexie's .last() on this where() query.
 * For a non-unique index like beyondDayId, .last() orders by primary key
 * (a random UUID) among same-beyondDayId rows, not by insertion/recorded
 * time — so it does NOT reliably return the most recent check-in when
 * more than one exists for the day. Sorting by recordedAt explicitly is
 * the correct "latest" query.
 */
export async function getLatestCheckIn(
  beyondDayId: string,
): Promise<StateCheckIn | undefined> {
  const all = await db.checkIns.where("beyondDayId").equals(beyondDayId).toArray();
  return all.sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq)).at(-1);
}

/** See getLatestCheckIn's note — same fix, sorted by issuedAt. */
export async function getLatestRecommendation(
  beyondDayId: string,
): Promise<Recommendation | undefined> {
  const all = await db.recommendations.where("beyondDayId").equals(beyondDayId).toArray();
  return all.sort((a, b) => byTimeThenSeq(a.issuedAt, a.seq, b.issuedAt, b.seq)).at(-1);
}

export type RecommendationDecision = "ACCEPTED" | "DECLINED" | "NO_ACTION_RECORDED";

/**
 * Which of the three mutually-exclusive decisions (if any) was recorded
 * for a given recommendation: accepted it, declined it, or acknowledged
 * no action was needed. undefined means no decision has been made yet.
 */
export async function getRecommendationDecision(
  beyondDayId: string,
  recommendationId: string,
): Promise<RecommendationDecision | undefined> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const match = events.find(
    (e) =>
      (e.type === "RECOMMENDATION_ACCEPTED" ||
        e.type === "RECOMMENDATION_DECLINED" ||
        e.type === "NO_ACTION_RECORDED") &&
      (e.payload as { recommendationId?: string }).recommendationId === recommendationId,
  );
  if (!match) return undefined;
  if (match.type === "RECOMMENDATION_ACCEPTED") return "ACCEPTED";
  if (match.type === "RECOMMENDATION_DECLINED") return "DECLINED";
  return "NO_ACTION_RECORDED";
}

export async function wasRecommendationRecorded(
  beyondDayId: string,
  recommendationId: string,
): Promise<boolean> {
  return (await getRecommendationDecision(beyondDayId, recommendationId)) !== undefined;
}

export interface PriorOutcomeMemory {
  recommendation: Recommendation;
  decision: RecommendationDecision;
  rating: NonNullable<Outcome["rating"]>;
  ratedAt: string;
}

/**
 * The most recent strictly-earlier recommendation with the exact same
 * kind that has both an explicit recorded decision and an explicit
 * GOOD/NEUTRAL/BAD rating. This is read-only history for TODAY's existing
 * WHY surface — never an Engine input or a prediction.
 *
 * Recommendation recency uses the established issuedAt + seq ordering.
 * A row indistinguishable from current on both fields is excluded because
 * the data cannot truthfully prove it came first. Multiple ratings are not
 * expected through the UI; if they exist, the latest recorded rating wins,
 * with id as a stable final tie-break.
 */
export async function getPriorOutcomeMemory(
  current: Recommendation,
): Promise<PriorOutcomeMemory | undefined> {
  const candidates = (await db.recommendations.toArray())
    .filter(
      (candidate) =>
        candidate.id !== current.id &&
        candidate.kind === current.kind &&
        byTimeThenSeq(candidate.issuedAt, candidate.seq, current.issuedAt, current.seq) < 0,
    )
    .sort((a, b) => {
      const byRecency = byTimeThenSeq(b.issuedAt, b.seq, a.issuedAt, a.seq);
      return byRecency !== 0 ? byRecency : a.id.localeCompare(b.id);
    });

  const ratedOutcomes = (await db.outcomes.toArray())
    .filter((outcome): outcome is Outcome & { recommendationId: string; rating: NonNullable<Outcome["rating"]> } =>
      outcome.recommendationId !== undefined && outcome.rating !== undefined,
    )
    .sort((a, b) => {
      const byRecordedAt = b.recordedAt.localeCompare(a.recordedAt);
      return byRecordedAt !== 0 ? byRecordedAt : a.id.localeCompare(b.id);
    });
  const latestRatingByRecommendation = new Map<string, (typeof ratedOutcomes)[number]>();
  for (const outcome of ratedOutcomes) {
    if (!latestRatingByRecommendation.has(outcome.recommendationId)) {
      latestRatingByRecommendation.set(outcome.recommendationId, outcome);
    }
  }

  for (const recommendation of candidates) {
    const outcome = latestRatingByRecommendation.get(recommendation.id);
    if (!outcome) continue;
    const decision = await getRecommendationDecision(recommendation.beyondDayId, recommendation.id);
    if (!decision) continue;
    return {
      recommendation,
      decision,
      rating: outcome.rating,
      ratedAt: outcome.recordedAt,
    };
  }

  return undefined;
}

/**
 * Reconstructs effective hydration truth from the raw event stream.
 * WATER_LOGGED starts a chain; WATER_LOG_CORRECTED events supersede the
 * amount without erasing the original fact. Effective total = sum of each
 * chain's current HEAD value, never the sum of every raw entry.
 */
export async function getHydrationEntries(
  beyondDayId: string,
): Promise<HydrationEntry[]> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const logged = events.filter(
    (e): e is DomainEvent<WaterLoggedPayload> => e.type === "WATER_LOGGED",
  );
  const corrections = events.filter(
    (e): e is DomainEvent<WaterLogCorrectedPayload> => e.type === "WATER_LOG_CORRECTED",
  );

  return logged
    .sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq))
    .map((root): HydrationEntry => {
      let headId = root.id;
      let headAmount = root.payload.amountOz;
      let count = 0;
      // Walk the chain forward: find the correction targeting the current
      // head, repeat, until no further correction exists.
      let next = corrections.find((c) => c.payload.supersedesEventId === headId);
      while (next) {
        headId = next.id;
        headAmount = next.payload.amountOz;
        count += 1;
        next = corrections.find((c) => c.payload.supersedesEventId === headId);
      }
      return {
        rootEventId: root.id,
        headEventId: headId,
        originalAmountOz: root.payload.amountOz,
        effectiveAmountOz: headAmount,
        correctionCount: count,
        recordedAt: root.recordedAt,
      };
    });
}

export async function getEffectiveHydrationTotal(beyondDayId: string): Promise<number> {
  const entries = await getHydrationEntries(beyondDayId);
  return entries.reduce((sum, e) => sum + e.effectiveAmountOz, 0);
}

export async function getEventCount(beyondDayId?: string): Promise<number> {
  if (!beyondDayId) return db.events.count();
  return db.events.where("beyondDayId").equals(beyondDayId).count();
}

export async function getRecommendationCount(beyondDayId?: string): Promise<number> {
  if (!beyondDayId) return db.recommendations.count();
  return db.recommendations.where("beyondDayId").equals(beyondDayId).count();
}

export async function getDayCount(): Promise<number> {
  return db.beyondDays.count();
}

/**
 * The Engine suggests ending the BeyondDay right after PRIMARY sleep is
 * logged (Context & Safety Decisions, 2026-08-19; refined by the Sleep/
 * Day-Ownership Model DECISION, 2026-08-19) — a suggestion, not an
 * automatic close. A SUPPLEMENTAL (nap) log never triggers this, so a
 * pre-shift nap doesn't prematurely suggest ending a day that's really
 * still going (e.g. through an overnight shift to the real closing
 * sleep afterward). Events logged before this decision have no `kind`
 * field at all — treated as PRIMARY, the only kind that existed then,
 * never reinterpreted as a nap.
 */
export async function shouldSuggestEndDay(beyondDayId: string): Promise<boolean> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const hasPrimarySleepLogged = events.some(
    (e) =>
      e.type === "SLEEP_LOGGED" &&
      ((e.payload as { kind?: "PRIMARY" | "SUPPLEMENTAL" }).kind ?? "PRIMARY") === "PRIMARY",
  );
  const hasEnded = events.some((e) => e.type === "DAY_ENDED");
  return hasPrimarySleepLogged && !hasEnded;
}

/**
 * Phase 5 (BODY logging): shared chain-walk for the single-value
 * correction chains (sleep, protein, bodyweight) — same walking logic as
 * getHydrationEntries (left untouched, not routed through this) applied
 * generically, since these three all gained the identical
 * logged-then-corrected shape this phase.
 */
function walkCorrectionChain(
  correctionEvents: DomainEvent[],
  rootId: string,
  rootValue: number,
  valueKey: string,
): { headEventId: string; effectiveValue: number; correctionCount: number } {
  let headId = rootId;
  let headValue = rootValue;
  let count = 0;
  let next = correctionEvents.find(
    (c) => (c.payload as { supersedesEventId: string }).supersedesEventId === headId,
  );
  while (next) {
    headId = next.id;
    headValue = (next.payload as Record<string, number>)[valueKey]!;
    count += 1;
    next = correctionEvents.find(
      (c) => (c.payload as { supersedesEventId: string }).supersedesEventId === headId,
    );
  }
  return { headEventId: headId, effectiveValue: headValue, correctionCount: count };
}

export interface SleepEntry {
  rootEventId: string;
  headEventId: string;
  originalDurationMinutes: number;
  effectiveDurationMinutes: number;
  correctionCount: number;
  recordedAt: string;
  kind: "PRIMARY" | "SUPPLEMENTAL";
}

/** Every sleep log for the day (PRIMARY and SUPPLEMENTAL), with corrections resolved to each entry's effective value. */
export async function getSleepEntries(beyondDayId: string): Promise<SleepEntry[]> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const logged = events.filter((e) => e.type === "SLEEP_LOGGED");
  const corrections = events.filter((e) => e.type === "SLEEP_LOG_CORRECTED");
  return logged
    .sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq))
    .map((root): SleepEntry => {
      const payload = root.payload as { durationMinutes: number; kind?: "PRIMARY" | "SUPPLEMENTAL" };
      const chain = walkCorrectionChain(corrections, root.id, payload.durationMinutes, "durationMinutes");
      return {
        rootEventId: root.id,
        headEventId: chain.headEventId,
        originalDurationMinutes: payload.durationMinutes,
        effectiveDurationMinutes: chain.effectiveValue,
        correctionCount: chain.correctionCount,
        recordedAt: root.recordedAt,
        kind: payload.kind ?? "PRIMARY",
      };
    });
}

/**
 * Most recent sleep duration logged for this BeyondDay (any kind), if
 * any — its effective (corrected) value, not necessarily the originally
 * logged one. See getLatestCheckIn's note on why this is sorted
 * explicitly rather than relying on Dexie's .last().
 */
export async function getLatestSleepMinutes(beyondDayId: string): Promise<number | undefined> {
  const entries = await getSleepEntries(beyondDayId);
  return entries.at(-1)?.effectiveDurationMinutes;
}

export interface BodyweightEntry {
  rootEventId: string;
  headEventId: string;
  originalWeightLbs: number;
  effectiveWeightLbs: number;
  correctionCount: number;
  recordedAt: string;
}

/** Every bodyweight log for the day, with corrections resolved to each entry's effective value. */
export async function getBodyweightEntries(beyondDayId: string): Promise<BodyweightEntry[]> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const logged = events.filter((e) => e.type === "BODYWEIGHT_LOGGED");
  const corrections = events.filter((e) => e.type === "BODYWEIGHT_LOG_CORRECTED");
  return logged
    .sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq))
    .map((root): BodyweightEntry => {
      const payload = root.payload as { weightLbs: number };
      const chain = walkCorrectionChain(corrections, root.id, payload.weightLbs, "weightLbs");
      return {
        rootEventId: root.id,
        headEventId: chain.headEventId,
        originalWeightLbs: payload.weightLbs,
        effectiveWeightLbs: chain.effectiveValue,
        correctionCount: chain.correctionCount,
        recordedAt: root.recordedAt,
      };
    });
}

/** Most recent bodyweight logged for this BeyondDay, if any — its effective (corrected) value. A fact only — no goal/target. */
export async function getLatestBodyweight(beyondDayId: string): Promise<number | undefined> {
  const entries = await getBodyweightEntries(beyondDayId);
  return entries.at(-1)?.effectiveWeightLbs;
}

export interface ProteinEntry {
  rootEventId: string;
  headEventId: string;
  originalGrams: number;
  effectiveGrams: number;
  correctionCount: number;
  recordedAt: string;
}

/** Every protein log for the day, with corrections resolved to each entry's effective value. */
export async function getProteinEntries(beyondDayId: string): Promise<ProteinEntry[]> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const logged = events.filter((e) => e.type === "PROTEIN_LOGGED");
  const corrections = events.filter((e) => e.type === "PROTEIN_LOG_CORRECTED");
  return logged
    .sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq))
    .map((root): ProteinEntry => {
      const payload = root.payload as { grams: number };
      const chain = walkCorrectionChain(corrections, root.id, payload.grams, "grams");
      return {
        rootEventId: root.id,
        headEventId: chain.headEventId,
        originalGrams: payload.grams,
        effectiveGrams: chain.effectiveValue,
        correctionCount: chain.correctionCount,
        recordedAt: root.recordedAt,
      };
    });
}

/** Total protein logged for this BeyondDay — sum of every entry's effective (corrected) value, no target/goal. */
export async function getTotalProteinGrams(beyondDayId: string): Promise<number> {
  const entries = await getProteinEntries(beyondDayId);
  return entries.reduce((sum, e) => sum + e.effectiveGrams, 0);
}

/**
 * Outcome rating placement (Context & Safety Decisions, 2026-08-19,
 * locked): "the next time TODAY is opened after a recommendation was
 * recorded, it can optionally show 'Last time: {recommendation} — how'd
 * that go?'" — tied to the recommendation lifecycle, appearing alongside
 * a genuinely newer recommendation, not the one currently on screen.
 * Only a RECORDED (accepted/no-action) recommendation is ratable, and
 * only once, per recommendation.
 */
/**
 * Drop 02a: the schedule pattern's I/O boundary. Reads the single stored
 * row, validates it, and falls back to DEFAULT_SCHEDULE_PATTERN if none
 * exists yet (a fresh v4 install is seeded by the Dexie migration, so this
 * only matters for in-memory/test databases opened without going through
 * that upgrade) or if the stored row is malformed (e.g. a hand-edited or
 * corrupted imported backup) — "unknown is better than false precision"
 * beats surfacing a broken schedule or throwing. Never writes.
 */
export async function getSchedulePattern(): Promise<SchedulePattern> {
  const raw = await db.schedulePatterns.get("current");
  if (!raw) return DEFAULT_SCHEDULE_PATTERN;
  return parseSchedulePattern(raw) ?? DEFAULT_SCHEDULE_PATTERN;
}

/**
 * Thin wrapper so the UI has one query entry point rather than importing
 * the engine function directly, matching every other derived-state query
 * in this file. Defaults to real "now" in production; tests inject a
 * fixed Date. Purely a read — never touches BeyondDay.workContext.
 *
 * Drop 02a: loads the stored SchedulePattern first (persistence retrieves
 * configuration), then calls the pure deriver (engine interprets it).
 * deriveScheduledContext itself does no I/O and stays fully testable in
 * isolation with an explicit pattern argument.
 */
export async function getScheduledContext(now: Date = new Date()): Promise<ScheduledContext> {
  const pattern = await getSchedulePattern();
  return deriveScheduledContext(now, pattern);
}

export interface MinimumDayStatus {
  enabled: boolean;
  hydrate: boolean;
  protein: boolean;
  meds: boolean;
  hygiene: boolean;
  move: boolean;
  recoverConnect: boolean;
  allSatisfied: boolean;
}

const MINIMUM_DAY_HYDRATE_OZ = 40;
const MINIMUM_DAY_PROTEIN_G = 25;
const MINIMUM_DAY_MOVE_MINUTES = 5;
const MINIMUM_DAY_RECOVER_CONNECT_MINUTES = 10;

/**
 * MINIMUM DAY (Decision Register, RESET/CAPACITY — locked six-item
 * baseline, reconfirmed by the 2026-08-19 authority reconciliation which
 * explicitly rejected the simplified "any check-in + any BODY log"
 * proposal). HYDRATE/PROTEIN derive automatically from existing BODY
 * logs; MOVE/RECOVER_CONNECT derive automatically from a RECOVERY
 * session's actual duration where it proves the condition, with manual
 * completion as the documented fallback; MEDS/HYGIENE are always manual
 * (generic completion, no details stored — there's no event that could
 * "prove" them automatically without collecting private detail).
 */
export async function getMinimumDayStatus(beyondDayId: string): Promise<MinimumDayStatus> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const enabled = events.some((e) => e.type === "MINIMUM_DAY_ENABLED");

  const hydrateTotal = await getEffectiveHydrationTotal(beyondDayId);
  const proteinTotal = await getTotalProteinGrams(beyondDayId);

  const meds = events.some((e) => e.type === "MEDS_COMPLETED");
  const hygiene = events.some((e) => e.type === "HYGIENE_COMPLETED");

  const recoveryDurations = events
    .filter(
      (e) =>
        (e.type === "WORKOUT_COMPLETED" || e.type === "WORKOUT_ABANDONED") &&
        (e.payload as { sessionType?: string }).sessionType === "RECOVERY",
    )
    .map((e) => (e.payload as { durationMinutes?: number }).durationMinutes)
    .filter((d): d is number => d !== undefined);

  const move =
    recoveryDurations.some((d) => d >= MINIMUM_DAY_MOVE_MINUTES) ||
    events.some((e) => e.type === "MOVE_COMPLETED");
  const recoverConnect =
    recoveryDurations.some((d) => d >= MINIMUM_DAY_RECOVER_CONNECT_MINUTES) ||
    events.some((e) => e.type === "RECOVER_CONNECT_COMPLETED");

  const hydrate = hydrateTotal >= MINIMUM_DAY_HYDRATE_OZ;
  const protein = proteinTotal >= MINIMUM_DAY_PROTEIN_G;

  return {
    enabled,
    hydrate,
    protein,
    meds,
    hygiene,
    move,
    recoverConnect,
    allSatisfied: hydrate && protein && meds && hygiene && move && recoverConnect,
  };
}

export async function getPendingOutcomeRating(beyondDayId: string): Promise<Recommendation | undefined> {
  // Leverage Implementation 001 (deterministic ordering hardening,
  // 2026-08-22): Recommendation carries `seq`, so a same-instant tie
  // (two recommendations issued in the same millisecond) is no longer
  // resolved by raw timestamp-string comparison alone.
  const recommendations = (await db.recommendations.where("beyondDayId").equals(beyondDayId).toArray()).sort(
    (a, b) => byTimeThenSeq(a.issuedAt, a.seq, b.issuedAt, b.seq),
  );
  if (recommendations.length < 2) return undefined; // no "last time" without a newer one on screen

  const past = recommendations.slice(0, -1);
  const outcomes = await db.outcomes.where("beyondDayId").equals(beyondDayId).toArray();
  const rated = new Set(outcomes.filter((o) => o.rating).map((o) => o.recommendationId));

  for (let i = past.length - 1; i >= 0; i--) {
    const candidate = past[i]!;
    if (rated.has(candidate.id)) continue;
    if (await wasRecommendationRecorded(beyondDayId, candidate.id)) return candidate;
  }
  return undefined;
}

export interface OpenResetInfo {
  eventId: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  startedAt: string;
}

export interface OpenShiftDownInfo {
  eventId: string;
  durationMinutes: number;
  startedAt: string;
}

/**
 * Interrupted-session reconstruction (P0): RESET/SHIFT DOWN's in-progress
 * state previously lived only in React component state, so a reload while
 * one was open would lose track of it entirely — the panel would forget
 * it was ever started, letting a fresh START create a second, orphaned
 * RESET_STARTED with no matching completion. Finds a RESET_STARTED (or
 * SHIFT_DOWN_STARTED) with no matching terminal event (matched by
 * causationId) and returns the original chosen value so the UI can
 * restore the exact in-progress state, not just "something is open."
 * If more than one is somehow open, the most recent wins.
 *
 * Phase 4 (guided RESET/SHIFT DOWN): *_CANCELLED is now a second terminal
 * event alongside *_COMPLETED — cancelling closes out an open RESET/SHIFT
 * DOWN exactly like completing it does, it just means something different
 * historically (see cancelReset/cancelShiftDown). startedAt (the original
 * STARTED event's occurredAt) is exposed so the in-progress UI can show
 * when it began, not just that something is open.
 */
export async function getOpenReset(beyondDayId: string): Promise<OpenResetInfo | undefined> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const terminalTargets = new Set(
    events
      .filter((e) => e.type === "RESET_COMPLETED" || e.type === "RESET_CANCELLED")
      .map((e) => e.causationId),
  );
  const open = events
    .filter((e) => e.type === "RESET_STARTED" && !terminalTargets.has(e.id))
    .sort((a, b) => byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq))
    .at(-1);
  if (!open) return undefined;
  return {
    eventId: open.id,
    intensity: (open.payload as { intensity: 1 | 2 | 3 | 4 | 5 }).intensity,
    startedAt: open.occurredAt,
  };
}

export async function getOpenShiftDown(beyondDayId: string): Promise<OpenShiftDownInfo | undefined> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const terminalTargets = new Set(
    events
      .filter((e) => e.type === "SHIFT_DOWN_COMPLETED" || e.type === "SHIFT_DOWN_CANCELLED")
      .map((e) => e.causationId),
  );
  const open = events
    .filter((e) => e.type === "SHIFT_DOWN_STARTED" && !terminalTargets.has(e.id))
    .sort((a, b) => byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq))
    .at(-1);
  if (!open) return undefined;
  return {
    eventId: open.id,
    durationMinutes: (open.payload as { durationMinutes: number }).durationMinutes,
    startedAt: open.occurredAt,
  };
}

export interface WorkPeriodEndedInfo {
  eventId: string;
  occurredAt: string;
}

/**
 * Drop 02b (Explicit Work Transition): the day's one effective
 * WORK_PERIOD_ENDED fact, if any — application/commands.ts's
 * markWorkEnded is the only writer, and is itself idempotent, so there is
 * at most one of these per BeyondDay. Returns it regardless of whether a
 * later SHIFT_DOWN_COMPLETED has since cleared the post-shift requirement
 * (see hasUnresolvedPostShift below for that check) — this query answers
 * "did work ever end today," not "is it still unresolved."
 */
export async function getWorkPeriodEnded(beyondDayId: string): Promise<WorkPeriodEndedInfo | undefined> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const ended = events.find((e) => e.type === "WORK_PERIOD_ENDED");
  if (!ended) return undefined;
  return { eventId: ended.id, occurredAt: ended.occurredAt };
}

/**
 * Drop 02b: true exactly when this BeyondDay has a WORK_PERIOD_ENDED fact
 * that no SHIFT_DOWN_COMPLETED has happened after (Decision Register:
 * "SHIFT_DOWN_COMPLETED clears the post-shift requirement"). A
 * SHIFT_DOWN_COMPLETED that happened BEFORE the work-ended fact (an
 * earlier, unrelated shift-down) does not clear a later requirement. Feeds
 * engine/evaluate.ts's EvaluateInput.hasUnresolvedPostShift — the Engine
 * itself stays pure and never touches Dexie.
 */
export async function hasUnresolvedPostShift(beyondDayId: string): Promise<boolean> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const ended = events.find((e) => e.type === "WORK_PERIOD_ENDED");
  if (!ended) return false;
  // Harvest Checkpoint 7 (CI-discovered, unrelated to this sprint's own
  // changes — application/queries.ts's own hasUnresolvedPostShift is
  // untouched by anything else this session built): a raw string `>`
  // comparison of occurredAt treats a genuine same-millisecond tie as
  // "not after," so a SHIFT_DOWN_COMPLETED that lands in the exact same
  // millisecond as the WORK_PERIOD_ENDED fact it's meant to clear was
  // incorrectly still counted as unresolved. Same class of flakiness
  // this file already fixed for every other "most recent" query via the
  // seq tie-break (byTimeThenSeq, above) — this is the one query in
  // this file that hadn't been routed through it yet.
  const clearedAfter = events.some(
    (e) => e.type === "SHIFT_DOWN_COMPLETED" && byTimeThenSeq(e.occurredAt, e.seq, ended.occurredAt, ended.seq) > 0,
  );
  return !clearedAfter;
}

/**
 * Overdrive Phase 10: everything currently open in the inbox, oldest
 * first — reading order matches capture order, not urgency ("inbox age
 * is not urgency" is about not auto-promoting old items, not about how
 * they're listed).
 */
export async function getOpenCaptureItems(): Promise<CaptureItem[]> {
  const items = await db.captureItems.where("status").equals("OPEN").toArray();
  return items.sort((a, b) => byTimeThenSeq(a.capturedAt, a.seq, b.capturedAt, b.seq));
}

/** Every capture regardless of status, oldest first — the full history view. */
export async function getAllCaptureItems(): Promise<CaptureItem[]> {
  const items = await db.captureItems.toArray();
  return items.sort((a, b) => byTimeThenSeq(a.capturedAt, a.seq, b.capturedAt, b.seq));
}
