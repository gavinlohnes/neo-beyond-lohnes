import { type ReactNode } from "react";
import { quickCheckInValues } from "./todayActions";
import { AdvisorySection } from "./AdvisorySection";
import { CheckInFixSheet, FixUndoBanner } from "./CheckInFix";
import { ResetCard } from "./ResetCard";
import { ShiftDownCard } from "./ShiftDownCard";
import { EndDayCard } from "./EndDayCard";
import { CommitmentsCard } from "./CommitmentsCard";
import { CaptureToolsCard } from "./CaptureSection";
import { MinimumDayCard } from "./MinimumDaySection";
import { CheckInCard } from "./CheckInCard";
import { WorkContextCard } from "./WorkContextCard";
import { type ToolsItem } from "./shiftClock";
import { TodayNumbers } from "./TodayNumbers";
import { askAlfred } from "../../components/AlfredSheet";
import { deriveLogNudge, usualTimesFor } from "../../../application/logNudge";
import { dismissNudge, readLogNudgeSettings, readNudgeDismissed } from "./logNudgeStore";
import type { TodaySectionsInput } from "./todaySections";

/**
 * GRAYSON-TODAY-SPLIT-003 slice D2 (sections out): TODAY's TOOLS, moved out of TodayScreen unchanged:
 * `toolHasContent`, the five `render*Tool` helpers, the check-in fix area, FUEL and `renderToolsItem`. TodayScreen
 * calls this once per render and uses what it returns exactly where it used the helpers before, so the rendered tree
 * is the same. `renderRecoverSleepPrompt` comes from the phase rows (TodayPhaseRows.tsx), which use these tools too.
 */
