/**
 * GRAYSON-TODAY-SPLIT-003 slice B ("one set of actions"): TODAY's handlers, moved unchanged from TodayScreen.tsx.
 * busyRef moved with them, so the in-flight guard still runs first in every handler; TodayScreen reads the same ref
 * for its own taps. Every handler still ends in TODAY's single refresh().
 */
import { CoachCard } from "./CoachCard";
import { shiftRun } from "../../../application/shiftRun";
import { captureCommitFeedback } from "../../feel/feedback";
import { WorkPreparation } from "../../components/WorkPreparation";
import { TodayRoutine } from "../../components/TodayRoutine";
import { SleepMetricSheet } from "./SleepMetricSheet";
import { LogSheet } from "../../components/LogSheet";
import { TodayReviewSupport } from "../../components/TodayReviewSupport";
import { WeeklyReviewReadyLine } from "../../components/WeeklyReviewReadyLine";
import { ShiftRecoveryBrief } from "./ShiftRecoveryBrief";
import { LifeStateBand } from "./LifeStateBand";
import { Orientation } from "./Orientation";
import { CloseCard } from "./CloseCard";
import { ShiftCatchUpCard } from "./ShiftCatchUpCard";
import { WeekAheadView } from "../weekly/WeekAheadView";
import { CheckInSheet } from "./CheckInSheet";
import { useRef } from "react";
import { SystemsLine } from "../systems/SystemsLine";
import { SuitLines } from "./SuitLines";
import { Signal } from "../../components/Signal";
import { useOnline } from "../../hooks/useOnline";
import { performDueDayRollover } from "../../../application/commands";
import { describeRecommendationReason } from "./recommendationCopy";
import { TickNumber } from "../../feel/TickNumber";
import type {
  CaptureItem,
  StateCheckIn,
} from "../../../domain/common/types";
import { Icon } from "../../icons/Icon";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { TodayToasts } from "./TodayToasts";
import { type TodaySnapshot } from "./todayRead";
import { TodayRecommendationDraft } from "./TodayRecommendationDraft";
import { TodayEnergy } from "./TodayEnergy";
import { EatingWindowCard } from "./EatingWindowCard";
import { OperatorHeader } from "../../components/OperatorHeader";
import { SignalRow } from "../../components/SignalRow";
import { CommandSurface } from "../../components/CommandSurface";
import { AdvisorySection } from "./AdvisorySection";
import { convertCaptureToObligation, satisfyObligation } from "../../../application/intentCommands";
import { CommitmentQuickActions } from "./CommitmentQuickActions";
import type { Obligation } from "../../../domain/intent/types";
import { isCheckInComplete, type CheckInValues } from "./checkInFields";
import {
  resolveWorkContextSource,
} from "./workContextCopy";
import { useRedCapacityOverrideGate } from "../../hooks/useRedCapacityOverrideGate";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";
import { useUndoWindow } from "../../hooks/useUndoWindow";
import { undoCheckInCorrection, type CheckInCorrectionResult } from "../../../application/checkInCorrectionCommands";
import { type SessionOutcome } from "./resetShiftDownCopy";
import { ActiveWorkoutCard } from "./ActiveWorkoutCard";
import { WorkoutCall } from "./WorkoutCall";
import { QuickLog } from "./QuickLog";
import { NightClosed } from "./NightClosed";
import type { TrainDestination } from "../train/TrainScreen";
import { logMeal, voidMealLog } from "../../../application/nutritionCommands";
import type { SavedMeal } from "../../../domain/common/types";
import { ResetCard } from "./ResetCard";
import { ShiftDownCard } from "./ShiftDownCard";
import { EndDayCard } from "./EndDayCard";
import { CommitmentsCard } from "./CommitmentsCard";
import { canConfirmCapturePromotion, capturePromotionError, capturePromotionInput, emptyCapturePromotionDraft, type CapturePromotionDraft } from "../../components/CapturePromotionForm";
import { suggestCaptureDueDate } from "../../../engine/captureIntelligence";
import type { CaptureDateSuggestion } from "../../../domain/capture/types";
import { CheckInCard } from "./CheckInCard";
import { WorkContextCard } from "./WorkContextCard";
import { RecommendationCard } from "./RecommendationCard";
import { ConsoleControls } from "./ConsoleControls";
import { EarlyStartRow } from "./EarlyStartRow";
import { SmallSteps } from "./SmallSteps";
import { MetricDetailSheet } from "../../metrics/MetricDetailSheet";
import { LogEntrySheet } from "../../components/LogEntrySheet";
import { ShiftMarkSheet } from "../../components/ShiftMarkSheet";
import {
  startDayFromTap,
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
  type RecommendationHandoffTarget,
} from "../../../application/queries";
import type { ScheduledContext } from "../../../engine/scheduledContext";
import {
  getActiveWorkoutSession,
} from "../../../application/trainQueries";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { checkInDraftDecision } from "../../../engine/checkInDraft";
import {
  type ToolsItem,
} from "./shiftClock";
import { DecryptNumber } from "./DecryptNumber";
import { TodayNumbers } from "./TodayNumbers";
import { ModeHeader } from "./ModeHeader";
import { ActiveExperimentLine } from "./ActiveExperimentLine";
import { ShiftHandoff } from "../../components/ShiftHandoff";
import { clearModePin } from "../../../application/modePinQueries";
import { nextRolloverBoundaryAfter } from "../../../engine/dayRollover";
import { describeError } from "../../errorMessage";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { Capacity } from "../../../domain/common/types";
import type { CheckInDraft } from "../../../engine/checkInDraft";

