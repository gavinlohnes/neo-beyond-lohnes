/**
 * GRAYSON-TODAY-SPLIT-003 slice A ("one read"): every read TODAY's refresh() makes, gathered into one typed
 * snapshot of the day. The reads, their order and their failure handling moved here unchanged from
 * TodayScreen.refresh(); TodayScreen still owns the request-id ownership checks and installs the snapshot in one
 * synchronous run (the 2026-09-02 CI-flake fix). `currentContext` and the Garmin measured snapshot keep their own
 * request-guarded paths in TodayScreen.
 */
import { getWeekAhead, type WeekAhead } from "../../../application/weekAheadQueries";
import { getLivedDayMap, type MapMark } from "../../../application/livedDayMap";
import { getShiftSleepPlan, type ShiftSleepPlan } from "../../../application/shiftSleepPlan";
import { getRecordedDayBefore, getRecordedYesterday } from "../../../application/lifeState";
import { getConfirmedExceptions } from "../../../application/scheduleExceptions";
import { hasRecoveryContract } from "../../../application/recoveryContract";
import { livedDayStartOf } from "../../../application/reflect";
import { getLastMainSleep, getSystemStatus, type SystemStatus } from "../../../application/systemStatus";
import { getBackupPrompt } from "../../../application/autoBackupQueries";
import { getEarlyDayStart, livedReadAt, type EarlyDayStart } from "../../../application/earlyDayStart";
import { getCurrentlyEligibleUnresolvedObligations, getMissionForObligation } from "../../../application/intentQueries";
import { getAdvisoryNotes } from "../../../application/advisoryQueries";
import { wasRecommendationMateriallyRepeated } from "../../../application/continuityQueries";
import { getTonightState, type TonightState } from "../../../application/tonightQueries";
import { getEffectiveProteinTargetG, getNutritionTargets } from "../../../application/nutritionTargetQueries";
import { getCheckInDraft } from "../../../application/checkInDraftQueries";
import { getRecommendationMemory, type RecommendationMemory, type RememberedLesson } from "../../../application/remember";
import {
  getActiveDay,
  getLatestCheckIn,
  getLatestRecommendation,
  getRecommendationDecision,
  getRecommendationHandoff,
  shouldSuggestEndDay,
  getPendingOutcomeRating,
  getPriorOutcomeMemory,
  getMinimumDayStatus,
  getEffectiveHydrationTotal,
  getHydrationEntries,
  getMostRecentBodyweight,
  getDayProteinTotalG,
  getOpenReset,
  getOpenShiftDown,
  getLastShiftDownCompletedAt,
  getWorkPeriodEnded,
  getWorkPeriodStarted,
  getWorkContextSource,
  hasUnresolvedPostShift,
  getOpenCaptureItems,
  getSchedulePattern,
  getSleepEntries,
  getSleepDraftEvidence,
  type MinimumDayStatus,
  type PriorOutcomeMemory,
  type RecommendationDecision,
  type RecommendationHandoffTarget,
} from "../../../application/queries";
import { getActiveWorkoutSession } from "../../../application/trainQueries";
import { getMostRelevantUnresolvedObligation } from "../../../engine/obligationRelevance";
import { formatLocalDate } from "../../../engine/scheduledContext";
import type { CheckInDraft } from "../../../engine/checkInDraft";
import type { AdvisoryNote } from "../../../domain/intelligence/types";
import type { Mission, Obligation } from "../../../domain/intent/types";
import type { DecisionJournalEntry } from "../../../domain/journal/types";
import type {
  BeyondDay,
  CaptureItem,
  Recommendation,
  SchedulePattern,
  StateCheckIn,
  WorkContextSource,
  WorkoutSession,
} from "../../../domain/common/types";
import { getAppOpenedAt } from "../../appSession";

/** LIFE-STATE-001/002: yesterday's recorded work context, kept with the lived day it was read for. */
export type TodayYesterday = {
  livedDay: number;
  kind: "WORK" | "OFF" | null;
  dayBefore: "WORK" | "OFF" | null;
  contractPlanned: boolean;
  confirmed: ReadonlyMap<string, "WORK" | "OFF">;
  week: WeekAhead | null;
  map: MapMark[];
  sleepPlan: ShiftSleepPlan | null;
};

/**
 * Every reader readTodaySnapshot uses. Tests pass fakes; TODAY uses the real application reads, looked up at call
 * time so a module mock in a test still reaches them.
 */
