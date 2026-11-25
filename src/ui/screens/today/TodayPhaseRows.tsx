import { SLEEP_DRAFT_ADJUST_MAX, SLEEP_DRAFT_ADJUST_MIN, quickCheckInValues } from "./todayActions";
import { WorkoutCall } from "./WorkoutCall";
import { QuickLog } from "./QuickLog";
import { NightClosed } from "./NightClosed";
import { ShiftDownCard } from "./ShiftDownCard";
import { CheckInCard } from "./CheckInCard";
import { templateLabel } from "../train/trainCopy";
import { sleepDraftWindow } from "../../../engine/sleepDraft";
import { getAppOpenedAt } from "../../appSession";
import { formatDuration } from "../body/bodyScreenCopy";
import { type ShiftClockRow } from "./shiftClock";
import { ShiftHandoff } from "../../components/ShiftHandoff";
import type { TodaySectionsInput } from "./todaySections";
import type { TodayTools } from "./TodayTools";

/**
 * GRAYSON-TODAY-SPLIT-003 slice D2 (sections out): TODAY's phase rows, moved out of TodayScreen unchanged:
 * `renderPhaseRow` and the RECOVER sleep prompt it shares with TOOLS. TodayScreen calls this once per render.
 */
export function todayPhaseRows({ snapshot, view, actions, resetSession, shiftDownSession, checkInForm, confirmFlows, local }: TodaySectionsInput, { checkInFixArea, renderWorkContextTool }: Pick<TodayTools, "checkInFixArea" | "renderWorkContextTool">) {
  const {
    attentionPlan,
    capacityResult,
    dominant,
    fuelLine,
    lateRecoverWithoutSleep,
    shiftClock,
    shiftDownIsPrimary,
    shiftDownIsRow,
    sleepDraft,
    suggestedVariant,
    workoutLine,
  } = view;
  const {
    busyRef,
    dismissSleepDraft,
    handleCancelShiftDown,
    handleCheckIn,
    handleCompleteShiftDown,
    handleLogSavedMeal,
    handleLogSleepDraft,
    handleMarkWorkEnded,
    handleMinimumDayLogWater,
    handleQuickCheckIn,
    handleStartShiftDown,
  } = actions;
  const {
    activeWorkout,
    checkIn,
    day,
    lastMainSleepMinutes,
    lastWaterAmount,
    minimumDayHydrateOz,
    minimumDayProteinG,
    proteinTargetG,
    recommendation,
    tonight,
    workPeriodEndedAt,
  } = snapshot;
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
    setCheckInDraftDismissed,
    setFixCheckInId,
    setValues,
  } = checkInForm;
  const {
    busy,
    checkInFormOpen,
    customTemplateList,
    nextWorkout,
    onOpenBody,
    onOpenTrain,
    postShiftPlan,
    refresh,
    setCheckInFormOpen,
    setShiftDownOpen,
    setSleepDraftAdjust,
    setSleepNotYetDay,
    shiftDownOpen,
    shiftDownStartRef,
    shiftHandoffRefreshKey,
    sleepDraftAdjust,
    sleepDraftDismissedDayId,
    sleepNotYetDay,
    workoutQuestion,
  } = local;
  function renderRecoverSleepPrompt() {
    if (!day) return null;
    // SLEEP-001: the drafted night is the question itself, so logging it is one tap.
    if (sleepDraft && sleepDraftDismissedDayId !== day.id) return <div data-recover-sleep-prompt>{renderPhaseRow("MAIN_SLEEP", true)}</div>;
    return <div className="equipment-row" data-recover-sleep-prompt>
      <h2 className="card-title">Did you sleep?</h2>
      {sleepNotYetDay === day.id && <p className="meta">Log main sleep when you're ready.</p>}
      <button type="button" className="btn-primary" disabled={busy} onClick={() => onOpenBody?.("sleep")}>LOG MAIN SLEEP</button>
      {sleepNotYetDay !== day.id && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setSleepNotYetDay(day.id)}>NOT YET</button>}
    </div>;
  }


  function renderPhaseRow(row: ShiftClockRow, sleepPromptBody = false) {
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
        return <div className="equipment-row"><p className="card-body" style={{ margin: 0 }}>{fuelLine}</p></div>;
      case "WORKOUT_CALL":
        // An active workout already owns Operate above.
        if (activeWorkout || (shiftClock.displayPhase !== "EXPECTED_POST_WORK" && shiftClock.displayPhase !== "OFF")) return null;
        return (
          <WorkoutCall
            phase={shiftClock.displayPhase}
            day={day}
            tonight={tonight}
            question={workoutQuestion}
            workoutLabel={nextWorkout?.label ?? null}
            minutes={nextWorkout?.minutes ?? {}}
            suggestedVariant={suggestedVariant}
            lastMainSleepMinutes={lastMainSleepMinutes}
            checkInLevel={checkIn && capacityResult ? capacityResult.capacity : null}
            busy={busy}
            onCheckIn={() => setCheckInFormOpen(true)}
            onOpenTrain={onOpenTrain}
            onAnswered={() => void refresh()}
          />
        );
      case "QUICK_LOG":
        return (
          <QuickLog
            refreshKey={tonight}
            lastWaterAmount={lastWaterAmount}
            busy={busy}
            onLogMeal={handleLogSavedMeal}
            onLogWater={(amount) => handleMinimumDayLogWater(amount)}
          />
        );
      case "NIGHT_CLOSED":
        return (
          <NightClosed
            tonight={tonight}
            proteinG={minimumDayProteinG}
            proteinTargetG={proteinTargetG}
            waterOz={minimumDayHydrateOz}
            trainedLabel={tonight?.trained
              ? `${templateLabel(tonight.trained.templateId as Parameters<typeof templateLabel>[0], customTemplateList)} · ${tonight.trained.sessionType.toLowerCase()}, ${tonight.trained.status.toLowerCase()}`
              : null}
          />
        );
      case "SHIFT_HANDOFF":
        return shiftHandoffRefreshKey !== undefined ? <ShiftHandoff refreshKey={shiftHandoffRefreshKey} /> : null;
      case "SHIFT_DOWN":
        if (lateRecoverWithoutSleep && !activeShiftDownId) return renderRecoverSleepPrompt();
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
            <div className="equipment-row day-line-check-in">
              <p className="tool-label" style={{ marginBottom: 4 }}>CHECK-IN</p>
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
          );
        }
        // The console shows guidance once; the contextual row keeps the completed check-in and UPDATE.
        return (
          <>

            <CheckInCard isInFlight={() => busyRef.current}
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
              onFix={checkIn ? () => setFixCheckInId(checkIn.id) : undefined}
              fixArea={checkInFixArea}
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
        if (lateRecoverWithoutSleep && (!shiftDownIsRow || activeShiftDownId !== null) && !sleepPromptBody) return renderRecoverSleepPrompt();
        if (sleepDraft && sleepDraftDismissedDayId !== day.id) {
          const minutes = Math.min(SLEEP_DRAFT_ADJUST_MAX, Math.max(SLEEP_DRAFT_ADJUST_MIN, sleepDraft.value + sleepDraftAdjust));
          return (
            <div className="equipment-row">
              <p className="tool-label" style={{ marginBottom: 4 }}>MAIN SLEEP</p>
              {/* SLEEP-001: said as the window you slept, ending when you opened the app. */}
              <h2 className="card-title" style={{ marginBottom: 2 }}>Slept {sleepDraftWindow(minutes, getAppOpenedAt())}?</h2>
              <p className="meta" style={{ marginBottom: 12 }}>
                Up to {formatDuration(minutes)} · {sleepDraft.reason}
                {sleepDraftAdjust !== 0 ? ` · adjusted ${sleepDraftAdjust > 0 ? "+" : "−"}${Math.abs(sleepDraftAdjust)} min` : ""}
              </p>
              <button className="btn-primary" disabled={busy} onClick={() => void handleLogSleepDraft(minutes, sleepDraftAdjust !== 0)}>
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
                    ENTER IN DATA
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


  return { renderRecoverSleepPrompt, renderPhaseRow };
}
