import type { WorkoutSession } from "../../../domain/common/types";
import { CommandSurface } from "../../components/CommandSurface";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former `renderActiveWorkout` closure — same markup,
 * same conditions, now parameterized instead of closing over TodayScreen's
 * local state. No behavior change.
 */
export function ActiveWorkoutCard({
  activeWorkout,
  isDominant,
  fromEarlierDay = false,
  onOpenTrain,
}: {
  activeWorkout: WorkoutSession | null;
  isDominant: boolean;
  /** TONIGHT-001: the workout outlived its own BeyondDay (an idle workout no longer holds the 16:30 roll). */
  fromEarlierDay?: boolean;
  onOpenTrain?: ((destination: "RECOVERY" | "WORKOUT") => void) | undefined;
}) {
  if (!activeWorkout) return null;
  const sessionLabel =
    activeWorkout.sessionType === "RECOVERY"
      ? "Recovery session"
      : `${activeWorkout.templateId} · ${activeWorkout.sessionType.toLowerCase()}`;
  const startedAt = new Date(activeWorkout.startedAt);
  const startedTime = startedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const startedDay = startedAt.toLocaleDateString("en-US", { weekday: "short" });
  const content = (
    <>
      <p className="tool-label">{fromEarlierDay ? "WORKOUT STILL OPEN" : "WORKOUT IN PROGRESS"}</p>
      <h2 className={isDominant ? "command-title" : "card-title"}>Resume your active workout</h2>
      {fromEarlierDay ? (
        <p className="card-body" style={{ marginBottom: 4 }}>
          {sessionLabel} · started {startedDay} {startedTime}. It stays on that day. Finish or resume it in TRAIN.
        </p>
      ) : (
        <p className={isDominant ? "card-body" : "visually-hidden"} style={{ marginBottom: 4 }}>
          {sessionLabel} · started {startedTime}. Sets and position stay in TRAIN.
        </p>
      )}
      <button className="btn-primary" onClick={() => onOpenTrain?.("WORKOUT")}>
        RESUME WORKOUT
      </button>
    </>
  );
  return isDominant ? <CommandSurface>{content}</CommandSurface> : <div className="equipment-row active-workout-row">{content}</div>;
}
