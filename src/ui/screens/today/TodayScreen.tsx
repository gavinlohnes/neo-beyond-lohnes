import { useEffect, useState } from "react";
import type { BeyondDay, CaptureItem, Recommendation, StateCheckIn } from "../../../domain/common/types";
import { ConfirmIcon, Icon, ResolveIcon, SignalIcon } from "../../icons/Icon";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { SignalRow } from "../../components/SignalRow";
import { deriveAttentionPlan, isInAttention } from "./attentionPolicy";
import { describeCommitmentsSummary, describeObligationRelevance } from "./commitmentsCopy";
import {
  getMostRelevantUnresolvedObligation,
  hasObligationRequiringAttention,
  isAttentionWorthyTier,
} from "../../../engine/obligationRelevance";
import { getCurrentlyEligibleUnresolvedObligations } from "../../../application/intentQueries";
import { formatLocalDate } from "../../../engine/scheduledContext";
import type { Obligation } from "../../../domain/intent/types";
import {
  CHECK_IN_FIELDS,
  describeCheckInValues,
  isCheckInComplete,
  rangeForField,
  type CheckInValues,
  type PartialCheckInValues,
} from "./checkInFields";
import { describeContextStrip, describeSchedulePrediction, resolveWorkContextSource } from "./workContextCopy";
import { describeCapacity } from "./capacityCopy";
import { deriveCapacity } from "../../../engine/capacity";
import {
  DECLINE_LABEL,
  describeEvidenceBasis,
  describeRecommendationAction,
  describeRecommendationEffect,
  describePriorOutcomeMemory,
  describeRecordedDecision,
  describeTraceLabel,
  describeTraceValue,
} from "./recommendationCopy";
import { dismissOutcome, isOutcomeDismissed } from "../../../persistence/outcomeDismissals";
import { useRedCapacityOverrideGate } from "../../hooks/useRedCapacityOverrideGate";
import {
  describeMinimumDaySummary,
  isSeriouslyConstrained,
  MINIMUM_DAY_ENABLE_BODY,
  MINIMUM_DAY_ITEMS,
  MINIMUM_DAY_PROMINENT_BODY,
  MINIMUM_DAY_PROMINENT_TITLE,
} from "./minimumDayCopy";
import {
  describeResetInProgress,
  describeResetResult,
  describeShiftDownInProgress,
  describeShiftDownResult,
  isPrimaryReset,
  isPrimaryShiftDown,
  RESET_EXPLANATION,
  RESET_EXPLANATION_SHORT,
  SHIFT_DOWN_DURATION_PRESETS,
  SHIFT_DOWN_EXPLANATION,
  SHIFT_DOWN_EXPLANATION_SHORT,
  type SessionOutcome,
} from "./resetShiftDownCopy";
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
} from "../../../application/queries";
import { getDaysSinceLastBackup } from "../../../persistence/backup";
import type { ScheduledContext } from "../../../engine/scheduledContext";

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
 * mechanism of its own (see renderCommitmentsCard's doc comment on why
 * VIEW stops at "switch tabs" rather than deep-linking to the specific
 * Obligation).
 */
