import type { Dispatch, ReactNode, SetStateAction } from "react";
import { SleepMetricSheet } from "./SleepMetricSheet";
import { LogSheet } from "../../components/LogSheet";
import { CheckInSheet } from "./CheckInSheet";
import { TodayToasts } from "./TodayToasts";
import { quickCheckInValues, type LoggedEntry, type TodayActions } from "./todayActions";
import type { MeasuredMetric } from "./MeasuredSheet";
import { MetricDetailSheet } from "../../metrics/MetricDetailSheet";
import { LogEntrySheet, type LogEntryTarget } from "../../components/LogEntrySheet";
import { ShiftMarkSheet } from "../../components/ShiftMarkSheet";
import type { DetailMetric } from "../../../application/metricDetail";
import type { useCheckInForm } from "./useCheckInForm";

/**
 * GRAYSON-TODAY-SPLIT-003 slice D3 (sections out): the seven sheets and toasts at the foot of TODAY's main view,
 * moved out of TodayScreen unchanged and in the same order: the NOTE sheet, the sleep sheet, the log-entry and
 * shift-mark editors, the metric detail sheet, the check-in sheet and the "recorded" toasts. TODAY still owns every
 * open/close value; this component only shows them. It takes the one set of actions, the check-in form hook and the
 * local values the sheets show or set.
 */
export function TodaySheets({ actions, checkInForm, local }: {
  actions: Pick<TodayActions, "busyRef" | "handleCheckIn" | "handleQuickCheckIn" | "handleSameAsLast">;
  checkInForm: Pick<ReturnType<typeof useCheckInForm>, "values" | "setValues" | "checkInError" | "activeCheckInDraft">;
  local: {
    busy: boolean;
    refresh: () => Promise<void>;
    refreshVersion: number;
    fastCaptureOpen: boolean;
    closeFastCapture: () => void;
    captureTool: ReactNode;
    measuredOpen: MeasuredMetric | null;
    setMeasuredOpen: Dispatch<SetStateAction<MeasuredMetric | null>>;
    editTarget: LogEntryTarget | null;
    setEditTarget: Dispatch<SetStateAction<LogEntryTarget | null>>;
    shiftTarget: { beyondDayId: string } | null;
    setShiftTarget: Dispatch<SetStateAction<{ beyondDayId: string } | null>>;
    detailOpen: DetailMetric | null;
    setDetailOpen: Dispatch<SetStateAction<DetailMetric | null>>;
    checkInFormOpen: boolean;
    setCheckInFormOpen: Dispatch<SetStateAction<boolean>>;
    hydrationConfirmation: LoggedEntry | null;
    mealConfirmation: (LoggedEntry & { message: string }) | null;
    sleepConfirmation: LoggedEntry | null;
    proteinConfirmation: LoggedEntry | null;
    onOpenHealthEvidence: ((metric: "water" | "protein" | "weight" | "sleep") => void) | undefined;
    onOpenRecord: ((target: "water" | "weight" | "protein" | "note") => void) | undefined;
  };
}) {
  const { busyRef, handleCheckIn, handleQuickCheckIn, handleSameAsLast } = actions;
  const { values, setValues, checkInError, activeCheckInDraft } = checkInForm;
  const {
    busy, refresh, refreshVersion, fastCaptureOpen, closeFastCapture, captureTool, measuredOpen, setMeasuredOpen, editTarget, setEditTarget,
    shiftTarget, setShiftTarget, detailOpen, setDetailOpen, checkInFormOpen, setCheckInFormOpen,
    hydrationConfirmation, mealConfirmation, sleepConfirmation, proteinConfirmation, onOpenHealthEvidence, onOpenRecord,
  } = local;
  return <>
    <LogSheet open={fastCaptureOpen} title="NOTE" onClose={closeFastCapture} canClose={() => !busyRef.current}>{captureTool}</LogSheet>
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
  </>;
}
