import { useEffect, useRef, useState } from "react";
import type { BeyondDay, CaptureItem, Recommendation, StateCheckIn, WorkoutSession } from "../../../domain/common/types";
import { ConfirmIcon, Icon } from "../../icons/Icon";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { SignalRow } from "../../components/SignalRow";
import { CommandSurface } from "../../components/CommandSurface";
import { deriveAttentionPlan, isInAttention } from "./attentionPolicy";
import { getMostRelevantUnresolvedObligation, hasObligationRequiringAttention } from "../../../engine/obligationRelevance";
import { getCurrentlyEligibleUnresolvedObligations, getMissionForObligation } from "../../../application/intentQueries";
import { convertCaptureToObligation, satisfyObligation } from "../../../application/intentCommands";
import { formatLocalDate } from "../../../engine/scheduledContext";
import type { Mission, Obligation } from "../../../domain/intent/types";
import { isCheckInComplete, type CheckInValues, type PartialCheckInValues } from "./checkInFields";
import { describeContextStrip, resolveWorkContextSource } from "./workContextCopy";
import { describeCapacity, describeCapacityUnknown } from "./capacityCopy";
import { deriveCapacity } from "../../../engine/capacity";
import { dismissOutcome } from "../../../persistence/outcomeDismissals";
import { useRedCapacityOverrideGate } from "../../hooks/useRedCapacityOverrideGate";
import { isSeriouslyConstrained } from "./minimumDayCopy";
import { isPrimaryReset, isPrimaryShiftDown, type SessionOutcome } from "./resetShiftDownCopy";
import { ActiveWorkoutCard } from "./ActiveWorkoutCard";
import { ResetCard } from "./ResetCard";
import { ShiftDownCard } from "./ShiftDownCard";
import { EndDayCard } from "./EndDayCard";
import { CommitmentsCard } from "./CommitmentsCard";
import { CaptureListRow, CaptureToolsCard } from "./CaptureSection";
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
  getTotalProteinGrams,
  getOpenReset,
  getOpenShiftDown,
  getWorkPeriodEnded,
  hasUnresolvedPostShift,
  getOpenCaptureItems,
  type MinimumDayStatus,
  type PriorOutcomeMemory,
  type RecommendationDecision,
  type RecommendationHandoffTarget,
} from "../../../application/queries";
import { getDaysSinceLastBackup } from "../../../persistence/backup";
import type { ScheduledContext } from "../../../engine/scheduledContext";
import { getCurrentOperationalContext, type CurrentOperationalContext } from "../../../application/currentContextQueries";
import { getActiveWorkoutSession } from "../../../application/trainQueries";