export function TodayScreen({ onViewCommitments }: { onViewCommitments?: () => void } = {}) {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [checkIn, setCheckIn] = useState<StateCheckIn | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [decision, setDecision] = useState<RecommendationDecision | undefined>(undefined);
  const [priorOutcomeMemory, setPriorOutcomeMemory] = useState<PriorOutcomeMemory | null>(null);
  const [values, setValues] = useState<PartialCheckInValues>({});
  const [busy, setBusy] = useState(false);
  const [activeResetId, setActiveResetId] = useState<string | null>(null);
  const [resetIntensity, setResetIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [openResetStartedAt, setOpenResetStartedAt] = useState<string | null>(null);
  const [lastResetOutcome, setLastResetOutcome] = useState<SessionOutcome | null>(null);
  const [activeShiftDownId, setActiveShiftDownId] = useState<string | null>(null);
  const [shiftDownDuration, setShiftDownDuration] = useState(10);
  const [openShiftDownStartedAt, setOpenShiftDownStartedAt] = useState<string | null>(null);
  const [lastShiftDownOutcome, setLastShiftDownOutcome] = useState<SessionOutcome | null>(null);
  const [suggestEndDay, setSuggestEndDay] = useState(false);
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<Recommendation | null>(null);
  const [scheduledContext, setScheduledContext] = useState<ScheduledContext | null>(null);
  const [workPeriodEndedAt, setWorkPeriodEndedAt] = useState<string | null>(null);
  const [unresolvedPostShift, setUnresolvedPostShift] = useState(false);
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
  const [minimumDay, setMinimumDay] = useState<MinimumDayStatus | null>(null);
  const [minimumDayHydrateOz, setMinimumDayHydrateOz] = useState(0);
  const [minimumDayProteinG, setMinimumDayProteinG] = useState(0);
  const [mdWaterInput, setMdWaterInput] = useState("");
  const [mdProteinInput, setMdProteinInput] = useState("");
  // Product Experience Sprint, P3: RESET/SHIFT DOWN/check-in each default
  // to a compact row once they're not the thing TODAY needs you looking
  // at (see renderResetCard/renderShiftDownCard and the check-in section
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
  // Intent & Commitment Spine, Drop 02: currently-eligible unresolved
  // Obligations, fetched unconditionally like openCaptureItems above —
  // Obligations are not day-scoped either (see application/intentQueries.ts).
  // Intent Lifecycle Integrity (2026-08-23): sourced from
  // getCurrentlyEligibleUnresolvedObligations, not getUnresolvedObligations
  // directly — an Obligation whose parent Mission is ARCHIVED must not
  // participate in COMMITMENT/ATTENTION (see docs/UX_DECISIONS.md).
  const [unresolvedObligations, setUnresolvedObligations] = useState<Obligation[]>([]);
  const [commitmentsOpen, setCommitmentsOpen] = useState(false);
  const { guard, ConfirmPanel } = useRedCapacityOverrideGate();

  useEffect(() => {
    void refresh();
    setDaysSinceBackup(getDaysSinceLastBackup());
    void getScheduledContext().then(setScheduledContext);
  }, []);

  async function refresh() {
    const activeDay = (await getActiveDay()) ?? null;
    setDay(activeDay);
    // Overdrive Phase 10: capture is deliberately not day-scoped ("inbox
    // age is not urgency," and jotting something down shouldn't require a
    // BeyondDay to already exist), so this refreshes unconditionally.
    setOpenCaptureItems(await getOpenCaptureItems());
    // Intent & Commitment Spine, Drop 02: same reasoning — Obligations are
    // not day-scoped either.
    setUnresolvedObligations(await getCurrentlyEligibleUnresolvedObligations());
    if (activeDay) {
      setCheckIn((await getLatestCheckIn(activeDay.id)) ?? null);
      const rec = (await getLatestRecommendation(activeDay.id)) ?? null;
      setRecommendation(rec);
      setDecision(rec ? await getRecommendationDecision(activeDay.id, rec.id) : undefined);
      setPriorOutcomeMemory(rec ? (await getPriorOutcomeMemory(rec)) ?? null : null);
      setSuggestEndDay(await shouldSuggestEndDay(activeDay.id));
      const pending = (await getPendingOutcomeRating(activeDay.id)) ?? null;
      setPendingOutcome(pending && !isOutcomeDismissed(pending.id) ? pending : null);
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
    }
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
      await refresh();
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

  async function handleEnableMinimumDay() {
    if (busy || !day) return;
    setBusy(true);
    try {
      await enableMinimumDay(day.id);
      await refresh();
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
  async function handleMinimumDayLogWater() {
    if (busy) return;
    const amount = Number(mdWaterInput);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    try {
      const activeDay = await ensureActiveDay();
      await logWater(activeDay.id, amount);
      setMdWaterInput("");
      await refresh();
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
    if (busy || !day || !pendingOutcome) return;
    setBusy(true);
    try {
      await rateOutcome(day.id, pendingOutcome.id, rating);
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
    activeResetId,
    activeShiftDownId,
    suggestEndDay,
    hasPendingOutcome: !!pendingOutcome,
    hasUnresolvedCapture: openCaptureItems.length > 0,
    hasCommitmentDue,
  });
  const dominant = attentionPlan.dominant;
  const endDayInAttention = isInAttention(attentionPlan, "END_DAY_SUGGESTED");
  const pendingOutcomeInAttention = isInAttention(attentionPlan, "PENDING_OUTCOME");
  const captureInAttention = isInAttention(attentionPlan, "CAPTURE_UNRESOLVED");
  const commitmentInAttention = isInAttention(attentionPlan, "COMMITMENT_DUE");

  /**
   * Suit Layer 01: the Capture list-row markup was hand-copied verbatim
   * between the ATTENTION-tier list and the TOOLS-tier list (renderCaptureToolsCard) —
   * a real, current duplication, extracted here rather than left as two
   * copies that could quietly drift.
   */
  function renderCaptureListRow(item: CaptureItem) {
    return (
      <div
        key={item.id}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          padding: "8px 0",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <span className="card-body" style={{ margin: 0 }}>{item.text}</span>
        <button
          className="btn-secondary"
          style={{ width: "auto", padding: "6px 12px", fontSize: 16, flexShrink: 0 }}
          disabled={busy}
          onClick={() => void handleResolveCapture(item)}
        >
          RESOLVE
        </button>
      </div>
    );
  }

  /**
   * Harvest Checkpoint 3: `isDominant` is separate from `active` — both
   * RESET and SHIFT DOWN could in principle be simultaneously active
   * (independent state machines, no mutual exclusion enforced), but
   * "exactly one operating surface receives primary visual attention"
   * (COMMAND 3.0's NOW tier) must hold even then. `active` still decides
   * WHAT renders (in-progress content, COMPLETE/CANCEL); `isDominant`
   * only decides whether THIS card gets the corner-flag/card--action
   * leadership treatment — an active-but-not-dominant session (the rare
   * both-active case) still shows full, usable content, just without
   * competing visually with whichever one actually owns NOW.
   */
  function renderResetCard(prominent: boolean, isDominant: boolean) {
    if (!day) return null;
    const active = activeResetId !== null;
    const open = prominent || active || resetOpen;
    if (!open) {
      return (
        <CollapsibleRow
          name="RESET"
          icon={<Icon name="reset" size={20} />}
          summary={RESET_EXPLANATION_SHORT}
          onOpen={() => setResetOpen(true)}
        />
      );
    }
    // BEYOND Suit Implementation 01B: EXECUTION (a genuinely active,
    // dominant RESET) gets the same .command-surface territory as
    // PRIMARY DECISION — it IS the command surface while it's what NOW
    // is showing. Everything else (ordinary tool, or active-but-demoted
    // in the rare both-active case) is .equipment-row, not a card.
    // .signal-row (a real Engine-suggested-but-not-started signal) is
    // unchanged from Suit Layer 01.
    const isCommand = active && isDominant;
    return (
      <div
        key={active ? "in-progress" : "picker"}
        className={`fade-in ${isCommand ? "command-surface" : active ? "equipment-row" : prominent ? "card signal-row" : "equipment-row"}`}
      >
        <p
          className={isCommand ? "command-title" : "tool-label"}
          style={{ marginBottom: 4, color: active ? "var(--accent-strong)" : undefined, display: "flex", alignItems: "center", gap: 6 }}
        >
          {prominent ? <SignalIcon key="on" name="reset" size={20} /> : <Icon key="off" name="reset" size={20} />}
          {active && <span aria-hidden="true" className="diamond" />}
          {active ? "RESET IN PROGRESS" : prominent ? "RECOMMENDED — RESET" : "RESET"}
        </p>
        <p className="card-body" style={{ marginBottom: 12 }}>{RESET_EXPLANATION}</p>
        {active ? (
          <>
            <p className="card-body" style={{ marginBottom: 12 }}>
              {describeResetInProgress(resetIntensity)}
              {openResetStartedAt ? ` Started ${new Date(openResetStartedAt).toLocaleTimeString()}.` : ""}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, ...(isCommand ? { fontSize: 18, padding: "18px var(--space-4)" } : {}) }}
                disabled={busy}
                onClick={() => void handleCompleteReset()}
              >
                COMPLETE RESET
              </button>
              <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleCancelReset()}>
                CANCEL RESET
              </button>
            </div>
          </>
        ) : (
          <>
            {lastResetOutcome && (
              <p className="meta" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <ConfirmIcon size={20} />
                {describeResetResult(lastResetOutcome)}
              </p>
            )}
            <p className="card-body" style={{ marginBottom: 8 }}>
              BODY BEFORE STORY — how much do you need? 1 is a light touch, 5 is fully immersive.
            </p>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip ${resetIntensity === n ? "chip--selected" : ""}`}
                  aria-pressed={resetIntensity === n}
                  disabled={busy}
                  onClick={() => setResetIntensity(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button className="btn-primary" disabled={busy} onClick={() => void handleStartReset()}>
              START RESET
            </button>
          </>
        )}
      </div>
    );
  }

  /** Harvest Checkpoint 3: see renderResetCard's doc comment for `isDominant`. */
  function renderShiftDownCard(prominent: boolean, isDominant: boolean) {
    if (!day) return null;
    const active = activeShiftDownId !== null;
    const open = prominent || active || shiftDownOpen;
    if (!open) {
      return (
        <CollapsibleRow
          name="SHIFT DOWN"
          icon={<Icon name="shiftDown" size={20} />}
          summary={SHIFT_DOWN_EXPLANATION_SHORT}
          onOpen={() => setShiftDownOpen(true)}
        />
      );
    }
    const isCommand = active && isDominant;
    return (
      <div
        key={active ? "in-progress" : "picker"}
        className={`fade-in ${isCommand ? "command-surface" : active ? "equipment-row" : prominent ? "card signal-row" : "equipment-row"}`}
      >
        <p
          className={isCommand ? "command-title" : "tool-label"}
          style={{ marginBottom: 4, color: active ? "var(--accent-strong)" : undefined, display: "flex", alignItems: "center", gap: 6 }}
        >
          {prominent ? <SignalIcon key="on" name="shiftDown" size={20} /> : <Icon key="off" name="shiftDown" size={20} />}
          {active && <span aria-hidden="true" className="diamond" />}
          {active ? "SHIFT DOWN IN PROGRESS" : prominent ? "RECOMMENDED — SHIFT DOWN" : "SHIFT DOWN"}
        </p>
        <p className="card-body" style={{ marginBottom: 12 }}>{SHIFT_DOWN_EXPLANATION}</p>
        {active ? (
          <>
            <p className="card-body" style={{ marginBottom: 12 }}>
              {describeShiftDownInProgress(shiftDownDuration)}
              {openShiftDownStartedAt ? ` Started ${new Date(openShiftDownStartedAt).toLocaleTimeString()}.` : ""}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, ...(isCommand ? { fontSize: 18, padding: "18px var(--space-4)" } : {}) }}
                disabled={busy}
                onClick={() => void handleCompleteShiftDown()}
              >
                COMPLETE SHIFT DOWN
              </button>
              <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleCancelShiftDown()}>
                CANCEL SHIFT DOWN
              </button>
            </div>
          </>
        ) : (
          <>
            {lastShiftDownOutcome && (
              <p className="meta" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <ConfirmIcon size={20} />
                {describeShiftDownResult(lastShiftDownOutcome)}
              </p>
            )}
            <p className="meta" style={{ marginBottom: 8 }}>How many minutes?</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {SHIFT_DOWN_DURATION_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip ${shiftDownDuration === n ? "chip--selected" : ""}`}
                  style={{ minWidth: 50 }}
                  aria-pressed={shiftDownDuration === n}
                  disabled={busy}
                  onClick={() => setShiftDownDuration(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
              <span className="meta">Custom:</span>
              <input
                type="number"
                min={1}
                value={shiftDownDuration}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setShiftDownDuration(Number.isNaN(v) || v < 1 ? 1 : v);
                }}
                className="input"
                style={{ flex: 1 }}
              />
              <span className="meta">min</span>
            </div>
            <button className="btn-primary" disabled={busy} onClick={() => void handleStartShiftDown()}>
              START SHIFT DOWN
            </button>
          </>
        )}
      </div>
    );
  }

  function renderMinimumDayCard(prominent: boolean) {
    if (!minimumDay) return null;
    // FIELD ALPHA Gate A correction: the prominent (seriously
    // constrained, not yet enabled) case already earns its full visible
    // presence via existing product truth (isSeriouslyConstrained) and
    // is unchanged. Everywhere else, Minimum Day defaults to a compact
    // GLANCE-depth CollapsibleRow — its full six-item contents (once
    // enabled) or its enable offer (once not) were consuming substantial
    // vertical space even when it wasn't the operator's primary concern.
    if (!prominent && !minimumDayOpen) {
      return (
        <CollapsibleRow
          name="MINIMUM DAY"
          summary={describeMinimumDaySummary(minimumDay)}
          onOpen={() => setMinimumDayOpen(true)}
        />
      );
    }
    return (
      <div className={prominent ? "card signal-row" : "equipment-row"}>
        <p className="tool-label" style={{ marginBottom: 4 }}>MINIMUM DAY</p>
        {!minimumDay.enabled ? (
          <>
            <h2 className="card-title">{prominent ? MINIMUM_DAY_PROMINENT_TITLE : "Reduced baseline"}</h2>
            <p className="card-body" style={{ marginBottom: 12 }}>
              {prominent ? MINIMUM_DAY_PROMINENT_BODY : MINIMUM_DAY_ENABLE_BODY}
            </p>
            <button className="btn-primary" disabled={busy} onClick={() => void handleEnableMinimumDay()}>
              ENABLE MINIMUM DAY
            </button>
          </>
        ) : (
          <>
            {MINIMUM_DAY_ITEMS.map((item) => {
              const done = minimumDay[item.key];
              return (
                <div key={item.key} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="card-body" style={{ margin: 0 }}>
                      {done && <span aria-hidden="true" className="diamond" style={{ marginRight: 6, verticalAlign: 1 }} />}
                      {item.label}
                      {item.key === "hydrate" ? ` — ${minimumDayHydrateOz}oz logged` : ""}
                      {item.key === "protein" ? ` — ${minimumDayProteinG}g logged` : ""}
                    </span>
                    {!done && item.key === "meds" && (
                      <button
                        className="btn-secondary"
                        style={{ width: "auto", padding: "4px 12px", fontSize: 16 }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("MEDS")}
                      >
                        MARK DONE
                      </button>
                    )}
                    {!done && item.key === "hygiene" && (
                      <button
                        className="btn-secondary"
                        style={{ width: "auto", padding: "4px 12px", fontSize: 16 }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("HYGIENE")}
                      >
                        MARK DONE
                      </button>
                    )}
                    {!done && item.key === "move" && (
                      <button
                        className="btn-secondary"
                        style={{ width: "auto", padding: "4px 12px", fontSize: 16 }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("MOVE")}
                      >
                        MARK DONE
                      </button>
                    )}
                  </div>
                  <p className="meta" style={{ marginTop: 4 }}>{item.updateNote}</p>
                  {!done && item.key === "hydrate" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input
                        type="number"
                        min={0}
                        placeholder="oz"
                        value={mdWaterInput}
                        onChange={(e) => setMdWaterInput(e.target.value)}
                        className="input"
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-primary"
                        style={{ width: "auto", padding: "8px 14px", fontSize: 16 }}
                        disabled={busy || !(Number(mdWaterInput) > 0)}
                        onClick={() => void handleMinimumDayLogWater()}
                      >
                        LOG WATER
                      </button>
                    </div>
                  )}
                  {!done && item.key === "protein" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input
                        type="number"
                        min={0}
                        placeholder="g"
                        value={mdProteinInput}
                        onChange={(e) => setMdProteinInput(e.target.value)}
                        className="input"
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-primary"
                        style={{ width: "auto", padding: "8px 14px", fontSize: 16 }}
                        disabled={busy || !(Number(mdProteinInput) > 0)}
                        onClick={() => void handleMinimumDayLogProtein()}
                      >
                        LOG PROTEIN
                      </button>
                    </div>
                  )}
                  {!done && item.key === "recoverConnect" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button
                        className="btn-secondary"
                        style={{ flex: 1, padding: "6px 12px", fontSize: 16 }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("RECOVER")}
                      >
                        MARK RECOVER
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ flex: 1, padding: "6px 12px", fontSize: 16 }}
                        disabled={busy}
                        onClick={() => void handleMarkMinimum("CONNECT")}
                      >
                        MARK CONNECT
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  const evidenceBasis = describeEvidenceBasis(checkIn !== null);

  /**
   * Harvest Checkpoint 3 (NOW): the recommendation card, extracted into
   * its own function so it can render either as the dominant NOW surface
   * (full card--action + corner-flag) or — once an active RESET/SHIFT
   * DOWN takes over dominance — as a quiet TOOLS-tier CollapsibleRow,
   * still one tap from the full WHY trace and accept/decline. Recording
   * a decision remains available either way; only its visual weight
   * changes. STATUS's own context-strip line used to live inside this
   * card's header — moved out to its own compact, always-visible line
   * (see the STATUS block in the return below) so it reads even before
   * a check-in exists, and so this card is purely about the one
   * decision it's asking for.
   */
  function renderRecommendationCard(isDominant: boolean) {
    if (!day || !recommendation) return null;
    const open = isDominant || recommendationOpen;
    if (!open) {
      return (
        <CollapsibleRow
          name="RECOMMENDATION"
          summary={decision ? `${recommendation.title} — ${describeRecordedDecision(decision)}` : recommendation.title}
          onOpen={() => setRecommendationOpen(true)}
        />
      );
    }
    // BEYOND Suit Implementation 01B: three distinct silhouettes, not
    // one card with modifier classes.
    //   - ALL CLEAR: .all-clear — no surface, no red, quiet text
    //     directly on the black field (Part 2/4).
    //   - PRIMARY DECISION (dominant): .command-surface — a bold left
    //     red bar + --surface-active (a flat, dark red-black wash, no
    //     gradient) it now finally uses; big .command-title. This is
    //     the one genuinely dominant territory on the screen.
    //   - Demoted (some other surface — an active RESET/SHIFT DOWN —
    //     is dominant instead): .equipment-row, same quiet TOOLS-tier
    //     treatment every other tool gets. Still full content, one tap
    //     away either way — nothing here changes what's reachable.
    // ResolveIcon vs. ConfirmIcon (Suit Implementation 01) is unchanged:
    // NO_ACTION_REQUIRED's own title/rationale stays Engine-authored,
    // untouched.
    const isAllClear = recommendation.kind === "NO_ACTION_REQUIRED";
    const wrapperClassName = isAllClear ? "all-clear fade-in" : isDominant ? "command-surface fade-in" : "equipment-row fade-in";
    return (
      <div key={recommendation.id} className={wrapperClassName}>
        <h2 className={isDominant || isAllClear ? "command-title" : "tool-label"} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAllClear ? <ConfirmIcon size={isDominant ? 24 : 20} /> : <ResolveIcon size={isDominant ? 28 : 20} />}
          {recommendation.title}
        </h2>
        <p className="card-body">{recommendation.rationale}</p>
        {evidenceBasis && (
          <p className="meta" style={{ marginTop: 8 }}>{evidenceBasis}</p>
        )}
        {/*
         * TODAY // SUIT LAYER 01 (DEC-003): "the existing WHY interaction
         * becomes the first expression of the inside-the-suit concept...
         * expose additional structure showing the real deterministic
         * inputs/reasoning already available." Every value below already
         * existed on `recommendation.trace` (engine/evaluate.ts) or
         * `checkIn` before this Drop — nothing here is manufactured.
         * matchedRules was the only piece previously surfaced; inputs/
         * derived/selectionReason/engineVersion/evaluatedAt were already
         * computed and stored on every Recommendation, just never shown.
         */}
        <details className="why" style={{ marginTop: 12 }}>
          <summary>How BEYOND decided</summary>
          <div className="machinery-panel">
            {checkIn && (
              <>
                <p className="why-group-label">State input</p>
                {CHECK_IN_FIELDS.map((f) => (
                  <div key={f.key} className="why-rule">
                    <span>{f.label}</span>
                    <span>{checkIn[f.key]}</span>
                  </div>
                ))}
              </>
            )}

            <p className="why-group-label">Derived</p>
            {recommendation.trace.derived.length > 0 ? (
              recommendation.trace.derived.map((d) => (
                <div key={d.key} className="why-rule">
                  <span>{describeTraceLabel(d.key)}</span>
                  <span>{describeTraceValue(d.value)}</span>
                </div>
              ))
            ) : (
              <div className="why-rule">
                <span>Capacity</span>
                <span>Not computed — no check-in yet</span>
              </div>
            )}

            <p className="why-group-label">Context</p>
            {recommendation.trace.inputs.map((i) => (
              <div key={i.key} className="why-rule">
                <span>{describeTraceLabel(i.key)}</span>
                <span>{describeTraceValue(i.value)}</span>
              </div>
            ))}

            <p className="why-group-label">Rules evaluated</p>
            {recommendation.trace.matchedRules.map((r) => (
              <div key={r.ruleId} className={`why-rule ${r.result ? "why-rule--matched" : ""}`}>
                <span>{r.ruleId}</span>
                <span>{r.result ? r.reason : "—"}</span>
              </div>
            ))}

            <p className="why-selection">{recommendation.trace.selectionReason}</p>
            {priorOutcomeMemory && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                <p className="why-group-label">Previous result</p>
                <p className="card-body">
                  {describePriorOutcomeMemory(
                    priorOutcomeMemory.decision,
                    priorOutcomeMemory.rating,
                    priorOutcomeMemory.recommendation.issuedAt,
                  )}
                </p>
              </div>
            )}
            <p className="meta" style={{ marginTop: 8 }}>
              ENGINE {recommendation.trace.engineVersion} · EVALUATED{" "}
              {new Date(recommendation.trace.evaluatedAt).toLocaleTimeString()}
            </p>
          </div>
        </details>
        <div style={{ marginTop: isDominant && !isAllClear ? 20 : 12 }}>
          {decision ? (
            <button className="btn-primary" disabled style={isDominant && !isAllClear ? { fontSize: 18, padding: "18px var(--space-4)" } : undefined}>
              {describeRecordedDecision(decision)}
            </button>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, ...(isDominant && !isAllClear ? { fontSize: 18, padding: "18px var(--space-4)" } : {}) }}
                  disabled={busy}
                  onClick={() => void handleRecord()}
                >
                  {describeRecommendationAction(recommendation.kind)}
                </button>
                {recommendation.kind !== "NO_ACTION_REQUIRED" && (
                  <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={handleDecline}>
                    {DECLINE_LABEL}
                  </button>
                )}
              </div>
              <p className="meta" style={{ marginTop: 8 }}>
                {describeRecommendationEffect(recommendation.kind)}
              </p>
            </>
          )}
          <ConfirmPanel />
        </div>
      </div>
    );
  }

  /**
   * Harvest Checkpoint 3 (ATTENTION/TOOLS): called once; placed in
   * ATTENTION when suggestEndDay earned it, otherwise in TOOLS as a
   * quiet, always-reachable CollapsibleRow — ending the day is always
   * possible, not only when the Engine-adjacent signal suggests it.
   */
  function renderEndDayCard() {
    if (!day) return null;
    const open = suggestEndDay || endDayOpen;
    if (!open) {
      return (
        <CollapsibleRow name="BEYONDDAY" summary="End your day whenever you're ready." onOpen={() => setEndDayOpen(true)} />
      );
    }
    // Suit Layer 01: styled by real urgency (suggestEndDay), not merely
    // by whether it won the scarce ATTENTION slot — the same underlying
    // fact should look the same whether or not it's currently displayed
    // in ATTENTION or (capped out) still in TOOLS.
    const body = (
      <>
        {suggestEndDay && (
          <p className="card-body" style={{ marginBottom: 12 }}>
            Primary sleep logged — this BeyondDay looks done. End it whenever you're ready.
          </p>
        )}
        <button className="btn-secondary" disabled={busy} onClick={() => void handleEndDay()}>
          END DAY
        </button>
      </>
    );
    if (suggestEndDay) {
      return <SignalRow label="BEYONDDAY">{body}</SignalRow>;
    }
    return (
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>BEYONDDAY</p>
        {body}
      </div>
    );
  }

  /**
   * Intent & Commitment Spine — Drop 02 (temporal corrections binding,
   * 2026-08-22). Called once; placed in ATTENTION when
   * commitmentInAttention earned it, otherwise TOOLS — same shape as
   * renderEndDayCard. Shows only the single most relevant unresolved
   * Obligation (engine/obligationRelevance.ts's fixed ranking), plus a
   * plain count of anything else unresolved — never a per-item list, so
   * this never competes with the primary recommendation the way a real
   * task list would.
   *
   * Read-only by design (Drop 02 product ruling): no satisfy/release/
   * mark-waiting/edit control here. VIEW switches to the MORE tab, where
   * canonical mutation already lives (Missions & Obligations) — it does
   * not deep-link to this specific Obligation's detail, since that would
   * require lifting new "pending navigation" state through App.tsx,
   * MoreScreen.tsx, AND IntentScreen.tsx (none of which coordinate
   * navigation with each other today, and Drop 02's own approved plan
   * listed both of the latter two files as unchanged) — disproportionate
   * plumbing for one button, per this Drop's own instruction not to build
   * a routing subsystem for it. onViewCommitments is optional; if TODAY
   * is ever rendered without it (e.g. a future embedding), VIEW simply
   * doesn't render rather than doing nothing silently.
   */
  function renderCommitmentsCard() {
    if (!headlineCommitment) return null;
    const otherCount = unresolvedObligations.length - 1;
    const { obligation, tier } = headlineCommitment;

    if (!commitmentsOpen) {
      // FIELD ALPHA Gate A correction: the header is the object's fixed
      // role ("COMMITMENT" — matching what's shown once expanded below),
      // not the obligation's own title, which used to sit here
      // unlabeled and could visually collide with TODAY's "Now" section
      // header above it. The title itself still appears, in the summary
      // line, via describeCommitmentsSummary.
      return (
        <CollapsibleRow
          name="COMMITMENT"
          summary={describeCommitmentsSummary(tier, obligation, otherCount)}
          onOpen={() => setCommitmentsOpen(true)}
        />
      );
    }

    const body = (
      <>
        <h2 className="card-title">{obligation.title}</h2>
        {obligation.description && <p className="card-body">{obligation.description}</p>}
        <p className="meta" style={{ marginBottom: otherCount > 0 ? 4 : 12 }}>
          {describeObligationRelevance(tier, obligation)}
        </p>
        {otherCount > 0 && (
          <p className="meta" style={{ marginBottom: 12 }}>
            +{otherCount} more unresolved.
          </p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} onClick={() => setCommitmentsOpen(false)}>
            CLOSE
          </button>
          {onViewCommitments && (
            <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} onClick={onViewCommitments}>
              VIEW
            </button>
          )}
        </div>
      </>
    );
    // Suit Layer 01: styled by the headline's own real tier, not by
    // whether it happened to win the scarce ATTENTION slot — same
    // reasoning as renderEndDayCard above.
    if (isAttentionWorthyTier(tier)) {
      return <SignalRow label="COMMITMENT">{body}</SignalRow>;
    }
    return (
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>COMMITMENT</p>
        {body}
      </div>
    );
  }

  /**
   * Harvest Checkpoint 3 (TOOLS): the quick-capture input itself is NEVER
   * collapsed — Capture's own doctrine (Overdrive Phase 10) is "always a
   * single-line input, never a bigger form to open... less friction than
   * RESET/SHIFT DOWN's progressive disclosure, not the same amount." Only
   * the open-items LIST is tiered: when it already earned a compact slot
   * in ATTENTION, it isn't repeated here (no second dashboard hiding
   * underneath the first) — otherwise (zero items, or the rare case it
   * lost the 2-slot cap to END DAY + a pending outcome both being true)
   * it renders right here instead, so nothing captured is ever more than
   * one section away.
   */
  function renderCaptureToolsCard() {
    const hasOpenItems = openCaptureItems.length > 0;
    const showListHere = hasOpenItems && !captureInAttention;
    return (
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>
          CAPTURE{hasOpenItems ? ` (${openCaptureItems.length})` : ""}
        </p>
        <p className="meta" style={{ marginBottom: 8 }}>
          Jot something down now. Where it belongs is a decision for later, not now.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: showListHere ? 12 : 0 }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1 }}
            placeholder="Capture a thought..."
            value={captureText}
            disabled={busy}
            onChange={(e) => setCaptureText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCapture();
            }}
          />
          <button
            className="btn-secondary"
            style={{ width: "auto", padding: "8px 16px" }}
            disabled={busy || !captureText.trim()}
            onClick={() => void handleCapture()}
          >
            CAPTURE
          </button>
        </div>
        {showListHere && (
          <>
            {openCaptureItems.map((item) => renderCaptureListRow(item))}
            {justResolvedCapture && (
              <ConfirmBanner
                message={`Resolved "${justResolvedCapture.text}"`}
                actionLabel="UNDO"
                onAction={() => void handleUndoResolveCapture()}
                disabled={busy}
                divider
              />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="screen fade-in">
      {/* BEYOND Suit Implementation 01B: the identity zone is
          deliberately quiet now — a real <h1> for correct heading
          structure (Part 15), but styled with .eyebrow (small, mono)
          rather than the large .title display treatment. Freed
          territory and visual weight belong to the command surface
          below, not to screen chrome. */}
      <h1 className="eyebrow">BEYOND // TODAY</h1>

      {!day && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <p className="card-body" style={{ margin: 0 }}>No day started yet.</p>
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 16px" }} disabled={busy} onClick={() => void handleStartDay()}>
            START DAY
          </button>
        </div>
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
          quieter than .card--action so it never competes with NOW. */}
      {day && (
        <p className="status-strip">
          {describeContextStrip(day.workContext, scheduledContext, unresolvedPostShift)}
          {capacityResult && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden="true" className={`capacity-dot capacity-dot--${capacityResult.capacity.toLowerCase()}`} />
              {`· ${describeCapacity(capacityResult.capacity, capacityResult.reasonCodes)}`}
            </span>
          )}
        </p>
      )}

      {/* NOW — exactly one dominant operating surface: the recommendation,
          unless a genuinely active RESET or SHIFT DOWN has taken over. */}
      {day && recommendation && <p className="section-label">Now</p>}
      {day && recommendation && dominant === "SHIFT_DOWN_ACTIVE" && renderShiftDownCard(shiftDownIsPrimary, true)}
      {day && recommendation && dominant === "RESET_ACTIVE" && renderResetCard(resetIsPrimary, true)}
      {day && recommendation && dominant === "RECOMMENDATION" && renderRecommendationCard(true)}

      {showProminentMinimumDay && renderMinimumDayCard(true)}

      {/* ATTENTION — earned, capped at ATTENTION_MAX, and disappears
          entirely when nothing currently qualifies (attentionPolicy.ts). */}
      {attentionPlan.attention.length > 0 && (
        <>
          <p className="section-label">Attention</p>

          {endDayInAttention && renderEndDayCard()}

          {commitmentInAttention && renderCommitmentsCard()}

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
              {openCaptureItems.map((item) => renderCaptureListRow(item))}
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

      {/* TOOLS — quiet, always-reachable capabilities that aren't
          currently competing with NOW. No capability is deleted; every
          item below is one tap from full content. */}
      <p className="section-label">Tools</p>

      {day && recommendation && dominant !== "SHIFT_DOWN_ACTIVE" && renderShiftDownCard(shiftDownIsPrimary, false)}
      {day && recommendation && dominant !== "RESET_ACTIVE" && renderResetCard(resetIsPrimary, false)}
      {day && recommendation && dominant !== "RECOMMENDATION" && renderRecommendationCard(false)}

      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>STATE INPUT</p>
        <h2 className="card-title">State check-in</h2>
        {/* FIELD ALPHA Gate A correction: ALL GOOD is a routine, always-
            available shortcut, not a decision — as .btn-primary (solid
            --accent red, full width) it was reading as one of the
            strongest visual objects on the whole screen even when the
            actual primary recommendation was NO ACTION REQUIRED,
            conflicting with the Red Budget doctrine (significance earns
            intensity). .btn-secondary is the existing quieter primitive
            with identical sizing/tap target/disabled treatment — reused
            rather than inventing a new one. Functionality, defaults, and
            Engine inputs are unchanged; only the button's own visual
            weight moved. */}
        <button
          className="btn-secondary"
          style={{ marginBottom: 4 }}
          disabled={busy}
          onClick={() => void handleQuickCheckIn()}
        >
          ALL GOOD
        </button>
        <p className="meta" style={{ marginBottom: checkIn && !checkInFormOpen ? 12 : 16 }}>
          Sets {describeCheckInValues(quickCheckInValues)} — submits immediately.
        </p>

        {checkIn && !checkInFormOpen ? (
          <div key="summary" className="fade-in">
            <p className="card-body" style={{ marginBottom: 8 }}>
              Last check-in: {describeCheckInValues(checkIn)}
            </p>
            <p className="meta" style={{ marginBottom: 12 }}>
              recorded {new Date(checkIn.recordedAt).toLocaleTimeString()}
            </p>
            <button className="btn-secondary" onClick={() => setCheckInFormOpen(true)}>
              MANUAL CHECK-IN
            </button>
          </div>
        ) : (
          <div key="form" className="fade-in">
            <p className="card-body" style={{ marginBottom: 12 }}>
              How are you doing right now? Tap a number for each — nothing here is filled in for you.
            </p>
            {CHECK_IN_FIELDS.map((field) => (
              <div key={field.key} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span className="card-body" style={{ margin: 0, fontWeight: 600, color: "var(--text-1)" }}>
                    {field.label}
                  </span>
                  <span className="meta">{field.directionLabel}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {rangeForField(field).map((n) => {
                    const selected = values[field.key] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        className={`chip ${selected ? "chip--selected" : ""}`}
                        aria-pressed={selected}
                        disabled={busy}
                        onClick={() => setValues((s) => ({ ...s, [field.key]: n }))}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button className="btn-primary" disabled={busy || !isCheckInComplete(values)} onClick={() => void handleCheckIn()}>
              SUBMIT CHECK-IN
            </button>
            {!isCheckInComplete(values) && (
              <p className="meta" style={{ marginTop: 8 }}>Select all five to submit.</p>
            )}
            {checkIn && (
              <p className="meta" style={{ marginTop: 8 }}>
                last recorded {new Date(checkIn.recordedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Overdrive Phase 18 (TODAY PRIORITY COMPRESSION): once work
          context is settled for the day — OFF, or WORK with the shift
          already marked ended — there's nothing left to decide here, so
          it collapses to the same compact summary-row pattern RESET/
          SHIFT DOWN already use rather than staying a permanently
          full-weight card. Still WORK and not yet ended keeps the full
          card open, since MARK WORK ENDED is a real pending action. */}
      {day &&
        scheduledContext &&
        (() => {
          const settled = day.workContext === "OFF" || (day.workContext === "WORK" && workPeriodEndedAt !== null);
          const open = workContextOpen || !settled;
          if (!open) {
            const summary =
              day.workContext === "OFF"
                ? "Off today."
                : `Working today — ended ${new Date(workPeriodEndedAt!).toLocaleTimeString()}.`;
            return <CollapsibleRow name="WORK CONTEXT" summary={summary} onOpen={() => setWorkContextOpen(true)} />;
          }
          return (
            <div className="equipment-row">
              <p className="tool-label" style={{ marginBottom: 4 }}>WORK CONTEXT</p>
              <h2 className="card-title">Are you working today?</h2>
              <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12 }}>
                <button
                  type="button"
                  className={`chip ${day.workContext === "WORK" ? "chip--selected" : ""}`}
                  aria-pressed={day.workContext === "WORK"}
                  disabled={busy}
                  onClick={() => void handleSetWorkContext("WORK")}
                >
                  YES
                </button>
                <button
                  type="button"
                  className={`chip ${day.workContext === "OFF" ? "chip--selected" : ""}`}
                  aria-pressed={day.workContext === "OFF"}
                  disabled={busy}
                  onClick={() => void handleSetWorkContext("OFF")}
                >
                  NO
                </button>
              </div>
              <p className="card-body" style={{ fontSize: 16 }}>{describeSchedulePrediction(scheduledContext)}</p>
              {day.workContext !== "UNKNOWN" && (
                <p className="meta" style={{ marginTop: 8 }}>
                  Currently set: {day.workContext === "WORK" ? "working today" : "off today"}.
                </p>
              )}
              {day.workContext === "WORK" && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                  {workPeriodEndedAt ? (
                    <p className="meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ConfirmIcon size={20} />
                      Work ended at {new Date(workPeriodEndedAt).toLocaleTimeString()}.
                    </p>
                  ) : (
                    <>
                      <p className="meta" style={{ marginBottom: 8 }}>
                        When your shift is actually over, mark it — BEYOND never guesses this from the clock.
                      </p>
                      <button className="btn-secondary" disabled={busy} onClick={() => void handleMarkWorkEnded()}>
                        MARK WORK ENDED
                      </button>
                    </>
                  )}
                </div>
              )}
              {settled && (
                <button
                  className="btn-secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => setWorkContextOpen(false)}
                >
                  COLLAPSE
                </button>
              )}
            </div>
          );
        })()}

      {day && minimumDay && !showProminentMinimumDay && renderMinimumDayCard(false)}

      {renderCaptureToolsCard()}

      {!commitmentInAttention && renderCommitmentsCard()}

      {!endDayInAttention && renderEndDayCard()}

      {(daysSinceBackup === null || daysSinceBackup >= BACKUP_NUDGE_THRESHOLD_DAYS) && (
        <p className="meta" style={{ marginTop: 4 }}>
          {daysSinceBackup === null
            ? "No backup on record yet — export one from MORE."
            : `It's been ${daysSinceBackup} days since your last backup — export one from MORE.`}
        </p>
      )}
    </div>
  );
}
