import { useEffect, useRef, useState } from "react";
import { getLiftRecentSessions, type LiftSession } from "../../../application/trainHistoryQueries";
import { formatShortDate } from "../../../application/bodyTrendQueries";
import { describeError } from "../../errorMessage";
import { StrengthCurve } from "./StrengthCurve";

/**
 * ULTIMATE-FOUNDATION-002: the current exercise's HISTORY control. It owns
 * its own open state, so it lives inside the per-exercise CommandSurface and
 * starts closed whenever the current exercise changes — coming back to a lift
 * never reopens its history or moves focus unasked.
 */
export function LiftHistoryControl({ exerciseId, exerciseName }: { exerciseId: string; exerciseName: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  if (open) {
    return (
      <LiftHistory
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        onClose={() => {
          setOpen(false);
          requestAnimationFrame(() => buttonRef.current?.focus());
        }}
      />
    );
  }
  return (
    <button ref={buttonRef} type="button" className="btn-secondary train-lift-history-open" aria-label={`${exerciseName} history`} onClick={() => setOpen(true)}>
      HISTORY
    </button>
  );
}

/**
 * ULTIMATE-FOUNDATION-002 (Training Record): a lift's history during a
 * workout — its existing strength curve plus the working sets from its last
 * three finished sessions. Read once when opened, never after each logged
 * set; the in-progress session is not part of it. Closing returns to the
 * same set with nothing changed (TRAIN owns the inputs and the rest timer).
 */
export function LiftHistory({ exerciseId, exerciseName, onClose }: { exerciseId: string; exerciseName: string; onClose: () => void }) {
  const [sessions, setSessions] = useState<LiftSession[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    getLiftRecentSessions(exerciseId).then(
      (next) => current && setSessions(next),
      (error) => current && setReadError(describeError(error, "This lift's history is unavailable.")),
    );
    return () => {
      current = false;
    };
  }, [exerciseId]);

  return (
    <div className="train-lift-history">
      <StrengthCurve exerciseId={exerciseId} exerciseName={exerciseName} heading={`${exerciseName} history`} focusOnOpen onClose={onClose}>
        {readError ? (
          <p className="meta" role="alert">{readError}</p>
        ) : sessions === null ? null : sessions.length > 0 && (
          <>
            <p className="tool-label" style={{ marginBottom: 4 }}>RECENT SESSIONS</p>
            <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
              {sessions.map((session) => (
                <li key={session.sessionId} className="card-body" style={{ marginBottom: 2 }}>
                  {formatShortDate(session.startedAt)}: {session.sets.map((s) => `${s.weight} lb × ${s.reps}`).join(", ")}
                </li>
              ))}
            </ul>
          </>
        )}
      </StrengthCurve>
    </div>
  );
}