export function todayReaders() {
  return {
    getActiveDay,
    getActiveWorkoutSession,
    getOpenCaptureItems,
    getCurrentlyEligibleUnresolvedObligations,
    getMissionForObligation,
    getCheckInDraft,
    getLatestCheckIn,
    getLatestRecommendation,
    getRecommendationDecision,
    getRecommendationHandoff,
    getPriorOutcomeMemory,
    getRecommendationMemory,
    wasRecommendationMateriallyRepeated,
    shouldSuggestEndDay,
    getPendingOutcomeRating,
    getMinimumDayStatus,
    getEffectiveHydrationTotal,
    getHydrationEntries,
    getMostRecentBodyweight,
    getDayProteinTotalG,
    getOpenReset,
    getOpenShiftDown,
    getLastShiftDownCompletedAt,
    getWorkPeriodEnded,
    getWorkPeriodStarted,
    hasUnresolvedPostShift,
    getWorkContextSource,
    getSleepEntries,
    getSleepDraftEvidence,
    getAppOpenedAt,
    getAdvisoryNotes,
    getSystemStatus,
    getLastMainSleep,
    getEffectiveProteinTargetG,
    getNutritionTargets,
    getTonightState,
    getEarlyDayStart,
    getRecordedYesterday,
    getRecordedDayBefore,
    hasRecoveryContract,
    getConfirmedExceptions,
    getWeekAhead,
    getLivedDayMap,
    getShiftSleepPlan,
    getSchedulePattern,
    getBackupPrompt,
  };
}
export type TodayReaders = ReturnType<typeof todayReaders>;

/** One typed snapshot of the day: what TODAY's refresh() reads. */
export interface TodaySnapshot {
  day: BeyondDay | null;
  activeWorkout: WorkoutSession | null;
  /** LIFE-STATE-001: yesterday's recorded work context (read in refresh); the state is derived in render. */
  yesterdayRecorded: TodayYesterday | null;
  earlyStart: EarlyDayStart | null;
  schedulePattern: SchedulePattern | null;
  openCaptureItems: CaptureItem[];
  /**
   * Intent & Commitment Spine, Drop 02: currently-eligible unresolved Obligations, fetched unconditionally like
   * openCaptureItems — Obligations are not day-scoped either (see application/intentQueries.ts). Intent Lifecycle
   * Integrity (2026-08-23): sourced from getCurrentlyEligibleUnresolvedObligations, not getUnresolvedObligations
   * directly — an Obligation whose parent Mission is ARCHIVED must not participate in COMMITMENT/ATTENTION (see
   * docs/UX_DECISIONS.md).
   */
  unresolvedObligations: Obligation[];
  headlineCommitmentMission: { obligationId: string; mission: Mission } | null;
  checkIn: StateCheckIn | null;
  recommendation: Recommendation | null;
  decision: RecommendationDecision | undefined;
  recommendationHandoff: RecommendationHandoffTarget | null;
  priorOutcomeMemory: PriorOutcomeMemory | null;
  /** LOOP step 4 — REMEMBER: your own earlier conclusions, read with the rest of TODAY so nothing pops in later. */
  rememberedLesson: RememberedLesson | null;
  pendingReflection: DecisionJournalEntry | null;
  materiallyRepeated: boolean;
  suggestEndDay: boolean;
  pendingOutcome: Recommendation | null;
  minimumDay: MinimumDayStatus | null;
  minimumDayHydrateOz: number;
  minimumDayProteinG: number;
  /** The open RESET found on this read; TODAY seeds its RESET session from it. */
  openReset: Awaited<ReturnType<typeof getOpenReset>> | undefined;
  /** The open SHIFT DOWN found on this read; TODAY seeds its SHIFT DOWN session from it. */
  openShiftDown: Awaited<ReturnType<typeof getOpenShiftDown>> | undefined;
  /** Soak fix (2026-10-04): when this day's latest SHIFT DOWN completed, from history, so a reload knows too. */
  shiftDownCompletedAt: string | null;
  workPeriodEndedAt: string | null;
  /** OWNER-GO-001: STARTED WORK puts TODAY on shift at once, even before the scheduled start. */
  workPeriodStartedAt: string | null;
  unresolvedPostShift: boolean;
  /** DROP 0: where the day's work context came from — "per schedule" only while the saved schedule's value stands. */
  workContextSource: WorkContextSource | undefined;
  /** Recorded times of this day's main-sleep logs (see mainSleepEndsPostShift). */
  mainSleepRecordedAt: string[];
  sleepDraftEvidence: Awaited<ReturnType<typeof getSleepDraftEvidence>> | null;
  /** Drop 5: the check-in draft (the operator's previous answers). */
  checkInDraft: CheckInDraft | undefined;
  advisoryNotes: AdvisoryNote[];
  lastWaterAmount: number | null;
  waterLogCount: number;
  /** POLISH-002: TODAY's four number tiles — the latest weigh-in and today's water-log count. */
  latestWeightLbs: number | undefined;
  systemStatus: SystemStatus | null;
  /** SUIT-001: the SYSTEMS line's sleep reading — System Status's own last-main-sleep rule. */
  lastMainSleepMinutes: number | null;
  lastMainSleepFromGarmin: boolean;
  /** SUIT-001: the existing backup-due rule (same setting and threshold as BackupDueLine). */
  backupDue: { days: number | null } | null;
  proteinTargetG: number | undefined;
  /** GRAYSON C4.6: his own water target, when he set one. */
  waterTargetOz: number | undefined;
  tonight: TonightState | null;
}

