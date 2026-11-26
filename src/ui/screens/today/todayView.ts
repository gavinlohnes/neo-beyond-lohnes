import { describeShiftRun, shiftRun } from "../../../application/shiftRun";
import { deriveAhead } from "../../../application/ahead";
import { markKey, type LookSnapshot } from "../../../application/sinceLastLook";
import { sleepMinutes as externalSleepMinutes } from "../../../domain/health/measuredSeries";
import { deriveLifeState, lifeStateInput } from "../../../application/lifeState";
import { deriveLifeMoment, lifeMomentInput } from "../../../application/lifeTransition";
import { getLighterLift } from "../../../application/lighterNightQueries";
import { recordedBy } from "../../../application/workContextResolution";
import { livedDayStartOf } from "../../../application/reflect";
import { minuteOfDay, paceReading, type PaceHistories } from "../../../application/pace";
import { livedReadAt } from "../../../application/earlyDayStart";
import { type TodaySnapshot } from "./todayRead";
import { deriveAttentionPlan, isInAttention } from "./attentionPolicy";
import { classifyObligation, getMostRelevantUnresolvedObligation, hasObligationRequiringAttention, isAttentionWorthyTier } from "../../../engine/obligationRelevance";
import { deriveCapacity } from "../../../engine/capacity";
import { isPrimaryReset, isPrimaryShiftDown } from "./resetShiftDownCopy";
import { type MeasuredSnapshot } from "../../../application/measuredQueries";
import { formatLocalDate, livedDayShiftWindow } from "../../../engine/scheduledContext";
import { suggestSessionVariant } from "../../../engine/trainSuggestion";
import { traceShortSleepStreak } from "../../../engine/evaluate";
import { deriveSleepDraft } from "../../../engine/sleepDraft";
import { getAppOpenedAt } from "../../appSession";
import { deriveShiftClockView, describeCountdown, describeFuel, describePlannedWorkout, isWorkEndDue, mainSleepEndsPostShift, type ShiftClockPhase, type ShiftClockRow, type ToolsItem, TOOLS_ORDER } from "./shiftClock";
import { mostRecentBoundaryAtOrBefore, nextRolloverBoundaryAfter } from "../../../engine/dayRollover";

/** TODAY's local values the derived view reads (everything else comes from the snapshot). */
export interface TodayViewUi {
  activeResetId: string | null;
  activeShiftDownId: string | null;
  checkInFormOpen: boolean;
  commandFocus: ToolsItem | "SHIFT_HANDOFF" | "SMALL_STEPS" | null | undefined;
  hydrationOperationOpen: boolean;
  measured: MeasuredSnapshot | null;
  modePin: { dayId: string; phase: ShiftClockPhase | null } | null;
  nextWorkout: { label: string; minutes: Partial<Record<"STANDARD" | "REDUCED", number>> } | null;
  paceHistories: PaceHistories | null;
  workContextOpen: boolean;
  workoutQuestion: { open: boolean };
  /** GRAYSON-LIGHTER-NIGHT-001: the lighter-last-night card reported it has something to show. */
  lighterNightPresent?: boolean;
}

/**
 * GRAYSON-TODAY-SPLIT-003 slice D (sections out): TODAY's derived values, moved out of TodayScreen unchanged.
 * Everything here is computed in render from the one read (`snapshot`), the small local state TODAY passes in (`ui`)
 * and the minute clock (`now`). Two reads are kept exactly as they were: the commitment date uses the real clock
 * (`formatLocalDate(new Date())`) and the sleep draft reads the app-opened time.
 */
