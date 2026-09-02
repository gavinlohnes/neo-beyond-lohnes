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
  onOpenTrain,
}: {
  activeWorkout: WorkoutSession | null;
  isDominant: boolean;
  onOpenTrain?: ((destination: "RECOVERY" | "WORKOUT") => void) | undefined;
}) {
  if (!activeWorkout) return null;
  const sessionLabel =
    activeWorkout.sessionType === "RECOVERY"
      ? "Recovery session"
      : `${activeWorkout.templateId} · ${activeWorkout.sessionType.toLowerCase()}`;
  const content = (
    <>
      <p className="tool-label">WORKOUT IN PROGRESS</p>
      <h2 className={isDominant ? "command-title" : "card-title"}>Resume your active workout</h2>
      <p className="card-body" style={{ marginBottom: 12 }}>
        {sessionLabel} · started {new Date(activeWorkout.startedAt).toLocaleTimeString()}. Your logged sets and exact position remain in TRAIN.
      </p>
      <button className="btn-primary" onClick={() => onOpenTrain?.("WORKOUT")}>
        RESUME WORKOUT
      </button>
    </>
  );
  return isDominant ? <CommandSurface>{content}</CommandSurface> : <div className="equipment-row">{content}</div>;
}