/** What TODAY shows before its first read lands: the same starting values its separate states had. */
export const EMPTY_TODAY_SNAPSHOT: TodaySnapshot = {
  day: null,
  activeWorkout: null,
  yesterdayRecorded: null,
  earlyStart: null,
  schedulePattern: null,
  openCaptureItems: [],
  unresolvedObligations: [],
  headlineCommitmentMission: null,
  checkIn: null,
  recommendation: null,
  decision: undefined,
  recommendationHandoff: null,
  priorOutcomeMemory: null,
  rememberedLesson: null,
  pendingReflection: null,
  materiallyRepeated: false,
  suggestEndDay: false,
  pendingOutcome: null,
  minimumDay: null,
  minimumDayHydrateOz: 0,
  minimumDayProteinG: 0,
  openReset: undefined,
  openShiftDown: undefined,
  shiftDownCompletedAt: null,
  workPeriodEndedAt: null,
  workPeriodStartedAt: null,
  unresolvedPostShift: false,
  workContextSource: undefined,
  mainSleepRecordedAt: [],
  sleepDraftEvidence: null,
  checkInDraft: undefined,
  advisoryNotes: [],
  lastWaterAmount: null,
  waterLogCount: 0,
  latestWeightLbs: undefined,
  systemStatus: null,
  lastMainSleepMinutes: null,
  lastMainSleepFromGarmin: false,
  backupDue: null,
  proteinTargetG: undefined,
  waterTargetOz: undefined,
  tonight: null,
};

export interface ReadTodayOptions {
  /** Fakes for tests; anything left out uses the real read. */
  readers?: Partial<TodayReaders>;
  /**
   * Called synchronously the moment the first read (active day and workout) resolves, before any other read
   * starts. TODAY decides ownership and starts its `currentContext` read here, at the same moment as before.
   */
  onDayRead?: (activeDay: BeyondDay | null, activeWorkout: WorkoutSession | null) => void;
}

/**
 * Reads the day. `now` is called wherever the read used `new Date()`, so each clock reading happens at the same
 * point in the read as before. A failed optional read is left out exactly as TODAY always did; a failed required
 * read rejects.
 */
