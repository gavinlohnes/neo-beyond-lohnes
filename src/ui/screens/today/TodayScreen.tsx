import { useEffect, useRef, useState } from "react";
import type {
  BeyondDay,
  CaptureItem,
  Recommendation,
  StateCheckIn,
  WorkContextSource,
  WorkoutSession,
} from "../../../domain/common/types";
import { ConfirmIcon, Icon } from "../../icons/Icon";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { SignalRow } from "../../components/SignalRow";
import { CommandSurface } from "../../components/CommandSurface";
import { deriveAttentionPlan, isInAttention } from "./attentionPolicy";
import { getMostRelevantUnresolvedObligation, hasObligationRequiringAttention } from "../../../engine/obligationRelevance";
import { getCurrentlyEligibleUnresolvedObligations, getMissionForObligation } from "../../../application/intentQueries";
import { getAdvisoryNotes } from "../../../application/advisoryQueries";
import { wasRecommendationMateriallyRepeated } from "../../../application/continuityQueries";
import type { AdvisoryNote } from "../../../domain/intelligence/types";
import { AdvisorySection } from "./AdvisorySection";
import { convertCaptureToObligation, satisfyObligation } from "../../../application/intentCommands";
import { formatLocalDate } from "../../../engine/scheduledContext";
import type { Mission, Obligation } from "../../../domain/intent/types";
import { isCheckInComplete, type CheckInValues, type PartialCheckInValues } from "./checkInFields";
import {
  WORKING_PER_SCHEDULE,
  describeContextStrip,
  describeStandingChange,
  resolveWorkContextSource,
} from "./workContextCopy";
import { describeCapacity, describeCapacityUnknown } from "./capacityCopy";
import { deriveCapacity } from "../../../engine/capacity";
import { dismissOutcome } from "../../../persistence/outcomeDismissals";
import { useRedCapacityOverrideGate } from "../../hooks/useRedCapacityOverrideGate";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";
import { useUndoOpen } from "../../hooks/useUndoWindow";
import type { BodyFocus } from "../../shortcuts";
import { isSeriouslyConstrained } from "./minimumDayCopy";
import { isPrimaryReset, isPrimaryShiftDown, type SessionOutcome } from "./resetShiftDownCopy";
import { ActiveWorkoutCard } from "./ActiveWorkoutCard";
import { ResetCard } from "./ResetCard";
import { ShiftDownCard } from "./ShiftDownCard";
import { EndDayCard } from "./EndDayCard";
import { CommitmentsCard } from "./CommitmentsCard";
import { CaptureListRow, CaptureToolsCard } from "./CaptureSection";
import { suggestCaptureDueDate } from "../../../engine/captureIntelligence";
import type { CaptureDateSuggestion } from "../../../domain/capture/types";
import { HydrationOperationCard, MinimumDayCard } from "./MinimumDaySection";
import { CheckInCard } from "./CheckInCard";
import { WorkContextCard } from "./WorkContextCard";
import { RecommendationCard } from "./RecommendationCard";
import {
  startDay,
  ensureActiveDay,
  submitCheckIn,
  recordRecommendation,
  declineRecommendation,
  startReset,
  completeReset,
  cancelReset,
  startShiftDown,
  completeShiftDown,
  cancelShiftDown,
  endDay,
  ActiveWorkoutBlocksDayEndError,
  rateOutcome,
  setWorkContext,
  markWorkEnded,
  captureItem,
  resolveCaptureItem,
  reopenCaptureItem,
  enableMinimumDay,
  markMedsCompleted,
  markHygieneCompleted,
  markMoveCompleted,
  markRecoverConnectCompleted,
  logWater,
  logProtein,
  logSleep,
  voidWaterLog,
  voidSleepLog,
  voidProteinLog,
} from "../../../application/commands";
import {
  getActiveDay,
  getLatestCheckIn,
  getLatestRecommendation,
  getRecommendationDecision,
  getRecommendationHandoff,
  shouldSuggestEndDay,
  getPendingOutcomeRating,
  getPriorOutcomeMemory,
  getScheduledContext,
  getMinimumDayStatus,
  getEffectiveHydrationTotal,
  getDayProteinTotalG,
  getOpenReset,
  getOpenShiftDown,
  getWorkPeriodEnded,
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
import type { ScheduledContext } from "../../../engine/scheduledContext";
import { getCurrentOperationalContext, type CurrentOperationalContext } from "../../../application/currentContextQueries";
import {
  getActiveWorkoutSession,
  getSessionMinutesEstimate,
  suggestTemplateForNextWorkout,
} from "../../../application/trainQueries";
import { getQuitHabit } from "../../../application/quitQueries";
import { getEffectiveProteinTargetG } from "../../../application/nutritionTargetQueries";
import { getCustomTemplates } from "../../../application/customTemplateQueries";
import { livedDayShiftWindow } from "../../../engine/scheduledContext";
import { suggestSessionVariant } from "../../../engine/trainSuggestion";
import type { SchedulePattern } from "../../../domain/common/types";
import { templateLabel } from "../train/trainCopy";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { deriveSleepDraft } from "../../../engine/sleepDraft";
import { checkInDraftDecision, type CheckInDraft } from "../../../engine/checkInDraft";
import { getCheckInDraft } from "../../../application/checkInDraftQueries";
import { getAppOpenedAt } from "../../appSession";
import { formatDuration } from "../body/bodyScreenCopy";
import {
  deriveShiftClockView,
  describeCountdown,
  describeFuel,
  describePlannedWorkout,
  describePhaseHeading,
  describeToolsSummary,
  isWorkEndDue,
  mainSleepEndsPostShift,
  TOOLS_ORDER,
  type ShiftClockRow,
  type ToolsItem,
} from "./shiftClock";
import { describeError } from "../../errorMessage";

/** UNDO-001: what a TODAY log banner needs to undo the entry it confirms. */
type LoggedEntry = { amount: number; eventId: string; dayId: string };

/**
 * Quick check-in default ("all good" one-tap, Context & Safety Decisions
 * 2026-08-19). Still produces a real StateCheckIn the Engine evaluates —
 * these values feed the locked capacity rule directly, so they were
 * chosen to land comfortably GREEN as "a genuinely fine day," not the
 * most extreme possible values. Confirmed with Gavin 2026-08-19.
 */
export const quickCheckInValues: CheckInValues = {
  energy: 4,
  stress: 2,
  mood: 4,
  soreness: 1,
  alcoholUrge: 0,
};

/**
 * Intent & Commitment Spine — Drop 02: onViewCommitments is optional and
 * unused unless a caller wires it up — App.tsx passes a callback that
 * switches to the MORE tab. TodayScreen itself has no navigation
 * mechanism of its own (see CommitmentsCard.tsx's doc comment on why
 * VIEW stops at "switch tabs" rather than deep-linking to the specific
 * Obligation).
 */
/** Bounds for nudging a sleep draft: 15 min to 16 h. */
const SLEEP_DRAFT_ADJUST_MIN = 15;
const SLEEP_DRAFT_ADJUST_MAX = 16 * 60;
const SLEEP_DRAFT_DISMISSED_KEY = "beyond:sleepDraftDismissedDay";

/** NOT NOW is remembered on this phone only (localStorage); unavailable storage simply means it isn't remembered. */
function readSleepDraftDismissal(): string | null {
  try {
    return localStorage.getItem(SLEEP_DRAFT_DISMISSED_KEY);
  } catch {
    return null;
  }
}

function writeSleepDraftDismissal(dayId: string): void {
  try {
    localStorage.setItem(SLEEP_DRAFT_DISMISSED_KEY, dayId);
  } catch {
    // Not remembered — the draft simply returns next time.
  }
}

export function TodayScreen({
  onViewCommitments,
  onOpenTrain,
  onOpenBody,
  openToolsOnMount = false,
}: {
  onViewCommitments?: () => void;
  onOpenTrain?: (destination: "RECOVERY" | "WORKOUT") => void;
  onOpenBody?: (target?: BodyFocus) => void;
  /** Drop 2: open with TOOLS expanded (MORE's capture link lands in it). */
  openToolsOnMount?: boolean;
} = {}) {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [checkIn, setCheckIn] = useState<StateCheckIn | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [decision, setDecision] = useState<RecommendationDecision | undefined>(undefined);
  const [recommendationHandoff, setRecommendationHandoff] = useState<RecommendationHandoffTarget | null>(null);
  const [priorOutcomeMemory, setPriorOutcomeMemory] = useState<PriorOutcomeMemory | null>(null);
  const [materiallyRepeated, setMateriallyRepeated] = useState(false);
  const [values, setValues] = useState<PartialCheckInValues>({});
  // Drop 5: the check-in draft (the operator's previous answers), and whether they chose START BLANK.
  const [checkInDraft, setCheckInDraft] = useState<CheckInDraft | undefined>(undefined);
  const [checkInDraftDismissed, setCheckInDraftDismissed] = useState(false);
  const activeCheckInDraft = checkInDraft && !checkInDraftDismissed ? checkInDraft : undefined;
  // What the form shows and submits: taps win over the draft.
  const checkInFormValues: PartialCheckInValues = activeCheckInDraft ? { ...activeCheckInDraft.value, ...values } : values;
  const [busy, setBusy] = useState(false);
  // TODAY-009 (residual TODAY-R02, flagged in TODAY-006): `busy` is React
  // state, so setBusy(true) doesn't take effect (and re-render the
  // disabled buttons that normally prevent this) until the next render —
  // a theoretical, not human-triggerable, sub-frame gap where a handler
  // could be invoked twice before that render lands, since both
  // invocations would still read the stale `busy === false` closure
  // value. busyRef mirrors `busy` but updates synchronously, so the
  // guard check at the top of every handler below is genuinely race-free
  // regardless of render timing. `busy` state itself is unchanged and
  // still drives all UI disabling — this only closes the guard's own gap.
  const busyRef = useRef(false);
  // LAUNCH-VISION-003 (2026-09-15, direct owner ruling): fires the
  // power-on sweep exactly once per START DAY — "the one real power-on
  // moment in the whole app," never replayed by a later refresh() or
  // remount within the same START DAY, since nothing ever resets this
  // back to false. Same one-shot-on-mount convention as .fade-in/
  // .set-earned elsewhere in this codebase.
  const [justStartedDay, setJustStartedDay] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [activeResetId, setActiveResetId] = useState<string | null>(null);
  const [resetIntensity, setResetIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [openResetStartedAt, setOpenResetStartedAt] = useState<string | null>(null);
  const [lastResetOutcome, setLastResetOutcome] = useState<SessionOutcome | null>(null);
  const [activeShiftDownId, setActiveShiftDownId] = useState<string | null>(null);
  const [shiftDownDuration, setShiftDownDuration] = useState(10);
  const [openShiftDownStartedAt, setOpenShiftDownStartedAt] = useState<string | null>(null);
  const [lastShiftDownOutcome, setLastShiftDownOutcome] = useState<SessionOutcome | null>(null);
  const [suggestEndDay, setSuggestEndDay] = useState(false);
  const [endDayBlockedByWorkout, setEndDayBlockedByWorkout] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<Recommendation | null>(null);
  const [scheduledContext, setScheduledContext] = useState<ScheduledContext | null>(null);
  const [workPeriodEndedAt, setWorkPeriodEndedAt] = useState<string | null>(null);
  // DROP 0: where the day's work context came from — "per schedule" only while the saved schedule's value stands.
  const [workContextSource, setWorkContextSource] = useState<WorkContextSource | undefined>(undefined);
  const [unresolvedPostShift, setUnresolvedPostShift] = useState(false);
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
  const [openCaptureItems, setOpenCaptureItems] = useState<CaptureItem[]>([]);
  const [advisoryNotes, setAdvisoryNotes] = useState<AdvisoryNote[]>([]);
  const [captureText, setCaptureText] = useState("");
  // Overdrive Phase 17 (Capture 1.1): reopenCaptureItem already existed
  // (application/commands.ts) and was already tested
  // (captureInbox.test.ts, "reopening undoes an accidental resolve") but
  // had no UI wired to it — an accidental RESOLVE tap had no way back.
  // Tracks only the single most-recently-resolved item, mirroring how
  // BODY's own confirmation-with-undo banners work (each new one simply
  // replaces the last) — not a resolved-items history browser, which
  // would start pulling Capture toward task management.
  const [justResolvedCapture, setJustResolvedCapture] = useState<{ id: string; text: string } | null>(null);
  // Capture Processing, Slice 3: the inline "-> OBLIGATION" confirm panel
  // for a specific capture row (id null when closed), the editable title
  // (pre-filled from the capture's own text, never auto-submitted), and a
  // one-line result — same non-undoable SUCCESS/ERROR shape as
  // commitmentFeedback below, since undoing would mean deleting an
  // Obligation, which Drop 01 doctrine has no operation for.
  const [captureConversion, setCaptureConversion] = useState<{ id: string; text: string } | null>(null);
  const [conversionTitle, setConversionTitle] = useState("");
  // Capture Intelligence layer (2026-09-02): a chrono-node/Compromise-derived
  // due-date proposal (see engine/captureIntelligence.ts), pre-filled into
  // this same editable field the moment the conversion panel opens — never
  // applied on its own. conversionDateSuggestion is kept only to show the
  // evidence line ("Detected from ..."); conversionDueAt is the actual,
  // freely editable/clearable form value that gets submitted.
  const [conversionDueAt, setConversionDueAt] = useState("");
  const [conversionDateSuggestion, setConversionDateSuggestion] = useState<CaptureDateSuggestion | null>(null);
  const [captureConversionFeedback, setCaptureConversionFeedback] = useState<{ kind: "SUCCESS" | "ERROR"; message: string } | null>(null);
  const [minimumDay, setMinimumDay] = useState<MinimumDayStatus | null>(null);
  const [minimumDayHydrateOz, setMinimumDayHydrateOz] = useState(0);
  const [minimumDayProteinG, setMinimumDayProteinG] = useState(0);
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
  // UNDO-001: a just-logged entry, UNDO for its first UNDO_WINDOW_MS, then CORRECT IN BODY.
  const [hydrationConfirmation, setHydrationConfirmation] = useState<LoggedEntry | null>(null);
  const [proteinConfirmation, setProteinConfirmation] = useState<LoggedEntry | null>(null);
  const hydrationUndoOpen = useUndoOpen(hydrationConfirmation);
  const proteinUndoOpen = useUndoOpen(proteinConfirmation);
  const [undoFailure, setUndoFailure] = useState<string | null>(null);
  // Intent & Commitment Spine, Drop 02: currently-eligible unresolved
  // Obligations, fetched unconditionally like openCaptureItems above —
  // Obligations are not day-scoped either (see application/intentQueries.ts).
  // Intent Lifecycle Integrity (2026-08-23): sourced from
  // getCurrentlyEligibleUnresolvedObligations, not getUnresolvedObligations
  // directly — an Obligation whose parent Mission is ARCHIVED must not
  // participate in COMMITMENT/ATTENTION (see docs/UX_DECISIONS.md).
  const [unresolvedObligations, setUnresolvedObligations] = useState<Obligation[]>([]);
  const [headlineCommitmentMission, setHeadlineCommitmentMission] = useState<{
    obligationId: string;
    mission: Mission;
  } | null>(null);
  const [commitmentsOpen, setCommitmentsOpen] = useState(false);
  const [commitmentConfirmation, setCommitmentConfirmation] = useState<{ id: string; title: string } | null>(null);
  const [commitmentFeedback, setCommitmentFeedback] = useState<{ kind: "SUCCESS" | "ERROR"; message: string } | null>(null);
  const commitmentFeedbackRef = useRef<HTMLParagraphElement>(null);
  const commitmentSatisfactionPendingRef = useRef(false);
  const shiftDownStartRef = useRef<HTMLButtonElement>(null);
  // Drop 6: the quit tracker's post-shift plan, shown inside SHIFT DOWN.
  const [postShiftPlan, setPostShiftPlan] = useState<string | undefined>(undefined);
  const { guard, ConfirmPanel } = useRedCapacityOverrideGate();

  // ---- SHIFT CLOCK (Drop 2) ----
  // The clock the phase and countdowns are read against; ticks every 30 s so
  // the strip and the phase change on their own at 18:00 and 06:00.
  const [now, setNow] = useState(() => new Date());
  const [schedulePattern, setSchedulePattern] = useState<SchedulePattern | null>(null);
  // Recorded times of this day's main-sleep logs (see mainSleepEndsPostShift).
  const [mainSleepRecordedAt, setMainSleepRecordedAt] = useState<string[]>([]);
  const [proteinTargetG, setProteinTargetG] = useState<number | undefined>(undefined);
  // The next workout TRAIN would suggest, with Time-Fit estimates per variant.
  const [nextWorkout, setNextWorkout] = useState<{
    label: string;
    minutes: Partial<Record<"STANDARD" | "REDUCED", number>>;
  } | null>(null);
  const [quitHabitSetUp, setQuitHabitSetUp] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(openToolsOnMount);

  // ---- SLEEP DRAFT (2026-10-03) ----
  const [sleepDraftEvidence, setSleepDraftEvidence] = useState<Awaited<ReturnType<typeof getSleepDraftEvidence>> | null>(null);
  // ±15-minute nudges applied to the draft before logging it.
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
    void refresh();
    void getScheduledContext().then(setScheduledContext);
    void loadShiftClockSetup();
    // Best-effort: a missing plan just means SHIFT DOWN shows none.
    void getQuitHabit()
      .then((habit) => {
        setPostShiftPlan(habit?.postShiftPlan);
        setQuitHabitSetUp(habit !== undefined);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  // Coming back to the foreground: re-read, so a screen left open overnight
  // sees this morning's Shift Down and its sleep draft (2026-10-03).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      setNow(new Date());
      void refresh().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  /**
   * Shift Clock's slower-changing inputs: the saved schedule and the next
   * workout with its Time-Fit estimates. Read on mount and after a rollover,
   * not on every refresh. Best-effort — a failed read just leaves a row
   * without its duration or countdown.
   */
  async function loadShiftClockSetup() {
    try {
      setSchedulePattern(await getSchedulePattern());
      const [templateId, customTemplates] = await Promise.all([suggestTemplateForNextWorkout(), getCustomTemplates()]);
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
    let activeDay: BeyondDay | null;
    let activeWorkoutSession: WorkoutSession | null;
    try {
      [activeDay, activeWorkoutSession] = await Promise.all([
        getActiveDay().then((result) => result ?? null),
        getActiveWorkoutSession().then((result) => result ?? null),
      ]);
    } catch (err) {
      // A superseded refresh's failed read must vanish silently — it may
      // never regress `day`, and it must never surface as an unhandled
      // rejection. A still-current refresh's failure is unchanged from
      // prior behavior (out of this correction's scope) and is rethrown.
      if (!mountedRef.current || myRequestId !== refreshRequestIdRef.current) return;
      throw err;
    }
    // Ownership decided HERE, immediately after the read above resolves —
    // same timing as before this fix — and reused as-is below rather than
    // re-derived after the many further awaits this function makes. A
    // refresh that owns the render at this instant must apply everything
    // it composes even if a newer refresh starts partway through; deciding
    // ownership again later, after those further awaits, could reach a
    // different (stricter) answer than this one and silently drop an
    // update this refresh was always entitled to make.
    const isOwner = mountedRef.current && myRequestId === refreshRequestIdRef.current;
    // CI-timing-flake fix (2026-09-02): every read this function needs —
    // starting with `activeDay`/`activeWorkoutSession` above, through every
    // read below — is gathered into a local BEFORE any of it is committed
    // via setState. Every setter for all of it then fires together at the
    // very end, in one synchronous run with no `await` between them, so
    // React batches the whole thing into a single render.
    //
    // The previous shape here was a long run of individual
    // `await X(); setY(...)` pairs (plus one early, separately-committed
    // `setDay`/`setActiveWorkout` block), each committing its own render.
    // A test polling for one early piece of this state (e.g. the "Orient"
    // heading, gated on `day`, or the Attention section, gated on
    // `unresolvedObligations`/`pendingOutcome`) could observe a DOM
    // snapshot where that one piece had landed but a later piece in the
    // same chain (e.g. `checkIn`, which drives the STATUS strip's capacity
    // modifier) had not — a real, reproducible CI-only race (never
    // reproduced locally) since it depends on exactly how the scheduler
    // interleaves each render commit with the polling test's own retries.
    // A prior fix ("Fix CI-only timing flake in AdvisoryNotes refresh()
    // ordering") narrowly reordered one field to dodge one instance of
    // this; two different fields in the same chain hit the identical race
    // days later (PR #67's CI), which is exactly the whack-a-mole outcome
    // a per-field reorder was always going to produce. Batching the whole
    // function removes the gap instead of relocating it.
    //
    // The one deliberate exception is `currentContext`: its fetch is
    // kicked off here (so its latency overlaps with everything else this
    // function awaits below) but its *result* is still consumed via its
    // own request-id-guarded `.then()/.catch()`, landing whenever it
    // resolves — unchanged from before, and still correct, since nothing
    // in this component treats `currentContext` as available synchronously
    // with `day`; every consumer already falls back to
    // `day`/`scheduledContext`/`unresolvedPostShift` while it's in flight.
    const contextPromise = isOwner
      ? getCurrentOperationalContext(activeDay ? { id: activeDay.id, workContext: activeDay.workContext } : null)
      : null;

    // Overdrive Phase 10: capture is deliberately not day-scoped ("inbox
    // age is not urgency," and jotting something down shouldn't require a
    // BeyondDay to already exist), so this refreshes unconditionally.
    const openCaptureItems = await getOpenCaptureItems();
    // Intent & Commitment Spine, Drop 02: same reasoning — Obligations are
    // not day-scoped either.
    const obligations = await getCurrentlyEligibleUnresolvedObligations();
    const headline = getMostRelevantUnresolvedObligation(obligations, formatLocalDate(new Date()));
    const mission = headline ? await getMissionForObligation(headline.obligation) : undefined;
    const headlineCommitmentMission = headline && mission ? { obligationId: headline.obligation.id, mission } : null;

    let checkIn: StateCheckIn | null = null;
    let rec: Recommendation | null = null;
    let decision: RecommendationDecision | undefined;
    let recommendationHandoff: RecommendationHandoffTarget | null = null;
    let priorOutcomeMemory: PriorOutcomeMemory | null = null;
    let materiallyRepeated = false;
    let suggestEndDay = false;
    let pendingOutcome: Awaited<ReturnType<typeof getPendingOutcomeRating>> | null = null;
    let minimumDay: MinimumDayStatus | null = null;
    let minimumDayHydrateOz = 0;
    let minimumDayProteinG = 0;
    let openReset: Awaited<ReturnType<typeof getOpenReset>> | undefined;
    let openShiftDown: Awaited<ReturnType<typeof getOpenShiftDown>> | undefined;
    let workPeriodEndedAt: string | null = null;
    let unresolvedPostShift = false;
    let workContextSource: WorkContextSource | undefined;
    let mainSleepTimes: string[] = [];
    let draftEvidence: Awaited<ReturnType<typeof getSleepDraftEvidence>> | null = null;
    // Drop 5: the check-in draft reads the operator's latest check-in on any day.
    const nextCheckInDraft = await getCheckInDraft();

    if (activeDay) {
      checkIn = (await getLatestCheckIn(activeDay.id)) ?? null;
      rec = (await getLatestRecommendation(activeDay.id)) ?? null;
      decision = rec ? await getRecommendationDecision(activeDay.id, rec.id) : undefined;
      recommendationHandoff = rec ? (await getRecommendationHandoff(rec)) ?? null : null;
      priorOutcomeMemory = rec ? (await getPriorOutcomeMemory(rec)) ?? null : null;
      materiallyRepeated = rec ? await wasRecommendationMateriallyRepeated(rec) : false;
      suggestEndDay = await shouldSuggestEndDay(activeDay.id);
      pendingOutcome = rec ? (await getPendingOutcomeRating(rec)) ?? null : null;
      minimumDay = await getMinimumDayStatus(activeDay.id);
      minimumDayHydrateOz = await getEffectiveHydrationTotal(activeDay.id);
      // DROP 1.5: the one shared day total (protein-only logs + meals), same as BODY and Nutrition Targets.
      minimumDayProteinG = await getDayProteinTotalG(activeDay.id);
      openReset = await getOpenReset(activeDay.id);
      openShiftDown = await getOpenShiftDown(activeDay.id);
      const workPeriodEnded = await getWorkPeriodEnded(activeDay.id);
      workPeriodEndedAt = workPeriodEnded ? workPeriodEnded.occurredAt : null;
      unresolvedPostShift = await hasUnresolvedPostShift(activeDay.id);
      workContextSource = await getWorkContextSource(activeDay.id);
      mainSleepTimes = (await getSleepEntries(activeDay.id)).filter((e) => e.kind === "PRIMARY").map((e) => e.recordedAt);
      draftEvidence = await getSleepDraftEvidence(activeDay.id, getAppOpenedAt());
    }
    // Intelligence Spine consumption (2026-09-02): advisory notes are pure
    // SUPPORT-tier background context with no ordering dependency on
    // anything else refresh() loads — gathered here alongside everything
    // above rather than separately, now that everything commits together
    // anyway.
    const advisoryNotes = await getAdvisoryNotes();
    const effectiveProteinTarget = await getEffectiveProteinTargetG();

    // Everything on the active-day/context path is gated on this single
    // ownership check: a refresh superseded by the time its getActiveDay()
    // resolves must not install `day`, and must not let its own composed
    // state become authoritative.
    if (isOwner) {
      const newDayId = activeDay ? activeDay.id : null;
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
      setDay(activeDay);
      setActiveWorkout(activeWorkoutSession);
    }
    setOpenCaptureItems(openCaptureItems);
    setUnresolvedObligations(obligations);
    setHeadlineCommitmentMission(headlineCommitmentMission);
    if (activeDay) {
      setCheckIn(checkIn);
      setRecommendation(rec);
      setDecision(decision);
      setRecommendationHandoff(recommendationHandoff);
      setPriorOutcomeMemory(priorOutcomeMemory);
      setMateriallyRepeated(materiallyRepeated);
      setSuggestEndDay(suggestEndDay);
      setPendingOutcome(pendingOutcome);
      setMinimumDay(minimumDay);
      setMinimumDayHydrateOz(minimumDayHydrateOz);
      setMinimumDayProteinG(minimumDayProteinG);
      if (openReset) {
        setActiveResetId(openReset.eventId);
        setResetIntensity(openReset.intensity);
        setOpenResetStartedAt(openReset.startedAt);
      } else {
        setActiveResetId(null);
        setOpenResetStartedAt(null);
      }
      if (openShiftDown) {
        setActiveShiftDownId(openShiftDown.eventId);
        setShiftDownDuration(openShiftDown.durationMinutes);
        setOpenShiftDownStartedAt(openShiftDown.startedAt);
      } else {
        setActiveShiftDownId(null);
        setOpenShiftDownStartedAt(null);
      }
      setWorkPeriodEndedAt(workPeriodEndedAt);
      setUnresolvedPostShift(unresolvedPostShift);
      setWorkContextSource(workContextSource);
      setMainSleepRecordedAt(mainSleepTimes);
      setSleepDraftEvidence(draftEvidence);
      setCheckInDraft(nextCheckInDraft);
    } else {
      setRecommendation(null);
      setDecision(undefined);
      setRecommendationHandoff(null);
    }
    setAdvisoryNotes(advisoryNotes);
    setProteinTargetG(effectiveProteinTarget);

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

  function handleRecommendationHandoff(target: RecommendationHandoffTarget) {
    if (target === "SHIFT_DOWN") {
      setShiftDownOpen(true);
      // SHIFT DOWN may be behind TOOLS in this part of the shift (Drop 2).
      if (!shiftDownIsRow && !liftedShiftDown) setToolsOpen(true);
      requestAnimationFrame(() => {
        shiftDownStartRef.current?.scrollIntoView({ block: "center" });
        shiftDownStartRef.current?.focus();
      });
      return;
    }
    onOpenTrain?.(target);
  }

  async function handleStartDay() {
    if (busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await startDay();
      // TODAY-008 (residual TODAY-R01, flagged in TODAY-006): every other
      // mutating handler in this component calls refresh() afterward so
      // everything derived from the active day (checkIn, recommendation,
      // currentContext, advisoryNotes, obligations, etc.) stays in sync
      // without a reload — this one skipped it and only set `day` itself,
      // letting the prior day's now-stale derived state bleed into the
      // newly started day's render until something else happened to
      // trigger a refresh. refresh() re-derives `day` itself via its own
      // getActiveDay() read, so the separate setDay() call above is gone.
      await refresh();
      setJustStartedDay(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCheckIn() {
    const submitted = checkInFormValues;
    if (busy || busyRef.current || !isCheckInComplete(submitted)) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      // Drop 5: never auto-confirmed — this runs only on the operator's tap, and records how the draft was decided.
      await submitCheckIn(
        activeDay.id,
        submitted,
        activeCheckInDraft ? checkInDraftDecision(activeCheckInDraft.value, submitted) : undefined,
      );
      setCheckInDraftDismissed(false);
      // Refetch everything derived from the new recommendation — not just
      // checkIn/recommendation — so pendingOutcome (CP10) and any other
      // derived state stay in sync without requiring a page reload.
      await refresh();
      // Empty must look empty (Phase 2): a just-submitted check-in is
      // already reflected by "last recorded" below, not by the fields
      // still showing the values as if pending. Reset so a returning user
      // never mistakes leftover selections for a new, unsubmitted check-in.
      setValues({});
      // P3: collapse back to the compact summary — the form having just
      // been submitted is exactly the moment it should stop dominating
      // the screen.
      setCheckInFormOpen(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleQuickCheckIn() {
    if (busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await submitCheckIn(activeDay.id, quickCheckInValues);
      await refresh();
      setValues({});
      setCheckInFormOpen(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleRecord() {
    if (busy || busyRef.current || !day || !recommendation) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await recordRecommendation(day.id, recommendation);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function actuallyDecline() {
    if (!day || !recommendation) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await declineRecommendation(day.id, recommendation, { overrideConfirmed: true });
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  /**
   * A STABILIZE recommendation only ever exists because capacity was RED
   * (engine/evaluate.ts's only path to that kind) — declining it is always
   * an override of RED-tier guidance, so it goes through the same shared
   * confirm-every-time mechanism TRAIN uses (useRedCapacityOverrideGate).
   * RECOVER/EXECUTE_PLANNED_WORK never pair with RED and skip straight to
   * actuallyDecline, matching how TRAIN's REDUCED/RECOVERY variants skip
   * the same gate for startWorkout.
   */
  function handleDecline() {
    if (busy || busyRef.current || !day || !recommendation) return;
    if (recommendation.kind === "STABILIZE") {
      guard("RED", () => actuallyDecline());
    } else {
      void actuallyDecline();
    }
  }

  async function handleStartReset() {
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await startReset(day.id, resetIntensity);
      setLastResetOutcome(null);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCompleteReset() {
    if (busy || busyRef.current || !day || !activeResetId) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await completeReset(day.id, activeResetId);
      setLastResetOutcome("COMPLETED");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  /** Distinct from completing — "started this but didn't go through with it," never recorded as done. */
  async function handleCancelReset() {
    if (busy || busyRef.current || !day || !activeResetId) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await cancelReset(day.id, activeResetId);
      setLastResetOutcome("CANCELLED");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleStartShiftDown() {
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await startShiftDown(day.id, shiftDownDuration);
      setLastShiftDownOutcome(null);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCompleteShiftDown() {
    if (busy || busyRef.current || !day || !activeShiftDownId) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await completeShiftDown(day.id, activeShiftDownId);
      setLastShiftDownOutcome("COMPLETED");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCancelShiftDown() {
    if (busy || busyRef.current || !day || !activeShiftDownId) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await cancelShiftDown(day.id, activeShiftDownId);
      setLastShiftDownOutcome("CANCELLED");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleEndDay() {
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await endDay(day.id, "EXPLICIT_END_DAY");
      setEndDayBlockedByWorkout(false);
      await refresh();
    } catch (error) {
      if (error instanceof ActiveWorkoutBlocksDayEndError) {
        setEndDayBlockedByWorkout(true);
        setEndDayOpen(true);
        return;
      }
      throw error;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleSetWorkContext(value: "WORK" | "OFF") {
    if (busy || busyRef.current || !day || !scheduledContext) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const source = resolveWorkContextSource(scheduledContext.todayIsScheduledWorkDay, value);
      await setWorkContext(day.id, value, source);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // DROP 0: one tap flips the saved schedule's value for this day. Always a
  // MANUAL declaration, so it wins for the rest of the day and shows in History.
  async function handleChangeStandingWorkContext() {
    if (busy || busyRef.current || !day || day.workContext === "UNKNOWN") return;
    busyRef.current = true;
    setBusy(true);
    try {
      await setWorkContext(day.id, day.workContext === "WORK" ? "OFF" : "WORK", "MANUAL");
      setWorkContextOpen(false);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // SLEEP DRAFT: one tap logs the (possibly nudged) draft as main sleep,
  // recording whether it was confirmed as proposed or adjusted first.
  async function handleLogSleepDraft(minutes: number, adjusted: boolean) {
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const eventId = await logSleep(day.id, minutes, "PRIMARY", adjusted ? "ADJUSTED" : "CONFIRMED");
      setSleepDraftAdjust(0);
      await refresh();
      setSleepConfirmation({ amount: minutes, eventId, dayId: day.id });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function dismissSleepDraft() {
    if (!day) return;
    setSleepDraftDismissedDayId(day.id);
    writeSleepDraftDismissal(day.id);
  }

  async function handleMarkWorkEnded() {
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await markWorkEnded(day.id);
      setWorkContextOpen(false);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCapture() {
    if (busy || busyRef.current || !captureText.trim()) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await captureItem(captureText);
      setCaptureText("");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleResolveCapture(item: CaptureItem) {
    if (busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await resolveCaptureItem(item.id);
      setJustResolvedCapture({ id: item.id, text: item.text });
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function requestCommitmentSatisfaction(obligation: Obligation) {
    if (busy || busyRef.current) return;
    setCommitmentFeedback(null);
    setCommitmentConfirmation({ id: obligation.id, title: obligation.title });
  }

  function cancelCommitmentSatisfaction() {
    if (busy || busyRef.current) return;
    setCommitmentConfirmation(null);
    setCommitmentFeedback(null);
  }

  async function confirmCommitmentSatisfaction() {
    if (busy || busyRef.current || commitmentSatisfactionPendingRef.current || !commitmentConfirmation) return;
    const target = commitmentConfirmation;
    commitmentSatisfactionPendingRef.current = true;
    busyRef.current = true;
    setBusy(true);
    setCommitmentFeedback(null);
    try {
      await satisfyObligation(target.id);
      setCommitmentConfirmation(null);
      setCommitmentsOpen(false);
      await refresh();
      setCommitmentFeedback({ kind: "SUCCESS", message: `Commitment satisfied: ${target.title}.` });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      const stale = detail.startsWith("OBLIGATION_NOT_FOUND");
      if (stale) {
        setCommitmentConfirmation(null);
        setCommitmentsOpen(false);
        await refresh();
      }
      setCommitmentFeedback({
        kind: "ERROR",
        message: stale
          ? `Could not satisfy ${target.title}: the commitment no longer exists. TODAY has been refreshed.`
          : `Could not satisfy ${target.title}: ${describeError(error, "something went wrong.")}`,
      });
    } finally {
      commitmentSatisfactionPendingRef.current = false;
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleUndoResolveCapture() {
    if (busy || busyRef.current || !justResolvedCapture) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await reopenCaptureItem(justResolvedCapture.id);
      setJustResolvedCapture(null);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function requestCaptureConversion(item: CaptureItem) {
    if (busy || busyRef.current) return;
    setCaptureConversionFeedback(null);
    setConversionTitle(item.text);
    const suggestion = suggestCaptureDueDate(item.text, new Date());
    setConversionDateSuggestion(suggestion);
    setConversionDueAt(suggestion?.dueAt ?? "");
    setCaptureConversion({ id: item.id, text: item.text });
  }

  function cancelCaptureConversion() {
    if (busy || busyRef.current) return;
    setCaptureConversion(null);
    setConversionDueAt("");
    setConversionDateSuggestion(null);
  }

  async function confirmCaptureConversion() {
    if (busy || busyRef.current || !captureConversion || !conversionTitle.trim()) return;
    const target = captureConversion;
    const title = conversionTitle.trim();
    const dueAt = conversionDueAt.trim();
    busyRef.current = true;
    setBusy(true);
    setCaptureConversionFeedback(null);
    try {
      await convertCaptureToObligation(target.id, { title, ...(dueAt ? { dueAt } : {}) });
      setCaptureConversion(null);
      setConversionDueAt("");
      setConversionDateSuggestion(null);
      await refresh();
      setCaptureConversionFeedback({ kind: "SUCCESS", message: `Obligation created: ${title}` });
    } catch (error) {
      setCaptureConversionFeedback({
        kind: "ERROR",
        message: describeError(error, "Could not create the obligation."),
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleEnableMinimumDay() {
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await enableMinimumDay(day.id);
      await refresh();
      setMinimumDayOpen(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleMarkMinimum(kind: "MEDS" | "HYGIENE" | "MOVE" | "RECOVER" | "CONNECT") {
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (kind === "MEDS") await markMedsCompleted(day.id);
      else if (kind === "HYGIENE") await markHygieneCompleted(day.id);
      else if (kind === "MOVE") await markMoveCompleted(day.id);
      else await markRecoverConnectCompleted(day.id, kind);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  /** UNDO-001: UNDO on a just-logged banner voids that entry — never an erase. */
  async function handleUndoLog(log: "WATER" | "SLEEP" | "PROTEIN") {
    const confirmation = { WATER: hydrationConfirmation, SLEEP: sleepConfirmation, PROTEIN: proteinConfirmation }[log];
    if (busy || busyRef.current || !confirmation) return;
    const voidLog = { WATER: voidWaterLog, SLEEP: voidSleepLog, PROTEIN: voidProteinLog }[log];
    const clear = { WATER: setHydrationConfirmation, SLEEP: setSleepConfirmation, PROTEIN: setProteinConfirmation }[log];
    busyRef.current = true;
    setBusy(true);
    setUndoFailure(null);
    try {
      await voidLog(confirmation.dayId, confirmation.eventId);
      clear(null);
      await refresh();
    } catch (e) {
      setUndoFailure(describeError(e, "Could not undo."));
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function renderLoggedBanner(message: string, undoOpen: boolean, log: "WATER" | "SLEEP" | "PROTEIN", focus?: BodyFocus) {
    if (undoOpen) {
      return <ConfirmBanner message={message} actionLabel="UNDO" disabled={busy} onAction={() => void handleUndoLog(log)} />;
    }
    return onOpenBody ? (
      <ConfirmBanner message={message} actionLabel="CORRECT IN BODY" onAction={() => onOpenBody(focus)} />
    ) : (
      <p role="status" aria-live="polite" className="meta fade-in">
        <ConfirmIcon size={20} /> {message.replace(/\.$/, "")}. Corrections remain available in BODY.
      </p>
    );
  }

  /**
   * Item 3 (Phase 3): logs directly from the same commands/events BODY
   * uses (logWater/logProtein) — no separate record-keeping path, so
   * there's no way for this to create a duplicate of a BODY-side log.
   */
  async function handleMinimumDayLogWater(amountOverride?: number) {
    if (busy || busyRef.current) return;
    const amount = amountOverride ?? Number(mdWaterInput);
    if (!Number.isFinite(amount) || amount <= 0) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logWater(activeDay.id, amount);
      setMdWaterInput("");
      await refresh();
      setHydrationConfirmation({ amount, eventId, dayId: activeDay.id });
      setHydrationOperationOpen(false);
      setHydrationManualOpen(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleMinimumDayLogProtein() {
    if (busy || busyRef.current) return;
    const grams = Number(mdProteinInput);
    if (!Number.isFinite(grams) || grams <= 0) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logProtein(activeDay.id, grams);
      setMdProteinInput("");
      await refresh();
      setProteinConfirmation({ amount: grams, eventId, dayId: activeDay.id });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleRateOutcome(rating: "GOOD" | "NEUTRAL" | "BAD") {
    if (busy || busyRef.current || !pendingOutcome) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await rateOutcome(pendingOutcome.beyondDayId, pendingOutcome.id, rating);
      setPendingOutcome(null);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function handleDismissOutcome() {
    if (!pendingOutcome) return;
    dismissOutcome(pendingOutcome.id);
    setPendingOutcome(null);
  }

  const capacityResult = checkIn ? deriveCapacity(checkIn) : null;
  // Item 1 (Phase 3): RED or multi-factor YELLOW offers Minimum Day
  // prominently, but only while it isn't already enabled — once it's on,
  // there's nothing left to "offer."
  const seriouslyConstrained = capacityResult
    ? isSeriouslyConstrained(capacityResult.capacity, capacityResult.reasonCodes.length)
    : false;
  const showProminentMinimumDay = seriouslyConstrained && !!minimumDay && !minimumDay.enabled;

  // Item 6 (Phase 4): when a tool IS the actual Engine recommendation
  // (Recommendation.suggestedCommand), it shouldn't read as an "override"
  // of that recommendation — it IS the recommendation. shiftDownIsPrimary
  // is reachable today (STABILIZE -> START_SHIFT_DOWN); resetIsPrimary is
  // always false under the current locked engine (no recommendation kind
  // has a START_RESET suggestedCommand) — see resetShiftDownCopy.ts.
  const shiftDownIsPrimary = isPrimaryShiftDown(recommendation);
  const resetIsPrimary = isPrimaryReset(recommendation);

  // Intent & Commitment Spine, Drop 02: the single most relevant
  // unresolved Obligation, and whether it's genuinely due/overdue/
  // planned-today enough to earn TODAY's scarce ATTENTION slot — see
  // engine/obligationRelevance.ts for the locked temporal rule. `today`
  // is computed once per render from the real clock (formatLocalDate),
  // never cached — the same reasoning getScheduledContext()'s default
  // `now` parameter already uses.
  const todayLocalDate = formatLocalDate(new Date());
  const headlineCommitment = getMostRelevantUnresolvedObligation(unresolvedObligations, todayLocalDate);
  const hasCommitmentDue = hasObligationRequiringAttention(unresolvedObligations, todayLocalDate);

  // Harvest Checkpoint 2/3 (TODAY presentation policy): a pure,
  // presentation-only classification of already-known state into
  // NOW (dominant)/ATTENTION/TOOLS — see attentionPolicy.ts. This
  // supersedes the old ad hoc activeModeInProgress/showSystemSection
  // booleans with one tested module; no Engine policy, capacity, or
  // domain fact is touched by it.
  // DROP 0: the saved schedule's value still stands for this day (no change since).
  const workContextPerSchedule = !!day && day.workContext !== "UNKNOWN" && workContextSource === "SCHEDULE_STANDING";
  // SHIFT CLOCK (Drop 2): which rows this part of the shift shows; the rest go behind TOOLS.
  const shiftWindow = day && schedulePattern ? livedDayShiftWindow(new Date(day.startedAt), schedulePattern) : null;
  const shiftClock = deriveShiftClockView({
    now,
    workContext: day?.workContext ?? "UNKNOWN",
    shiftWindow,
    workEnded: workPeriodEndedAt !== null,
    mainSleepLogged: mainSleepEndsPostShift(mainSleepRecordedAt, workPeriodEndedAt, shiftWindow),
  });
  const phaseRows: ShiftClockRow[] = day ? shiftClock.rows : [];
  const toolsItems: ToolsItem[] = day ? shiftClock.tools : [...TOOLS_ORDER];
  const checkInIsRow = phaseRows.includes("CHECK_IN");
  // SLEEP DRAFT: only on the post-shift MAIN SLEEP row (Command Center rule 3).
  const sleepDraft =
    day && phaseRows.includes("MAIN_SLEEP") && sleepDraftEvidence
      ? deriveSleepDraft({
          ...sleepDraftEvidence,
          openedAt: getAppOpenedAt(),
          mainSleepLogged: mainSleepEndsPostShift(mainSleepRecordedAt, workPeriodEndedAt, shiftWindow),
        })
      : null;
  const shiftDownIsRow = phaseRows.includes("SHIFT_DOWN");
  const attentionPlan = deriveAttentionPlan({
    activeWorkoutId: activeWorkout?.id ?? null,
    activeWorkoutType: activeWorkout?.sessionType ?? null,
    activeResetId,
    activeShiftDownId,
    recommendationKind: recommendation?.kind ?? null,
    recommendationSuggestedCommand: recommendation?.suggestedCommand ?? null,
    suggestEndDay,
    hasPendingOutcome: !!pendingOutcome,
    hasUnresolvedCapture: openCaptureItems.length > 0,
    hasCommitmentDue,
    // A row that already shows the same thing this phase doesn't also take an
    // attention slot: post-shift folds MARK WORK ENDED into SHIFT DOWN, and the
    // check-in row asks for the check-in itself (Drop 2).
    // Owner rulings (a) and (b), 2026-10-03: MARK WORK ENDED is offered only
    // once the shift has started (never before it), and the check-in is never
    // prompted before or during the shift — it happens after shift.
    hasWorkEndAvailable:
      day?.workContext === "WORK" &&
      workPeriodEndedAt === null &&
      !shiftDownIsRow &&
      shiftClock.phase !== "PRE_WORK" &&
      isWorkEndDue(shiftClock.phase, shiftWindow, now),
    isCheckInMissing:
      day !== null &&
      checkIn === null &&
      !checkInIsRow &&
      shiftClock.phase !== "PRE_WORK" &&
      shiftClock.phase !== "SCHEDULED_SHIFT",
    isMinimumDayProminent: showProminentMinimumDay,
    isHydrationOperationOpen:
      hydrationOperationOpen &&
      minimumDay?.enabled === true &&
      minimumDay.hydrate === false &&
      minimumDayHydrateOz > 0,
  });
  const dominant = attentionPlan.dominant;
  const endDayInAttention = isInAttention(attentionPlan, "END_DAY_SUGGESTED");
  const pendingOutcomeInAttention = isInAttention(attentionPlan, "PENDING_OUTCOME");
  const captureInAttention = isInAttention(attentionPlan, "CAPTURE_UNRESOLVED");
  const commitmentInAttention = isInAttention(attentionPlan, "COMMITMENT_DUE");
  const recommendationInAttention = isInAttention(attentionPlan, "RECOMMENDATION_UNRESOLVED");
  const workEndInAttention = isInAttention(attentionPlan, "WORK_END_AVAILABLE");
  const checkInInAttention = isInAttention(attentionPlan, "CHECK_IN_MISSING");
  const minimumDayInAttention = isInAttention(attentionPlan, "MINIMUM_DAY_PROMINENT");



  // ---- SHIFT CLOCK rendering (Drop 2) ----
  const fuelLine = describeFuel(minimumDayProteinG, proteinTargetG, minimumDayHydrateOz);
  const suggestedVariant = suggestSessionVariant(capacityResult ? capacityResult.capacity : null).variant;
  const workoutLine = nextWorkout
    ? suggestedVariant === "RESET"
      ? `${nextWorkout.label} · RESET suggested first`
      : describePlannedWorkout(nextWorkout.label, suggestedVariant, nextWorkout.minutes[suggestedVariant])
    : null;
  const liftedShiftDown = !!day && shiftDownIsPrimary && !shiftDownIsRow && toolsItems.includes("SHIFT_DOWN");
  const liftedReset = !!day && resetIsPrimary && toolsItems.includes("RESET");
  const liftedCheckIn = checkInFormOpen && !checkInIsRow;
  const liftedWorkContext = workContextOpen && !phaseRows.includes("WORK_QUESTION");
  // SURFACE/INTERRUPT advisory notes were never folded away (LAUNCH POLISH),
  // so they stay visible above TOOLS; only all-QUIET advisory waits inside.
  const liftedAdvisory = advisoryNotes.some((note) => note.attentionLevel !== "QUIET");

  /** Whether a TOOLS item has anything to show right now — the summary names only these. */
  function toolHasContent(item: ToolsItem): boolean {
    switch (item) {
      case "CHECK_IN":
        return (
          !liftedCheckIn &&
          !!day &&
          ((!checkInInAttention || checkInFormOpen) ||
            (!!recommendation && attentionPlan.recommendationPlacement === "SUPPORT"))
        );
      case "SHIFT_DOWN":
        return !liftedShiftDown && !!day && !!recommendation && dominant !== "SHIFT_DOWN_ACTIVE" && dominant !== "OPERATION_CONFLICT";
      case "RESET":
        return !liftedReset && !!day && !!recommendation && dominant !== "RESET_ACTIVE" && dominant !== "OPERATION_CONFLICT";
      case "WORK_CONTEXT":
        return !liftedWorkContext && !!day && !!scheduledContext && (!workEndInAttention || workContextOpen);
      case "FUEL":
        return !!day;
      case "MINIMUM_DAY":
        return !!day && !!minimumDay && !minimumDayInAttention && dominant !== "HYDRATION_ACTIVE";
      case "CAPTURE":
        return true;
      case "COMMITMENTS":
        return !commitmentInAttention && !!headlineCommitment;
      case "END_DAY":
        return !endDayInAttention;
      case "ADVISORY":
        return !liftedAdvisory && advisoryNotes.length > 0;
    }
  }
  const visibleTools = toolsItems.filter(toolHasContent);

  function renderShiftDownTool() {
    return (
      <>
      {day && recommendation && dominant !== "SHIFT_DOWN_ACTIVE" && dominant !== "OPERATION_CONFLICT" && (
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
      </>
    );
  }

  function renderResetTool() {
    return (
      <>
      {day && recommendation && dominant !== "RESET_ACTIVE" && dominant !== "OPERATION_CONFLICT" && (
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
    );
  }

  function renderCheckInTool() {
    return (
      <div id="today-check-in">
      {day && recommendation && attentionPlan.recommendationPlacement === "SUPPORT" &&
        recommendation.kind !== "NO_ACTION_REQUIRED" && (
          <RecommendationCard
            day={day}
            recommendation={recommendation}
            isDominant={false}
            decision={decision}
            checkIn={checkIn}
            recommendationOpen={recommendationOpen}
            setRecommendationOpen={setRecommendationOpen}
            recommendationHandoff={recommendationHandoff}
            activeShiftDownId={activeShiftDownId}
            priorOutcomeMemory={priorOutcomeMemory}
            materiallyRepeated={materiallyRepeated}
            busy={busy}
            onOpenTrain={onOpenTrain}
            onRecord={() => void handleRecord()}
            onDecline={handleDecline}
            onHandoff={handleRecommendationHandoff}
            confirmPanel={<ConfirmPanel />}
          />
        )}
      {(!checkInInAttention || checkInFormOpen) && (
        <CheckInCard
          busy={busy}
          checkIn={checkIn}
          checkInFormOpen={checkInFormOpen}
          setCheckInFormOpen={setCheckInFormOpen}
          values={checkInFormValues}
          setValues={setValues}
          draft={activeCheckInDraft}
          onStartBlank={() => {
            setCheckInDraftDismissed(true);
            setValues({});
          }}
          quickCheckInValues={quickCheckInValues}
          onQuickCheckIn={() => void handleQuickCheckIn()}
          onSubmitCheckIn={() => void handleCheckIn()}
        />
      )}
      {day && recommendation && dominant === "NONE" && recommendation.kind === "NO_ACTION_REQUIRED" && (
        <RecommendationCard
          day={day}
          recommendation={recommendation}
          isDominant={false}
          decision={decision}
          checkIn={checkIn}
          recommendationOpen={recommendationOpen}
          setRecommendationOpen={setRecommendationOpen}
          recommendationHandoff={recommendationHandoff}
          activeShiftDownId={activeShiftDownId}
          priorOutcomeMemory={priorOutcomeMemory}
          materiallyRepeated={materiallyRepeated}
          busy={busy}
          onOpenTrain={onOpenTrain}
          onRecord={() => void handleRecord()}
          onDecline={handleDecline}
          onHandoff={handleRecommendationHandoff}
          confirmPanel={<ConfirmPanel />}
        />
      )}
      </div>
    );
  }

  function renderWorkContextTool() {
    return (
      <>
      {/* Overdrive Phase 18 (TODAY PRIORITY COMPRESSION): once work
          context is settled for the day — OFF, or WORK with the shift
          already marked ended — there's nothing left to decide here, so
          it collapses to the same compact summary-row pattern RESET/
          SHIFT DOWN already use rather than staying a permanently
          full-weight card. Still WORK and not yet ended keeps the full
          card open, since MARK WORK ENDED is a real pending action. */}
      {(!workEndInAttention || workContextOpen) && day && scheduledContext && (
        <WorkContextCard
          day={day}
          scheduledContext={scheduledContext}
          workContextOpen={workContextOpen}
          setWorkContextOpen={setWorkContextOpen}
          workPeriodEndedAt={workPeriodEndedAt}
          busy={busy}
          onSetWorkContext={(value) => void handleSetWorkContext(value)}
          onMarkWorkEnded={() => void handleMarkWorkEnded()}
          perSchedule={workContextPerSchedule}
          // Shift Clock (Drop 2): the per-schedule one-tap change lives in the
          // status strip; here the card keeps its ordinary controls.
        />
      )}
      </>
    );
  }

  function renderFuel() {
    return (
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>FUEL</p>
        <p className="card-body" style={{ margin: 0 }}>{fuelLine}</p>
      </div>
    );
  }

  function renderToolsItem(item: ToolsItem) {
    switch (item) {
      case "CHECK_IN":
        return liftedCheckIn ? null : renderCheckInTool();
      case "SHIFT_DOWN":
        return liftedShiftDown ? null : renderShiftDownTool();
      case "RESET":
        return liftedReset ? null : renderResetTool();
      case "WORK_CONTEXT":
        return liftedWorkContext ? null : renderWorkContextTool();
      case "FUEL":
        return day ? renderFuel() : null;
      case "MINIMUM_DAY":
        return (
          <>
      {day && minimumDay && !minimumDayInAttention && dominant !== "HYDRATION_ACTIVE" && (
        <MinimumDayCard
          prominent={false}
          minimumDay={minimumDay}
          minimumDayOpen={minimumDayOpen}
          onOpenCollapsed={() => {
            if (minimumDay.enabled && !minimumDay.hydrate && minimumDayHydrateOz > 0) {
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
        />
      )}
          </>
        );
      case "CAPTURE":
        return (
          <CaptureToolsCard
        openCaptureItems={openCaptureItems}
        captureInAttention={captureInAttention}
        captureText={captureText}
        setCaptureText={setCaptureText}
        busy={busy}
        onCapture={() => void handleCapture()}
        justResolvedCapture={justResolvedCapture}
        onUndoResolve={() => void handleUndoResolveCapture()}
        captureConversion={captureConversion}
        conversionTitle={conversionTitle}
        setConversionTitle={setConversionTitle}
        conversionDueAt={conversionDueAt}
        setConversionDueAt={setConversionDueAt}
        conversionDateSuggestion={conversionDateSuggestion}
        onRequestConversion={requestCaptureConversion}
        onCancelConversion={cancelCaptureConversion}
        onConfirmConversion={() => void confirmCaptureConversion()}
        onResolve={(item) => void handleResolveCapture(item)}
      />
        );
      case "COMMITMENTS":
        return (
          <>
      {!commitmentInAttention && (
        <CommitmentsCard
          headlineCommitment={headlineCommitment}
          unresolvedObligationsCount={unresolvedObligations.length}
          commitmentsOpen={commitmentsOpen}
          setCommitmentsOpen={setCommitmentsOpen}
          headlineCommitmentMission={headlineCommitmentMission}
          commitmentConfirmation={commitmentConfirmation}
          busy={busy}
          onViewCommitments={onViewCommitments}
          onRequestSatisfaction={requestCommitmentSatisfaction}
          onCancelSatisfaction={cancelCommitmentSatisfaction}
          onConfirmSatisfaction={() => void confirmCommitmentSatisfaction()}
        />
      )}
          </>
        );
      case "END_DAY":
        return (
          <>
      {!endDayInAttention && (
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
          </>
        );
      case "ADVISORY":
        return (
          <AdvisorySection
        notes={advisoryNotes}
        excludeObligationId={headlineCommitment?.obligation.id}
        busy={busy}
        onLogWater={(amountOz) => void handleMinimumDayLogWater(amountOz)}
        onOpenMinimumDay={() => setMinimumDayOpen(true)}
      />
        );
    }
  }

  function renderPhaseRow(row: ShiftClockRow) {
    if (!day) return null;
    switch (row) {
      case "WORK_QUESTION":
        return renderWorkContextTool();
      case "TONIGHT":
        return (
          <div className="equipment-row">
            <p className="tool-label" style={{ marginBottom: 4 }}>AFTER SHIFT</p>
            <p className="card-title" style={{ margin: 0 }}>{workoutLine ?? "Workout suggestion loading…"}</p>
          </div>
        );
      case "FUEL":
        return renderFuel();
      case "QUICK_LOG":
        return (
          <div className="equipment-row">
            <p className="tool-label" style={{ marginBottom: 8 }}>QUICK LOG</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="chip" aria-label="Log 8 oz water" disabled={busy} onClick={() => void handleMinimumDayLogWater(8)}>
                +8 oz
              </button>
              <button type="button" className="chip" aria-label="Log 16 oz water" disabled={busy} onClick={() => void handleMinimumDayLogWater(16)}>
                +16 oz
              </button>
              {onOpenBody && (
                <button type="button" className="chip" aria-label="Log a meal in BODY" onClick={() => onOpenBody("meal")}>
                  MEAL
                </button>
              )}
              {onOpenBody && quitHabitSetUp && (
                <button type="button" className="chip" aria-label="Log an urge in BODY" onClick={() => onOpenBody("urge")}>
                  URGE
                </button>
              )}
            </div>
          </div>
        );
      case "SHIFT_DOWN":
        // An in-progress SHIFT DOWN already owns Operate above.
        if (dominant === "SHIFT_DOWN_ACTIVE" || dominant === "OPERATION_CONFLICT") return null;
        return (
          <ShiftDownCard
            prominent={shiftDownIsPrimary}
            isDominant={false}
            forceOpen
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
            onMarkWorkEnded={
              day.workContext === "WORK" && workPeriodEndedAt === null ? () => void handleMarkWorkEnded() : undefined
            }
          />
        );
      case "CHECK_IN":
        if (!checkIn && !checkInFormOpen) {
          return (
            <div className="equipment-row">
              <p className="tool-label" style={{ marginBottom: 4 }}>STATE INPUT</p>
              <h2 className="card-title">Check in</h2>
              <button className="btn-secondary" disabled={busy} onClick={() => void handleQuickCheckIn()}>
                ALL GOOD
              </button>
              <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => setCheckInFormOpen(true)}>
                MANUAL CHECK-IN
              </button>
            </div>
          );
        }
        if (!checkIn || checkInFormOpen || !recommendation || attentionPlan.recommendationPlacement === "ATTENTION") {
          return (
            <CheckInCard
              busy={busy}
              checkIn={checkIn}
              checkInFormOpen={checkInFormOpen}
              setCheckInFormOpen={setCheckInFormOpen}
              values={checkInFormValues}
              setValues={setValues}
              draft={activeCheckInDraft}
              onStartBlank={() => {
                setCheckInDraftDismissed(true);
                setValues({});
              }}
              quickCheckInValues={quickCheckInValues}
              onQuickCheckIn={() => void handleQuickCheckIn()}
              onSubmitCheckIn={() => void handleCheckIn()}
            />
          );
        }
        // Checked in: the row becomes the recommendation, with the check-in kept as one line under it.
        return (
          <>
            <RecommendationCard
          day={day}
          recommendation={recommendation}
          isDominant={dominant === "RECOMMENDATION"}
          decision={decision}
          checkIn={checkIn}
          recommendationOpen={recommendationOpen}
          setRecommendationOpen={setRecommendationOpen}
          recommendationHandoff={recommendationHandoff}
          activeShiftDownId={activeShiftDownId}
          priorOutcomeMemory={priorOutcomeMemory}
          materiallyRepeated={materiallyRepeated}
          busy={busy}
          onOpenTrain={onOpenTrain}
          onRecord={() => void handleRecord()}
          onDecline={handleDecline}
          onHandoff={handleRecommendationHandoff}
          confirmPanel={<ConfirmPanel />}
        />
            <CheckInCard
              busy={busy}
              checkIn={checkIn}
              checkInFormOpen={false}
              setCheckInFormOpen={setCheckInFormOpen}
              values={checkInFormValues}
              setValues={setValues}
              draft={activeCheckInDraft}
              onStartBlank={() => {
                setCheckInDraftDismissed(true);
                setValues({});
              }}
              quickCheckInValues={quickCheckInValues}
              onQuickCheckIn={() => void handleQuickCheckIn()}
              onSubmitCheckIn={() => void handleCheckIn()}
            />
          </>
        );
      case "WORKOUT":
        // An active workout already owns Operate above.
        if (activeWorkout) return null;
        return (
          <div className="equipment-row">
            <p className="tool-label" style={{ marginBottom: 4 }}>WORKOUT</p>
            <p className="card-title" style={{ marginBottom: onOpenTrain ? 12 : 0 }}>{workoutLine ?? "Workout suggestion loading…"}</p>
            {onOpenTrain && (
              <button className="btn-secondary" onClick={() => onOpenTrain("WORKOUT")}>
                OPEN TRAIN
              </button>
            )}
          </div>
        );
      case "MAIN_SLEEP":
        if (sleepDraft && sleepDraftDismissedDayId !== day.id) {
          const minutes = Math.min(SLEEP_DRAFT_ADJUST_MAX, Math.max(SLEEP_DRAFT_ADJUST_MIN, sleepDraft.value + sleepDraftAdjust));
          return (
            <div className="equipment-row">
              <p className="tool-label" style={{ marginBottom: 4 }}>MAIN SLEEP</p>
              <h2 className="card-title" style={{ marginBottom: 2 }}>Slept up to {formatDuration(minutes)}?</h2>
              <p className="meta" style={{ marginBottom: 12 }}>
                {sleepDraft.reason}
                {sleepDraftAdjust !== 0 ? ` · adjusted ${sleepDraftAdjust > 0 ? "+" : "−"}${Math.abs(sleepDraftAdjust)} min` : ""}
              </p>
              <button className="btn-secondary" disabled={busy} onClick={() => void handleLogSleepDraft(minutes, sleepDraftAdjust !== 0)}>
                LOG {formatDuration(minutes).toUpperCase()}
              </button>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button type="button" className="chip" aria-label="15 minutes less" disabled={busy || minutes <= SLEEP_DRAFT_ADJUST_MIN} onClick={() => setSleepDraftAdjust((a) => a - 15)}>
                  −15
                </button>
                <button type="button" className="chip" aria-label="15 minutes more" disabled={busy || minutes >= SLEEP_DRAFT_ADJUST_MAX} onClick={() => setSleepDraftAdjust((a) => a + 15)}>
                  +15
                </button>
                <button type="button" className="chip" disabled={busy} onClick={dismissSleepDraft}>
                  NOT NOW
                </button>
                {onOpenBody && (
                  <button type="button" className="chip" onClick={() => onOpenBody("sleep")}>
                    ENTER IN BODY
                  </button>
                )}
              </div>
            </div>
          );
        }
        return (
          <div className="equipment-row">
            <p className="tool-label" style={{ marginBottom: 4 }}>MAIN SLEEP</p>
            <p className="card-body" style={{ marginBottom: onOpenBody ? 12 : 0 }}>Log it when you wake.</p>
            {onOpenBody && (
              <button className="btn-secondary" onClick={() => onOpenBody("sleep")}>
                LOG MAIN SLEEP
              </button>
            )}
          </div>
        );
    }
  }

  return (
    <div
      className={`screen fade-in today-field${
        day && dominant === "NONE" && attentionPlan.attention.length === 0 ? " today-field--quiet" : ""
      }${justStartedDay ? " today-field--boot" : ""}`}
      data-field-state={
        dominant !== "NONE" ? "earned" : attentionPlan.attention.length > 0 ? "attention" : "quiet"
      }
    >
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
      <div className="field-header">
        <Icon name="mission" size={22} />
        <h1 className="eyebrow">BEYOND // TODAY</h1>
      </div>

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
          {commitmentFeedback.message}
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
          {captureConversionFeedback.message}
        </p>
      )}

      {hydrationConfirmation !== null &&
        renderLoggedBanner(`${hydrationConfirmation.amount} oz recorded.`, hydrationUndoOpen, "WATER", "water")}

      {sleepConfirmation !== null &&
        renderLoggedBanner(`Main sleep logged · ${formatDuration(sleepConfirmation.amount)}`, sleepUndoOpen, "SLEEP", "sleep")}

      {proteinConfirmation !== null &&
        renderLoggedBanner(`${proteinConfirmation.amount} g protein recorded.`, proteinUndoOpen, "PROTEIN")}

      {undoFailure && (
        <p className="meta" role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>{undoFailure}</p>
      )}

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
      {day && <h2 className="visually-hidden">Orient</h2>}
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
        <div
          className={
            capacityResult && capacityResult.capacity !== "GREEN"
              ? `status-strip status-strip--stacked status-strip--${capacityResult.capacity.toLowerCase()}`
              : "status-strip status-strip--stacked"
          }
        >
          {/* SHIFT CLOCK (Drop 2): before and during a scheduled shift the
              headline is the countdown; the work context it rests on moves to
              a quiet line under it. The "per schedule" one-tap change stays
              here in every phase, so it's never behind TOOLS. */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <p className="status-strip__headline" style={{ margin: 0 }}>
              {shiftClock.countdown
                ? describeCountdown(shiftClock.countdown, now)
                : describeContextStrip(
                    currentContext ? (currentContext.workContext ?? day.workContext) : day.workContext,
                    currentContext ? currentContext.schedulePrediction : scheduledContext,
                    currentContext ? currentContext.hasUnresolvedPostShift : unresolvedPostShift,
                    workContextPerSchedule,
                  )}
            </p>
            {workContextPerSchedule && day.workContext !== "UNKNOWN" && (
              <button
                type="button"
                className="chip"
                style={{ flex: "none", padding: "8px 14px" }}
                disabled={busy}
                onClick={() => void handleChangeStandingWorkContext()}
              >
                {describeStandingChange(day.workContext)}
              </button>
            )}
          </div>
          {shiftClock.countdown && (
            <p className="status-strip__detail">{workContextPerSchedule ? WORKING_PER_SCHEDULE : "Working today"}</p>
          )}
          <p className="status-strip__detail">
            {capacityResult ? (
              <span
                className={capacityResult.capacity !== "GREEN" ? "status-strip__capacity" : undefined}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span aria-hidden="true" className={`capacity-dot capacity-dot--${capacityResult.capacity.toLowerCase()}`} />
                {describeCapacity(capacityResult.capacity, capacityResult.reasonCodes)}
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span aria-hidden="true" className="capacity-dot capacity-dot--unknown" />
                {describeCapacityUnknown()}
              </span>
            )}
          </p>
        </div>
      )}

      {/* OPERATE — exactly one dominant operating surface. Multiple active
          operation state is named explicitly rather than
          silently allowing JSX order to choose a winner. */}
      {day && dominant !== "NONE" && !(dominant === "RECOMMENDATION" && checkInIsRow) && (
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
      {day && dominant === "OPERATION_CONFLICT" && <ActiveWorkoutCard activeWorkout={activeWorkout} isDominant={false} onOpenTrain={onOpenTrain} />}
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
          isDominant={true}
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
          isDominant={true}
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
      {day && dominant === "WORKOUT_ACTIVE" && <ActiveWorkoutCard activeWorkout={activeWorkout} isDominant={true} onOpenTrain={onOpenTrain} />}
      {day && dominant === "HYDRATION_ACTIVE" && (
        <HydrationOperationCard
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
      )}
      {/* SHIFT CLOCK (Drop 2): where the phase has a check-in row, the
          recommendation renders in that row instead (the check-in "becomes"
          it), never twice. */}
      {day && recommendation && dominant === "RECOMMENDATION" && !checkInIsRow && (
        <RecommendationCard
          day={day}
          recommendation={recommendation}
          isDominant={true}
          decision={decision}
          checkIn={checkIn}
          recommendationOpen={recommendationOpen}
          setRecommendationOpen={setRecommendationOpen}
          recommendationHandoff={recommendationHandoff}
          activeShiftDownId={activeShiftDownId}
          priorOutcomeMemory={priorOutcomeMemory}
          materiallyRepeated={materiallyRepeated}
          busy={busy}
          onOpenTrain={onOpenTrain}
          onRecord={() => void handleRecord()}
          onDecline={handleDecline}
          onHandoff={handleRecommendationHandoff}
          confirmPanel={<ConfirmPanel />}
        />
      )}
      {/* SHIFT CLOCK (Drop 2): the quiet "No action required" result now
          renders with the check-in — its row, or TOOLS outside that phase. */}

      {/* ATTENTION — earned, capped at ATTENTION_MAX, and disappears
          entirely when nothing currently qualifies (attentionPolicy.ts). */}
      {attentionPlan.attention.length > 0 && (
        <>
          <h2 className="section-label section-label--field">Attention</h2>

          {recommendationInAttention && (
            <RecommendationCard
              day={day}
              recommendation={recommendation}
              isDominant={false}
              isAttention={true}
              decision={decision}
              checkIn={checkIn}
              recommendationOpen={recommendationOpen}
              setRecommendationOpen={setRecommendationOpen}
              recommendationHandoff={recommendationHandoff}
              activeShiftDownId={activeShiftDownId}
              priorOutcomeMemory={priorOutcomeMemory}
              materiallyRepeated={materiallyRepeated}
              busy={busy}
              onOpenTrain={onOpenTrain}
              onRecord={() => void handleRecord()}
              onDecline={handleDecline}
              onHandoff={handleRecommendationHandoff}
              confirmPanel={<ConfirmPanel />}
            />
          )}

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
              headlineCommitment={headlineCommitment}
              unresolvedObligationsCount={unresolvedObligations.length}
              commitmentsOpen={commitmentsOpen}
              setCommitmentsOpen={setCommitmentsOpen}
              headlineCommitmentMission={headlineCommitmentMission}
              commitmentConfirmation={commitmentConfirmation}
              busy={busy}
              onViewCommitments={onViewCommitments}
              onRequestSatisfaction={requestCommitmentSatisfaction}
              onCancelSatisfaction={cancelCommitmentSatisfaction}
              onConfirmSatisfaction={() => void confirmCommitmentSatisfaction()}
            />
          )}

          {checkInInAttention && !checkInFormOpen && (
            <SignalRow label="STATE INPUT">
              <h2 className="card-title">Check in when you can</h2>
              <p className="card-body" style={{ marginBottom: 12 }}>
                BEYOND has no current state input for this BeyondDay. Guidance remains deterministic, but less informed.
              </p>
              <button className="btn-primary" disabled={busy} onClick={() => void handleQuickCheckIn()}>
                ALL GOOD
              </button>
              <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => setCheckInFormOpen(true)}>
                MANUAL CHECK-IN
              </button>
            </SignalRow>
          )}

          {minimumDayInAttention && (
            <MinimumDayCard
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
            />
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
                Last time, BEYOND recommended "{pendingOutcome.title}" — how did that go?
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
              {openCaptureItems.map((item) => (
                <CaptureListRow
                  key={item.id}
                  item={item}
                  busy={busy}
                  captureConversion={captureConversion}
                  conversionTitle={conversionTitle}
                  setConversionTitle={setConversionTitle}
                  conversionDueAt={conversionDueAt}
                  setConversionDueAt={setConversionDueAt}
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
          <h2 className="section-label">{describePhaseHeading(shiftClock.phase, day.workContext)}</h2>
          {phaseRows.map((row) => (
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
          <CollapsibleRow name="TOOLS" summary={describeToolsSummary(visibleTools)} onOpen={() => setToolsOpen(true)} />
        ) : (
          <section aria-label="TOOLS">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <h2 className="section-label" style={{ margin: 0 }}>Tools</h2>
              <button type="button" className="chip" style={{ flex: "none", padding: "8px 14px" }} aria-label="Close TOOLS" onClick={() => setToolsOpen(false)}>
                CLOSE
              </button>
            </div>
            {visibleTools.map((item) => (
              <div key={item} data-tools-item={item}>
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
