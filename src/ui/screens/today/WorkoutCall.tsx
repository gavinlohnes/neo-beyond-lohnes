import { useEffect, useRef, useState } from "react";
import { setPlannedWork } from "../../../application/commands";
import type { TonightState } from "../../../application/tonightQueries";
import type { BeyondDay } from "../../../domain/common/types";
import { formatDuration } from "../body/bodyScreenCopy";
import type { TrainDestination } from "../train/TrainScreen";

/**
 * TONIGHT-001 (owner approval, 2026-10-19): one question where the workout
 * decision actually happens. After a shift (RECOVER) it asks train, short or
 * sleep first; on a day off (OFF DUTY) it waits for the first open and asks
 * start, later or not today. Gavin has no fixed routine yet, so it never
 * assumes an answer.
 *
 * It records only the operator's answer, through the existing PLANNED_WORK_SET
 * command (the same one TRAIN's "Planning to train today?" uses), and opens
 * TRAIN, whose own flow (RED override included) governs any start. The variant
 * marked "SUGGESTED" is TRAIN's existing suggestSessionVariant output, the same
 * one the workout row already showed; the Engine's recommendation stays in its
 * own card above, unchanged.
 */
export type WorkoutCallVariant = "STANDARD" | "REDUCED" | "RESET" | "RECOVERY";

const LATER_KEY_PREFIX = "beyond.workoutCallLater.";

/** LATER is placement only, like a mode pin: this phone, this BeyondDay, never an event. */
function readLater(dayId: string): boolean {
  try { return localStorage.getItem(LATER_KEY_PREFIX + dayId) === "1"; } catch { return false; }
}
function writeLater(dayId: string, value: boolean) {
  try {
    if (value) localStorage.setItem(LATER_KEY_PREFIX + dayId, "1");
    else localStorage.removeItem(LATER_KEY_PREFIX + dayId);
  } catch {
    // Storage unavailable: LATER simply doesn't persist across reloads.
  }
}

/** True while the workout call would show its question: unanswered, not deferred, nothing trained. */
export function workoutCallIsOpen(dayId: string, tonight: TonightState | null): boolean {
  return !!tonight && !tonight.trained && tonight.planned === undefined && !readLater(dayId);
}

