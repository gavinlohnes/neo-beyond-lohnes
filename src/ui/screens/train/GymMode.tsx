import { useEffect, useRef, useState } from "react";
import type { ExercisePrescription } from "../../../domain/workout/types";
import { describePlates, describeWarmUp, getBarbellExerciseIds, warmUpRamp } from "../../../application/gymModeQueries";

export interface GymModeProps {
  exercise: ExercisePrescription;
  exerciseIndex: number;
  exerciseCount: number;
  /** The set to log next, or null when this exercise's sets are all logged. */
  setNumber: number | null;
  allComplete: boolean;
  weight: string;
  reps: string;
  /** Last time's numbers for this exercise (the ghost set). */
  ghost: { weight: number; reps: number } | undefined;
  /** True when this exercise has no logged sets yet this session. */
  exerciseUntouched: boolean;
  /** The session's exercise ids in order (the warm-up ramp goes on the first barbell one). */
  sessionExerciseIds: readonly string[];
  restLabel: string | null;
  notice: string | null;
  busy: boolean;
  onAdjustWeight: (deltaLbs: number) => void;
  onAdjustReps: (delta: number) => void;
  onSetWeight: (value: string) => void;
  onSetReps: (value: string) => void;
  onLog: () => void;
  onSkip: () => void;
  onExit: () => void;
  /** Moves to the first exercise with sets left (TRAIN's own rule). */
  onNextExercise: () => void;
}

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

/**
 * GYM-001 (owner brief 2026-10-04, rulings 1A and 3A): the gym screen. A
 * full-screen view of the current lift for one hand between sets. It only
 * presents TRAIN's own state and calls TRAIN's own handlers (the same
 * logSet path); EXIT returns to TRAIN with nothing lost. Keeps the screen
 * awake while open where the browser allows it. Plate math and the warm-up
 * ramp appear for barbell lifts only; the ramp is a suggestion, never
 * logged.
 */
export function GymMode(props: GymModeProps) {
  const { exercise, setNumber } = props;
  const [barbellIds, setBarbellIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let current = true;
    void getBarbellExerciseIds().then((ids) => {
      if (current) setBarbellIds(ids);
    });
    return () => {
      current = false;
    };
  }, []);

  useWakeLock();

  // GYM-POLISH-001: focus moves into gym mode on open; Escape closes it.
  const dialogRef = useRef<HTMLDivElement>(null);
  const { onExit } = props;
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onExit]);

  const isBarbell = barbellIds.has(exercise.exerciseId);
  const firstBarbellId = props.sessionExerciseIds.find((id) => barbellIds.has(id));
  const weightLbs = Number(props.weight);
  const ramp =
    isBarbell && exercise.exerciseId === firstBarbellId && setNumber === 1 && props.exerciseUntouched && weightLbs > 0
      ? warmUpRamp(weightLbs)
      : [];

  return (
    <div ref={dialogRef} tabIndex={-1} className="gym-mode" role="dialog" aria-modal="true" aria-label="Gym mode">
      <div className="gym-mode__top">
        <p className="meta" style={{ margin: 0 }}>
          Exercise {props.exerciseIndex + 1} of {props.exerciseCount}
        </p>
        <button type="button" className="btn-secondary gym-mode__exit" onClick={props.onExit}>
          EXIT
        </button>
      </div>

      <h2 className="gym-mode__name">{exercise.name}</h2>
      <p className="meta-strong" style={{ margin: "0 0 4px" }}>
        {setNumber !== null ? `Set ${setNumber} of ${exercise.sets}` : "All sets logged"} · {exercise.repRangeLow}-{exercise.repRangeHigh} reps
      </p>
      {props.ghost && (
        <p className="gym-mode__ghost">
          Last time {props.ghost.weight} × {props.ghost.reps}
        </p>
      )}

      {props.allComplete ? (
        <div className="gym-mode__done">
          <p className="card-title">Every set is logged.</p>
          <p className="card-body">EXIT to finish the workout in TRAIN.</p>
        </div>
      ) : setNumber === null ? (
        <div className="gym-mode__done">
          <p className="card-body">This exercise is done.</p>
          <button type="button" className="btn-primary gym-mode__log" onClick={props.onNextExercise}>
            NEXT EXERCISE
          </button>
        </div>
      ) : (
        <>
          {ramp.length > 0 && <p className="gym-mode__hint">{describeWarmUp(ramp)}</p>}
          <Stepper
            label="Weight"
            unit="lb"
            value={props.weight}
            onChange={props.onSetWeight}
            onMinus={() => props.onAdjustWeight(-exercise.incrementLbs)}
            onPlus={() => props.onAdjustWeight(exercise.incrementLbs)}
          />
          {isBarbell && weightLbs > 0 && <p className="gym-mode__hint">{describePlates(weightLbs)}</p>}
          <Stepper
            label="Reps"
            unit="reps"
            value={props.reps}
            onChange={props.onSetReps}
            onMinus={() => props.onAdjustReps(-1)}
            onPlus={() => props.onAdjustReps(1)}
          />
          {props.notice && (
            <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
              {props.notice}
            </p>
          )}
          <button type="button" className="btn-primary gym-mode__log" disabled={props.busy} onClick={props.onLog}>
            LOG SET {setNumber}
          </button>
          <button type="button" className="btn-secondary gym-mode__skip" disabled={props.busy} onClick={props.onSkip}>
            SKIP
          </button>
        </>
      )}

      {props.restLabel && (
        <p className="gym-mode__rest" role="status">
          {props.restLabel}
        </p>
      )}
    </div>
  );
}

/** A big typeable number with −/+ on either side; empty reads "0" as a placeholder, never a logged value. */
function Stepper(props: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="gym-mode__stepper">
      <button type="button" className="btn-secondary gym-mode__step" aria-label={`${props.label} down`} onClick={props.onMinus}>
        −
      </button>
      <label className="gym-mode__value">
        <input
          className="gym-mode__number"
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="0"
          aria-label={props.label}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
        <span className="meta">{props.unit}</span>
      </label>
      <button type="button" className="btn-secondary gym-mode__step" aria-label={`${props.label} up`} onClick={props.onPlus}>
        +
      </button>
    </div>
  );
}

/** Keeps the screen awake while mounted, re-asking when the page becomes visible again. */
function useWakeLock() {
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let active = true;
    const acquire = () => {
      if (document.visibilityState !== "visible") return;
      void nav.wakeLock!
        .request("screen")
        .then((s) => {
          if (!active) {
            void s.release();
            return;
          }
          // GYM-POLISH-001: let go of a lock still held before keeping the new one.
          void sentinel?.release().catch(() => {});
          sentinel = s;
        })
        .catch(() => {});
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release().catch(() => {});
    };
  }, []);
}