const BACKUP_NUDGE_THRESHOLD_DAYS = 7;

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
export function TodayScreen({
  onViewCommitments,
  onOpenTrain,
  onOpenBody,
}: {
  onViewCommitments?: () => void;
  onOpenTrain?: (destination: "RECOVERY" | "WORKOUT") => void;
  onOpenBody?: () => void;
} = {}) {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [checkIn, setCheckIn] = useState<StateCheckIn | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [decision, setDecision] = useState<RecommendationDecision | undefined>(undefined);
  const [recommendationHandoff, setRecommendationHandoff] = useState<RecommendationHandoffTarget | null>(null);
  const [priorOutcomeMemory, setPriorOutcomeMemory] = useState<PriorOutcomeMemory | null>(null);
  const [values, setValues] = useState<PartialCheckInValues>({});
  const [busy, setBusy] = useState(false);
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
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<Recommendation | null>(null);
  const [scheduledContext, setScheduledContext] = useState<ScheduledContext | null>(null);
  const [workPeriodEndedAt, setWorkPeriodEndedAt] = useState<string | null>(null);
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
  const [hydrationConfirmation, setHydrationConfirmation] = useState<number | null>(null);
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
  const { guard, ConfirmPanel } = useRedCapacityOverrideGate();

  useEffect(() => {
    void refresh();
    setDaysSinceBackup(getDaysSinceLastBackup());
    void getScheduledContext().then(setScheduledContext);
  }, []);

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
    // Everything on the active-day/context path is gated on this single
    // ownership check: a refresh superseded by the time its getActiveDay()
    // resolves must not install `day`, and must not even start context
    // composition — starting it would let that work later become
    // authoritative if left unguarded downstream.
    if (mountedRef.current && myRequestId === refreshRequestIdRef.current) {
      const newDayId = activeDay ? activeDay.id : null;
      if (newDayId !== currentContextDayIdRef.current) {
        // This accepted refresh is adopting a different day (including a
        // transition to/from no active day) than whatever `currentContext`
        // currently belongs to. That old context is not truthful for the
        // newly-adopted day — clear it now, synchronously with setDay
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
      getCurrentOperationalContext(activeDay ? { id: activeDay.id, workContext: activeDay.workContext } : null)
        .then((result) => {
          if (!mountedRef.current || myRequestId !== refreshRequestIdRef.current) return;
          setCurrentContext(result);
        })
        .catch(() => {
          if (!mountedRef.current || myRequestId !== refreshRequestIdRef.current) return;
          setCurrentContext(null);
        });
    }
    // Overdrive Phase 10: capture is deliberately not day-scoped ("inbox
    // age is not urgency," and jotting something down shouldn't require a
    // BeyondDay to already exist), so this refreshes unconditionally.
    setOpenCaptureItems(await getOpenCaptureItems());
    // Intent & Commitment Spine, Drop 02: same reasoning — Obligations are
    // not day-scoped either.
    const obligations = await getCurrentlyEligibleUnresolvedObligations();
    setUnresolvedObligations(obligations);
    const headline = getMostRelevantUnresolvedObligation(obligations, formatLocalDate(new Date()));
    const mission = headline ? await getMissionForObligation(headline.obligation) : undefined;
    setHeadlineCommitmentMission(headline && mission ? { obligationId: headline.obligation.id, mission } : null);
    if (activeDay) {
      setCheckIn((await getLatestCheckIn(activeDay.id)) ?? null);
      const rec = (await getLatestRecommendation(activeDay.id)) ?? null;
      setRecommendation(rec);
      setDecision(rec ? await getRecommendationDecision(activeDay.id, rec.id) : undefined);
      setRecommendationHandoff(rec ? (await getRecommendationHandoff(rec)) ?? null : null);
      setPriorOutcomeMemory(rec ? (await getPriorOutcomeMemory(rec)) ?? null : null);
      setSuggestEndDay(await shouldSuggestEndDay(activeDay.id));
      const pending = rec ? (await getPendingOutcomeRating(rec)) ?? null : null;
      setPendingOutcome(pending);
      setMinimumDay(await getMinimumDayStatus(activeDay.id));
      setMinimumDayHydrateOz(await getEffectiveHydrationTotal(activeDay.id));
      setMinimumDayProteinG(await getTotalProteinGrams(activeDay.id));

      const openReset = await getOpenReset(activeDay.id);
      if (openReset) {
        setActiveResetId(openReset.eventId);
        setResetIntensity(openReset.intensity);
        setOpenResetStartedAt(openReset.startedAt);
      } else {
        setActiveResetId(null);
        setOpenResetStartedAt(null);
      }

      const openShiftDown = await getOpenShiftDown(activeDay.id);
      if (openShiftDown) {
        setActiveShiftDownId(openShiftDown.eventId);
        setShiftDownDuration(openShiftDown.durationMinutes);
        setOpenShiftDownStartedAt(openShiftDown.startedAt);
      } else {
        setActiveShiftDownId(null);
        setOpenShiftDownStartedAt(null);
      }

      const workPeriodEnded = await getWorkPeriodEnded(activeDay.id);
      setWorkPeriodEndedAt(workPeriodEnded ? workPeriodEnded.occurredAt : null);
      setUnresolvedPostShift(await hasUnresolvedPostShift(activeDay.id));
    } else {
      setRecommendation(null);
      setDecision(undefined);
      setRecommendationHandoff(null);
    }
  }

  function handleRecommendationHandoff(target: RecommendationHandoffTarget) {
    if (target === "SHIFT_DOWN") {
      setShiftDownOpen(true);
      requestAnimationFrame(() => {
        shiftDownStartRef.current?.scrollIntoView({ block: "center" });
        shiftDownStartRef.current?.focus();
      });
      return;
    }
    onOpenTrain?.(target);
  }

  async function handleStartDay() {
    if (busy) return;
    setBusy(true);
    try {
      setDay(await startDay());
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn() {
    if (busy || !isCheckInComplete(values)) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await submitCheckIn(activeDay.id, values);
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
      setBusy(false);
    }
  }

  async function handleQuickCheckIn() {
    if (busy) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await submitCheckIn(activeDay.id, quickCheckInValues);
      await refresh();
      setValues({});
      setCheckInFormOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleRecord() {
    if (busy || !day || !recommendation) return;
    setBusy(true);
    try {
      await recordRecommendation(day.id, recommendation);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function actuallyDecline() {
    if (!day || !recommendation) return;
    setBusy(true);
    try {
      await declineRecommendation(day.id, recommendation, { overrideConfirmed: true });
      await refresh();
    } finally {
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
    if (busy || !day || !recommendation) return;
    if (recommendation.kind === "STABILIZE") {
      guard("RED", () => actuallyDecline());
    } else {
      void actuallyDecline();
    }
  }

  async function handleStartReset() {
    if (busy || !day) return;
    setBusy(true);
    try {
      await startReset(day.id, resetIntensity);
      setLastResetOutcome(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteReset() {
    if (busy || !day || !activeResetId) return;
    setBusy(true);
    try {
      await completeReset(day.id, activeResetId);
      setLastResetOutcome("COMPLETED");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  /** Distinct from completing — "started this but didn't go through with it," never recorded as done. */
  async function handleCancelReset() {
    if (busy || !day || !activeResetId) return;
    setBusy(true);
    try {
      await cancelReset(day.id, activeResetId);
      setLastResetOutcome("CANCELLED");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleStartShiftDown() {
    if (busy || !day) return;
    setBusy(true);
    try {
      await startShiftDown(day.id, shiftDownDuration);
      setLastShiftDownOutcome(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteShiftDown() {
    if (busy || !day || !activeShiftDownId) return;
    setBusy(true);
    try {
      await completeShiftDown(day.id, activeShiftDownId);
      setLastShiftDownOutcome("COMPLETED");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelShiftDown() {
    if (busy || !day || !activeShiftDownId) return;
    setBusy(true);
    try {
      await cancelShiftDown(day.id, activeShiftDownId);
      setLastShiftDownOutcome("CANCELLED");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleEndDay() {
    if (busy || !day) return;
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
      setBusy(false);
    }
  }

  async function handleSetWorkContext(value: "WORK" | "OFF") {
    if (busy || !day || !scheduledContext) return;
    setBusy(true);
    try {
      const source = resolveWorkContextSource(scheduledContext.todayIsScheduledWorkDay, value);
      await setWorkContext(day.id, value, source);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkWorkEnded() {
    if (busy || !day) return;
    setBusy(true);
    try {
      await markWorkEnded(day.id);
      setWorkContextOpen(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCapture() {
    if (busy || !captureText.trim()) return;
    setBusy(true);
    try {
      await captureItem(captureText);
      setCaptureText("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleResolveCapture(item: CaptureItem) {
    if (busy) return;
    setBusy(true);
    try {
      await resolveCaptureItem(item.id);
      setJustResolvedCapture({ id: item.id, text: item.text });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function requestCommitmentSatisfaction(obligation: Obligation) {
    if (busy) return;
    setCommitmentFeedback(null);
    setCommitmentConfirmation({ id: obligation.id, title: obligation.title });
  }

  function cancelCommitmentSatisfaction() {
    if (busy) return;
    setCommitmentConfirmation(null);
    setCommitmentFeedback(null);
  }

  async function confirmCommitmentSatisfaction() {
    if (busy || commitmentSatisfactionPendingRef.current || !commitmentConfirmation) return;
    const target = commitmentConfirmation;
    commitmentSatisfactionPendingRef.current = true;
    setBusy(true);
    setCommitmentFeedback(null);
    try {
      await satisfyObligation(target.id);
      setCommitmentConfirmation(null);
      setCommitmentsOpen(false);
      await refresh();
      setCommitmentFeedback({ kind: "SUCCESS", message: `Commitment satisfied: ${target.title}.` });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Could not satisfy the commitment.";
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
          : `Could not satisfy ${target.title}: ${detail}`,
      });
    } finally {
      commitmentSatisfactionPendingRef.current = false;
      setBusy(false);
    }
  }

  async function handleUndoResolveCapture() {
    if (busy || !justResolvedCapture) return;
    setBusy(true);
    try {
      await reopenCaptureItem(justResolvedCapture.id);
      setJustResolvedCapture(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function requestCaptureConversion(item: CaptureItem) {
    if (busy) return;
    setCaptureConversionFeedback(null);
    setConversionTitle(item.text);
    setCaptureConversion({ id: item.id, text: item.text });
  }

  function cancelCaptureConversion() {
    if (busy) return;
    setCaptureConversion(null);
  }

  async function confirmCaptureConversion() {
    if (busy || !captureConversion || !conversionTitle.trim()) return;
    const target = captureConversion;
    const title = conversionTitle.trim();
    setBusy(true);
    setCaptureConversionFeedback(null);
    try {
      await convertCaptureToObligation(target.id, { title });
      setCaptureConversion(null);
      await refresh();
      setCaptureConversionFeedback({ kind: "SUCCESS", message: `Obligation created: ${title}` });
    } catch (error) {
      setCaptureConversionFeedback({
        kind: "ERROR",
        message: error instanceof Error ? error.message : "Could not create the obligation.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleEnableMinimumDay() {
    if (busy || !day) return;
    setBusy(true);
    try {
      await enableMinimumDay(day.id);
      await refresh();
      setMinimumDayOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkMinimum(kind: "MEDS" | "HYGIENE" | "MOVE" | "RECOVER" | "CONNECT") {
    if (busy || !day) return;
    setBusy(true);
    try {
      if (kind === "MEDS") await markMedsCompleted(day.id);
      else if (kind === "HYGIENE") await markHygieneCompleted(day.id);
      else if (kind === "MOVE") await markMoveCompleted(day.id);
      else await markRecoverConnectCompleted(day.id, kind);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  /**
   * Item 3 (Phase 3): logs directly from the same commands/events BODY
   * uses (logWater/logProtein) — no separate record-keeping path, so
   * there's no way for this to create a duplicate of a BODY-side log.
   */
  async function handleMinimumDayLogWater(amountOverride?: number) {
    if (busy) return;
    const amount = amountOverride ?? Number(mdWaterInput);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await logWater(activeDay.id, amount);
      setMdWaterInput("");
      await refresh();
      setHydrationConfirmation(amount);
      setHydrationOperationOpen(false);
      setHydrationManualOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleMinimumDayLogProtein() {
    if (busy) return;
    const grams = Number(mdProteinInput);
    if (!Number.isFinite(grams) || grams <= 0) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await logProtein(activeDay.id, grams);
      setMdProteinInput("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRateOutcome(rating: "GOOD" | "NEUTRAL" | "BAD") {
    if (busy || !pendingOutcome) return;
    setBusy(true);
    try {
      await rateOutcome(pendingOutcome.beyondDayId, pendingOutcome.id, rating);
      setPendingOutcome(null);
    } finally {
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
    hasWorkEndAvailable: day?.workContext === "WORK" && workPeriodEndedAt === null,
    isCheckInMissing: day !== null && checkIn === null,
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


  return (
    <div
      className={`screen fade-in today-field${
        day && dominant === "NONE" && attentionPlan.attention.length === 0 ? " today-field--quiet" : ""
      }`}
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

      {hydrationConfirmation !== null && (
        onOpenBody ? (
          <ConfirmBanner
            message={`${hydrationConfirmation} oz recorded.`}
            actionLabel="CORRECT IN BODY"
            onAction={onOpenBody}
          />
        ) : (
          <p role="status" aria-live="polite" className="meta fade-in">
            <ConfirmIcon size={20} /> {hydrationConfirmation} oz recorded. Corrections remain available in BODY.
          </p>
        )
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
      {day && <h2 className="section-label section-label--field">Orient</h2>}
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
          <p className="status-strip__headline">
            {describeContextStrip(
              currentContext ? (currentContext.workContext ?? day.workContext) : day.workContext,
              currentContext ? currentContext.schedulePrediction : scheduledContext,
              currentContext ? currentContext.hasUnresolvedPostShift : unresolvedPostShift,
            )}
          </p>
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
      {day && dominant !== "NONE" && <h2 className="section-label section-label--field">Operate</h2>}
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
      {day && recommendation && dominant === "RECOMMENDATION" && (
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
          busy={busy}
          onOpenTrain={onOpenTrain}
          onRecord={() => void handleRecord()}
          onDecline={handleDecline}
          onHandoff={handleRecommendationHandoff}
          confirmPanel={<ConfirmPanel />}
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
          busy={busy}
          onOpenTrain={onOpenTrain}
          onRecord={() => void handleRecord()}
          onDecline={handleDecline}
          onHandoff={handleRecommendationHandoff}
          confirmPanel={<ConfirmPanel />}
        />
      )}

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
              <h2 className="card-title">Working today</h2>
              <p className="card-body" style={{ marginBottom: 12 }}>
                Setup is recorded. When your shift is actually over, mark it — BEYOND never guesses this from the clock.
              </p>
              <button className="btn-primary" disabled={busy} onClick={() => void handleMarkWorkEnded()}>
                MARK WORK ENDED
              </button>
              <button className="btn-secondary" style={{ marginTop: 8 }} disabled={busy} onClick={() => setWorkContextOpen(true)}>
                CHANGE WORK CONTEXT
              </button>
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

      {/* SUPPORT — quiet, always-reachable capabilities that aren't
          currently competing with NOW. No capability is deleted; every
          item below is one tap from full content. */}
      <div className={`today-support${dominant !== "NONE" ? " today-support--subordinate" : ""}`}>
        <h2 className="section-label">Support</h2>

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
        />
      )}
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
          values={values}
          setValues={setValues}
          quickCheckInValues={quickCheckInValues}
          onQuickCheckIn={() => void handleQuickCheckIn()}
          onSubmitCheckIn={() => void handleCheckIn()}
        />
      )}

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
        />
      )}

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
        onRequestConversion={requestCaptureConversion}
        onCancelConversion={cancelCaptureConversion}
        onConfirmConversion={() => void confirmCaptureConversion()}
        onResolve={(item) => void handleResolveCapture(item)}
      />

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

      {(daysSinceBackup === null || daysSinceBackup >= BACKUP_NUDGE_THRESHOLD_DAYS) && (
        <p className="meta" style={{ marginTop: 4 }}>
          {daysSinceBackup === null
            ? "No backup on record yet — export one from MORE."
            : `It's been ${daysSinceBackup} days since your last backup — export one from MORE.`}
        </p>
      )}
      </div>
    </div>
  );
}