export function WorkoutCall({
  phase,
  day,
  tonight,
  workoutLabel,
  minutes,
  suggestedVariant,
  lastMainSleepMinutes,
  checkInLevel,
  busy,
  onCheckIn,
  onOpenTrain,
  onAnswered,
}: {
  phase: "EXPECTED_POST_WORK" | "OFF";
  day: BeyondDay;
  tonight: TonightState | null;
  /** "A", or a custom program's name; null while it loads. */
  workoutLabel: string | null;
  minutes: Partial<Record<"STANDARD" | "REDUCED", number>>;
  suggestedVariant: WorkoutCallVariant;
  lastMainSleepMinutes: number | null;
  /** The latest check-in's capacity, or null when there's none today. */
  checkInLevel: "GREEN" | "YELLOW" | "RED" | null;
  busy: boolean;
  onCheckIn: () => void;
  onOpenTrain?: ((destination: TrainDestination) => void) | undefined;
  /** Re-read TODAY after an answer is recorded. */
  onAnswered: () => void;
}) {
  const [later, setLater] = useState(() => readLater(day.id));
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  useEffect(() => { setLater(readLater(day.id)); setChanging(false); }, [day.id]);

  if (!tonight || tonight.trained) return null;
  const label = workoutLabel ?? "Workout";
  const minutesText = (variant: "STANDARD" | "REDUCED") => (minutes[variant] !== undefined ? `~${minutes[variant]} min` : null);

  async function answer(planned: boolean, destination?: TrainDestination) {
    if (writing.current || busy) return;
    writing.current = true;
    setError(null);
    try {
      await setPlannedWork(day.id, planned);
      writeLater(day.id, false);
      setLater(false);
      setChanging(false);
      onAnswered();
      if (destination) onOpenTrain?.(destination);
    } catch {
      setError("Your answer didn't save. Try again.");
    } finally {
      writing.current = false;
    }
  }

  function chooseLater() {
    writeLater(day.id, true);
    setLater(true);
  }

  // Answered: one quiet line, still one tap from TRAIN or a change of mind.
  if (!changing && tonight.planned === false) {
    return (
      <div className="equipment-row workout-call workout-call--quiet">
        <p className="tool-label" style={{ marginBottom: 4 }}>WORKOUT</p>
        <p className="card-title" style={{ margin: 0 }}>Not today. {label} stays next.</p>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => setChanging(true)}>CHANGE</button>
      </div>
    );
  }
  if (!changing && (tonight.planned === true || later)) {
    const variant = suggestedVariant === "REDUCED" ? "REDUCED" : "STANDARD";
    const time = minutesText(variant);
    return (
      <div className="equipment-row workout-call workout-call--quiet">
        <p className="tool-label" style={{ marginBottom: 4 }}>WORKOUT</p>
        <p className="card-title" style={{ margin: 0 }}>
          {tonight.planned === true ? "Planned" : "Later"} · {label}{time ? ` · ${time}` : ""}
        </p>
        {onOpenTrain && <button type="button" className="btn-secondary" disabled={busy} onClick={() => onOpenTrain("WORKOUT")}>OPEN TRAIN</button>}
      </div>
    );
  }

  const evidence = [
    lastMainSleepMinutes !== null ? `Slept ${formatDuration(lastMainSleepMinutes)}` : "Sleep not logged",
    checkInLevel ? `Check-in ${checkInLevel}` : "No check-in yet",
  ].join(" · ");
  const suggestedTag = <span className="today-sheet__tag">SUGGESTED</span>;
  const afterShift = phase === "EXPECTED_POST_WORK";

  return (
    <div className="equipment-row workout-call" role="group" aria-labelledby={`workout-call-${day.id}`}>
      <p className="tool-label" style={{ marginBottom: 4 }}>{afterShift ? "AFTER SHIFT" : "DAY OFF"}</p>
      <h2 id={`workout-call-${day.id}`} className="card-title" style={{ marginBottom: 2 }}>
        {afterShift ? "Train or sleep?" : `${label} today?`}
      </h2>
      <p className="meta" style={{ marginBottom: 8 }}>{evidence}</p>
      {suggestedVariant === "RESET" && <p className="meta" style={{ marginBottom: 8 }}>A RESET is suggested first. It's in TOOLS.</p>}
      <div className="workout-call__options">
        {afterShift ? (
          <>
            <button type="button" className="today-sheet__option" disabled={busy} onClick={() => void answer(true, "WORKOUT_STANDARD")}>
              <span><strong>TRAIN · {label}</strong><span>Full session{minutesText("STANDARD") ? ` · ${minutesText("STANDARD")}` : ""}</span></span>
              {suggestedVariant === "STANDARD" && suggestedTag}
            </button>
            <button type="button" className="today-sheet__option" disabled={busy} onClick={() => void answer(true, "WORKOUT_REDUCED")}>
              <span><strong>SHORT · {label} REDUCED</strong><span>Fewer sets{minutesText("REDUCED") ? ` · ${minutesText("REDUCED")}` : ""}</span></span>
              {suggestedVariant === "REDUCED" && suggestedTag}
            </button>
            <button type="button" className="today-sheet__option" disabled={busy} onClick={() => void answer(false)}>
              <span><strong>SLEEP FIRST</strong><span>{label} stays next.</span></span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="today-sheet__option" disabled={busy} onClick={() => void answer(true, suggestedVariant === "REDUCED" ? "WORKOUT_REDUCED" : "WORKOUT")}>
              <span><strong>START · {label}{suggestedVariant === "REDUCED" ? " REDUCED" : ""}</strong><span>Opens TRAIN{minutesText(suggestedVariant === "REDUCED" ? "REDUCED" : "STANDARD") ? ` · ${minutesText(suggestedVariant === "REDUCED" ? "REDUCED" : "STANDARD")}` : ""}</span></span>
            </button>
            <button type="button" className="today-sheet__option" disabled={busy} onClick={chooseLater}>
              <span><strong>LATER</strong><span>Keeps a quiet row here.</span></span>
            </button>
            <button type="button" className="today-sheet__option" disabled={busy} onClick={() => void answer(false)}>
              <span><strong>NOT TODAY</strong><span>{label} stays next.</span></span>
            </button>
          </>
        )}
      </div>
      {!checkInLevel && (
        <button type="button" className="chip workout-call__check-in" disabled={busy} onClick={onCheckIn}>CHECK IN FIRST</button>
      )}
      {error && <p className="meta meta--error" role="alert">{error}</p>}
    </div>
  );
}
