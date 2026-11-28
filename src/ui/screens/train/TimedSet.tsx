import "./routineEditor.css";
import { useEffect, useRef, useState } from "react";
import { formatHold } from "../../../domain/workout/types";
import { getRestBuzzPreference } from "../../../application/restBuzzQueries";
import { restEndBuzz } from "../../feel/restEndBuzz";

/**
 * GRAYSON-SET-TYPES-001: a timed set. START counts up on screen and buzzes once at the target (the rest timer's buzz,
 * at his chosen strength); DONE logs the time held. He can type the seconds instead and use LOG. Nothing is stored
 * until DONE or LOG: the clock lives in this component only.
 */
export function TimedSet({ setNumber, targetSec, value, disabled, onChange, onDone }: {
  setNumber: number;
  targetSec: number;
  /** The typed seconds, as the input holds them. */
  value: string;
  disabled?: boolean;
  onChange: (seconds: string) => void;
  onDone: (seconds: number) => void;
}) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const buzzed = useRef(false);
  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    if (startedAt === null || buzzed.current || elapsed < targetSec) return;
    buzzed.current = true;
    const pref = getRestBuzzPreference();
    if (pref.enabled) restEndBuzz(pref.strength);
  }, [elapsed, startedAt, targetSec]);

  const start = () => { buzzed.current = false; const t = Date.now(); setNow(t); setStartedAt(t); };
  const done = () => {
    const held = Math.max(1, Math.floor((Date.now() - (startedAt ?? Date.now())) / 1000));
    setStartedAt(null);
    onDone(held);
  };

  return (
    <div className="timed-set" data-timed-set>
      <p className="meta" style={{ margin: "0 0 6px" }}>Target {formatHold(targetSec)}</p>
      {startedAt !== null ? (
        <div className="timed-set__running">
          <p className="timed-set__clock" role="timer" aria-live="off" aria-label={`Set ${setNumber} held ${formatHold(elapsed)}`}>
            {formatHold(elapsed)}
          </p>
          {elapsed >= targetSec && <p className="meta" role="status" style={{ margin: 0 }}>Target reached.</p>}
          <button type="button" className="btn-primary timed-set__go" disabled={disabled} onClick={done}>DONE</button>
        </div>
      ) : (
        <>
          <button type="button" className="btn-primary timed-set__go" disabled={disabled} onClick={start}>START SET {setNumber}</button>
          <label className="timed-set__typed">
            <span className="meta train-live-field">OR TYPE SECONDS</span>
            <input type="number" inputMode="numeric" min={1} max={3600} className="input train-live-input" value={value}
              aria-label={`Set ${setNumber} seconds held`} onChange={(e) => onChange(e.target.value)} />
          </label>
        </>
      )}
    </div>
  );
}
