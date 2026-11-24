import { CoachCard } from "./CoachCard";
import type { CoachDestination } from "../../../application/coachCards";
import "../more/wholeLife.css";
import { DRIVE_HOME_EVENT } from "../../driveHomeEvent";
import { WorkPreparation } from "../../components/WorkPreparation";
import { TodayRoutine } from "../../components/TodayRoutine";
import { routineMomentFor } from "../../../application/routineCommands";
import { SleepMetricSheet } from "./SleepMetricSheet";
import { useHiddenFeatures } from "../../hiddenFeatures";
import { LogSheet } from "../../components/LogSheet";
import { TodayReviewSupport } from "../../components/TodayReviewSupport";
import { WeeklyReviewReadyLine } from "../../components/WeeklyReviewReadyLine";
import { DeltaNewsLine } from "../../components/DeltaViews";
import { ShiftRecoveryBrief } from "./ShiftRecoveryBrief";
import { LifeStateBand } from "./LifeStateBand";
import { Orientation } from "./Orientation";
import { CloseCard } from "./CloseCard";
import { closeDone, catchUpDone } from "./closeStore";
import { ShiftCatchUpCard } from "./ShiftCatchUpCard";
import { markOrientationSeen, orientationSeen } from "./orientationStore";
import { WeekAheadView } from "../weekly/WeekAheadView";
import { placeMarks, plannedMarks } from "../../../application/livedDayMap";
import { diffLook, firstKnown, markKey, mergeLook, newMarkKeys, sinceLabel, type LookSnapshot } from "../../../application/sinceLastLook";
import { readLastLook, writeLastLook } from "./lastLookStore";
import { contractDate } from "../../../application/recoveryContract";
import { PostRunReportDisclosure, RecoveryContractOffer } from "./RecoveryContract";
import { createObligation } from "../../../application/intentCommands";
import { CheckInSheet } from "./CheckInSheet";
import { useSessionDraft } from "../../sessionDrafts";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { SystemStatus } from "../../../application/systemStatus";
import { SystemsLine } from "../systems/SystemsLine";
import { SuitLines } from "./SuitLines";
import { ShiftChangeMoment, StartedWork } from "./ShiftChange";
import { getPaceHistories, type PaceHistories, type PaceReading } from "../../../application/pace";
import { Signal } from "../../components/Signal";
import { useOnline } from "../../hooks/useOnline";
import { describeSystemStatus } from "./statusCopy";
import { describePlainRecommendationTitle } from "./recommendationCopy";
import { TickNumber } from "../../feel/TickNumber";
import type {
  BeyondDay,
  Recommendation,
} from "../../../domain/common/types";
import { ConfirmIcon, Icon } from "../../icons/Icon";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { TodayToasts } from "./TodayToasts";
import { useCheckInForm } from "./useCheckInForm";
import { useResetSession } from "./useResetSession";
import { useShiftDownSession } from "./useShiftDownSession";
import { useConfirmFlows } from "./useConfirmFlows";
import { useSmallSteps } from "./useSmallSteps";
import { deriveTodayView } from "./todayView";
import { todayTools } from "./TodayTools";
import { todayPhaseRows } from "./TodayPhaseRows";
import type { TodaySectionsInput } from "./todaySections";
import { quickCheckInValues, readSleepDraftDismissal, useTodayActions, type LoggedEntry } from "./todayActions";
export { quickCheckInValues };
import { EMPTY_TODAY_SNAPSHOT, installTodaySnapshot, readTodaySnapshot, type TodaySnapshot } from "./todayRead";
import { TodayRecommendationDraft } from "./TodayRecommendationDraft";
import { TodayEnergy } from "./TodayEnergy";
import { EatingWindowCard } from "./EatingWindowCard";
import { OperatorHeader } from "../../components/OperatorHeader";
import { SignalRow } from "../../components/SignalRow";
import { CommandSurface } from "../../components/CommandSurface";
import { CommitmentQuickActions } from "./CommitmentQuickActions";
import { getCurrentlyEligibleUnresolvedObligations } from "../../../application/intentQueries";
import type { Mission, Obligation } from "../../../domain/intent/types";
import { describeCapacity, describeCapacityUnknown } from "./capacityCopy";
import { dismissOutcome } from "../../../persistence/outcomeDismissals";
import {
  WORKING_PER_SCHEDULE,
  describeContextStrip,
  describeStandingChange,
} from "./workContextCopy";
import { useRedCapacityOverrideGate } from "../../hooks/useRedCapacityOverrideGate";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";
import { useUndoOpen } from "../../hooks/useUndoWindow";
import type { BodyFocus } from "../../shortcuts";
import { ActiveWorkoutCard } from "./ActiveWorkoutCard";
import { useWorkoutCallQuestion } from "./WorkoutCall";
import type { TrainDestination } from "../train/TrainScreen";
import { getRecentSavedMeals } from "../../../application/nutritionQueries";
import { ResetCard } from "./ResetCard";
import { ShiftDownCard } from "./ShiftDownCard";
import { EndDayCard } from "./EndDayCard";
import { CommitmentsCard } from "./CommitmentsCard";
import { CaptureListRow } from "./CaptureSection";
import { HydrationOperationCard, MinimumDayCard } from "./MinimumDaySection";
import { RecommendationCard, describeAllClearHeadline } from "./RecommendationCard";
import { getMeasuredSnapshot, type MeasuredSnapshot } from "../../../application/measuredQueries";
import { SyncGarminLink, describeGarminAsOf, measuredClock, type MeasuredMetric } from "./MeasuredSheet";
import { unusualAria, unusualTileLabel } from "./unusualCopy";
import { ConsoleControls } from "./ConsoleControls";
import { EarlyStartRow } from "./EarlyStartRow";
import { SmallSteps } from "./SmallSteps";
import { MetricDetailSheet } from "../../metrics/MetricDetailSheet";
import { LogEntrySheet, type LogEntryTarget } from "../../components/LogEntrySheet";
import { ShiftMarkSheet } from "../../components/ShiftMarkSheet";
import type { DetailMetric } from "../../../application/metricDetail";
import "./smallSteps.css";
import "../../foundation/foundation.css";
import "./todayFoundation.css";
import {
  rateOutcome,
  reopenCaptureItem,
} from "../../../application/commands";
import {
  getActiveDay,
  getScheduledContext,
  getSchedulePattern,
} from "../../../application/queries";
import type { ScheduledContext } from "../../../engine/scheduledContext";
import { getCurrentOperationalContext, type CurrentOperationalContext } from "../../../application/currentContextQueries";
import {
  getActiveWorkoutSession,
  getSessionMinutesEstimate,
  suggestTemplateForNextWorkout,
} from "../../../application/trainQueries";
import { getQuitHabit } from "../../../application/quitQueries";
import { getCustomTemplates } from "../../../application/customTemplateQueries";
import { templateLabel } from "../train/trainCopy";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { formatDuration } from "../body/bodyScreenCopy";
import {
  predictedWorkPhase,
  deriveLivedDayStrip,
  describeCountdown,
  describePhaseHeading,
  describeToolsSummary,
  TOOLS_ORDER,
  type ShiftClockPhase,
  type ToolsItem,
} from "./shiftClock";
import { DecryptNumber } from "./DecryptNumber";
import { getLogNudge, type LogNudgeRead } from "../../../application/logNudge";
import { ModeCity, ModeScene, SuitMode } from "./ModeIdentity";
import { ModeHeader } from "./ModeHeader";
import { ActiveExperimentLine } from "./ActiveExperimentLine";
import { ShiftHandoff } from "../../components/ShiftHandoff";
import { getModePin, setModePin } from "../../../application/modePinQueries";
import { sleepMinutes as measuredSleepMinutes } from "../../../domain/health/measuredSeries";
import { nextRolloverBoundaryAfter } from "../../../engine/dayRollover";



/**
 * Intent & Commitment Spine — Drop 02: onViewCommitments is optional and
 * unused unless a caller wires it up — App.tsx passes a callback that
 * switches to the MORE tab. TodayScreen itself has no navigation
 * mechanism of its own (see CommitmentsCard.tsx's doc comment on why
 * VIEW stops at "switch tabs" rather than deep-linking to the specific
 * Obligation).
 */
/** STATUS-001: the existing capacity dot styles, by System Status level. */
const STATUS_DOT: Record<SystemStatus["level"], string> = { GREEN: "green", AMBER: "yellow", RED: "red", NO_READ: "unknown" };