export function deriveTodayView(snapshot: TodaySnapshot, ui: TodayViewUi, now: Date) {
  const {
    activeWorkout,
    advisoryNotes,
    checkIn,
    day,
    mainSleepRecordedAt,
    minimumDay,
    minimumDayHydrateOz,
    minimumDayProteinG,
    openCaptureItems,
    pendingOutcome,
    proteinTargetG,
    recommendation,
    schedulePattern,
    shiftDownCompletedAt,
    sleepDraftEvidence,
    suggestEndDay,
    systemStatus,
    unresolvedObligations,
    workContextSource,
    workPeriodEndedAt,
    workPeriodStartedAt,
    yesterdayRecorded,
  } = snapshot;
  const {
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
  } = ui;
  const capacityResult = checkIn ? deriveCapacity(checkIn) : null;
  // SUIT-001 stale reading: the shown BeyondDay's lived day has ended but the 16:30 roll hasn't
  // been applied (a workout holds it open, or a re-read hasn't landed). Values are yesterday's.
  const stale = !!day && now.getTime() >= nextRolloverBoundaryAfter(new Date(day.startedAt)).getTime();

  // STATUS-001: the strip's edge follows the System Status once it's read (AMBER uses the yellow edge).
  const stripLevel: "yellow" | "red" | null = systemStatus
    ? systemStatus.level === "RED"
      ? "red"
      : systemStatus.level === "AMBER"
        ? "yellow"
        : null
    : capacityResult && capacityResult.capacity !== "GREEN"
      ? (capacityResult.capacity.toLowerCase() as "yellow" | "red")
      : null;
  // TONIGHT-001 (owner ruling, 2026-10-19): Gavin never uses Minimum Day, so TODAY no longer
  // offers it after a constrained check-in (Item 1, Phase 3). It stays one tap away in
  // MORE → Today tools, and its TOOLS row shows while it's on.
  const showProminentMinimumDay = false;

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
  // ADVISORY-002: every other due commitment is listed in COMMITMENT (it used to sit in ADVISORY).
  const otherDueCommitments = unresolvedObligations
    .filter((obligation) => obligation.id !== headlineCommitment?.obligation.id)
    .map((obligation) => ({ obligation, tier: classifyObligation(obligation, todayLocalDate) }))
    .filter((commitment) => isAttentionWorthyTier(commitment.tier));
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
  // SHIFT-RUN-001 on TODAY: where today sits in the saved rotation, unless he declared the day otherwise.
  // LIFE-STATE-001: derived in render from the saved schedule, today's recorded context and yesterday's record.
  // EARLY-DAY-START-001: lived-day reads follow a day opened early; clocks and countdowns still use `now`.
  const livedNow = livedReadAt(day, now);
  const recordedNow = yesterdayRecorded && yesterdayRecorded.livedDay === livedDayStartOf(livedNow).getTime() ? yesterdayRecorded : null;
  const scheduledRun = schedulePattern ? shiftRun(livedNow, schedulePattern, 21, recordedNow?.confirmed) : null;
  const lifeInput = day && schedulePattern ? lifeStateInput(livedNow, schedulePattern, day.workContext === "UNKNOWN" ? null : day.workContext, recordedNow?.kind ?? null, workContextSource ? recordedBy(workContextSource) : undefined, recordedNow?.confirmed) : null;
  const lifeReading = lifeInput ? deriveLifeState(lifeInput) : null;
  // OPERATOR-EXPERIENCE-001: NEXT, from Week Ahead's days and what today is (recorded, else planned).
  const ahead = lifeInput && recordedNow?.week ? deriveAhead(livedNow, lifeInput.today.recorded ?? lifeInput.today.scheduled, recordedNow.week.days) : null;
  // Slice 3: what TODAY shows now, for "since you last looked". A field is null until it has loaded.
  const lookNow: Omit<LookSnapshot, "at"> | null = day && recordedNow ? {
    state: lifeReading?.label ?? null, next: ahead?.line ?? null, confirmed: ahead ? ahead.confirmed : null,
    advice: recommendation ? { id: recommendation.id, title: recommendation.title } : "none",
    garmin: measured ? (measured.lastNight ? { end: measured.lastNight.endTime, minutes: externalSleepMinutes(measured.lastNight) } : "none") : null,
    marks: recordedNow.map.map(markKey),
  } : null;
  const lookKey = lookNow ? JSON.stringify(lookNow) : null;
  // LIFE-STATE-002: the moment between states, if today is one, with the day before yesterday from record or schedule.
  const lifeMoment = lifeInput && schedulePattern ? deriveLifeMoment(lifeMomentInput(now, schedulePattern, lifeInput, recordedNow?.dayBefore ?? null, recordedNow?.confirmed), lifeReading) : null;
  const lifeState = lifeReading?.state ?? null;
  const todayRun = scheduledRun && day && (day.workContext === "UNKNOWN" || day.workContext === scheduledRun.kind) ? `scheduled: ${describeShiftRun(scheduledRun)}` : null;
  const shiftWindow = day && schedulePattern ? livedDayShiftWindow(new Date(day.startedAt), schedulePattern) : null;
  const livedDayStart = mostRecentBoundaryAtOrBefore(new Date(day?.startedAt ?? now));
  const shiftClockInput = {
    now,
    workContext: day?.workContext ?? "UNKNOWN",
    shiftWindow,
    workEnded: workPeriodEndedAt !== null,
    mainSleepLogged: mainSleepEndsPostShift(mainSleepRecordedAt, workPeriodEndedAt, shiftWindow),
    shiftDownDone:
      shiftDownCompletedAt !== null && (!shiftWindow || new Date(shiftDownCompletedAt).getTime() >= shiftWindow.start.getTime()),
  } as const;
  // COMMAND-CENTER-001: the pin is placement only. `scheduledClock` (no pin)
  // feeds every decision below — Attention eligibility, guidance timing;
  // `shiftClock` (with the pin) only chooses which rows and countdown TODAY shows.
  const scheduledClock = deriveShiftClockView(shiftClockInput);
  // OWNER-GO-001: once STARTED WORK is recorded, PREP's rows and prep prompts give way to ON SHIFT
  // (placement only, like the pin; decisions still read the schedule). A manual pin still wins.
  const startedEarly = !!workPeriodStartedAt && workPeriodEndedAt === null && scheduledClock.phase === "PRE_WORK";
  const manualPin = day && modePin?.dayId === day.id ? modePin.phase : null;
  const pinnedPhase = manualPin ?? (startedEarly ? "SCHEDULED_SHIFT" : null);
  const shiftClock = deriveShiftClockView(shiftClockInput, pinnedPhase);
  const scheduledRows: ShiftClockRow[] = day ? scheduledClock.rows : [];
  const phaseRows: ShiftClockRow[] = day ? shiftClock.rows : [];
  // TONIGHT-001: the mode's one question and its one-tap logs sit right under the action row.
  const LEADING_ROWS: readonly ShiftClockRow[] = ["WORK_QUESTION", "SHIFT_DOWN", "WORKOUT_CALL", "QUICK_LOG"];
  // TONIGHT-001: an all-clear never reads "Nothing needs you" above an unanswered question.
  const questionBelow =
    !!day &&
    (phaseRows.includes("WORK_QUESTION") ||
      (phaseRows.includes("WORKOUT_CALL") && !activeWorkout && workoutQuestion.open));
  const leadingPhaseRows = phaseRows.filter((row) => LEADING_ROWS.includes(row));
  const remainingPhaseRows = phaseRows.filter((row) => !LEADING_ROWS.includes(row) && row !== "FUEL");
  const toolsItems: ToolsItem[] = day ? shiftClock.tools : [...TOOLS_ORDER];
  const checkInIsRow = phaseRows.includes("CHECK_IN");
  const checkInIsScheduledRow = scheduledRows.includes("CHECK_IN");
  const shiftDownIsScheduledRow = scheduledRows.includes("SHIFT_DOWN");
  const workoutCallIsScheduledRow = scheduledRows.includes("WORKOUT_CALL");
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
  // POLISH-002: the all-clear card says what's next, in the prototype's voice. Presentation only,
  // and from the schedule, never a pin: a pin never changes guidance.
  // AUDIT-FIX: the all-clear never says "Nothing needs you" while TODAY's numbers show amber "behind pace".
  const paceMinute = paceHistories ? minuteOfDay(paceHistories.dayStart, now) : 0;
  const behindPace = paceHistories ? ([["Water", "water", minimumDayHydrateOz], ["Protein", "protein", minimumDayProteinG]] as const)
    .filter(([, kind, total]) => paceReading(kind, total, paceHistories[kind], paceMinute).verdict === "BELOW").map(([name]) => name) : [];
  const behindLine = behindPace.length ? `${behindPace.join(" and ")} ${behindPace.length > 1 ? "are" : "is"} behind your pace. ` : "";
  const baseActionContext = scheduledClock.countdown
    ? scheduledClock.countdown.kind === "SHIFT_STARTS"
      ? `${describeCountdown(scheduledClock.countdown, now)}. Eat and drink before you go.`
      : `${describeCountdown(scheduledClock.countdown, now).replace("Shift ends in ", "")} left. Log as you go.`
    : scheduledClock.phase === "EXPECTED_POST_WORK" ? "Shift’s done. Power down. Sleep."
    : scheduledClock.phase === "OFF" ? "Your time. Train, plan or rest. Nothing’s waiting."
    : undefined;
  const nextActionContext = behindLine ? `${behindLine}${(baseActionContext ?? "Log as you go.").replace("Nothing’s waiting.", "").trim()}` : baseActionContext;
  const lateRecoverWithoutSleep = !!day && scheduledClock.phase === "EXPECTED_POST_WORK" && shiftClock.displayPhase === "EXPECTED_POST_WORK" && now.getHours() >= 13 && mainSleepRecordedAt.length === 0;
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
      !shiftDownIsScheduledRow &&
      // TONIGHT-001: after the shift the workout call is RECOVER's one question; MARK WORK ENDED
      // stays one tap away inside SHIFT DOWN in TOOLS.
      !workoutCallIsScheduledRow &&
      scheduledClock.phase !== "PRE_WORK" &&
      isWorkEndDue(scheduledClock.phase, shiftWindow, now),
    hasLighterNight: day !== null && ui.lighterNightPresent === true,
    isCheckInMissing:
      day !== null &&
      checkIn === null &&
      !checkInIsScheduledRow &&
      // TONIGHT-001: the workout call carries CHECK IN FIRST; the check-in itself waits in TOOLS.
      !workoutCallIsScheduledRow &&
      scheduledClock.phase !== "PRE_WORK" &&
      scheduledClock.phase !== "SCHEDULED_SHIFT",
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
  /**
   * CAPTURE-PARITY-002: where the TOOLS Capture card leaves its open-capture rows to Attention.
   * A focused COMMAND view (CAPTURE, DAILY CONTROLS item) shows no Attention, so the card lists them.
   * MORE → TODAY TOOLS (`commandFocus === null`) shows Attention on the same screen, so the rows
   * appear once: in Attention, unless that row is only the day-off pointer to the sweep.
   */
  const captureRowsInAttention = commandFocus == null
    ? captureInAttention && (commandFocus === undefined || day?.workContext !== "OFF")
    : false;
  const commitmentInAttention = isInAttention(attentionPlan, "COMMITMENT_DUE");
  const recommendationInAttention = isInAttention(attentionPlan, "RECOMMENDATION_UNRESOLVED");
  const workEndInAttention = isInAttention(attentionPlan, "WORK_END_AVAILABLE");
  const checkInInAttention = isInAttention(attentionPlan, "CHECK_IN_MISSING");
  const minimumDayInAttention = isInAttention(attentionPlan, "MINIMUM_DAY_PROMINENT");
  const lighterNightInAttention = isInAttention(attentionPlan, "LIGHTER_NIGHT");



  // ---- SHIFT CLOCK rendering (Drop 2) ----
  const fuelLine = describeFuel(minimumDayProteinG, proteinTargetG, minimumDayHydrateOz);
  // SLEEP-ENGINE-001: the short-sleep fact comes from the issued recommendation's trace, so this row and its card agree.
  const capacityVariant = suggestSessionVariant(capacityResult ? capacityResult.capacity : null, traceShortSleepStreak(recommendation?.trace)).variant;
  // GRAYSON-LIGHTER-NIGHT-001: on a lighter last night he took the SHORT form, so TODAY's workout rows say SHORT too
  // (a RESET or RECOVERY suggestion still comes first).
  const suggestedVariant = capacityVariant === "STANDARD" && day && getLighterLift(day.id)?.form === "REDUCED" ? "REDUCED" : capacityVariant;
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
  // ADVISORY-002: obligation notes live in COMMITMENT, not ADVISORY.
  const shownAdvisoryNotes = advisoryNotes.filter((note) => note.sourceModule !== "obligationRelevance");
  const liftedAdvisory = shownAdvisoryNotes.some((note) => note.attentionLevel !== "QUIET");
  return {
    capacityResult,
    stale,
    stripLevel,
    showProminentMinimumDay,
    shiftDownIsPrimary,
    resetIsPrimary,
    todayLocalDate,
    headlineCommitment,
    otherDueCommitments,
    hasCommitmentDue,
    workContextPerSchedule,
    livedNow,
    recordedNow,
    scheduledRun,
    lifeInput,
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
    scheduledRows,
    phaseRows,
    LEADING_ROWS,
    questionBelow,
    leadingPhaseRows,
    remainingPhaseRows,
    toolsItems,
    checkInIsRow,
    checkInIsScheduledRow,
    shiftDownIsScheduledRow,
    workoutCallIsScheduledRow,
    sleepDraft,
    shiftDownIsRow,
    paceMinute,
    behindPace,
    behindLine,
    baseActionContext,
    nextActionContext,
    lateRecoverWithoutSleep,
    attentionPlan,
    dominant,
    endDayInAttention,
    pendingOutcomeInAttention,
    captureInAttention,
    captureRowsInAttention,
    commitmentInAttention,
    recommendationInAttention,
    workEndInAttention,
    checkInInAttention,
    minimumDayInAttention,
    lighterNightInAttention,
    fuelLine,
    suggestedVariant,
    workoutLine,
    liftedShiftDown,
    liftedReset,
    liftedCheckIn,
    liftedWorkContext,
    shownAdvisoryNotes,
    liftedAdvisory,
  };
}

export type TodayView = ReturnType<typeof deriveTodayView>;