export function todayTools({ snapshot, view, actions, resetSession, shiftDownSession, checkInForm, confirmFlows, local }: TodaySectionsInput, renderRecoverSleepPrompt: () => ReactNode) {
  const {
    attentionPlan,
    captureRowsInAttention,
    checkInInAttention,
    commitmentInAttention,
    dominant,
    endDayInAttention,
    fuelLine,
    headlineCommitment,
    lateRecoverWithoutSleep,
    liftedAdvisory,
    liftedCheckIn,
    liftedReset,
    liftedShiftDown,
    liftedWorkContext,
    minimumDayInAttention,
    otherDueCommitments,
    resetIsPrimary,
    scheduledClock,
    shiftClock,
    shiftDownIsPrimary,
    shiftDownIsRow,
    shownAdvisoryNotes,
    workContextPerSchedule,
    workEndInAttention,
  } = view;
  const {
    busyRef,
    cancelCaptureConversion,
    cancelCommitmentSatisfaction,
    confirmCaptureConversion,
    confirmCommitmentSatisfaction,
    handleCancelReset,
    handleCancelShiftDown,
    handleCapture,
    handleCheckIn,
    handleCheckInFixed,
    handleCompleteReset,
    handleCompleteShiftDown,
    handleEnableMinimumDay,
    handleEndDay,
    handleMarkMinimum,
    handleMarkWorkEnded,
    handleMinimumDayLogProtein,
    handleMinimumDayLogWater,
    handleQuickCheckIn,
    handleResolveCapture,
    handleSetWorkContext,
    handleStartReset,
    handleStartShiftDown,
    handleUndoCheckInFix,
    handleUndoResolveCapture,
    requestCaptureConversion,
    requestCommitmentSatisfaction,
  } = actions;
  const {
    checkIn,
    day,
    headlineCommitmentMission,
    lastMainSleepFromGarmin,
    lastMainSleepMinutes,
    latestWeightLbs,
    minimumDay,
    minimumDayHydrateOz,
    minimumDayProteinG,
    openCaptureItems,
    proteinTargetG,
    recommendation,
    suggestEndDay,
    unresolvedObligations,
    waterLogCount,
    waterTargetOz,
    workPeriodEndedAt,
    workPeriodStartedAt,
  } = snapshot;
  const {
    activeResetId,
    lastResetOutcome,
    openResetStartedAt,
    resetIntensity,
    setResetIntensity,
  } = resetSession;
  const {
    activeShiftDownId,
    lastShiftDownOutcome,
    openShiftDownStartedAt,
    setShiftDownDuration,
    shiftDownDuration,
  } = shiftDownSession;
  const {
    activeCheckInDraft,
    checkInFormValues,
    fixCheckInId,
    fixUndo,
    setCheckInDraftDismissed,
    setFixCheckInId,
    setValues,
  } = checkInForm;
  const {
    captureConversion,
    commitmentConfirmation,
    conversionDateSuggestion,
    conversionDraft,
    justResolvedCapture,
    setConversionDraft,
  } = confirmFlows;
  const {
    busy,
    captureFeedback,
    captureText,
    checkInFormOpen,
    commandFocus,
    commandTools,
    commitmentsOpen,
    endDayBlockedByWorkout,
    endDayOpen,
    hiddenFeatures,
    logNudgeRead,
    mdProteinInput,
    mdWaterInput,
    measured,
    minimumDayOpen,
    now,
    onOpenBody,
    onOpenHealthEvidence,
    onOpenTrain,
    onViewCommitments,
    operationsOnly,
    paceHistories,
    postShiftPlan,
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
    setWorkContextOpen,
    shiftDownOpen,
    shiftDownStartRef,
    waterControlsVisible,
    workContextOpen,
  } = local;
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
        // TONIGHT-001: after the shift SHIFT DOWN waits here (no longer a RECOVER row), with or without a check-in.
        return !liftedShiftDown && !!day && (!!recommendation || shiftClock.displayPhase === "EXPECTED_POST_WORK") && dominant !== "SHIFT_DOWN_ACTIVE" && dominant !== "OPERATION_CONFLICT";
      case "RESET":
        return !liftedReset && !!day && !!recommendation && dominant !== "RESET_ACTIVE" && dominant !== "OPERATION_CONFLICT";
      case "WORK_CONTEXT":
        return !liftedWorkContext && !!day && !!scheduledContext && (!workEndInAttention || workContextOpen);
      case "FUEL":
        return false;
      case "MINIMUM_DAY":
        return !!day && !!minimumDay && (commandTools || minimumDay.enabled) && !minimumDayInAttention && dominant !== "HYDRATION_ACTIVE";
      case "CAPTURE":
        return true;
      case "COMMITMENTS":
        return !commitmentInAttention && !!headlineCommitment;
      case "END_DAY":
        return !endDayInAttention;
      case "ADVISORY":
        return !liftedAdvisory && shownAdvisoryNotes.length > 0;
    }
  }

  function renderShiftDownTool() {
    if (lateRecoverWithoutSleep && !activeShiftDownId) return shiftDownIsRow ? renderRecoverSleepPrompt() : null;
    return (
      <>
      {day && (!!recommendation || shiftClock.displayPhase === "EXPECTED_POST_WORK") && dominant !== "SHIFT_DOWN_ACTIVE" && dominant !== "OPERATION_CONFLICT" && (
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
          onMarkWorkEnded={
            day.workContext === "WORK" && workPeriodEndedAt === null ? () => void handleMarkWorkEnded() : undefined
          }
        />
      )}
      </>
    );
  }

  function renderResetTool() {
    return (
      <>
      {day && (commandFocus !== undefined || recommendation && dominant !== "RESET_ACTIVE" && dominant !== "OPERATION_CONFLICT") && (
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

  const checkInFixArea = <>
    <CheckInFixSheet checkInId={fixCheckInId} onClose={() => setFixCheckInId(null)} onChanged={(result) => handleCheckInFixed(result)} />
    {fixUndo && <FixUndoBanner message={fixUndo.message} busy={busy} onUndo={fixUndo.correctionEventId ? () => void handleUndoCheckInFix() : undefined} />}
  </>;

  function renderCheckInTool() {
    return (
      <div id="today-check-in">

      {(!checkInInAttention || checkInFormOpen) && (
        <CheckInCard isInFlight={() => busyRef.current}
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
          onFix={checkIn ? () => setFixCheckInId(checkIn.id) : undefined}
          fixArea={checkInFixArea}
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
      {(commandFocus !== undefined || !workEndInAttention || workContextOpen) && day && scheduledContext && (
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

  /** POLISH-002: the prototype's four number tiles. Missing stays "—"; each opens its history. */
  // BEYOND 4.0-a: AT A GLANCE lives in TodayNumbers.tsx; TODAY keeps the in-flight guard and what each tap opens.
  // GRAYSON-TODAY-CALM-001: the logging nudge is a quiet line (LOG_NUDGE); TODAY renders it with the others, under the
  // numbers, instead of inside them. Its condition and buttons are unchanged.
  function logNudgeLine(): { text: string; onTell: () => void; onNotNow: () => void } | null {
    // GRAYSON-LOG-NUDGE-001: silent on the clock (the catch-up owns shift meals) and in operations-only mode.
    const nudgeSettings = readLogNudgeSettings();
    const nudge = day && logNudgeRead?.kind ? deriveLogNudge({
      settings: nudgeSettings, usual: usualTimesFor(logNudgeRead.kind, logNudgeRead.learned, nudgeSettings), livedStart: logNudgeRead.livedStart,
      meals: logNudgeRead.meals, operationsOnly, dismissed: readNudgeDismissed(day.id),
      onClock: scheduledClock.phase === "SCHEDULED_SHIFT" || (!!workPeriodStartedAt && workPeriodEndedAt === null),
    }, now) : null;
    const nudgeDayId = day?.id;
    return nudge && nudgeDayId ? {
      text: nudge.text,
      onTell: () => { if (!busyRef.current) askAlfred("I ate "); },
      onNotNow: () => { dismissNudge(nudgeDayId, nudge.usualMinute); setNudgeAnswered((v) => v + 1); },
    } : null;
  }

  /** POLISH-002: the prototype's four number tiles (see above). */
  function renderFuel() {
    return <TodayNumbers
      measured={measured} operationsOnly={operationsOnly} minimumDayProteinG={minimumDayProteinG} proteinTargetG={proteinTargetG}
      minimumDayHydrateOz={minimumDayHydrateOz} waterTargetOz={waterTargetOz} waterLogCount={waterLogCount} latestWeightLbs={latestWeightLbs} lastMainSleepMinutes={lastMainSleepMinutes}
      lastMainSleepFromGarmin={lastMainSleepFromGarmin} paceHistories={paceHistories} now={now} dayId={day?.id} busy={busy} fuelLine={fuelLine}
      recordsAvailable={!!onOpenHealthEvidence}
      // METRIC-PAGE-001: WATER opens its metric page (records one tap further); sleep keeps its own page.
      onOpenTile={(metric) => { if (!busyRef.current) { if (metric === "sleep") setMeasuredOpen("sleep"); else setDetailOpen(metric); } }}
      // METRIC-PAGE-001: steps, resting heart rate and calories open the shared metric page; sleep keeps its own page.
      onOpenMeasured={(metric) => { if (busyRef.current) return; if (metric === "steps" || metric === "resting" || metric === "calories") setDetailOpen(metric); else if (metric) setMeasuredOpen(metric); else onOpenHealthEvidence?.("sleep"); }}
      onOpenBody={onOpenBody ? () => onOpenBody() : undefined} />;
  }

  function renderToolsItem(item: ToolsItem) {
    switch (item) {
      case "CHECK_IN":
        return liftedCheckIn ? null : renderCheckInTool();
      case "SHIFT_DOWN":
        return commandFocus === undefined && liftedShiftDown ? null : renderShiftDownTool();
      case "RESET":
        return commandFocus === undefined && liftedReset ? null : renderResetTool();
      case "WORK_CONTEXT":
        return commandFocus === undefined && liftedWorkContext ? null : renderWorkContextTool();
      case "FUEL":
        // The tiles above own the history links; TOOLS repeats the totals as one line.
        return day ? <div className="equipment-row"><p className="tool-label" style={{ marginBottom: 4 }}>FUEL</p><p className="card-body" style={{ margin: 0 }}>{fuelLine}</p></div> : null;
      case "MINIMUM_DAY":
        if (!hiddenFeatures.minimumDay) return null;
        return (
          <>
      {day && minimumDay && (commandFocus !== undefined || !minimumDayInAttention) && dominant !== "HYDRATION_ACTIVE" && (
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
        captureInAttention={captureRowsInAttention}
        captureText={captureText}
        feedback={captureFeedback}
        setCaptureText={setCaptureText}
        busy={busy}
        onCapture={() => void handleCapture()}
        justResolvedCapture={justResolvedCapture}
        onUndoResolve={() => void handleUndoResolveCapture()}
        captureConversion={captureConversion}
        conversionDraft={conversionDraft}
        setConversionDraft={setConversionDraft}
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
          </>
        );
      case "END_DAY":
        return (
          <>
      {(commandFocus !== undefined || !endDayInAttention) && (
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
        notes={shownAdvisoryNotes}
        busy={busy}
        waterControlVisible={waterControlsVisible}
        {...(!waterControlsVisible && dominant !== "HYDRATION_ACTIVE" ? { onLogWater: (amountOz: number) => void handleMinimumDayLogWater(amountOz) } : {})}
        {...(hiddenFeatures.minimumDay ? { onOpenMinimumDay: () => setMinimumDayOpen(true) } : {})}
      />
        );
    }
  }

  return { toolHasContent, renderShiftDownTool, renderResetTool, checkInFixArea, renderCheckInTool, renderWorkContextTool, renderFuel, logNudgeLine, renderToolsItem };
}

export type TodayTools = ReturnType<typeof todayTools>;