/** UNDO-001: what a TODAY log banner needs to undo the entry it confirms. */
export type LoggedEntry = { amount: number; eventId: string; dayId: string };

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

/** Bounds for nudging a sleep draft: 15 min to 16 h. */
export const SLEEP_DRAFT_ADJUST_MIN = 15;
export const SLEEP_DRAFT_ADJUST_MAX = 16 * 60;
const SLEEP_DRAFT_DISMISSED_KEY = "beyond:sleepDraftDismissedDay";

/** NOT NOW is remembered on this phone only (localStorage); unavailable storage simply means it isn't remembered. */
export function readSleepDraftDismissal(): string | null {
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

/** TODAY's own state the handlers read and write: local values, setters and derived placement. */
export interface TodayActionsUi {
  /** Persistence stays imported by TodayScreen.tsx only (its architecture allowlist entry); passed in unchanged. */
  dismissOutcome: (recommendationId: string) => void;
  activeCheckInDraft: CheckInDraft | undefined;
  activeResetId: string | null;
  activeShiftDownId: string | null;
  busy: boolean;
  captureConversion: { id: string; text: string; } | null;
  captureText: string;
  checkInFormValues: Partial<CheckInValues>;
  commandFocus: ToolsItem | "SHIFT_HANDOFF" | "SMALL_STEPS" | null | undefined;
  commitmentConfirmation: { id: string; title: string; } | null;
  commitmentSatisfactionPendingRef: RefObject<boolean>;
  conversionDraft: CapturePromotionDraft;
  fixUndo: { message: string; correctionEventId?: string; } | null;
  guard: (capacity: Capacity | null, action: () => void | Promise<void>) => void;
  hydrationConfirmation: LoggedEntry | null;
  justResolvedCapture: { id: string; text: string; } | null;
  liftedShiftDown: boolean;
  mdProteinInput: string;
  mdWaterInput: string;
  mealConfirmation: (LoggedEntry & { message: string; }) | null;
  operationsOnly: boolean;
  patchSnapshot: (patch: Partial<TodaySnapshot>) => void;
  proteinConfirmation: LoggedEntry | null;
  resetIntensity: 2 | 1 | 3 | 4 | 5;
  scheduledContext: ScheduledContext | null;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setCaptureConversion: Dispatch<SetStateAction<{ id: string; text: string; } | null>>;
  setCaptureConversionFeedback: Dispatch<SetStateAction<{ kind: "SUCCESS" | "ERROR"; message: string; } | null>>;
  setCaptureFeedback: Dispatch<SetStateAction<{ kind: "SUCCESS" | "ERROR"; message: string; } | null>>;
  setCaptureText: Dispatch<SetStateAction<string>>;
  setCheckInDraftDismissed: Dispatch<SetStateAction<boolean>>;
  setCheckInError: Dispatch<SetStateAction<string | null>>;
  setCheckInFormOpen: Dispatch<SetStateAction<boolean>>;
  setCheckInOutcome: Dispatch<SetStateAction<string | null>>;
  setCommitmentConfirmation: Dispatch<SetStateAction<{ id: string; title: string; } | null>>;
  setCommitmentFeedback: Dispatch<SetStateAction<{ kind: "SUCCESS" | "ERROR"; message: string; } | null>>;
  setCommitmentsOpen: Dispatch<SetStateAction<boolean>>;
  setConversionDateSuggestion: Dispatch<SetStateAction<CaptureDateSuggestion | null>>;
  setConversionDraft: Dispatch<SetStateAction<CapturePromotionDraft>>;
  setEndDayBlockedByWorkout: Dispatch<SetStateAction<boolean>>;
  setEndDayOpen: Dispatch<SetStateAction<boolean>>;
  setFixUndo: (next: { message: string; correctionEventId?: string; } | null) => void;
  setHydrationConfirmation: Dispatch<SetStateAction<LoggedEntry | null>>;
  setHydrationManualOpen: Dispatch<SetStateAction<boolean>>;
  setHydrationOperationOpen: Dispatch<SetStateAction<boolean>>;
  setJustResolvedCapture: Dispatch<SetStateAction<{ id: string; text: string; } | null>>;
  setJustStartedDay: Dispatch<SetStateAction<boolean>>;
  setLastResetOutcome: Dispatch<SetStateAction<SessionOutcome | null>>;
  setLastShiftDownOutcome: Dispatch<SetStateAction<SessionOutcome | null>>;
  setMdProteinInput: Dispatch<SetStateAction<string>>;
  setMdWaterInput: Dispatch<SetStateAction<string>>;
  setMealConfirmation: Dispatch<SetStateAction<(LoggedEntry & { message: string; }) | null>>;
  setMinimumDayOpen: Dispatch<SetStateAction<boolean>>;
  setNow: Dispatch<SetStateAction<Date>>;
  setOrientationOpen: Dispatch<SetStateAction<boolean>>;
  setProteinConfirmation: Dispatch<SetStateAction<LoggedEntry | null>>;
  setShiftDownOpen: Dispatch<SetStateAction<boolean>>;
  setSleepConfirmation: Dispatch<SetStateAction<LoggedEntry | null>>;
  setSleepDraftAdjust: Dispatch<SetStateAction<number>>;
  setSleepDraftDismissedDayId: Dispatch<SetStateAction<string | null>>;
  setStaleRefresh: Dispatch<SetStateAction<"IDLE" | "RUNNING" | "HELD" | "FAILED">>;
  setToolsOpen: Dispatch<SetStateAction<boolean>>;
  setUndoFailure: Dispatch<SetStateAction<string | null>>;
  setValues: Dispatch<SetStateAction<Partial<CheckInValues>>>;
  setWorkContextOpen: Dispatch<SetStateAction<boolean>>;
  shiftDownDuration: number;
  shiftDownIsRow: boolean;
  shiftDownStartRef: RefObject<HTMLButtonElement | null>;
  sleepConfirmation: LoggedEntry | null;
  staleRefresh: "IDLE" | "RUNNING" | "HELD" | "FAILED";
}

/** The shell's callbacks a handler may call. */
export interface TodayActionsCallbacks {
  onOpenTrain: ((destination: TrainDestination) => void) | undefined;
  onWorkContextChanged: (() => void) | undefined;
  onWorkEnded: (() => void) | undefined;
}

export interface TodayActionsInput {
  /** TODAY's one read (slice A). */
  snapshot: TodaySnapshot;
  /** TODAY's single refresh() entry point. */
  refresh: () => Promise<void>;
  ui: TodayActionsUi;
  callbacks: TodayActionsCallbacks;
}

export function useTodayActions({ snapshot, refresh, ui, callbacks }: TodayActionsInput) {
  const { day, recommendation, pendingOutcome } = snapshot;
  const {
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
  } = ui;
  const { onOpenTrain, onWorkContextChanged, onWorkEnded } = callbacks;
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
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      // EARLY-DAY-START-001: in the afternoon window the tap opens tonight's 16:30 day early.
      const started = await startDayFromTap();
      acknowledge("LIGHT");
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
      // GRAYSON C1.1/C1.2: a deliberate START DAY opens Orientation on any kind of day (work, recovery, day off,
      // unconfirmed). Never over an operation already in progress.
      if (!operationsOnly && started) setOrientationOpen(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  /** OWNER-GO-001: "Still RECOVER: …" or "Now NO ACTION REQUIRED: …", from the recommendation the check-in issued. */
  function describeCheckInOutcome(before: string | null, after: { kind: string; title: string; rationale: string }): string {
    const reason = describeRecommendationReason(after.rationale).replace(/\.$/, "");
    return before === after.kind ? `Still: ${after.title}. ${reason}. This check-in didn't change it.` : `Now: ${after.title}. ${reason}.`;
  }

  async function handleSameAsLast() {
    const acknowledge = captureCommitFeedback();
    const last = activeCheckInDraft?.value;
    if (busy || busyRef.current || !last) return;
    busyRef.current = true;
    setBusy(true);
    setCheckInError(null);
    const before = recommendation?.kind ?? null;
    try {
      const activeDay = await ensureActiveDay();
      const { recommendation: issued } = await submitCheckIn(activeDay.id, last);
      acknowledge("MEDIUM");
      setCheckInOutcome(describeCheckInOutcome(before, issued));
      setValues({});
      setCheckInFormOpen(false);
      await refresh();
    } catch (cause) {
      setCheckInError(describeError(cause, "Check-in didn’t save. Try again."));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCheckIn() {
    const acknowledge = captureCommitFeedback();
    const submitted = checkInFormValues;
    if (busy || busyRef.current || !isCheckInComplete(submitted)) return;
    busyRef.current = true;
    setBusy(true);
    setCheckInError(null);
    let committed = false;
    try {
      const activeDay = await ensureActiveDay();
      const before = recommendation?.kind ?? null;
      const { recommendation: issued } = await submitCheckIn(activeDay.id, submitted,
        operationsOnly && commandFocus === undefined && activeCheckInDraft ? checkInDraftDecision(activeCheckInDraft.value, submitted) : undefined);
      committed = true;
      setCheckInOutcome(describeCheckInOutcome(before, issued));
      acknowledge("MEDIUM");
      setCheckInDraftDismissed(false);
      setValues({});
      setCheckInFormOpen(false);
      await refresh();
    } catch (cause) {
      setCheckInError(committed ? "Check-in saved. Readings didn’t refresh. Reopen TODAY." : describeError(cause, "Check-in didn’t save. Try again."));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleQuickCheckIn() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      const before = recommendation?.kind ?? null;
      const { recommendation: issued } = await submitCheckIn(activeDay.id, quickCheckInValues);
      setCheckInOutcome(describeCheckInOutcome(before, issued));
      acknowledge("MEDIUM");
      await refresh();
      setValues({});
      setCheckInFormOpen(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  /** GRAYSON-CHECKIN-EDIT-001: a fix saved (or put back) in the fix sheet. Today's advice was re-worked by the command. */
  async function handleCheckInFixed(result: CheckInCorrectionResult, before: string | null = recommendation?.kind ?? null) {
    if (result.status === "NO_OP") { setFixUndo({ message: "Nothing changed." }); return; }
    if (result.status !== "CORRECTED" && result.status !== "UNDONE") return;
    const outcome = result.recommendation ? ` ${describeCheckInOutcome(before, result.recommendation).replace(" This check-in didn't change it.", "")}` : "";
    setCheckInOutcome(null);
    setFixUndo(result.status === "CORRECTED"
      ? { message: `Check-in fixed.${outcome}`, correctionEventId: result.correctionEventId }
      : { message: `Fix put back.${outcome}` });
    await refresh();
  }

  async function handleUndoCheckInFix() {
    const acknowledge = captureCommitFeedback();
    const target = fixUndo?.correctionEventId;
    if (!target || busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await undoCheckInCorrection(target);
      if (result.status === "UNDONE") acknowledge("MEDIUM");
      setFixUndo({ message: result.status === "UNDONE" ? "Fix undone." : "That fix was already changed." });
      await refresh();
    } catch (cause) {
      setCheckInError(describeError(cause, "Undo didn't save. Try again."));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleRecord() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day || !recommendation) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await recordRecommendation(day.id, recommendation);
      acknowledge("LIGHT");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function actuallyDecline() {
    const acknowledge = captureCommitFeedback();
    if (!day || !recommendation) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await declineRecommendation(day.id, recommendation, { overrideConfirmed: true });
      acknowledge("LIGHT");
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
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await startReset(day.id, resetIntensity);
      acknowledge("LIGHT");
      setLastResetOutcome(null);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCompleteReset() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day || !activeResetId) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await completeReset(day.id, activeResetId);
      acknowledge("LIGHT");
      setLastResetOutcome("COMPLETED");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  /** Distinct from completing — "started this but didn't go through with it," never recorded as done. */
  async function handleCancelReset() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day || !activeResetId) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await cancelReset(day.id, activeResetId);
      acknowledge("HEAVY");
      setLastResetOutcome("CANCELLED");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleStartShiftDown() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await startShiftDown(day.id, shiftDownDuration);
      acknowledge("LIGHT");
      setLastShiftDownOutcome(null);
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCompleteShiftDown() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day || !activeShiftDownId) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await completeShiftDown(day.id, activeShiftDownId);
      acknowledge("LIGHT");
      setLastShiftDownOutcome("COMPLETED");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCancelShiftDown() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day || !activeShiftDownId) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await cancelShiftDown(day.id, activeShiftDownId);
      acknowledge("HEAVY");
      setLastShiftDownOutcome("CANCELLED");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleEndDay() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await endDay(day.id, "EXPLICIT_END_DAY");
      acknowledge("HEAVY");
      clearModePin(day.id);
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
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day || !scheduledContext) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const source = resolveWorkContextSource(scheduledContext.todayIsScheduledWorkDay, value);
      await setWorkContext(day.id, value, source);
      acknowledge("LIGHT");
      await refresh();
      onWorkContextChanged?.();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // DROP 0: one tap flips the saved schedule's value for this day. Always a
  // MANUAL declaration, so it wins for the rest of the day and shows in History.
  async function handleChangeStandingWorkContext() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day || day.workContext === "UNKNOWN") return;
    busyRef.current = true;
    setBusy(true);
    try {
      await setWorkContext(day.id, day.workContext === "WORK" ? "OFF" : "WORK", "MANUAL");
      acknowledge("LIGHT");
      setWorkContextOpen(false);
      await refresh();
      onWorkContextChanged?.();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // SLEEP DRAFT: one tap logs the (possibly nudged) draft as main sleep,
  // recording whether it was confirmed as proposed or adjusted first.
  async function handleLogSleepDraft(minutes: number, adjusted: boolean) {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const eventId = await logSleep(day.id, minutes, "PRIMARY", adjusted ? "ADJUSTED" : "CONFIRMED");
      acknowledge("LIGHT");
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
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (await markWorkEnded(day.id)) acknowledge("LIGHT");
      setWorkContextOpen(false);
      await refresh();
      onWorkEnded?.();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleCapture() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !captureText.trim()) return;
    busyRef.current = true;
    setBusy(true);
    setCaptureFeedback(null);
    try {
      await captureItem(captureText);
      acknowledge("LIGHT");
      setCaptureText("");
      setCaptureFeedback({ kind: "SUCCESS", message: "Note saved in Capture. It is also searchable in MORE." });
      try { await refresh(); }
      catch (cause) { setCaptureFeedback({ kind: "ERROR", message: `Note saved. ${describeError(cause, "Could not refresh the list.")} Do not save it again; inspect it in MORE → SEARCH.` }); }
    } catch (cause) {
      setCaptureFeedback({ kind: "ERROR", message: `${describeError(cause, "Could not save the note.")} Your text is kept; try CAPTURE again when ready.` });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleResolveCapture(item: CaptureItem) {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await resolveCaptureItem(item.id);
      acknowledge("LIGHT");
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
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || commitmentSatisfactionPendingRef.current || !commitmentConfirmation) return;
    const target = commitmentConfirmation;
    commitmentSatisfactionPendingRef.current = true;
    busyRef.current = true;
    setBusy(true);
    setCommitmentFeedback(null);
    try {
      if (await satisfyObligation(target.id)) acknowledge("LIGHT");
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
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !justResolvedCapture) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (await reopenCaptureItem(justResolvedCapture.id)) acknowledge("LIGHT");
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
    const suggestion = suggestCaptureDueDate(item.text, new Date());
    setConversionDateSuggestion(suggestion);
    setConversionDraft({ ...emptyCapturePromotionDraft(item.text), dueAt: suggestion?.dueAt ?? "" });
    setCaptureConversion({ id: item.id, text: item.text });
  }

  function cancelCaptureConversion() {
    if (busy || busyRef.current) return;
    setCaptureConversion(null);
    setConversionDraft(emptyCapturePromotionDraft());
    setConversionDateSuggestion(null);
  }

  async function confirmCaptureConversion() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !captureConversion || !canConfirmCapturePromotion(conversionDraft)) return;
    const target = captureConversion;
    const input = capturePromotionInput(conversionDraft);
    busyRef.current = true;
    setBusy(true);
    setCaptureConversionFeedback(null);
    try {
      await convertCaptureToObligation(target.id, input);
      acknowledge("LIGHT");
      setCaptureConversion(null);
      setConversionDraft(emptyCapturePromotionDraft());
      setConversionDateSuggestion(null);
      await refresh();
      setCaptureConversionFeedback({
        kind: "SUCCESS",
        message: input.plannedAt
          ? `Plan item created: ${input.title}. Its planned day is separate from its deadline.`
          : `Task created: ${input.title}`,
      });
    } catch (error) {
      // The typed draft stays open so a retry needs no retyping.
      setCaptureConversionFeedback({
        kind: "ERROR",
        message: capturePromotionError(error, "Could not create the task. Your capture and choices are kept."),
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleEnableMinimumDay() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await enableMinimumDay(day.id);
      acknowledge("LIGHT");
      await refresh();
      setMinimumDayOpen(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleMarkMinimum(kind: "MEDS" | "HYGIENE" | "MOVE" | "RECOVER" | "CONNECT") {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !day) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (kind === "MEDS") await markMedsCompleted(day.id);
      else if (kind === "HYGIENE") await markHygieneCompleted(day.id);
      else if (kind === "MOVE") await markMoveCompleted(day.id);
      else await markRecoverConnectCompleted(day.id, kind);
      acknowledge("LIGHT");
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  /** UNDO-001: UNDO on a just-logged banner voids that entry — never an erase. */
  async function handleUndoLog(log: "WATER" | "SLEEP" | "PROTEIN" | "MEAL") {
    const acknowledge = captureCommitFeedback();
    const confirmation = { WATER: hydrationConfirmation, SLEEP: sleepConfirmation, PROTEIN: proteinConfirmation, MEAL: mealConfirmation }[log];
    if (busy || busyRef.current || !confirmation) return;
    const voidLog = { WATER: voidWaterLog, SLEEP: voidSleepLog, PROTEIN: voidProteinLog, MEAL: voidMealLog }[log];
    const clear = {
      WATER: setHydrationConfirmation,
      SLEEP: setSleepConfirmation,
      PROTEIN: setProteinConfirmation,
      MEAL: () => setMealConfirmation(null),
    }[log];
    busyRef.current = true;
    setBusy(true);
    setUndoFailure(null);
    try {
      if (await voidLog(confirmation.dayId, confirmation.eventId)) acknowledge("HEAVY");
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

  /**
   * TONIGHT-001: QUICK LOG and the MEAL sheet log a saved meal through the
   * same canonical command BODY uses, then show TODAY's usual confirmation
   * with UNDO (a MEAL_LOG_VOIDED, never a deletion).
   */
  async function handleLogSavedMeal(meal: SavedMeal): Promise<boolean> {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setUndoFailure(null);
    try {
      const activeDay = await ensureActiveDay();
      const { eventId } = await logMeal(activeDay.id, meal.id);
      acknowledge("LIGHT");
      setMealConfirmation({ amount: meal.calories, eventId, dayId: activeDay.id, message: `${meal.name} logged · ${meal.calories} kcal · ${meal.proteinG} g.` });
      try { await refresh(); } catch { setUndoFailure("Meal saved. Readings didn’t refresh. Reopen TODAY."); }
      return true;
    } catch (e) {
      setUndoFailure(describeError(e, "Meal not saved. Try again."));
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // OWNER-GO-001 (Gavin: "it says delete or undo. That can go away"): a log confirms with its message only.


  /**
   * Item 3 (Phase 3): logs directly from the same commands/events BODY
   * uses (logWater/logProtein) — no separate record-keeping path, so
   * there's no way for this to create a duplicate of a BODY-side log.
   */
  async function handleMinimumDayLogWater(amountOverride?: number) {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current) return false;
    const amount = amountOverride ?? Number(mdWaterInput);
    if (!Number.isFinite(amount) || amount <= 0) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logWater(activeDay.id, amount);
      acknowledge("LIGHT");
      setMdWaterInput("");
      patchSnapshot({ lastWaterAmount: amount });
      try { await refresh(); } catch { setUndoFailure("Water saved. Readings didn’t refresh. Reopen TODAY."); }
      setHydrationConfirmation({ amount, eventId, dayId: activeDay.id });
      setHydrationOperationOpen(false);
      setHydrationManualOpen(false);
      return true;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleMinimumDayLogProtein() {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current) return;
    const grams = Number(mdProteinInput);
    if (!Number.isFinite(grams) || grams <= 0) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logProtein(activeDay.id, grams);
      acknowledge("LIGHT");
      setMdProteinInput("");
      await refresh();
      setProteinConfirmation({ amount: grams, eventId, dayId: activeDay.id });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleRateOutcome(rating: "GOOD" | "NEUTRAL" | "BAD") {
    const acknowledge = captureCommitFeedback();
    if (busy || busyRef.current || !pendingOutcome) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await rateOutcome(pendingOutcome.beyondDayId, pendingOutcome.id, rating);
      acknowledge("LIGHT");
      patchSnapshot({ pendingOutcome: null });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function handleDismissOutcome() {
    if (!pendingOutcome) return;
    dismissOutcome(pendingOutcome.id);
    patchSnapshot({ pendingOutcome: null });
  }

  /** REFRESH: the existing rollover check, then TODAY's own re-read. The new day plays the decrypt. */
  async function handleStaleRefresh() {
    if (busyRef.current || staleRefresh === "RUNNING") return;
    setStaleRefresh("RUNNING");
    try {
      await performDueDayRollover().catch(() => undefined);
      await refresh();
      const current = await getActiveDay();
      const at = new Date();
      setNow(at);
      const stillStale = !!current && at.getTime() >= nextRolloverBoundaryAfter(new Date(current.startedAt)).getTime();
      setStaleRefresh(!stillStale ? "IDLE" : (await getActiveWorkoutSession()) ? "HELD" : "FAILED");
    } catch {
      setStaleRefresh("FAILED");
    }
  }

  return {
    busyRef,
    handleRecommendationHandoff,
    handleStartDay,
    describeCheckInOutcome,
    handleSameAsLast,
    handleCheckIn,
    handleQuickCheckIn,
    handleCheckInFixed,
    handleUndoCheckInFix,
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
    handleLogSleepDraft,
    dismissSleepDraft,
    handleMarkWorkEnded,
    handleCapture,
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
  };
}

/** TODAY's one set of actions. */
export type TodayActions = ReturnType<typeof useTodayActions>;