export async function readTodaySnapshot(now: () => Date = () => new Date(), options: ReadTodayOptions = {}): Promise<TodaySnapshot> {
  const r: TodayReaders = { ...todayReaders(), ...options.readers };
  const [activeDay, activeWorkoutSession]: [BeyondDay | null, WorkoutSession | null] = await Promise.all([
    r.getActiveDay().then((result) => result ?? null),
    r.getActiveWorkoutSession().then((result) => result ?? null),
  ]);
  options.onDayRead?.(activeDay, activeWorkoutSession);

  // Overdrive Phase 10: capture is deliberately not day-scoped ("inbox
  // age is not urgency," and jotting something down shouldn't require a
  // BeyondDay to already exist), so this refreshes unconditionally.
  const openCaptureItems = await r.getOpenCaptureItems();
  // Intent & Commitment Spine, Drop 02: same reasoning — Obligations are
  // not day-scoped either.
  const obligations = await r.getCurrentlyEligibleUnresolvedObligations();
  const headline = getMostRelevantUnresolvedObligation(obligations, formatLocalDate(now()));
  const mission = headline ? await r.getMissionForObligation(headline.obligation) : undefined;
  const headlineCommitmentMission = headline && mission ? { obligationId: headline.obligation.id, mission } : null;

  let checkIn: StateCheckIn | null = null;
  let rec: Recommendation | null = null;
  let decision: RecommendationDecision | undefined;
  let recommendationHandoff: RecommendationHandoffTarget | null = null;
  let priorOutcomeMemory: PriorOutcomeMemory | null = null;
  let rememberedLesson: RememberedLesson | null = null;
  let pendingReflection: DecisionJournalEntry | null = null;
  let materiallyRepeated = false;
  let suggestEndDay = false;
  let pendingOutcome: Awaited<ReturnType<typeof getPendingOutcomeRating>> | null = null;
  let minimumDay: MinimumDayStatus | null = null;
  let minimumDayHydrateOz = 0;
  let lastWater: number | null = null;
  let waterLogs = 0;
  let latestWeight: number | undefined;
  let minimumDayProteinG = 0;
  let openReset: Awaited<ReturnType<typeof getOpenReset>> | undefined;
  let openShiftDown: Awaited<ReturnType<typeof getOpenShiftDown>> | undefined;
  let shiftDownCompletedAtValue: string | null = null;
  let workPeriodEndedAt: string | null = null;
  let workPeriodStartedAt: string | null = null;
  let unresolvedPostShift = false;
  let workContextSource: WorkContextSource | undefined;
  let mainSleepTimes: string[] = [];
  let draftEvidence: Awaited<ReturnType<typeof getSleepDraftEvidence>> | null = null;
  // Drop 5: the check-in draft reads the operator's latest check-in on any day.
  const nextCheckInDraft = await r.getCheckInDraft();

  if (activeDay) {
    checkIn = (await r.getLatestCheckIn(activeDay.id)) ?? null;
    rec = (await r.getLatestRecommendation(activeDay.id)) ?? null;
    decision = rec ? await r.getRecommendationDecision(activeDay.id, rec.id) : undefined;
    recommendationHandoff = rec ? (await r.getRecommendationHandoff(rec)) ?? null : null;
    priorOutcomeMemory = rec ? (await r.getPriorOutcomeMemory(rec)) ?? null : null;
    // Optional context: a failed read leaves it out rather than failing TODAY.
    const memory: RecommendationMemory = rec && rec.kind !== "NO_ACTION_REQUIRED" ? await r.getRecommendationMemory(rec).catch(() => ({})) : {};
    rememberedLesson = memory.lesson ?? null;
    pendingReflection = memory.pending ?? null;
    materiallyRepeated = rec ? await r.wasRecommendationMateriallyRepeated(rec) : false;
    suggestEndDay = await r.shouldSuggestEndDay(activeDay.id);
    pendingOutcome = rec ? (await r.getPendingOutcomeRating(rec)) ?? null : null;
    minimumDay = await r.getMinimumDayStatus(activeDay.id);
    minimumDayHydrateOz = await r.getEffectiveHydrationTotal(activeDay.id);
    const waterEntries = await r.getHydrationEntries(activeDay.id);
    lastWater = waterEntries.at(-1)?.effectiveAmountOz ?? null;
    waterLogs = waterEntries.length;
    latestWeight = await r.getMostRecentBodyweight();
    // DROP 1.5: the one shared day total (protein-only logs + meals), same as BODY and Nutrition Targets.
    minimumDayProteinG = await r.getDayProteinTotalG(activeDay.id);
    openReset = await r.getOpenReset(activeDay.id);
    openShiftDown = await r.getOpenShiftDown(activeDay.id);
    shiftDownCompletedAtValue = (await r.getLastShiftDownCompletedAt(activeDay.id)) ?? null;
    const workPeriodEnded = await r.getWorkPeriodEnded(activeDay.id);
    workPeriodEndedAt = workPeriodEnded ? workPeriodEnded.occurredAt : null;
    workPeriodStartedAt = (await r.getWorkPeriodStarted(activeDay.id))?.occurredAt ?? null;
    unresolvedPostShift = await r.hasUnresolvedPostShift(activeDay.id);
    workContextSource = await r.getWorkContextSource(activeDay.id);
    mainSleepTimes = (await r.getSleepEntries(activeDay.id)).filter((e) => e.kind === "PRIMARY").map((e) => e.recordedAt);
    draftEvidence = await r.getSleepDraftEvidence(activeDay.id, r.getAppOpenedAt());
  }
  // Intelligence Spine consumption (2026-09-02): advisory notes are pure
  // SUPPORT-tier background context with no ordering dependency on
  // anything else refresh() loads — gathered here alongside everything
  // above rather than separately, now that everything commits together
  // anyway.
  const advisoryNotes = await r.getAdvisoryNotes();
  // STATUS-001: the one System Status line (read only; never reaches the Engine), composed from
  // THIS refresh's own activeDay and installed only by the refresh that owns the screen.
  const nextSystemStatus = await r.getSystemStatus(activeDay ?? null).catch(() => null);
  const nextLastMainSleep = activeDay ? await r.getLastMainSleep(activeDay.id).catch(() => null) : null;
  const effectiveProteinTarget = await r.getEffectiveProteinTargetG();
  const nextWaterTarget = await r.getNutritionTargets().then((t) => t.waterTargetOz, () => undefined);
  // TONIGHT-001: the morning call, wake card and night summary read one small fact set.
  const tonightState = activeDay ? await r.getTonightState(activeDay.id).catch(() => null) : null;
  // LIFE-STATE-001: yesterday's recorded work context, read with everything else so the state band lands in the
  // same render as the rest of TODAY (no layout jump after load).
  // The schedule too (loadShiftClockSetup also reads it), so the band never appears after the tiles. Yesterday is
  // kept with the lived day it was read for (review of #494), so after 16:30 a stale read is ignored, not used.
  // EARLY-DAY-START-001: a day opened early is read as the 16:30 day it is.
  const readAt = livedReadAt(activeDay, now());
  const nextEarlyStart = await r.getEarlyDayStart(now()).catch(() => null);
  // LIFE-STATE-002: the day before yesterday too (for yesterday's own state, so a transition can be named), and
  // whether the run-over follow-up is already planned, so it isn't offered twice.
  const [nextYesterday, nextSchedule] = activeDay ? await Promise.all([
    Promise.all([r.getRecordedYesterday(readAt), r.getRecordedDayBefore(readAt, 2), r.hasRecoveryContract(readAt), r.getConfirmedExceptions(), r.getWeekAhead(readAt).catch(() => null), r.getLivedDayMap(activeDay, readAt).catch(() => [] as MapMark[]), r.getShiftSleepPlan(readAt).catch(() => null)])
      .then(([kind, dayBefore, contractPlanned, exceptions, week, map, sleepPlan]) => ({ livedDay: livedDayStartOf(readAt).getTime(), kind, dayBefore, contractPlanned, week, map, sleepPlan,
        // SCHEDULE-EXCEPTIONS-001: confirmed changes, for the state, its moments and the shift run (FIELD-READINESS-001).
        confirmed: new Map([...exceptions].map(([date, e]) => [date, e.kind] as const)) }), () => null),
    r.getSchedulePattern().catch(() => null),
  ]) : [null, null];
  const prompt = r.getBackupPrompt();

  return {
    day: activeDay,
    activeWorkout: activeWorkoutSession,
    yesterdayRecorded: nextYesterday,
    earlyStart: nextEarlyStart,
    schedulePattern: nextSchedule,
    openCaptureItems,
    unresolvedObligations: obligations,
    headlineCommitmentMission,
    checkIn,
    recommendation: rec,
    decision,
    recommendationHandoff,
    priorOutcomeMemory,
    rememberedLesson,
    pendingReflection,
    materiallyRepeated,
    suggestEndDay,
    pendingOutcome,
    minimumDay,
    minimumDayHydrateOz,
    minimumDayProteinG,
    openReset,
    openShiftDown,
    shiftDownCompletedAt: shiftDownCompletedAtValue,
    workPeriodEndedAt,
    workPeriodStartedAt,
    unresolvedPostShift,
    workContextSource,
    mainSleepRecordedAt: mainSleepTimes,
    sleepDraftEvidence: draftEvidence,
    checkInDraft: nextCheckInDraft,
    advisoryNotes,
    lastWaterAmount: lastWater,
    waterLogCount: waterLogs,
    latestWeightLbs: latestWeight,
    systemStatus: nextSystemStatus,
    lastMainSleepMinutes: nextLastMainSleep?.minutes ?? null,
    lastMainSleepFromGarmin: nextLastMainSleep?.fromGarmin ?? false,
    backupDue: prompt?.kind === "BACKUP_DUE" ? { days: prompt.daysSinceLastBackup } : null,
    proteinTargetG: effectiveProteinTarget,
    waterTargetOz: nextWaterTarget,
    tonight: tonightState,
  };
}