export function TodayScreen({
  active = true,
  captureRequest = 0,
  onReturnFromCapture,
  onOpenPlan,
  onOpenLife,
  onViewCommitments,
  onOpenTrain,
  onOpenBody,
  onOpenHealthEvidence,
  onOpenRecord,
  onOpenWeeklyReview,
  onOpenCoach,
  onOpenSystems,
  onOpenCave,
  operationsOnly = false,
  commandFocus, onReturnToFullTools,
  toolsRequest = 0,
  openToolsOnMount = false,
  onWorkEnded,
  onWorkContextChanged,
  banners,
  brief,
  review,
  shiftHandoffRefreshKey,
  mealRefreshKey = 0,
}: {
  active?: boolean;
  captureRequest?: number;
  onReturnFromCapture?: (() => void) | undefined;
  onOpenPlan?: () => void;
  onOpenLife?: () => void;
  onViewCommitments?: (id?: string) => void;
  onOpenTrain?: (destination: TrainDestination) => void;
  onOpenWeeklyReview?: () => void;
  onOpenCoach?: (destination: CoachDestination) => void;
  /** SUIT-001: the SYSTEMS line opens the readout in COMMAND. */
  onOpenSystems?: () => void;
  /** SUIT-ALIVE S3/S4: the route and comms lines open the cave on that view. Absent, neither line shows. */
  onOpenCave?: (tab: "tonight" | "route" | "brief") => void;
  onOpenHealthEvidence?: (metric: "water" | "protein" | "weight" | "sleep") => void;
  /** Existing shell-owned forms: metric LOG WATER and direct quick Note, with canonical saves. */
  onOpenRecord?: ((target: "water" | "weight" | "protein" | "note") => void) | undefined;
  onOpenBody?: (target?: BodyFocus) => void;
  /** COMMAND-CENTER-001: COMMAND's "TODAY TOOLS" result opens TOOLS with its heading focused. */
  operationsOnly?: boolean;
  commandFocus?: ToolsItem | "SHIFT_HANDOFF" | "SMALL_STEPS" | null;
  onReturnToFullTools?: () => void;
  toolsRequest?: number;
  /** Drop 2: open with TOOLS expanded (MORE's capture link lands in it). */
  openToolsOnMount?: boolean;
  /** NOTES-HANDOFF-001: told after MARK WORK ENDED succeeds, so the shell can ask for a handoff note. */
  onWorkEnded?: () => void;
  /** CLEANUP-002: told after the day's work context changes, so the notes sweep line re-reads. */
  onWorkContextChanged?: () => void;
  /** CLEANUP-002: the shell's lines (backup, sweep, handoff, capsule), shown right under the header. */
  banners?: ReactNode;
  /** ATTENTION-001: optional narrative after the next action and logging. */
  brief?: ReactNode;
  review?: (onAvailable: (available: boolean) => void) => ReactNode;
  /** COMMAND-CENTER-001: the shift handoff note, under the header or in ON SHIFT's row. */
  shiftHandoffRefreshKey?: number;
  /** Re-read canonical totals after BODY without resetting TODAY's disclosures. */
  mealRefreshKey?: number;
} = {}) {
  // GRAYSON-TODAY-SPLIT-003 slice A (one read): everything refresh() reads is one typed snapshot of the day,
  // installed in one render. The names below read from it, so the rest of TODAY is unchanged.
  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const todaySnapshot = snapshot ?? EMPTY_TODAY_SNAPSHOT;
  const {
    day,
    checkIn,
    recommendation,
    decision,
    recommendationHandoff,
    priorOutcomeMemory,
    rememberedLesson,
    pendingReflection,
    materiallyRepeated,
    checkInDraft,
    activeWorkout,
    shiftDownCompletedAt,
    suggestEndDay,
    pendingOutcome,
    workPeriodEndedAt,
    workPeriodStartedAt,
    unresolvedPostShift,
    earlyStart,
    openCaptureItems,
    systemStatus,
    lastMainSleepMinutes,
    backupDue,
    minimumDay,
    minimumDayHydrateOz,
    minimumDayProteinG,
    lastWaterAmount,
    tonight,
    unresolvedObligations,
    headlineCommitmentMission,
    mainSleepRecordedAt,
    proteinTargetG,
  } = todaySnapshot;
  /** A handler or a slower read updating one piece of the snapshot (same as its own setter did before). */
  function patchSnapshot(patch: Partial<TodaySnapshot>) {
    setSnapshot((prev) => ({ ...(prev ?? EMPTY_TODAY_SNAPSHOT), ...patch }));
  }
  // TIMELINE-EDIT-001: the logged meal or water entry open for a fix (time, amount, remove).
  const [editTarget, setEditTarget] = useState<LogEntryTarget | null>(null);
  // SHIFT-CORRECT-001: the shift sheet a work mark on the timeline opens.
  const [shiftTarget, setShiftTarget] = useState<{ beyondDayId: string } | null>(null);
  // LAUNCH-STEADY-001: until the first read settles, "no day" is unknown, not a fact. TODAY shows a quiet reading
  // frame instead of "Mode not set / START DAY" flashing before the real day appears.
  const [dayRead, setDayRead] = useState(false);
  const [recommendationDraftPresent, setRecommendationDraftPresent] = useState(false);
  // GRAYSON-TODAY-SPLIT-003 slice C (small local state): the check-in form, RESET and SHIFT DOWN sessions, the
  // confirm flows and Small Steps live in their own hooks (useCheckInForm.ts and its neighbours). The names below
  // are unchanged, so the rest of TODAY reads them as before.
  const checkInForm = useCheckInForm(operationsOnly, checkInDraft);
  const {
    values,
    setValues,
    checkInError,
    setCheckInError,
    checkInDraftDismissed,
    setCheckInDraftDismissed,
    activeCheckInDraft,
    checkInFormValues,
    fixUndo,
    setFixUndo,
  } = checkInForm;
  const [busy, setBusy] = useState(false);
  // LAUNCH-VISION-003 (2026-09-15, direct owner ruling): fires the
  // power-on sweep exactly once per START DAY — "the one real power-on
  // moment in the whole app," never replayed by a later refresh() or
  // remount within the same START DAY, since nothing ever resets this
  // back to false. Same one-shot-on-mount convention as .fade-in/
  // .set-earned elsewhere in this codebase.
  const [justStartedDay, setJustStartedDay] = useState(false);
  const resetSession = useResetSession();
  const { activeResetId, resetIntensity, setResetIntensity, openResetStartedAt, lastResetOutcome, setLastResetOutcome } = resetSession;
  const shiftDownSession = useShiftDownSession();
  const { activeShiftDownId, shiftDownDuration, setShiftDownDuration, openShiftDownStartedAt, lastShiftDownOutcome, setLastShiftDownOutcome } = shiftDownSession;
  const [endDayBlockedByWorkout, setEndDayBlockedByWorkout] = useState(false);
  const [scheduledContext, setScheduledContext] = useState<ScheduledContext | null>(null);
  // OWNER-GO-001: after a check-in, one plain line on what it changed and what holds the answer.
  const [checkInOutcome, setCheckInOutcome] = useState<string | null>(null);
  // Current Operational Context V1 (bounded proof): feeds the STATUS
  // context strip only — every other read above (day, scheduledContext,
  // unresolvedPostShift) stays exactly as-is for its own other uses
  // (work-context confirmation source attribution, the schedule
  // prediction card). Falls back to those existing values while still
  // loading or on a failed read, so the strip's rendered wording never
  // changes and a read failure never masquerades as successful context.
  const [currentContext, setCurrentContext] = useState<CurrentOperationalContext | null>(null);
  // Monotonic request ownership for refresh() as a whole (same pattern as
  // SearchScreen.tsx's request-id guard): refresh() can overlap itself
  // (e.g. two rapid actions each ending in `await refresh()`). Ownership is
  // captured at the very start of refresh(), before its first await, so a
  // refresh's place in line is decided by invocation order — never by which
  // refresh's getActiveDay() happens to resolve first. Everything on the
  // active-day/context path (installing `day`, starting or installing
  // `currentContext`) checks this ref before touching state; a refresh that
  // has been superseded by the time it gets there is discarded, whatever
  // order its own reads settle in.
  const refreshRequestIdRef = useRef(0);
  // SHIFT-CHANGE-001: a STARTED WORK tap anywhere re-reads TODAY's start line at once.
  const [workStartTick, setWorkStartTick] = useState(0);
  // Which day `currentContext` was installed for — private to this
  // component, never exposed (CurrentOperationalContext carries no day
  // identity). Request-ownership alone stops a stale request from
  // *installing* the wrong context, but it doesn't stop an already-
  // installed context from surviving a same-refresh day change: an
  // accepted refresh can call setDay(dayB) while `currentContext` still
  // holds day A's already-resolved value, and day B's own context read is
  // still pending. Comparing the newly-adopted day's id against this ref
  // is how that day change is detected so the stale value can be cleared
  // at that exact moment, rather than left to render merged with day B.
  const currentContextDayIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  // SUIT-001 signals: the browser's connection flag and the existing backup-due rule (same
  // setting and threshold as BackupDueLine), re-read whenever TODAY refreshes.
  const online = useOnline();
  const [staleRefresh, setStaleRefresh] = useState<"IDLE" | "RUNNING" | "HELD" | "FAILED">("IDLE");
  const [captureText, setCaptureText] = useState("");
  useSessionDraft(operationsOnly ? "command-capture" : "capture", captureText.length > 0);
  const [captureFeedback, setCaptureFeedback] = useState<{ kind: "SUCCESS" | "ERROR"; message: string } | null>(null);
  const confirmFlows = useConfirmFlows();
  const {
    justResolvedCapture,
    setJustResolvedCapture,
    captureConversion,
    setCaptureConversion,
    conversionDraft,
    setConversionDraft,
    conversionDateSuggestion,
    setConversionDateSuggestion,
    captureConversionFeedback,
    setCaptureConversionFeedback,
    commitmentConfirmation,
    setCommitmentConfirmation,
    commitmentFeedback,
    setCommitmentFeedback,
    commitmentFeedbackRef,
    commitmentSatisfactionPendingRef,
  } = confirmFlows;
  const [mdWaterInput, setMdWaterInput] = useState("");
  const [mdProteinInput, setMdProteinInput] = useState("");
  // Product Experience Sprint, P3: RESET/SHIFT DOWN/check-in each default
  // to a compact row once they're not the thing TODAY needs you looking
  // at (see ResetCard.tsx/ShiftDownCard.tsx and the check-in section
  // below) — these track whether the user has explicitly opened the full
  // form anyway. Never gates the tools themselves, only their default
  // visual weight.
  const [resetOpen, setResetOpen] = useState(false);
  const [shiftDownOpen, setShiftDownOpen] = useState(false);
  const [checkInFormOpen, setCheckInFormOpen] = useState(false);
  // Overdrive Phase 18 (TODAY PRIORITY COMPRESSION): WORK CONTEXT used to
  // stay a fully-expanded card all day even once there was nothing left
  // to decide (OFF, or WORK with the shift already marked ended) — same
  // "default to a compact row once it's not the thing needing attention"
  // pattern RESET/SHIFT DOWN already use (resetOpen/shiftDownOpen above).
  const [workContextOpen, setWorkContextOpen] = useState(false);
  // Harvest Checkpoint 3 (COMMAND 3.0): same "collapsed until it's the
  // thing needing attention, one tap to reopen" pattern as
  // resetOpen/shiftDownOpen/workContextOpen/checkInFormOpen above,
  // applied to the three pieces that move between NOW/ATTENTION/TOOLS
  // under the new attention policy.
  const [recommendationOpen, setRecommendationOpen] = useState(false);
  const [endDayOpen, setEndDayOpen] = useState(false);
  // FIELD ALPHA Gate A correction: same "collapsed until it's the thing
  // needing attention, one tap to reopen" pattern as resetOpen/
  // shiftDownOpen/workContextOpen above, added because Minimum Day's
  // full six-item contents were consuming substantial vertical space
  // even when it wasn't the operator's primary concern. Only used for
  // the non-prominent placement — the prominent (seriously constrained)
  // case already earns its full visible presence via existing product
  // truth and is unaffected.
  const [minimumDayOpen, setMinimumDayOpen] = useState(false);
  const [hydrationOperationOpen, setHydrationOperationOpen] = useState(false);
  const [hydrationManualOpen, setHydrationManualOpen] = useState(false);
  // UNDO-001: a just-logged entry, UNDO for its first UNDO_WINDOW_MS, then CORRECT IN DATA.
  const [waterControlsVisible, setWaterControlsVisible] = useState(true);
  // GARMIN-004: measured Garmin values for TODAY's tiles and their sheets (display only).
  const [measured, setMeasured] = useState<MeasuredSnapshot | null>(null);
  const [measuredOpen, setMeasuredOpen] = useState<MeasuredMetric | null>(null);
  const [detailOpen, setDetailOpen] = useState<DetailMetric | null>(null);
  // FIELD-REHEARSAL-002: bumped by every finished refresh, so the suit bands re-read after a save
  // (the comms line said "Water 0 oz" for five minutes after a drink was logged).
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [hydrationConfirmation, setHydrationConfirmation] = useState<LoggedEntry | null>(null);
  const [proteinConfirmation, setProteinConfirmation] = useState<LoggedEntry | null>(null);
  // TONIGHT-001: a meal logged from QUICK LOG or the MEAL sheet, with the same UNDO window.
  const [mealConfirmation, setMealConfirmation] = useState<(LoggedEntry & { message: string }) | null>(null);
  const workoutQuestion = useWorkoutCallQuestion(day?.id, tonight);
  const hydrationUndoOpen = useUndoOpen(hydrationConfirmation);
  const proteinUndoOpen = useUndoOpen(proteinConfirmation);
  const mealUndoOpen = useUndoOpen(mealConfirmation);
  const [undoFailure, setUndoFailure] = useState<string | null>(null);
  const [commitmentsOpen, setCommitmentsOpen] = useState(false);
  const shiftDownStartRef = useRef<HTMLButtonElement>(null);
  // Drop 6: the quit tracker's post-shift plan, shown inside SHIFT DOWN.
  const [postShiftPlan, setPostShiftPlan] = useState<string | undefined>(undefined);
  const { guard, ConfirmPanel } = useRedCapacityOverrideGate();

  // ---- SHIFT CLOCK (Drop 2) ----
  // The clock the phase and countdowns are read against; ticks every 30 s so
  // the strip and the phase change on their own at 18:00 and 06:00.
  const [now, setNow] = useState(() => new Date());
  // SUIT-ALIVE S5: your past same-kind days' protein and water by time of day. Past days don't change
  // within a lived day, so they load once per day; pace itself follows the minute clock.
  const [paceHistories, setPaceHistories] = useState<PaceHistories | null>(null);
  useEffect(() => {
    let current = true;
    setPaceHistories(null);
    if (day) void getPaceHistories(day).then((h) => { if (current) setPaceHistories(h); }).catch(() => {});
    return () => { current = false; };
  }, [day?.id, day?.workContext]);
  // GRAYSON-LOG-NUDGE-001: what the quiet "tell Delta" line under the tiles reads (today's kind, its meals, his usual
  // times), re-read with TODAY's refresh; whether it shows follows the minute clock in render.
  const [logNudgeRead, setLogNudgeRead] = useState<LogNudgeRead | null>(null);
  const [, setNudgeAnswered] = useState(0);
  useEffect(() => {
    let current = true;
    if (!day) { setLogNudgeRead(null); return; }
    void getLogNudge(day.id, new Date()).then((r) => { if (current) setLogNudgeRead(r); }).catch(() => {});
    return () => { current = false; };
  }, [day?.id, refreshVersion]);
  // COMMAND-CENTER-001: the mode pin for this BeyondDay (placement only; see modePinQueries).
  const [modePin, setModePinState] = useState<{ dayId: string; phase: ShiftClockPhase | null } | null>(null);
  // The next workout TRAIN would suggest, with Time-Fit estimates per variant.
  const [nextWorkout, setNextWorkout] = useState<{
    label: string;
    minutes: Partial<Record<"STANDARD" | "REDUCED", number>>;
  } | null>(null);
  const [customTemplateList, setCustomTemplateList] = useState<Parameters<typeof templateLabel>[1]>([]);
  const [quitHabitSetUp, setQuitHabitSetUp] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(openToolsOnMount);
  // TONIGHT-001: TOOLS opened from MORE → Today tools also lists Minimum Day and Small Steps.
  const [commandTools, setCommandTools] = useState(openToolsOnMount);
  const [fastCaptureOpen, setFastCaptureOpen] = useState(false);
  const fastCaptureOrigin = useRef<{ trigger: HTMLElement | null; scrollY: number } | null>(null);
  function openFastCapture() {
    if (busyRef.current) return;
    fastCaptureOrigin.current = { trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null, scrollY: window.scrollY };
    setFastCaptureOpen(true);
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#fast-capture input[aria-label="Capture a thought"]')?.focus());
  }
  function closeFastCapture() {
    if (busyRef.current) return;
    setFastCaptureOpen(false);
    if (onReturnFromCapture) { onReturnFromCapture(); return; }
    const origin = fastCaptureOrigin.current;
    requestAnimationFrame(() => {
      origin?.trigger?.focus({ preventScroll: true });
      window.scrollTo({ top: origin?.scrollY ?? 0, behavior: "instant" });
    });
  }
  useEffect(() => { if (captureRequest > 0 && commandFocus === undefined) openFastCapture(); }, [captureRequest]);
  // Focus waits until TOOLS has rendered and TODAY is the visible workspace.
  const toolsFocusPending = useRef(false);
  useEffect(() => {
    if (toolsRequest === 0) return;
    toolsFocusPending.current = true;
    setSmallTool(null);
    setCommandTools(true);
    setToolsOpen(true);
  }, [toolsRequest]);
  useEffect(() => {
    if (!toolsFocusPending.current || !toolsOpen || !active) return;
    toolsFocusPending.current = false;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const heading = document.getElementById("console-tools-heading");
      heading?.focus();
      heading?.scrollIntoView({ block: "start" });
    }));
  }, [toolsOpen, active, toolsRequest]);
  // Optional session-local presentation, never a capacity/plan/Minimum Day write.
  const hiddenFeatures = useHiddenFeatures();
  const { smallSteps, setSmallSteps, smallTool, setSmallTool, smallStepsRef, smallStepsEntryRef, returnToSmallSteps, exitSmallSteps } = useSmallSteps(setToolsOpen);
  useEffect(() => {
    if (!hiddenFeatures.minimumDay) { setMinimumDayOpen(false); setHydrationOperationOpen(false); }
    if (!hiddenFeatures.smallSteps) { setSmallSteps(false); setSmallTool(null); }
  }, [hiddenFeatures.minimumDay, hiddenFeatures.smallSteps]);

  // ---- SLEEP DRAFT (2026-10-03) ----
  // ±15-minute nudges applied to the draft before logging it.
  const [sleepNotYetDay, setSleepNotYetDay] = useState<string | null>(null);
  const [sleepDraftAdjust, setSleepDraftAdjust] = useState(0);
  // NOT NOW: remembered on this phone only, for that day (per-device convenience).
  const [sleepDraftDismissedDayId, setSleepDraftDismissedDayId] = useState<string | null>(() => readSleepDraftDismissal());
  const [sleepConfirmation, setSleepConfirmation] = useState<LoggedEntry | null>(null);
  const sleepUndoOpen = useUndoOpen(sleepConfirmation);

  // DROP 0: re-read the new day's numbers and schedule phase after a 16:30 rollover.
  useDayRolloverRefresh(() => {
    void getScheduledContext().then(setScheduledContext);
    void loadShiftClockSetup();
    return refresh();
  });

  useEffect(() => {
    if (mealRefreshKey > 0) void refresh();
  }, [mealRefreshKey]);

  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    // LAUNCH-STEADY-001: however the read ends (even a failure past its first step), the reading frame ends with it.
    // A superseded read leaves it to the newer one, which ends the frame itself.
    const reading = refresh(), mine = refreshRequestIdRef.current;
    void reading.finally(() => { if (mountedRef.current && refreshRequestIdRef.current === mine) setDayRead(true); });
    void getScheduledContext().then(setScheduledContext);
    void loadShiftClockSetup();
    // Best-effort: a missing plan just means SHIFT DOWN shows none.
    void getQuitHabit()
      .then((habit) => {
        setPostShiftPlan(habit?.postShiftPlan);
        setQuitHabitSetUp(habit !== undefined);
      })
      .catch(() => {});
  }, [active]);
  // OPERATOR-EXPERIENCE-001 slice 3: each visit to TODAY compares what it shows with the last look on this device.
  // The visit's baseline is the first value of each field it saw, so the operator's own taps during the visit aren't
  // reported back as changes; the stored look follows what was last on screen.
  const [since, setSince] = useState<{ label: string; items: string[] } | null>(null);
  const lookPrevRef = useRef<LookSnapshot | null | undefined>(undefined);
  const lookBaseRef = useRef<LookSnapshot | null>(null);
  // DAY-MAP-001: map marks new since the last look on this device, outlined for this visit.
  const [freshMarks, setFreshMarks] = useState<ReadonlySet<string>>(() => new Set());
  // GRAYSON C1.1: Orientation, opened by START DAY on a work day and reopenable from TODAY.
  const [orientationOpen, setOrientationOpen] = useState(false);
  const [orientationSeenTick, setOrientationSeenTick] = useState(0);
  const [closeSeenTick, setCloseSeenTick] = useState(0);
  useEffect(() => { if (!active) { lookPrevRef.current = undefined; lookBaseRef.current = null; setSince(null); setFreshMarks(new Set()); } }, [active]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  // The clock also expires a pin when a workout retains this BeyondDay past 16:30.
  useEffect(() => {
    const timer = setTimeout(() => setNow(new Date()), Math.max(1, nextRolloverBoundaryAfter(now).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [now]);

  // Re-read at the boundary and on resume, without remounting any operation.
  const dayIdForPin = day?.id ?? null;
  const dayStartedAtForPin = day?.startedAt;
  useEffect(() => {
    setModePinState(dayIdForPin ? { dayId: dayIdForPin, phase: getModePin(dayIdForPin, dayStartedAtForPin, now) } : null);
  }, [dayIdForPin, dayStartedAtForPin, now]);

  // Coming back to the foreground: re-read, so a screen left open overnight
  // sees this morning's Shift Down and its sleep draft (2026-10-03).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      setNow(new Date());
      void refresh().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, []);

  /**
   * Shift Clock's slower-changing inputs: the saved schedule and the next
   * workout with its Time-Fit estimates. Read on mount and after a rollover,
   * not on every refresh. Best-effort — a failed read just leaves a row
   * without its duration or countdown.
   */
  async function loadShiftClockSetup() {
    try {
      const schedulePattern = await getSchedulePattern();
      patchSnapshot({ schedulePattern });
      const [templateId, customTemplates] = await Promise.all([suggestTemplateForNextWorkout(), getCustomTemplates()]);
      setCustomTemplateList(customTemplates);
      const [standard, reduced] = await Promise.all([
        getSessionMinutesEstimate(templateId, "STANDARD"),
        getSessionMinutesEstimate(templateId, "REDUCED"),
      ]);
      setNextWorkout({
        label: templateLabel(templateId, customTemplates),
        minutes: {
          ...(standard !== undefined ? { STANDARD: standard } : {}),
          ...(reduced !== undefined ? { REDUCED: reduced } : {}),
        },
      });
    } catch {
      // Leave whatever was there.
    }
  }

  useEffect(() => {
    commitmentFeedbackRef.current?.focus();
  }, [commitmentFeedback]);

  async function refresh() {
    // Ownership is captured HERE — before getActiveDay() or any other
    // await — so it reflects refresh invocation order, not the completion
    // order of whichever read happens to settle first. Without this, an
    // older refresh whose getActiveDay() simply takes longer could resolve
    // after a newer refresh's and be mistaken for the latest, regressing
    // `day`/`currentContext` back to stale values.
    const myRequestId = ++refreshRequestIdRef.current;
    // GRAYSON-TODAY-SPLIT-003 slice A: the reads themselves live in readTodaySnapshot (todayRead.ts), unchanged and in
    // the same order. `onDayRead` runs the moment the first read (getActiveDay()/getActiveWorkoutSession()) resolves,
    // before any other read starts, so ownership and the currentContext read start at the same moment as before.
    const first: { done: boolean; isOwner: boolean; contextPromise: ReturnType<typeof getCurrentOperationalContext> | null } = { done: false, isOwner: false, contextPromise: null };
    let next: TodaySnapshot;
    try {
      next = await readTodaySnapshot(() => new Date(), {
        onDayRead: (activeDay) => {
          first.done = true;
          // Ownership decided HERE, immediately after the read above resolves —
          // same timing as before this fix — and reused as-is below rather than
          // re-derived after the many further awaits this function makes. A
          // refresh that owns the render at this instant must apply everything
          // it composes even if a newer refresh starts partway through; deciding
          // ownership again later, after those further awaits, could reach a
          // different (stricter) answer than this one and silently drop an
          // update this refresh was always entitled to make.
          first.isOwner = mountedRef.current && myRequestId === refreshRequestIdRef.current;
          // The one deliberate exception to the batching below is `currentContext`: its fetch is
          // kicked off here (so its latency overlaps with everything else this
          // function awaits below) but its *result* is still consumed via its
          // own request-id-guarded `.then()/.catch()`, landing whenever it
          // resolves — unchanged from before, and still correct, since nothing
          // in this component treats `currentContext` as available synchronously
          // with `day`; every consumer already falls back to
          // `day`/`scheduledContext`/`unresolvedPostShift` while it's in flight.
          first.contextPromise = first.isOwner
            ? getCurrentOperationalContext(activeDay ? { id: activeDay.id, workContext: activeDay.workContext } : null)
            : null;
          // Subscribe immediately: other canonical reads below may still be pending when
          // this view rejects or the screen is hidden/unmounted. The owning handler below
          // still installs the result/fallback; this prevents an unhandled-rejection gap.
          void first.contextPromise?.catch(() => {});
        },
      });
    } catch (err) {
      // A later read's failure is unchanged: it rejects refresh().
      if (first.done) throw err;
      // A superseded refresh's failed read must vanish silently — it may
      // never regress `day`, and it must never surface as an unhandled
      // rejection. A still-current refresh's failure is unchanged from
      // prior behavior (out of this correction's scope) and is rethrown.
      if (!mountedRef.current || myRequestId !== refreshRequestIdRef.current) return;
      // A failed first read still ends the reading frame, so TODAY shows what it showed before.
      setDayRead(true);
      throw err;
    }
    const { isOwner, contextPromise } = first;
    // CI-timing-flake fix (2026-09-02): every read this function needs is
    // gathered (now by readTodaySnapshot) BEFORE any of it is committed via
    // setState. Every setter for all of it then fires together here, in one
    // synchronous run with no `await` between them, so React batches the
    // whole thing into a single render.
    //
    // The earlier shape was a long run of individual
    // `await X(); setY(...)` pairs, each committing its own render. A test
    // polling for one early piece of this state (e.g. the "Orient" heading,
    // gated on `day`, or the Attention section, gated on
    // `unresolvedObligations`/`pendingOutcome`) could observe a DOM snapshot
    // where that one piece had landed but a later piece in the same chain
    // (e.g. `checkIn`, which drives the STATUS strip's capacity modifier)
    // had not — a real, CI-only race. Batching the whole function removes
    // the gap instead of relocating it.
    //
    // Everything on the active-day/context path is gated on the single
    // ownership check: a refresh superseded by the time its getActiveDay()
    // resolves must not install `day`, and must not let its own composed
    // state become authoritative (installTodaySnapshot keeps those fields).
    if (isOwner) {
      const newDayId = next.day ? next.day.id : null;
      if (newDayId !== currentContextDayIdRef.current) {
        // This accepted refresh is adopting a different day (including a
        // transition to/from no active day) than whatever `currentContext`
        // currently belongs to. That old context is not truthful for the
        // newly-adopted day — clear it now, in the same batch as `day`
        // below, rather than let it keep rendering merged with the new
        // day's identity until its own read resolves. The status strip's
        // existing `currentContext ? ... : day.*` fallback then reads
        // day/scheduledContext/unresolvedPostShift directly while the new
        // day's context is in flight — the same truthful pre-V1 path
        // already used for a failed or still-loading read. Guarded to only
        // fire on an actual day change so a same-day refresh (the common
        // case) never flashes away context it doesn't need to.
        setCurrentContext(null);
      }
      currentContextDayIdRef.current = newDayId;
      setDayRead(true);
    }
    const read = next;
    setSnapshot((prev) => installTodaySnapshot(prev, read, { isOwner }));
    if (read.day) {
      // The RESET and SHIFT DOWN sessions are seeded from this read, in the same render.
      resetSession.seedFromRead(read.openReset);
      shiftDownSession.seedFromRead(read.openShiftDown);
    }
    setRefreshVersion((v) => v + 1);
    // GARMIN-004: off the critical path; a failed Garmin read hides the Garmin tiles, nothing else.
    if (isOwner && !operationsOnly) void getMeasuredSnapshot().then((next) => { if (mountedRef.current && myRequestId === refreshRequestIdRef.current) setMeasured(next); }, () => { if (mountedRef.current) setMeasured(null); });

    // A fresh, independently-composed view each refresh — never memoized
    // across calls, matching every other piece of state in this function.
    // Composed from THIS refresh's own already-resolved `activeDay` (not
    // re-fetched independently), so it can never disagree with `day` about
    // which day is current. Still request-id guarded: two overlapping
    // refresh() calls (e.g. two rapid actions) can have their
    // currentContext reads settle out of order, so only the result whose
    // id still matches the ref when it settles is installed. A rejected
    // read is handled explicitly — cleared to null (never left stale, never
    // presented as if it succeeded) so the render falls back to the
    // pre-V1 day/scheduledContext/unresolvedPostShift state deliberately.
    contextPromise
      ?.then((result) => {
        if (!mountedRef.current || myRequestId !== refreshRequestIdRef.current) return;
        setCurrentContext(result);
      })
      .catch(() => {
        if (!mountedRef.current || myRequestId !== refreshRequestIdRef.current) return;
        setCurrentContext(null);
      });
  }

  // GRAYSON-TODAY-SPLIT-003 slice D (sections out): the derived values live in deriveTodayView (todayView.ts), computed
  // in render from the one read, the local values below and the minute clock. The names are unchanged.
  const view = deriveTodayView(todaySnapshot, {
    activeResetId,
    activeShiftDownId,
    checkInFormOpen,
    commandFocus,
    hydrationOperationOpen,
    measured,
    modePin,
    nextWorkout,
    paceHistories,
    workContextOpen,
    workoutQuestion,
  }, now);
  const {
    capacityResult,
    stale,
    stripLevel,
    shiftDownIsPrimary,
    resetIsPrimary,
    todayLocalDate,
    headlineCommitment,
    otherDueCommitments,
    workContextPerSchedule,
    recordedNow,
    lifeReading,
    ahead,
    lookNow,
    lookKey,
    lifeMoment,
    lifeState,
    todayRun,
    shiftWindow,
    livedDayStart,
    shiftClockInput,
    scheduledClock,
    startedEarly,
    manualPin,
    pinnedPhase,
    shiftClock,
    phaseRows,
    questionBelow,
    leadingPhaseRows,
    remainingPhaseRows,
    toolsItems,
    checkInIsRow,
    shiftDownIsRow,
    behindPace,
    nextActionContext,
    lateRecoverWithoutSleep,
    attentionPlan,
    dominant,
    endDayInAttention,
    pendingOutcomeInAttention,
    captureInAttention,
    commitmentInAttention,
    recommendationInAttention,
    workEndInAttention,
    checkInInAttention,
    minimumDayInAttention,
    suggestedVariant,
    liftedShiftDown,
    liftedReset,
    liftedCheckIn,
    liftedWorkContext,
    liftedAdvisory,
  } = view;
  // REAL-DATA-001: close the named task right on the card.
  const commitmentActions = headlineCommitment && (headlineCommitment.tier === "OVERDUE" || headlineCommitment.tier === "DUE_TODAY")
    ? <CommitmentQuickActions key={headlineCommitment.obligation.id} obligation={headlineCommitment.obligation} today={todayLocalDate} onChanged={() => refresh()} />
    : null;
  useEffect(() => {
    if (!active || !lookNow) return;
    const cur: LookSnapshot = { at: new Date().toISOString(), ...lookNow };
    if (lookPrevRef.current === undefined) lookPrevRef.current = readLastLook();
    lookBaseRef.current = firstKnown(lookBaseRef.current, cur);
    const prev = lookPrevRef.current;
    setSince(prev ? { label: sinceLabel(prev.at, new Date()), items: diffLook(prev, lookBaseRef.current) } : null);
    setFreshMarks(newMarkKeys(prev, lookBaseRef.current));
    writeLastLook(mergeLook(readLastLook(), cur));
    // lookKey stands for lookNow's content.
  }, [active, lookKey]);

  /** Whether a TOOLS item has anything to show right now — the summary names only these. */
  // GRAYSON-TODAY-SPLIT-003 slice B (one set of actions): the handlers live in useTodayActions (todayActions.ts),
  // called here, after the placement values they read (shiftDownIsRow, liftedShiftDown) are known.
  const actions = useTodayActions({
    snapshot: todaySnapshot,
    refresh,
    ui: {
      dismissOutcome,
      activeCheckInDraft,
      activeResetId,
      activeShiftDownId,
      busy,
      captureConversion,
      captureText,
      checkInFormValues,
      commandFocus,
      commitmentConfirmation,
      commitmentSatisfactionPendingRef,
      conversionDraft,
      fixUndo,
      guard,
      hydrationConfirmation,
      justResolvedCapture,
      liftedShiftDown,
      mdProteinInput,
      mdWaterInput,
      mealConfirmation,
      operationsOnly,
      patchSnapshot,
      proteinConfirmation,
      resetIntensity,
      scheduledContext,
      setBusy,
      setCaptureConversion,
      setCaptureConversionFeedback,
      setCaptureFeedback,
      setCaptureText,
      setCheckInDraftDismissed,
      setCheckInError,
      setCheckInFormOpen,
      setCheckInOutcome,
      setCommitmentConfirmation,
      setCommitmentFeedback,
      setCommitmentsOpen,
      setConversionDateSuggestion,
      setConversionDraft,
      setEndDayBlockedByWorkout,
      setEndDayOpen,
      setFixUndo,
      setHydrationConfirmation,
      setHydrationManualOpen,
      setHydrationOperationOpen,
      setJustResolvedCapture,
      setJustStartedDay,
      setLastResetOutcome,
      setLastShiftDownOutcome,
      setMdProteinInput,
      setMdWaterInput,
      setMealConfirmation,
      setMinimumDayOpen,
      setNow,
      setOrientationOpen,
      setProteinConfirmation,
      setShiftDownOpen,
      setSleepConfirmation,
      setSleepDraftAdjust,
      setSleepDraftDismissedDayId,
      setStaleRefresh,
      setToolsOpen,
      setUndoFailure,
      setValues,
      setWorkContextOpen,
      shiftDownDuration,
      shiftDownIsRow,
      shiftDownStartRef,
      sleepConfirmation,
      staleRefresh,
    },
    callbacks: { onOpenTrain, onWorkContextChanged, onWorkEnded },
  });
  const {
    busyRef,
    handleRecommendationHandoff,
    handleStartDay,
    describeCheckInOutcome,
    handleSameAsLast,
    handleCheckIn,
    handleQuickCheckIn,
    handleRecord,
    actuallyDecline,
    handleDecline,
    handleStartReset,
    handleCompleteReset,
    handleCancelReset,
    handleStartShiftDown,
    handleCompleteShiftDown,
    handleCancelShiftDown,
    handleEndDay,
    handleSetWorkContext,
    handleChangeStandingWorkContext,
    handleMarkWorkEnded,
    handleResolveCapture,
    requestCommitmentSatisfaction,
    cancelCommitmentSatisfaction,
    confirmCommitmentSatisfaction,
    handleUndoResolveCapture,
    requestCaptureConversion,
    cancelCaptureConversion,
    confirmCaptureConversion,
    handleEnableMinimumDay,
    handleMarkMinimum,
    handleUndoLog,
    handleLogSavedMeal,
    handleMinimumDayLogWater,
    handleMinimumDayLogProtein,
    handleRateOutcome,
    handleDismissOutcome,
    handleStaleRefresh,
  } = actions;


  useEffect(() => {
    // If an existing operation takes foreground authority, exit tool isolation
    // instead of leaving an empty selected tool or obscuring manual alternatives.
    if (smallTool === "MINIMUM_DAY" && (minimumDayInAttention || dominant === "HYDRATION_ACTIVE")) {
      setSmallTool(null);
      window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(dominant === "HYDRATION_ACTIVE" ? "[data-small-hydration]" : "[data-small-minimum]");
        target?.querySelector<HTMLElement>("button, input")?.focus({ preventScroll: true });
        target?.scrollIntoView({ block: "start", behavior: "instant" });
      });
    }
  }, [smallTool, minimumDayInAttention, dominant]);

  function openSmallTool(tool: "MINIMUM_DAY" | "CAPTURE") {
    setToolsOpen(true);
    if (tool === "MINIMUM_DAY") setMinimumDayOpen(true);
    const foregroundMinimum = tool === "MINIMUM_DAY" && (minimumDayInAttention || dominant === "HYDRATION_ACTIVE");
    setSmallTool(foregroundMinimum ? null : tool);
    window.requestAnimationFrame(() => {
      const target = foregroundMinimum
        ? document.querySelector<HTMLElement>(dominant === "HYDRATION_ACTIVE" ? "[data-small-hydration]" : "[data-small-minimum]")
        : document.querySelector<HTMLElement>(`[data-tools-item="${tool}"]`);
      const control = target?.querySelector<HTMLElement>(tool === "CAPTURE" ? "input" : "button, input");
      control?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }

  // GRAYSON-TODAY-SPLIT-003 slice D2 (sections out): TOOLS live in todayTools (TodayTools.tsx) and the phase rows in
  // todayPhaseRows (TodayPhaseRows.tsx). Each takes the read, the view, the actions and the local state it shows; the
  // names below are the helpers TODAY used before, called in the same places.
  const sections: TodaySectionsInput = {
    snapshot: todaySnapshot,
    view,
    actions,
    resetSession,
    shiftDownSession,
    checkInForm,
    confirmFlows,
    local: {
      busy,
      captureFeedback,
      captureText,
      checkInFormOpen,
      commandFocus,
      commandTools,
      commitmentsOpen,
      customTemplateList,
      endDayBlockedByWorkout,
      endDayOpen,
      hiddenFeatures,
      logNudgeRead,
      mdProteinInput,
      mdWaterInput,
      measured,
      minimumDayOpen,
      nextWorkout,
      now,
      onOpenBody,
      onOpenHealthEvidence,
      onOpenTrain,
      onViewCommitments,
      operationsOnly,
      paceHistories,
      postShiftPlan,
      refresh,
      resetOpen,
      scheduledContext,
      setCaptureText,
      setCheckInFormOpen,
      setCommitmentsOpen,
      setDetailOpen,
      setEndDayOpen,
      setHydrationConfirmation,
      setHydrationOperationOpen,
      setMdProteinInput,
      setMdWaterInput,
      setMeasuredOpen,
      setMinimumDayOpen,
      setNudgeAnswered,
      setResetOpen,
      setShiftDownOpen,
      setSleepDraftAdjust,
      setSleepNotYetDay,
      setWorkContextOpen,
      shiftDownOpen,
      shiftDownStartRef,
      shiftHandoffRefreshKey,
      sleepDraftAdjust,
      sleepDraftDismissedDayId,
      sleepNotYetDay,
      waterControlsVisible,
      workContextOpen,
      workoutQuestion,
    },
  };
  const tools = todayTools(sections, () => phaseRowSection.renderRecoverSleepPrompt());
  const phaseRowSection = todayPhaseRows(sections, tools);
  const { toolHasContent, renderShiftDownTool, renderResetTool, renderCheckInTool, renderWorkContextTool, renderFuel, renderToolsItem } = tools;
  const { renderRecoverSleepPrompt, renderPhaseRow } = phaseRowSection;
  const visibleTools = toolsItems.filter((tool) => tool !== "MINIMUM_DAY" || hiddenFeatures.minimumDay).filter(toolHasContent);

  if (operationsOnly && commandFocus != null) return <div className="screen command-daily">
    <OperatorHeader destination="command">{commandFocus === "CAPTURE" ? "CAPTURE" : commandFocus === "SHIFT_HANDOFF" ? "SHIFT HANDOFF NOTES" : "DAILY CONTROLS"}</OperatorHeader>
    {!day && <button className="btn-primary" disabled={busy} onClick={() => void handleStartDay()}>START DAY</button>}
    {checkInError && <p role="alert">{checkInError}</p>}
    {banners}
    {commandFocus === "SMALL_STEPS" ? (hiddenFeatures.smallSteps ? <><SmallSteps minimumDayAvailable={hiddenFeatures.minimumDay} enabled busy={busy} onToggle={() => onReturnToFullTools?.()} onOpen={setSmallTool} />{smallTool && renderToolsItem(smallTool)}</> : <p className="meta">Show Small Steps in MORE → Hidden features.</p>)
      : commandFocus === "CHECK_IN" ? <><button className="btn-secondary" onClick={() => setCheckInFormOpen(true)}>CHECK IN</button>
      <CheckInSheet previous={activeCheckInDraft} open={checkInFormOpen} values={values} setValues={setValues} busy={busy} error={checkInError} isInFlight={() => busyRef.current}
        quickValues={quickCheckInValues} quick={() => void handleQuickCheckIn()} sameAsLast={activeCheckInDraft ? () => void handleSameAsLast() : undefined} submit={() => void handleCheckIn()} close={() => setCheckInFormOpen(false)} /></>
      : commandFocus === "SHIFT_HANDOFF" ? <><ShiftHandoff refreshKey={shiftHandoffRefreshKey ?? 0} /><p className="meta">Handoff entry is offered after work is marked ended. Existing notes remain in HISTORY.</p></>
      : commandFocus ? renderToolsItem(commandFocus) : <>{renderWorkContextTool()}{renderToolsItem("END_DAY")}
        <details><summary className="disclosure-row">More daily tools</summary>{TOOLS_ORDER.filter((tool) => !["WORK_CONTEXT", "END_DAY", "CHECK_IN"].includes(tool)).map((tool) => <div key={tool}>{renderToolsItem(tool)}</div>)}</details>
        <button className="btn-secondary" onClick={() => setCheckInFormOpen(true)}>CHECK IN</button>
        <CheckInSheet previous={activeCheckInDraft} open={checkInFormOpen} values={values} setValues={setValues} busy={busy} error={checkInError} isInFlight={() => busyRef.current}
          quickValues={quickCheckInValues} quick={() => void handleQuickCheckIn()} sameAsLast={activeCheckInDraft ? () => void handleSameAsLast() : undefined} submit={() => void handleCheckIn()} close={() => setCheckInFormOpen(false)} />
      </>}
  </div>;

  // FIELD-AUTHORITY-001 + TODAY-FOLD-001: a real next thing leads TODAY. The permanent center LOG
  // action now owns ordinary logging, so TODAY no longer duplicates WATER and MEAL above the fold.
  const nextIsReal = !day || dominant === "OPERATION_CONFLICT" || !!activeWorkout || !!activeResetId || !!activeShiftDownId
    || lateRecoverWithoutSleep || shiftClock.phase === "EXPECTED_POST_WORK" || (!!recommendation && recommendation.kind !== "NO_ACTION_REQUIRED");
  const statusSignal = !!systemStatus && systemStatus.level !== "GREEN" && systemStatus.level !== "NO_READ" && !nextIsReal;
  const checkInOwnedHere = !!day && !checkIn && dominant !== "OPERATION_CONFLICT" && !activeWorkout && !activeResetId && !activeShiftDownId && !lateRecoverWithoutSleep;
  const supportSection = <div className="today-context-support">
      <WorkPreparation dayId={day?.id ?? null} beforeWork={Boolean(day && day.workContext === "WORK" && scheduledClock.phase === "PRE_WORK" && !startedEarly)} onShift={scheduledClock.phase === "SCHEDULED_SHIFT"} active={active} busy={busy || !!activeWorkout || !!activeResetId || !!activeShiftDownId} />
      {/* POST-SHIFT-001 (#373): right after a shift, hands-free logging is one tap. Quiet; never a prompt. */}
      {day && scheduledClock.phase === "EXPECTED_POST_WORK" && !activeWorkout && !activeResetId && !activeShiftDownId && <button type="button" className="btn-secondary today-drive-home" disabled={busy} onClick={() => window.dispatchEvent(new Event(DRIVE_HOME_EVENT))}>DRIVE HOME · HANDS-FREE</button>}
      {/* ROUTINES-001 (owner ruling 2026-10-31): one quiet row, only the current moment's routines. */}
      <TodayRoutine dayId={day?.id ?? null} moment={day ? routineMomentFor({ phase: scheduledClock.phase, predictedPhase: predictedWorkPhase(shiftClockInput), workContext: day.workContext, workStarted: !!workPeriodStartedAt, workEnded: !!workPeriodEndedAt }) : null} active={active} busy={busy || !!activeWorkout || !!activeResetId || !!activeShiftDownId} />
  </div>;
  const lifeLink = onOpenLife && <button type="button" className="today-life-link" aria-label="Open your life" onClick={onOpenLife} disabled={busy}>
      <div><strong>YOUR LIFE</strong><span>Plans, projects, routines and people.</span></div><span aria-hidden="true">↗</span>
    </button>;
  const nextSection = <>
      <section className="console-guidance" aria-label="Next action">
        {checkInOutcome && <p className="meta check-in-outcome" role="status">{checkInOutcome}</p>}
        {dominant === "OPERATION_CONFLICT" ? <>      {day && dominant === "OPERATION_CONFLICT" && (
        <div className="card card--warning" role="alert">
          <p className="tool-label">OPERATION CONFLICT</p>
          <h2 className="card-title">Multiple foreground operations are active</h2>
          <p className="card-body">
            {[
              activeWorkout ? "WORKOUT" : null,
              activeResetId ? "RESET" : null,
              activeShiftDownId ? "SHIFT DOWN" : null,
            ].filter(Boolean).join(" and ")} are unresolved. Return to or resolve one operation before continuing with another.
          </p>
        </div>
      )}
      {day && dominant === "OPERATION_CONFLICT" && <ActiveWorkoutCard activeWorkout={activeWorkout} isDominant={false} fromEarlierDay={!!activeWorkout && activeWorkout.beyondDayId !== day.id} onOpenTrain={onOpenTrain} />}
      {day && dominant === "OPERATION_CONFLICT" && (
        <ResetCard
          prominent={false}
          isDominant={false}
          activeResetId={activeResetId}
          resetIntensity={resetIntensity}
          setResetIntensity={setResetIntensity}
          openResetStartedAt={openResetStartedAt}
          lastResetOutcome={lastResetOutcome}
          resetOpen={resetOpen}
          setResetOpen={setResetOpen}
          busy={busy}
          onStartReset={() => void handleStartReset()}
          onCompleteReset={() => void handleCompleteReset()}
          onCancelReset={() => void handleCancelReset()}
        />
      )}
      {day && dominant === "OPERATION_CONFLICT" && (
        <ShiftDownCard
          prominent={false}
          isDominant={false}
          activeShiftDownId={activeShiftDownId}
          shiftDownDuration={shiftDownDuration}
          setShiftDownDuration={setShiftDownDuration}
          openShiftDownStartedAt={openShiftDownStartedAt}
          lastShiftDownOutcome={lastShiftDownOutcome}
          shiftDownOpen={shiftDownOpen}
          setShiftDownOpen={setShiftDownOpen}
          busy={busy}
          onStartShiftDown={() => void handleStartShiftDown()}
          onCompleteShiftDown={() => void handleCompleteShiftDown()}
          onCancelShiftDown={() => void handleCancelShiftDown()}
          startButtonRef={shiftDownStartRef}
          postShiftPlan={postShiftPlan}
        />
      )}
</> : activeWorkout ? <ActiveWorkoutCard activeWorkout={activeWorkout} isDominant onOpenTrain={onOpenTrain} fromEarlierDay={!!day && activeWorkout.beyondDayId !== day.id} />
          : !day ? (dayRead ? <><h2>Start your day</h2><button type="button" className="btn-primary" disabled={busy} onClick={() => void handleStartDay()}>START DAY</button></> : null)
          : activeResetId ? <>      {day && (
        <ResetCard
          prominent={resetIsPrimary}
          isDominant={false}
          activeResetId={activeResetId}
          resetIntensity={resetIntensity}
          setResetIntensity={setResetIntensity}
          openResetStartedAt={openResetStartedAt}
          lastResetOutcome={lastResetOutcome}
          resetOpen={resetOpen}
          setResetOpen={setResetOpen}
          busy={busy}
          onStartReset={() => void handleStartReset()}
          onCompleteReset={() => void handleCompleteReset()}
          onCancelReset={() => void handleCancelReset()}
        />
      )}
</>
          : activeShiftDownId ? <>      {day && (
        <ShiftDownCard
          prominent={shiftDownIsPrimary}
          isDominant={false}
          activeShiftDownId={activeShiftDownId}
          shiftDownDuration={shiftDownDuration}
          setShiftDownDuration={setShiftDownDuration}
          openShiftDownStartedAt={openShiftDownStartedAt}
          lastShiftDownOutcome={lastShiftDownOutcome}
          shiftDownOpen={shiftDownOpen}
          setShiftDownOpen={setShiftDownOpen}
          busy={busy}
          onStartShiftDown={() => void handleStartShiftDown()}
          onCompleteShiftDown={() => void handleCompleteShiftDown()}
          onCancelShiftDown={() => void handleCancelShiftDown()}
          startButtonRef={shiftDownStartRef}
          postShiftPlan={postShiftPlan}
        />
      )}</>
          : lateRecoverWithoutSleep ? renderRecoverSleepPrompt()
          // GRAYSON C1.3: once SHIFT DOWN is done it steps aside (it was offered again, in red, until sleep or 16:30).
          : shiftClock.phase === "EXPECTED_POST_WORK" && !shiftClockInput.shiftDownDone ? renderPhaseRow("SHIFT_DOWN")
          : recommendation ? <>          <RecommendationCard
            nextAction
            // FIELD-AUTHORITY-001: this TODAY renders no question below the card, so never claim one.
            questionBelow={false}
            context={nextActionContext}
            behindPace={behindPace.length > 0}
            day={day}
            recommendation={recommendation}
            headlineCommitment={headlineCommitment}
            commitmentActions={commitmentActions}
            isDominant={dominant === "RECOMMENDATION"}
            isAttention={recommendationInAttention}
            decision={decision}
            checkIn={checkIn}
            recommendationOpen={recommendationOpen}
            setRecommendationOpen={setRecommendationOpen}
            recommendationHandoff={recommendationHandoff}
            activeShiftDownId={activeShiftDownId}
            priorOutcomeMemory={priorOutcomeMemory}
            rememberedLesson={rememberedLesson}
            pendingReflection={pendingReflection}
            onReflectionAnswered={() => void refresh()}
            materiallyRepeated={materiallyRepeated}
            busy={busy}
            onOpenTrain={onOpenTrain}
            onRecord={() => void handleRecord()}
            onDecline={handleDecline}
            onHandoff={handleRecommendationHandoff}
            confirmPanel={<ConfirmPanel />}
          /></>
          // FIELD-AUTHORITY-001 (states C/D): no Engine guidance yet is not an emergency. A calm
          // line, no red; logging leads and the one check-in path sits below.
          : <TodayRecommendationDraft dayId={day.id} now={now.getTime()} refreshKey={refreshVersion} busy={busy} onPresenceChange={setRecommendationDraftPresent} openCheckIn={() => setCheckInFormOpen(true)} fallback={<h2>{checkIn ? describeAllClearHeadline() : "Log when you want."}</h2>} />}
        {(activeWorkout || activeResetId || activeShiftDownId || shiftClock.phase === "EXPECTED_POST_WORK") && recommendation && <details><summary>WHY</summary><p>{recommendation.rationale}</p><p className="meta">Recorded Engine guidance. Your call.</p></details>}
      {(activeResetId || activeShiftDownId || shiftClock.phase === "EXPECTED_POST_WORK") && <ConfirmPanel />}
      {day && recommendation && onOpenCoach && <CoachCard active={active && !busy && !activeWorkout && !activeResetId && !activeShiftDownId} refreshKey={refreshVersion} variant={suggestedVariant} onOpen={onOpenCoach} />}
      {/* FIELD-AUTHORITY-001: TODAY's single "not checked in" surface — quiet, never red, and
          absent while an operation or the late sleep prompt owns the card. */}
      {checkInOwnedHere && !recommendationDraftPresent && <p className="today-check-in"><span><span>Not checked in.</span> <span>Check in for today's recommendation.</span></span><button type="button" className="btn-secondary" onClick={() => setCheckInFormOpen(true)}>CHECK IN</button></p>}
      {/* GRAYSON C1.1: Orientation stays one quiet tap away (FIELD-AUTHORITY-001: no red, nothing above the day). A day
          started by the roll or a log reads ORIENT TODAY until it's been seen on this device. */}
      {dayRead && day && <div className="today-briefing-entry"><button type="button" className="btn-secondary" disabled={busy} onClick={() => { if (!busyRef.current) setOrientationOpen(true); }}>{orientationSeenTick >= 0 && !orientationSeen(day.id) ? "ORIENT TODAY" : "ORIENTATION"}</button></div>}
    </section>
  </>;

  // TODAY-CLARITY-001 (WALKTHROUGH-002 finding 3): while the band shows NOW and NEXT, the hero's "scheduled: …" run
  // line said the same thing a third time; the band carries it (with its source), so the hero drops it. When the band
  // steps aside (an operation, the late sleep prompt) or NEXT couldn't be read, the hero keeps it.
  const bandHidden = dominant === "OPERATION_CONFLICT" || !!activeWorkout || !!activeResetId || !!activeShiftDownId || lateRecoverWithoutSleep;
  const bandCarriesRun = !!day && !!lifeReading && !!ahead && !bandHidden;
  // GRAYSON C1.1: Orientation owns the screen until ENTER TODAY; it steps aside for an operation in progress.
  const closeOrientation = () => { if (day) markOrientationSeen(day.id); setOrientationOpen(false); setOrientationSeenTick((n) => n + 1); };
  if (!operationsOnly && orientationOpen && day && !activeWorkout && !activeResetId && !activeShiftDownId) return <>
    <Orientation active={active} busy={busy} refreshKey={refreshVersion} routes={{
      onEnter: closeOrientation,
      onCheckIn: () => { if (!busyRef.current) setCheckInFormOpen(true); },
      onPrep: () => { closeOrientation(); requestAnimationFrame(() => document.querySelector(".work-preparation")?.scrollIntoView({ block: "start" })); },
      onCapture: () => { if (onOpenRecord) onOpenRecord("note"); else { closeOrientation(); openFastCapture(); } },
      onTrain: onOpenTrain ? () => { closeOrientation(); onOpenTrain("WORKOUT"); } : undefined,
      onSleep: onOpenBody ? () => onOpenBody("sleep") : onOpenHealthEvidence ? () => onOpenHealthEvidence("sleep") : undefined,
      onCommitment: onOpenPlan ? () => { closeOrientation(); onOpenPlan(); } : undefined,
      onSetContext: (value) => handleSetWorkContext(value),
    }} />
    <CheckInSheet previous={activeCheckInDraft} open={checkInFormOpen} close={() => setCheckInFormOpen(false)} values={values} setValues={setValues} busy={busy} isInFlight={() => busyRef.current} submit={() => void handleCheckIn()} quick={() => void handleQuickCheckIn()} sameAsLast={activeCheckInDraft ? () => void handleSameAsLast() : undefined} quickValues={quickCheckInValues} error={checkInError} />
  </>;
  if (!operationsOnly) return <div className="screen command-console today-field redesign-today">
    <SuitMode mode={pinnedPhase ?? scheduledClock.phase} />
    <OperatorHeader destination="mission">BEYOND // TODAY</OperatorHeader>
    {day && earlyStart && !bandHidden && <EarlyStartRow early={earlyStart} busy={busy} onStart={() => void handleStartDay()} />}
    {day ? <section className="today-situation cc-hero-wrap" aria-label="Day mode">          <ModeHeader
            eyebrow={now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
            run={bandCarriesRun ? null : todayRun}
            operation={bandHidden}
            // DAY-MAP-001: like the band, the map steps aside while an operation owns the screen, so RESUME stays above the fold.
            marks={recordedNow && !bandHidden ? placeMarks([...recordedNow.map, ...plannedMarks(recordedNow.sleepPlan?.windows ?? [], now)], livedDayStart).map((m) => (!m.planned && freshMarks.has(markKey(m)) ? { ...m, fresh: true as const } : m)) : undefined}
            onOpenSleepPlan={onOpenCave ? () => { if (!busyRef.current) onOpenCave("route"); } : undefined}
            onEditMark={(ref) => { if (!busyRef.current) setEditTarget(ref); }}
            onEditShift={(shift) => { if (!busyRef.current) setShiftTarget(shift); }}
            markActions={{
              ...(onOpenHealthEvidence ? {
                WATER: { label: "WATER", open: () => { if (!busyRef.current) onOpenHealthEvidence("water"); } },
                MEAL: { label: "FOOD", open: () => { if (!busyRef.current) onOpenHealthEvidence("protein"); } },
                SLEEP: { label: "SLEEP", open: () => { if (!busyRef.current) onOpenHealthEvidence("sleep"); } },
              } : {}),
              ...(onOpenTrain ? { WORKOUT: { label: "TRAIN", open: () => { if (!busyRef.current) onOpenTrain("HISTORY"); } } } : {}),
              ...(onOpenCave ? {
                SLEEP_PLAN: { label: "ROUTE", open: () => { if (!busyRef.current) onOpenCave("route"); } },
                NAP_PLAN: { label: "ROUTE", open: () => { if (!busyRef.current) onOpenCave("route"); } },
              } : {}),
            }}
            now={now}
            countdown={scheduledClock.countdown ? describeCountdown(scheduledClock.countdown, now) : undefined}
            hasAction={!!recommendation && recommendation.kind !== "NO_ACTION_REQUIRED" && !decision}
            scheduledPhase={startedEarly ? "SCHEDULED_SHIFT" : scheduledClock.phase}
            pin={manualPin}
            dayStart={livedDayStart}
            dayOff={day.workContext === "OFF"}
            busy={busy}
            strip={deriveLivedDayStrip({
              dayStart: livedDayStart,
              dayEnd: nextRolloverBoundaryAfter(new Date(day.startedAt)),
              now,
              workContext: day.workContext,
              shiftWindow,
              workEndedAt: workPeriodEndedAt,
              mainSleepRecordedAt,
            })}
            onPin={(phase) => { setModePin(day.id, phase); setModePinState({ dayId: day.id, phase }); }}
            onRecordWorkDay={scheduledContext ? () => void handleSetWorkContext("WORK") : undefined}
            systems={onOpenCave && <>
              <SuitLines now={now} refreshKey={`${refreshVersion}|${day.id}|${day.workContext ?? ""}|${recommendation?.id ?? ""}|${lastMainSleepMinutes ?? ""}|${capacityResult?.capacity ?? ""}|${workPeriodEndedAt ?? ""}|${Math.floor(now.getTime() / 300000)}`} onShift={shiftClock.displayPhase === "SCHEDULED_SHIFT"} onOpen={(tab) => { if (!busyRef.current) onOpenCave(tab); }} />
              <StartedWork now={now} refreshKey={`${day.id}|${day.workContext ?? ""}|${workPeriodEndedAt ?? ""}|${workStartTick}|${Math.floor(now.getTime() / 300000)}`} onSaved={() => { setWorkStartTick((n) => n + 1); void refresh(); }}
                // REAL-DATA-001: after the shift, SHIFT DOWN carries the one MARK WORK ENDED; no second button up here.
                onEndWork={shiftClock.phase === "EXPECTED_POST_WORK" ? undefined : () => void handleMarkWorkEnded()} />
              {/* SHIFT-CHANGE-001: the end of a shift, given the whole screen once. */}
              <ShiftChangeMoment now={now} refreshKey={`${day.id}|${workPeriodEndedAt ?? ""}|${workStartTick}|${Math.floor(now.getTime() / 60000)}`} onOpen={() => { if (!busyRef.current) onOpenCave("brief"); }} onStarted={() => { setWorkStartTick((n) => n + 1); void refresh(); }} onEndWork={() => void handleMarkWorkEnded()} />
            </>}
          >
            {/* The context sentence (or the countdown) stays for screen readers; the meta line shows it. */}
            <p className="visually-hidden status-strip__headline">
              {shiftClock.countdown
                ? describeCountdown(shiftClock.countdown, now)
                : describeContextStrip(
                    currentContext ? (currentContext.workContext ?? day.workContext) : day.workContext,
                    currentContext ? currentContext.schedulePrediction : scheduledContext,
                    currentContext ? currentContext.hasUnresolvedPostShift : unresolvedPostShift,
                    workContextPerSchedule,
                    scheduledClock.phase,
                  ).replace(" — shift ended, not yet shifted down", " · shift down pending").replace(" — after your shift", " · after shift")}
            </p>
            {shiftClock.countdown && <p className="visually-hidden status-strip__detail">{workContextPerSchedule ? WORKING_PER_SCHEDULE : "Working today"}</p>}
            <ActiveExperimentLine now={now} />
          </ModeHeader></section> : !dayRead
      // LAUNCH-STEADY-001: until the first read settles, "no day" is unknown: a quiet reading frame, never "Mode not set".
      ? <section className="today-situation cc-hero-wrap" aria-label="Reading today" aria-busy="true"><div className="cc-mode mode-empty today-reading"><p role="status" className="cc-mode-meta">Reading your day…</p><ModeCity now={now} workDay={false} /></div></section>
      : <section className="today-situation cc-hero-wrap" aria-label="Day mode"><div className="cc-mode mode-empty"><h2 className="cc-mode-name">Mode not set</h2><p className="cc-mode-meta">Start a day to set your context.</p><ModeCity now={now} workDay={false} /><ModeScene now={now} workDay={false} hasAction={false} /></div></section>}
    {/* SYNC-002: the shell's one line here (what SYNC GARMIN brought back), right under the hero. */}
    {banners && <div className="today-banners">{banners}</div>}
    {/* LIFE-STATE-001: the state frames the day, right above its next action. Like the check-in line, it steps
        aside while an operation or the late sleep prompt owns the card, so RESUME stays above the fold. */}
    {day && <div hidden={bandHidden}>
      <LifeStateBand reading={lifeReading} moment={lifeMoment} ahead={ahead} since={since} days={recordedNow?.week?.days} now={now}
        weekAhead={() => <WeekAheadView now={now} onScheduleChanged={() => void refresh()} />} /></div>}
    {nextSection}
    {/* GRAYSON LOG-CATCHUP-001: after SHIFT DOWN on a shift day, what didn't get logged at work, before the close. */}
    {day && shiftWindow && shiftDownCompletedAt && Date.parse(shiftDownCompletedAt) >= shiftWindow.start.getTime() && closeSeenTick >= 0 && !catchUpDone(day.id)
      && !(dominant === "OPERATION_CONFLICT" || activeWorkout || activeResetId || activeShiftDownId) && (
      <ShiftCatchUpCard dayId={day.id} busy={busy} onDone={() => { setCloseSeenTick((n) => n + 1); void refresh(); }} />
    )}
    {/* GRAYSON C1.3: after SHIFT DOWN (his getting-home ritual), a quiet, optional close, below the next card. */}
    {day && shiftDownCompletedAt && (!shiftWindow || Date.parse(shiftDownCompletedAt) >= shiftWindow.start.getTime()) && closeSeenTick >= 0 && !closeDone(day.id)
      && !(dominant === "OPERATION_CONFLICT" || activeWorkout || activeResetId || activeShiftDownId) && (
      <CloseCard dayId={day.id} busy={busy} onClosed={() => setCloseSeenTick((n) => n + 1)} />
    )}
    {/* LIFE-STATE-003: below the next card, so the day's real next thing still leads (FIELD-AUTHORITY-001). */}
    {day && lifeMoment?.moment === "RUN_OVER" && !(dominant === "OPERATION_CONFLICT" || activeWorkout || activeResetId || activeShiftDownId || lateRecoverWithoutSleep) && <section className="today-run-over" aria-label="After the run">
        {/* LIFE-STATE-003: the run that just ended, and an optional recovery contract for the first full day off. */}
        <PostRunReportDisclosure />
        <RecoveryContractOffer dayLabel={new Date(`${contractDate(now)}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })} planned={!!recordedNow?.contractPlanned} busy={busy}
          onSave={async (item) => { await createObligation({ title: item.title, plannedAt: contractDate(new Date()), description: item.description }); }}
          onSaved={() => void refresh()} />
      </section>}
    {/* VISUAL-FOUNDATION-003 (Gavin, 2026-11-14, Protected, approved): the numbers come right after the day's next step
        (and the after-the-run report); the preparation/life order below them is LIFE-STATE-001's, unchanged. */}
    {/* ENERGY-CURVE-001 (Gavin, 2026-11-19, approved new TODAY panel): tonight's energy estimate, just above the numbers. */}
    {dayRead && day && <TodayEnergy now={now.getTime()} active={active} refreshKey={refreshVersion} />}
    {/* GRAYSON C4.8a: the Eating Window, only once he has turned it on. */}
    {dayRead && day && <EatingWindowCard active={active} refreshKey={refreshVersion} busy={busy} />}
    {/* LAUNCH-STEADY-001: no NOT LOGGED tiles before the day has been read. */}
    {dayRead && <section className="today-numbers" aria-label="Today's numbers">
      {renderFuel()}
      {stale && <p role="status"><Signal data-signal="stale-note">{staleRefresh === "HELD"
        ? "These are yesterday’s numbers. Today starts when you finish your workout, or 2 hours after your last set."
        : staleRefresh === "FAILED" ? "These are yesterday’s numbers. Today didn’t load. Try again." : "These are yesterday’s numbers."}</Signal><button type="button" className="btn-secondary" disabled={busy || staleRefresh === "RUNNING"} onClick={() => void handleStaleRefresh()}>REFRESH</button></p>}
      {/* FIELD-AUTHORITY-001: one compact signal line. System Status joins it only when the next card
          isn't already speaking (no real recommendation) — never NOT CHECKED IN, which the card owns. */}
      {(!online || backupDue || undoFailure || checkInError || statusSignal) && <button type="button" className="btn-secondary today-system-signal" onClick={onOpenSystems}>
        {(undoFailure || checkInError) && <><Signal data-signal="save-failed">{undoFailure ?? checkInError}</Signal>{" "}</>}
        {!online && <><Signal data-signal="offline-line">Offline. Logging still saves on this phone.</Signal>{" "}</>}
        {statusSignal && systemStatus && <><span data-system-status={systemStatus.level}>STATUS · {describeSystemStatus(systemStatus)}</span>{" "}</>}
        {backupDue && <Signal data-signal="backup-line">{backupDue.days === null ? "No backup yet." : "Backup overdue."}</Signal>}
      </button>}

    </section>}
    {dayRead && onOpenRecord && <div className="today-note-shortcut"><button type="button" className="btn-secondary" disabled={busy} aria-label="Capture a note" aria-haspopup="dialog" onClick={() => { if (!busyRef.current) onOpenRecord("note"); }}>CAPTURE</button></div>}
    {/* LIFE-STATE-001: in a work run or on a flip day, the day's own preparation and routines come before your
        wider life; on a recovery or free day (or when the state is unknown) the usual order stays. Nothing is hidden. */}
    {/* Keyed, so React moves the two sections instead of remounting them (FIELD-AUTHORITY-001: reorder without remount). */}
    {(lifeState === "WORK_RUN" || lifeState === "FLIP" ? ["support", "life"] : ["life", "support"]).map((part) => <Fragment key={part}>{part === "support" ? supportSection : lifeLink}</Fragment>)}
    {brief}
    <TodayReviewSupport phase={scheduledClock.phase} now={now} active={active} review={review} onOpen={onOpenWeeklyReview} />
    <LogSheet open={fastCaptureOpen} title="NOTE" onClose={closeFastCapture} canClose={() => !busyRef.current}>{renderToolsItem("CAPTURE")}</LogSheet>
    <SleepMetricSheet open={measuredOpen === "sleep"} onClose={() => setMeasuredOpen(null)}
      onAllRecords={onOpenHealthEvidence ? () => { setMeasuredOpen(null); onOpenHealthEvidence("sleep"); } : undefined} />
    <LogEntrySheet target={editTarget} onClose={() => setEditTarget(null)} onChanged={() => refresh()} />
    <ShiftMarkSheet target={shiftTarget} onClose={() => setShiftTarget(null)} onChanged={() => refresh()} />
    <MetricDetailSheet open={detailOpen !== null} metric={detailOpen ?? "water"} onClose={() => setDetailOpen(null)} refreshKey={refreshVersion}
      onRecords={(detailOpen === "water" || detailOpen === "weight" || detailOpen === "protein") && onOpenHealthEvidence ? () => onOpenHealthEvidence(detailOpen) : undefined}
      onLog={(detailOpen === "water" || detailOpen === "weight" || detailOpen === "protein") && onOpenRecord ? () => onOpenRecord(detailOpen) : undefined} />
    <CheckInSheet previous={activeCheckInDraft} open={checkInFormOpen} close={() => setCheckInFormOpen(false)} values={values} setValues={setValues} busy={busy} isInFlight={() => busyRef.current} submit={() => void handleCheckIn()} quick={() => void handleQuickCheckIn()} sameAsLast={activeCheckInDraft ? () => void handleSameAsLast() : undefined} quickValues={quickCheckInValues} error={checkInError} />
    {/* TODAY-SPLIT-002 slice 2: the "recorded" confirmations live in TodayToasts; TODAY still decides when they show. */}
    <TodayToasts waterOz={hydrationConfirmation?.amount} mealMessage={mealConfirmation?.message} sleepMinutes={sleepConfirmation?.amount} proteinG={proteinConfirmation?.amount} />
  </div>;
  return (
    <div
      className={`screen fade-in command-console day-line today-field${
        day && dominant === "NONE" && attentionPlan.attention.length === 0 ? " today-field--quiet" : ""
      }${justStartedDay ? " today-field--boot" : ""}`}
      data-field-state={
        dominant !== "NONE" ? "earned" : attentionPlan.attention.length > 0 ? "attention" : "quiet"
      }
    >
      {!operationsOnly && <SuitMode mode={pinnedPhase ?? scheduledClock.phase} />}
      {/* BEYOND Suit Implementation 01B: the identity zone is
          deliberately quiet now — a real <h1> for correct heading
          structure (Part 15), but styled with .eyebrow (small, mono)
          rather than the large .title display treatment. Freed
          territory and visual weight belong to the command surface
          below, not to screen chrome.
          TODAY-006: wrapped in .field-header — the exact locked
          "BEYOND // TODAY" .eyebrow text/class is unchanged (Suit Layer
          01's own identity assertion), now paired with the same locked
          pilot "mission" glyph TODAY's nav tab already uses and a
          closing structural rule, so the screen opens on a real
          instrument header instead of one quiet line of text. */}
      <OperatorHeader destination="command">DAILY CONTROLS</OperatorHeader>

      {/* FIELD-ARCH-001: before a day exists, START DAY is the one
          available action — nothing else on this screen can compete for
          it yet, the same "exactly one dominant surface" condition every
          other CommandSurface call site on TODAY already renders under.
          SUIT-001 had already moved this off a bare unheaded .card onto
          a real heading + .btn-primary, but left it the one surviving
          plain .card on this screen (its own comment said so); this
          finishes that move onto the actual dominant-decision-surface
          primitive, using only existing primitives/copy — no new claim,
          same action. */}
      {!day && (
        <CommandSurface>
          <p className="tool-label">BEGIN</p>
          <h2 className="command-title">Start your BEYOND Day</h2>
          <p className="card-body" style={{ marginBottom: 12 }}>Check in and get today's guidance.</p>
          <button className="btn-primary" disabled={busy} onClick={() => void handleStartDay()}>
            START DAY
          </button>
        </CommandSurface>
      )}

      {/* STATUS — Harvest Checkpoint 3: compact, glanceable context, never
          its own card. The same content that used to live inside the
          recommendation card's own header — moved out so it's visible
          even before a check-in exists, and so NOW is purely about the
          one thing needing a decision. describeContextStrip is designed
          to accept a still-loading (null) scheduledContext gracefully
          (falls back to "Context not set yet"/"Working today" without a
          phase) — gating on `day` alone matches its actual contract.
          TODAY // SUIT LAYER 01 (DEC-003): now rendered via .status-strip
          — same content, given its own bordered "operational readout"
          presence instead of floating bare text, while staying far
          quieter than .card--action so it never competes with NOW.
          SUIT-001 (COMMAND PRESENCE): the strip now distinguishes all four
          capacity states the Suit needs to communicate — GREEN (unchanged
          default), YELLOW/RED (the left tick and capacity words shift to
          the same --warning/--accent-strong tokens .capacity-dot already
          uses — still just a glance-level tint, never a second red wash),
          and UNKNOWN (no check-in yet — previously said nothing about
          capacity at all, which reads as calm rather than as genuinely
          unknown). Still a single line, still color-independent: every
          state pairs its dot with an explicit word, never color alone. */}
      {/* LAUNCH POLISH (owner approval 2026-10-01): ORIENT drops its label
          and box — the same two facts read as a status line under the
          header, as in the Launch Vision prototype. */}
      
      {/* FIELD-ARCH-001: same two facts (describeContextStrip's sentence,
          the capacity dot+clause) this strip has always shown — restacked
          into a real label-free instrument reading (a bold headline line,
          then a quieter detail line) instead of one flat, uniform-scale
          sentence, so ORIENT stops being the one place on TODAY still
          rendered as plain prose next to OPERATE's own bold .command-title
          two inches below. .status-strip--stacked/__headline/__detail are
          additive: the base .status-strip class TRAIN's own single-line
          active-execution status reuses is untouched, so that usage is
          unaffected by this change. */}
      {day && (
        <section aria-labelledby="today-current-state-heading" className={`status-strip status-strip--stacked today-situation cc-hero-wrap${stripLevel ? ` status-strip--${stripLevel}` : ""}`}>
          <h2 id="today-current-state-heading" className="visually-hidden">DAY CONTEXT</h2>
          {/* POLISH-002: the prototype's mode hero — mode, meta, timeline, scene, and SYSTEMS inside
              its frame. AMBER or RED still lead the SYSTEMS line in words (SUIT-001). */}
          <ModeHeader
            run={todayRun}
            now={now}
            countdown={scheduledClock.countdown ? describeCountdown(scheduledClock.countdown, now) : undefined}
            hasAction={!!recommendation && recommendation.kind !== "NO_ACTION_REQUIRED" && !decision}
            scheduledPhase={startedEarly ? "SCHEDULED_SHIFT" : scheduledClock.phase}
            pin={manualPin}
            dayStart={livedDayStart}
            dayOff={day.workContext === "OFF"}
            busy={busy}
            strip={deriveLivedDayStrip({
              dayStart: livedDayStart,
              dayEnd: nextRolloverBoundaryAfter(new Date(day.startedAt)),
              now,
              workContext: day.workContext,
              shiftWindow,
              workEndedAt: workPeriodEndedAt,
              mainSleepRecordedAt,
            })}
            onPin={(phase) => { setModePin(day.id, phase); setModePinState({ dayId: day.id, phase }); }}
            onRecordWorkDay={scheduledContext ? () => void handleSetWorkContext("WORK") : undefined}
            systems={
              <SystemsLine
                input={{
                  sleepMinutes: lastMainSleepMinutes,
                  proteinG: minimumDayProteinG,
                  proteinTargetG: proteinTargetG,
                  checkIn: capacityResult?.capacity ?? null,
                  statusLevel: systemStatus?.level ?? null,
                }}
                warnings={[
                  ...(stale ? [{ key: "stale", text: "Yesterday’s numbers", node: <Signal data-signal="stale">Yesterday’s numbers</Signal> }] : []),
                  ...(backupDue ? [{ key: "backup", text: backupDue.days === null ? "No backup yet" : `Backup ${backupDue.days}d`, node: <Signal data-signal="backup">{backupDue.days === null ? "No backup yet" : `Backup ${backupDue.days}d`}</Signal> }] : []),
                  ...(!online ? [{ key: "offline", text: "Offline", node: <Signal data-signal="offline">Offline</Signal> }] : []),
                ]}
                onOpen={onOpenSystems ? () => { if (!busyRef.current) onOpenSystems(); } : undefined}
              />
            }
          >
            {/* The context sentence (or the countdown) stays for screen readers; the meta line shows it. */}
            <p className="visually-hidden status-strip__headline">
              {shiftClock.countdown
                ? describeCountdown(shiftClock.countdown, now)
                : describeContextStrip(
                    currentContext ? (currentContext.workContext ?? day.workContext) : day.workContext,
                    currentContext ? currentContext.schedulePrediction : scheduledContext,
                    currentContext ? currentContext.hasUnresolvedPostShift : unresolvedPostShift,
                    workContextPerSchedule,
                    scheduledClock.phase,
                  ).replace(" — shift ended, not yet shifted down", " · shift down pending").replace(" — after your shift", " · after shift")}
            </p>
            {shiftClock.countdown && <p className="visually-hidden status-strip__detail">{workContextPerSchedule ? WORKING_PER_SCHEDULE : "Working today"}</p>}
            {/* The "per schedule" one-tap change stays in the hero in every phase, never behind TOOLS. */}
            {workContextPerSchedule && day.workContext !== "UNKNOWN" && (
              <div className="cc-mode-context">
                <button
                  type="button"
                  className="cc-tag cc-context-change"
                  disabled={busy}
                  aria-label={describeStandingChange(day.workContext)}
                  onClick={() => void handleChangeStandingWorkContext()}
                >
                  <span className="cc-tag-face">{day.workContext === "WORK" ? "OFF TODAY" : "WORK TODAY"}</span>
                </button>
              </div>
            )}
          </ModeHeader>
          {stale && <div className="signal-stale cc-stale-note" role="status">
            <Signal data-signal="stale-note">{staleRefresh === "HELD"
              ? "These are yesterday’s numbers. Today starts when you finish your workout, or 2 hours after your last set."
              : staleRefresh === "FAILED" ? "These are yesterday’s numbers. Today didn’t load. Try again." : "These are yesterday’s numbers."}</Signal>
            <button type="button" disabled={busy || staleRefresh === "RUNNING"} onClick={() => void handleStaleRefresh()}>REFRESH</button>
          </div>}
          {systemStatus?.level === "RED" && recommendation?.kind === "NO_ACTION_REQUIRED" && <p className="day-line-evidence-note">Status reports recorded signals. Guidance doesn’t clear those sleep signals.</p>}
        </section>
      )}

      {/* One canonical Engine result. Foreground operations above retain priority;
          support guidance stays a disclosure rather than a competing dominant action. */}
      {day && !recommendation && <section className="console-guidance" aria-label="Current recommendation"><div className="cc-panel cc-rec next-action-card all-clear"><p className="cc-lbl">NEXT USEFUL ACTION</p><h2>{describeAllClearHeadline(questionBelow, behindPace.length > 0)}</h2>{nextActionContext && <p>{nextActionContext}</p>}</div></section>}
      {day && recommendation && (
        <section className="console-guidance" aria-label="Current recommendation">
          <p className="tool-label console-guidance__label">GUIDANCE</p>
          <RecommendationCard
            nextAction
            questionBelow={questionBelow}
            context={nextActionContext}
            behindPace={behindPace.length > 0}
            day={day}
            recommendation={recommendation}
            headlineCommitment={headlineCommitment}
            commitmentActions={commitmentActions}
            isDominant={dominant === "RECOMMENDATION"}
            isAttention={recommendationInAttention}
            decision={decision}
            checkIn={checkIn}
            recommendationOpen={recommendationOpen}
            setRecommendationOpen={setRecommendationOpen}
            recommendationHandoff={recommendationHandoff}
            activeShiftDownId={activeShiftDownId}
            priorOutcomeMemory={priorOutcomeMemory}
            rememberedLesson={rememberedLesson}
            pendingReflection={pendingReflection}
            onReflectionAnswered={() => void refresh()}
            materiallyRepeated={materiallyRepeated}
            busy={busy}
            onOpenTrain={onOpenTrain}
            onRecord={() => void handleRecord()}
            onDecline={handleDecline}
            onHandoff={handleRecommendationHandoff}
            confirmPanel={<ConfirmPanel />}
          />
        </section>
      )}

      {day && recommendation && onOpenCoach && <CoachCard active={active && !busy && !activeWorkout && !activeResetId && !activeShiftDownId} refreshKey={refreshVersion} variant={suggestedVariant} onOpen={onOpenCoach} />}
      {/* An active workout resumes from right under the card, above the fold. */}
      {day && dominant === "WORKOUT_ACTIVE" && <div className="today-resume-line"><ActiveWorkoutCard activeWorkout={activeWorkout} isDominant={false} fromEarlierDay={!!activeWorkout && activeWorkout.beyondDayId !== day.id} onOpenTrain={onOpenTrain} /></div>}
      {day && <ShiftRecoveryBrief active={active} now={now} />}
      {/* DELTA-GROWS-001 (Gavin: "Yes, with the TODAY line"): one quiet line, only when DELTA learned something new. */}
      {day && <DeltaNewsLine active={active} />}
      {day && onOpenWeeklyReview && <div className="today-review-line"><WeeklyReviewReadyLine active={active} phase={scheduledClock.phase} now={now} onOpen={onOpenWeeklyReview} /></div>}
      {day && <section className="today-numbers" aria-label="Today's numbers">{renderFuel()}</section>}
      <section className="console-operations" aria-labelledby="console-operations-heading">
        <h2 id="console-operations-heading" className="visually-hidden">LOG ACTIONS</h2>
        <ConsoleControls
          onWaterVisibilityChange={setWaterControlsVisible}
          onLogWater={handleMinimumDayLogWater}
          lastWaterAmount={lastWaterAmount}
          busy={busy}
          isInFlight={() => busyRef.current}
          onOpenWater={onOpenBody ? () => onOpenBody("water") : undefined}
          onOpenMeal={onOpenBody ? () => onOpenBody("meal") : undefined}
          loadMeals={getRecentSavedMeals}
          onLogMeal={handleLogSavedMeal}
          onOpenLog={{
            ...(onOpenBody ? {
              water: () => onOpenBody("water"),
              meal: () => onOpenBody("meal"),
              sleep: () => onOpenBody("sleep"),
              weight: () => onOpenBody("weight"),
              // An urge is logged against a quit habit; without one there's nothing to log yet.
              ...(quitHabitSetUp ? { urge: () => onOpenBody("urge") } : {}),
            } : {}),
            note: openFastCapture,
            ...(onOpenTrain ? { workout: () => onOpenTrain("WORKOUT") } : {}),
          }}
        />
      </section>

      {/* OPERATE — exactly one dominant operating surface. Multiple active
          operation state is named explicitly rather than
          silently allowing JSX order to choose a winner. */}
      {day && dominant !== "NONE" && dominant !== "WORKOUT_ACTIVE" && !(dominant === "RECOMMENDATION" && (checkInIsRow || phaseRows.includes("WORKOUT_CALL"))) && (
        <h2 className="section-label section-label--field">Operate</h2>
      )}
      {day && dominant === "OPERATION_CONFLICT" && (
        <div className="card card--warning" role="alert">
          <p className="tool-label">OPERATION CONFLICT</p>
          <h2 className="card-title">Multiple foreground operations are active</h2>
          <p className="card-body">
            {[
              activeWorkout ? "WORKOUT" : null,
              activeResetId ? "RESET" : null,
              activeShiftDownId ? "SHIFT DOWN" : null,
            ].filter(Boolean).join(" and ")} are unresolved. Return to or resolve one operation before continuing with another.
          </p>
        </div>
      )}
      {day && dominant === "OPERATION_CONFLICT" && <ActiveWorkoutCard activeWorkout={activeWorkout} isDominant={false} fromEarlierDay={!!activeWorkout && activeWorkout.beyondDayId !== day.id} onOpenTrain={onOpenTrain} />}
      {day && dominant === "OPERATION_CONFLICT" && (
        <ResetCard
          prominent={false}
          isDominant={false}
          activeResetId={activeResetId}
          resetIntensity={resetIntensity}
          setResetIntensity={setResetIntensity}
          openResetStartedAt={openResetStartedAt}
          lastResetOutcome={lastResetOutcome}
          resetOpen={resetOpen}
          setResetOpen={setResetOpen}
          busy={busy}
          onStartReset={() => void handleStartReset()}
          onCompleteReset={() => void handleCompleteReset()}
          onCancelReset={() => void handleCancelReset()}
        />
      )}
      {day && dominant === "OPERATION_CONFLICT" && (
        <ShiftDownCard
          prominent={false}
          isDominant={false}
          activeShiftDownId={activeShiftDownId}
          shiftDownDuration={shiftDownDuration}
          setShiftDownDuration={setShiftDownDuration}
          openShiftDownStartedAt={openShiftDownStartedAt}
          lastShiftDownOutcome={lastShiftDownOutcome}
          shiftDownOpen={shiftDownOpen}
          setShiftDownOpen={setShiftDownOpen}
          busy={busy}
          onStartShiftDown={() => void handleStartShiftDown()}
          onCompleteShiftDown={() => void handleCompleteShiftDown()}
          onCancelShiftDown={() => void handleCancelShiftDown()}
          startButtonRef={shiftDownStartRef}
          postShiftPlan={postShiftPlan}
        />
      )}
      {day && dominant === "SHIFT_DOWN_ACTIVE" && (
        <ShiftDownCard
          prominent={shiftDownIsPrimary}
          isDominant={false}
          activeShiftDownId={activeShiftDownId}
          shiftDownDuration={shiftDownDuration}
          setShiftDownDuration={setShiftDownDuration}
          openShiftDownStartedAt={openShiftDownStartedAt}
          lastShiftDownOutcome={lastShiftDownOutcome}
          shiftDownOpen={shiftDownOpen}
          setShiftDownOpen={setShiftDownOpen}
          busy={busy}
          onStartShiftDown={() => void handleStartShiftDown()}
          onCompleteShiftDown={() => void handleCompleteShiftDown()}
          onCancelShiftDown={() => void handleCancelShiftDown()}
          startButtonRef={shiftDownStartRef}
          postShiftPlan={postShiftPlan}
        />
      )}
      {day && dominant === "RESET_ACTIVE" && (
        <ResetCard
          prominent={resetIsPrimary}
          isDominant={false}
          activeResetId={activeResetId}
          resetIntensity={resetIntensity}
          setResetIntensity={setResetIntensity}
          openResetStartedAt={openResetStartedAt}
          lastResetOutcome={lastResetOutcome}
          resetOpen={resetOpen}
          setResetOpen={setResetOpen}
          busy={busy}
          onStartReset={() => void handleStartReset()}
          onCompleteReset={() => void handleCompleteReset()}
          onCancelReset={() => void handleCancelReset()}
        />
      )}
      {day && dominant === "HYDRATION_ACTIVE" && (
        <div data-small-hydration>
        <HydrationOperationCard fullToolAvailable={hiddenFeatures.minimumDay}
          minimumDay={minimumDay}
          minimumDayHydrateOz={minimumDayHydrateOz}
          busy={busy}
          mdWaterInput={mdWaterInput}
          setMdWaterInput={setMdWaterInput}
          hydrationManualOpen={hydrationManualOpen}
          setHydrationManualOpen={setHydrationManualOpen}
          onLogWater={(amountOverride) => void handleMinimumDayLogWater(amountOverride)}
          onViewFull={() => {
            setHydrationOperationOpen(false);
            setMinimumDayOpen(true);
          }}
        />
        </div>
      )}
      {/* CLEANUP-002: the shell's own lines sit under the header, part of the screen. */}
      {(banners || !online || (shiftHandoffRefreshKey !== undefined && !phaseRows.includes("SHIFT_HANDOFF"))) && <div className="today-banners">
        {/* SUIT-001 offline signal: words always; the glitch plays once when it first appears. */}
        {!online && <Signal as="p" className="meta signal-line" role="status" data-signal="offline-line">Offline. Logging still saves on this phone.</Signal>}
        {banners}
        {shiftHandoffRefreshKey !== undefined && !phaseRows.includes("SHIFT_HANDOFF") && <ShiftHandoff refreshKey={shiftHandoffRefreshKey} />}
      </div>}

      {commitmentFeedback && (
        <p
          ref={commitmentFeedbackRef}
          role={commitmentFeedback.kind === "ERROR" ? "alert" : "status"}
          aria-live={commitmentFeedback.kind === "ERROR" ? "assertive" : "polite"}
          tabIndex={-1}
          className="meta fade-in"
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}
        >
          {commitmentFeedback.kind === "SUCCESS" && <ConfirmIcon size={20} />}
          {commitmentFeedback.kind === "ERROR" ? <Signal key={commitmentFeedback.message} data-signal="save-failed">{commitmentFeedback.message}</Signal> : commitmentFeedback.message}
        </p>
      )}

      {captureConversionFeedback && (
        <p
          role={captureConversionFeedback.kind === "ERROR" ? "alert" : "status"}
          aria-live={captureConversionFeedback.kind === "ERROR" ? "assertive" : "polite"}
          className="meta fade-in"
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}
        >
          {captureConversionFeedback.kind === "SUCCESS" && <ConfirmIcon size={20} />}
          {captureConversionFeedback.kind === "ERROR" ? <Signal key={captureConversionFeedback.message} data-signal="save-failed">{captureConversionFeedback.message}</Signal> : captureConversionFeedback.message}
        </p>
      )}

      {hydrationConfirmation !== null &&
        <ConfirmBanner message={`${hydrationConfirmation.amount} oz recorded.`} />}

      {sleepConfirmation !== null &&
        <ConfirmBanner message={`Main sleep logged · ${formatDuration(sleepConfirmation.amount)}`} />}

      {proteinConfirmation !== null &&
        <ConfirmBanner message={`${proteinConfirmation.amount} g protein recorded.`} />}

      {mealConfirmation !== null &&
        <ConfirmBanner message={mealConfirmation.message} />}

      {undoFailure && (
        <Signal key={undoFailure} as="p" className="meta meta--error" role="alert" style={{ marginTop: 8 }} data-signal="save-failed">{undoFailure}</Signal>
      )}

      {/* Time-sensitive work controls keep their existing precedence. */}
      {day && leadingPhaseRows.length > 0 && (
        <section className="shift-clock-rows" aria-label={`${describePhaseHeading(shiftClock.phase, day.workContext)} work controls`}>
          <h2 className="section-label">{describePhaseHeading(shiftClock.phase, day.workContext)}</h2>
          {leadingPhaseRows.map((row) => <div key={row} data-shift-clock-row={row}>{renderPhaseRow(row)}</div>)}
        </section>
      )}

      {fastCaptureOpen && <section id="fast-capture" className="fast-capture" aria-label="Quick Capture">
        <div className="fast-capture-header"><h2 className="section-label">Put a thought down</h2><button type="button" className="btn-secondary" disabled={busy} onClick={closeFastCapture}>DONE</button></div>
        {renderToolsItem("CAPTURE")}
        <p className="meta">Nothing is recorded until you tap CAPTURE. Unfinished input stays here while you navigate.</p>
      </section>}
      {onOpenLife && <button type="button" className="today-life-link" aria-label="Open your life" onClick={onOpenLife} disabled={busy}>
        <div><strong>YOUR LIFE</strong><span>Plans, projects, routines and people.</span></div><span aria-hidden="true">↗</span>
      </button>}
      {onOpenPlan && <button type="button" className="today-plan-link" onClick={onOpenPlan} disabled={busy}>
        <span>PLAN TODAY</span><span>Your commitments & dates →</span>
      </button>}

      {day && hiddenFeatures.smallSteps && smallSteps && <div ref={smallStepsRef}><SmallSteps minimumDayAvailable={hiddenFeatures.minimumDay} enabled={true} busy={busy} onToggle={exitSmallSteps} onOpen={openSmallTool} /></div>}

      {/* ATTENTION — earned, capped at ATTENTION_MAX, and disappears
          entirely when nothing currently qualifies (attentionPolicy.ts). */}
      {attentionPlan.attention.length > 0 && (
        <>
          <h2 className="section-label section-label--field">Attention</h2>



          {endDayInAttention && (
            <EndDayCard
              hasDay={!!day}
              suggestEndDay={suggestEndDay}
              endDayOpen={endDayOpen}
              setEndDayOpen={setEndDayOpen}
              endDayBlockedByWorkout={endDayBlockedByWorkout}
              busy={busy}
              onOpenTrain={onOpenTrain}
              onEndDay={() => void handleEndDay()}
            />
          )}

          {workEndInAttention && !workContextOpen && (
            <SignalRow label="WORK STATE">
              {/* DECLUTTER-001: the explanation sentence is cut so SHIFT DOWN
                  fits on the first phone screen; the button says what it does. */}
              <h2 className="card-title" style={{ marginBottom: 12 }}>
                {workContextPerSchedule ? WORKING_PER_SCHEDULE : "Working today"}
              </h2>
              <button className="btn-primary" disabled={busy} onClick={() => void handleMarkWorkEnded()}>
                MARK WORK ENDED
              </button>
              {/* Shift Clock (Drop 2): a per-schedule day's one-tap change lives
                  in the status strip, always visible — not repeated here. */}
              {!workContextPerSchedule && (
                <button className="btn-secondary" style={{ marginTop: 8 }} disabled={busy} onClick={() => setWorkContextOpen(true)}>
                  CHANGE WORK CONTEXT
                </button>
              )}
            </SignalRow>
          )}

          {commitmentInAttention && (
            <CommitmentsCard
              otherDueCommitments={otherDueCommitments}
              headlineCommitment={headlineCommitment}
              unresolvedObligationsCount={unresolvedObligations.length}
              commitmentsOpen={commitmentsOpen}
              setCommitmentsOpen={setCommitmentsOpen}
              headlineCommitmentMission={headlineCommitmentMission}
              commitmentConfirmation={commitmentConfirmation}
              busy={busy}
              onViewCommitments={onViewCommitments ? () => onViewCommitments(headlineCommitment?.obligation.id) : undefined}
              onRequestSatisfaction={requestCommitmentSatisfaction}
              onCancelSatisfaction={cancelCommitmentSatisfaction}
              onConfirmSatisfaction={() => void confirmCommitmentSatisfaction()}
            />
          )}

          {checkInInAttention && !checkInFormOpen && (
            <SignalRow label="CHECK-IN">
              <h2 className="card-title">Check in when you can</h2>
              <p className="card-body" style={{ marginBottom: 12 }}>
                No check-in yet today. Suggestions still work without one; a check-in just helps them fit.
              </p>
              <button className="btn-secondary" disabled={busy} onClick={() => setCheckInFormOpen(true)}>CHECK IN</button>
            </SignalRow>
          )}

          {minimumDayInAttention && dominant !== "HYDRATION_ACTIVE" && (
            <div data-small-minimum>
            {hiddenFeatures.minimumDay && <MinimumDayCard
              prominent={true}
              minimumDay={minimumDay}
              minimumDayOpen={minimumDayOpen}
              onOpenCollapsed={() => {
                if (minimumDay?.enabled && !minimumDay.hydrate && minimumDayHydrateOz > 0) {
                  setHydrationConfirmation(null);
                  setHydrationOperationOpen(true);
                } else {
                  setMinimumDayOpen(true);
                }
              }}
              minimumDayHydrateOz={minimumDayHydrateOz}
              minimumDayProteinG={minimumDayProteinG}
              mdWaterInput={mdWaterInput}
              setMdWaterInput={setMdWaterInput}
              mdProteinInput={mdProteinInput}
              setMdProteinInput={setMdProteinInput}
              busy={busy}
              onEnable={() => void handleEnableMinimumDay()}
              onMarkMinimum={(kind) => void handleMarkMinimum(kind)}
              onLogWater={() => void handleMinimumDayLogWater()}
              onLogProtein={() => void handleMinimumDayLogProtein()}
            />}
            </div>
          )}

          {/* BEYOND Suit Implementation 01: relabeled from "LAST TIME" to
              the canonical Memory grammar's "OUTCOME" (Part 12) — pure
              presentation; the underlying pendingOutcome fact, its
              attention-earning rule, and rateOutcome's own behavior are
              byte-for-byte unchanged. This is the one Memory proof
              current real data cleanly supports without inventing new
              aggregation (USUAL/PATTERN/BASELINE would all need
              rolling-average-style computation nothing in the repository
              currently derives — left out and reported, not built here). */}
          {pendingOutcomeInAttention && pendingOutcome && (
            <SignalRow label="OUTCOME">
              <p className="card-body" style={{ marginBottom: 8 }}>
                Last time, BEYOND recommended "{describePlainRecommendationTitle(pendingOutcome.kind, pendingOutcome.title)}" — how did that go?
              </p>
              <p className="meta" style={{ marginBottom: 12 }}>
                This just records your answer for later review. It won't change today's guidance.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-primary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void handleRateOutcome("GOOD")}>
                  GOOD
                </button>
                <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void handleRateOutcome("NEUTRAL")}>
                  NEUTRAL
                </button>
                <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void handleRateOutcome("BAD")}>
                  BAD
                </button>
                <button
                  className="btn-secondary"
                  style={{ width: "auto", padding: "8px 16px" }}
                  disabled={busy}
                  onClick={handleDismissOutcome}
                >
                  DISMISS
                </button>
              </div>
            </SignalRow>
          )}

          {captureInAttention && (
            <SignalRow label={`CAPTURE (${openCaptureItems.length})`}>
              {/* CLEANUP-002 (walk-through finding 4): on a day off the sweep above is the one
                  place to go through notes, so Attention points there instead of repeating them. */}
              {day?.workContext === "OFF" ? (
                <p className="meta" style={{ margin: "4px 0 0" }}>
                  {openCaptureItems.length === 1 ? "1 note waiting" : `${openCaptureItems.length} notes waiting`}. SWEEP above
                  takes them one at a time.
                </p>
              ) : openCaptureItems.map((item) => (
                <CaptureListRow
                  key={item.id}
                  item={item}
                  busy={busy}
                  captureConversion={captureConversion}
                  conversionDraft={conversionDraft}
                  setConversionDraft={setConversionDraft}
                  conversionDateSuggestion={conversionDateSuggestion}
                  onRequestConversion={requestCaptureConversion}
                  onCancelConversion={cancelCaptureConversion}
                  onConfirmConversion={() => void confirmCaptureConversion()}
                  onResolve={(item) => void handleResolveCapture(item)}
                />
              ))}
              {justResolvedCapture && (
                <ConfirmBanner
                  message={`Resolved "${justResolvedCapture.text}"`}
                  actionLabel="UNDO"
                  onAction={() => void handleUndoResolveCapture()}
                  disabled={busy}
                  divider
                />
              )}
            </SignalRow>
          )}
        </>
      )}

      {/* SHIFT CLOCK (Drop 2) — the rows this part of the shift needs, at
          most MAX_PHASE_ROWS (shiftClock.ts), then one TOOLS row holding
          every other TODAY capability. Nothing is removed: each tool is one
          tap away. Operate and Attention above are unchanged. */}
      {day && (
        <section className="shift-clock-rows" aria-label={`${describePhaseHeading(shiftClock.phase, day.workContext)} rows`}>
          {leadingPhaseRows.length === 0 && <h2 className="section-label">{describePhaseHeading(shiftClock.phase, day.workContext)}</h2>}
          {remainingPhaseRows.filter((row) => !(lateRecoverWithoutSleep && shiftDownIsRow && !activeShiftDownId && row === "MAIN_SLEEP")).map((row) => (
            <div key={row} data-shift-clock-row={row}>
              {renderPhaseRow(row)}
            </div>
          ))}
        </section>
      )}

      {/* Lifted out of TOOLS while they matter: the Engine's own recommended
          SHIFT DOWN / RESET, and a check-in form or work-context card the
          operator just opened from Attention. */}
      {liftedShiftDown && renderShiftDownTool()}
      {liftedReset && renderResetTool()}
      {liftedCheckIn && renderCheckInTool()}
      {liftedWorkContext && renderWorkContextTool()}
      {liftedAdvisory && renderToolsItem("ADVISORY")}

      <div className={`today-support${dominant !== "NONE" ? " today-support--subordinate" : ""}`}>
        {!toolsOpen ? (
          <CollapsibleRow name="TOOLS" summary={describeToolsSummary(visibleTools)} onOpen={() => { setSmallTool(null); setToolsOpen(true); }} />
        ) : (
          <section aria-label="TOOLS">
            {smallSteps && smallTool && <div className="small-steps__return"><p className="meta">One tool open. Your other tools and drafts are still available.</p><button type="button" className="btn-secondary" onClick={returnToSmallSteps}>BACK TO SMALL STEPS</button><button type="button" className="btn-secondary" onClick={() => { setSmallTool(null); window.requestAnimationFrame(() => document.getElementById("console-tools-heading")?.focus()); }}>SHOW ALL TOOLS</button></div>}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <h2 id="console-tools-heading" tabIndex={-1} className="section-label" style={{ margin: 0 }}>Tools</h2>
              {day && hiddenFeatures.smallSteps && !smallSteps && commandTools && <button ref={smallStepsEntryRef} type="button" className="chip" aria-label="USE SMALL STEPS" disabled={busy} style={{ flex: "none", padding: "8px 10px" }} onClick={() => {
                setSmallSteps(true);
                setSmallTool(null);
                window.requestAnimationFrame(() => { smallStepsRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true }); smallStepsRef.current?.scrollIntoView({ block: "start", behavior: "instant" }); });
              }}>SMALL STEPS</button>}
              <button type="button" className="chip" style={{ flex: "none", padding: "8px 14px" }} aria-label="Close TOOLS" onClick={() => { setSmallTool(null); setCommandTools(false); setToolsOpen(false); }}>
                CLOSE
              </button>
            </div>
            {visibleTools.filter((item) => !fastCaptureOpen || item !== "CAPTURE").map((item) => (
              <div key={item} data-tools-item={item} hidden={smallSteps && smallTool !== null && item !== smallTool}>
                {renderToolsItem(item)}
              </div>
            ))}
          </section>
        )}
      {/* DECLUTTER Drop 3: backup status moved to MORE → Settings. */}
      </div>
    </div>
  );
}

/** Complete existing controls, available on demand in COMMAND. */
export function DailyControls(props: Parameters<typeof TodayScreen>[0] = {}) {
  return <TodayScreen {...props} operationsOnly commandFocus={props.commandFocus ?? null} />;
}
