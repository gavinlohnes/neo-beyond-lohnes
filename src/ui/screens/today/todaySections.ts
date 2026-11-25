import type { Dispatch, RefObject, SetStateAction } from "react";
import type { useHiddenFeatures } from "../../hiddenFeatures";
import type { BodyFocus } from "../../shortcuts";
import type { useWorkoutCallQuestion } from "./WorkoutCall";
import type { TrainDestination } from "../train/TrainScreen";
import type { MeasuredMetric } from "./MeasuredSheet";
import type { DetailMetric } from "../../../application/metricDetail";
import type { ScheduledContext } from "../../../engine/scheduledContext";
import type { templateLabel } from "../train/trainCopy";
import type { LogNudgeRead } from "../../../application/logNudge";
import type { MeasuredSnapshot } from "../../../application/measuredQueries";
import type { PaceHistories } from "../../../application/pace";
import type { ToolsItem } from "./shiftClock";
import type { TodaySnapshot } from "./todayRead";
import type { TodayView } from "./todayView";
import type { TodayActions, LoggedEntry } from "./todayActions";
import type { useResetSession } from "./useResetSession";
import type { useShiftDownSession } from "./useShiftDownSession";
import type { useCheckInForm } from "./useCheckInForm";
import type { useConfirmFlows } from "./useConfirmFlows";

type Setter<T> = Dispatch<SetStateAction<T>>;

/**
 * GRAYSON-TODAY-SPLIT-003 slice D2 (sections out): what TODAY's sections (TOOLS in TodayTools.tsx, the phase rows in
 * TodayPhaseRows.tsx) take: the one read, the derived view, the one set of actions, the slice C hooks, and the few
 * other local values and shell callbacks they show or set.
 */
export interface TodaySectionsInput {
  snapshot: TodaySnapshot;
  view: TodayView;
  actions: TodayActions;
  resetSession: ReturnType<typeof useResetSession>;
  shiftDownSession: ReturnType<typeof useShiftDownSession>;
  checkInForm: ReturnType<typeof useCheckInForm>;
  confirmFlows: ReturnType<typeof useConfirmFlows>;
  local: {
    now: Date;
    busy: boolean;
    operationsOnly: boolean;
    commandFocus: ToolsItem | "SHIFT_HANDOFF" | "SMALL_STEPS" | null | undefined;
    commandTools: boolean;
    hiddenFeatures: ReturnType<typeof useHiddenFeatures>;
    workoutQuestion: ReturnType<typeof useWorkoutCallQuestion>;
    refresh: () => Promise<void>;
    scheduledContext: ScheduledContext | null;
    measured: MeasuredSnapshot | null;
    paceHistories: PaceHistories | null;
    logNudgeRead: LogNudgeRead | null;
    postShiftPlan: string | undefined;
    nextWorkout: { label: string; minutes: Partial<Record<"STANDARD" | "REDUCED", number>> } | null;
    customTemplateList: Parameters<typeof templateLabel>[1];
    shiftHandoffRefreshKey: number | undefined;
    captureText: string;
    setCaptureText: Setter<string>;
    captureFeedback: { kind: "SUCCESS" | "ERROR"; message: string } | null;
    checkInFormOpen: boolean;
    setCheckInFormOpen: Setter<boolean>;
    commitmentsOpen: boolean;
    setCommitmentsOpen: Setter<boolean>;
    endDayBlockedByWorkout: boolean;
    endDayOpen: boolean;
    setEndDayOpen: Setter<boolean>;
    mdWaterInput: string;
    setMdWaterInput: Setter<string>;
    mdProteinInput: string;
    setMdProteinInput: Setter<string>;
    minimumDayOpen: boolean;
    setMinimumDayOpen: Setter<boolean>;
    resetOpen: boolean;
    setResetOpen: Setter<boolean>;
    shiftDownOpen: boolean;
    setShiftDownOpen: Setter<boolean>;
    shiftDownStartRef: RefObject<HTMLButtonElement | null>;
    workContextOpen: boolean;
    setWorkContextOpen: Setter<boolean>;
    waterControlsVisible: boolean;
    setHydrationConfirmation: Setter<LoggedEntry | null>;
    setHydrationOperationOpen: Setter<boolean>;
    setDetailOpen: Setter<DetailMetric | null>;
    setMeasuredOpen: Setter<MeasuredMetric | null>;
    setNudgeAnswered: Setter<number>;
    sleepDraftAdjust: number;
    setSleepDraftAdjust: Setter<number>;
    sleepNotYetDay: string | null;
    setSleepNotYetDay: Setter<string | null>;
    sleepDraftDismissedDayId: string | null;
    onOpenBody: ((target?: BodyFocus) => void) | undefined;
    onOpenTrain: ((destination: TrainDestination) => void) | undefined;
    onOpenHealthEvidence: ((metric: "water" | "protein" | "weight" | "sleep") => void) | undefined;
    onViewCommitments: ((id?: string) => void) | undefined;
  };
}