/**
 * Installs a fresh read over what TODAY already shows, keeping exactly the fields refresh() always left alone:
 * - a refresh that no longer owns the screen never installs the day, the workout, yesterday, the early start, the
 *   schedule, the System Status line or the last main sleep;
 * - a failed schedule read leaves the schedule TODAY already had;
 * - with no active day, the day-scoped reads keep their last values, except the recommendation, its decision and
 *   its hand-off, which clear.
 * Pure: no reads, no clock.
 */
export function installTodaySnapshot(prev: TodaySnapshot | null, next: TodaySnapshot, { isOwner }: { isOwner: boolean }): TodaySnapshot {
  const base = prev ?? EMPTY_TODAY_SNAPSHOT;
  const owned = isOwner
    ? {
        day: next.day,
        activeWorkout: next.activeWorkout,
        yesterdayRecorded: next.yesterdayRecorded,
        earlyStart: next.earlyStart,
        schedulePattern: next.schedulePattern ?? base.schedulePattern,
        systemStatus: next.systemStatus,
        lastMainSleepMinutes: next.lastMainSleepMinutes,
        lastMainSleepFromGarmin: next.lastMainSleepFromGarmin,
      }
    : {
        day: base.day,
        activeWorkout: base.activeWorkout,
        yesterdayRecorded: base.yesterdayRecorded,
        earlyStart: base.earlyStart,
        schedulePattern: base.schedulePattern,
        systemStatus: base.systemStatus,
        lastMainSleepMinutes: base.lastMainSleepMinutes,
        lastMainSleepFromGarmin: base.lastMainSleepFromGarmin,
      };
  const dayScoped = next.day
    ? {
        checkIn: next.checkIn,
        recommendation: next.recommendation,
        decision: next.decision,
        recommendationHandoff: next.recommendationHandoff,
        priorOutcomeMemory: next.priorOutcomeMemory,
        rememberedLesson: next.rememberedLesson,
        pendingReflection: next.pendingReflection,
        materiallyRepeated: next.materiallyRepeated,
        suggestEndDay: next.suggestEndDay,
        pendingOutcome: next.pendingOutcome,
        minimumDay: next.minimumDay,
        minimumDayHydrateOz: next.minimumDayHydrateOz,
        minimumDayProteinG: next.minimumDayProteinG,
        openReset: next.openReset,
        openShiftDown: next.openShiftDown,
        shiftDownCompletedAt: next.shiftDownCompletedAt,
        workPeriodEndedAt: next.workPeriodEndedAt,
        workPeriodStartedAt: next.workPeriodStartedAt,
        unresolvedPostShift: next.unresolvedPostShift,
        workContextSource: next.workContextSource,
        mainSleepRecordedAt: next.mainSleepRecordedAt,
        sleepDraftEvidence: next.sleepDraftEvidence,
        checkInDraft: next.checkInDraft,
      }
    : {
        checkIn: base.checkIn,
        recommendation: null,
        decision: undefined,
        recommendationHandoff: null,
        priorOutcomeMemory: base.priorOutcomeMemory,
        rememberedLesson: base.rememberedLesson,
        pendingReflection: base.pendingReflection,
        materiallyRepeated: base.materiallyRepeated,
        suggestEndDay: base.suggestEndDay,
        pendingOutcome: base.pendingOutcome,
        minimumDay: base.minimumDay,
        minimumDayHydrateOz: base.minimumDayHydrateOz,
        minimumDayProteinG: base.minimumDayProteinG,
        openReset: base.openReset,
        openShiftDown: base.openShiftDown,
        shiftDownCompletedAt: base.shiftDownCompletedAt,
        workPeriodEndedAt: base.workPeriodEndedAt,
        workPeriodStartedAt: base.workPeriodStartedAt,
        unresolvedPostShift: base.unresolvedPostShift,
        workContextSource: base.workContextSource,
        mainSleepRecordedAt: base.mainSleepRecordedAt,
        sleepDraftEvidence: base.sleepDraftEvidence,
        checkInDraft: base.checkInDraft,
      };
  return {
    ...owned,
    ...dayScoped,
    openCaptureItems: next.openCaptureItems,
    unresolvedObligations: next.unresolvedObligations,
    headlineCommitmentMission: next.headlineCommitmentMission,
    advisoryNotes: next.advisoryNotes,
    lastWaterAmount: next.lastWaterAmount,
    waterLogCount: next.waterLogCount,
    latestWeightLbs: next.latestWeightLbs,
    backupDue: next.backupDue,
    proteinTargetG: next.proteinTargetG,
    waterTargetOz: next.waterTargetOz,
    tonight: next.tonight,
  };
}
