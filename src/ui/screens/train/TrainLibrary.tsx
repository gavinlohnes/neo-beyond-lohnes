import { lazy, Suspense, useEffect, useId, useRef } from "react";
import "./routineEditor.css";

// The library screen carries the open set's loader; it loads only when he opens LIBRARY.
const ExerciseLibraryScreen = lazy(() => import("../more/ExerciseLibraryScreen").then((m) => ({ default: m.ExerciseLibraryScreen })));

/**
 * GRAYSON-TRAIN-HOME-001: the exercise library inside TRAIN, one tap from the start row: the same screen as MORE's
 * (his exercises, the library, the open set's search and "Show stretches"), with BACK to the workout.
 */
export function TrainLibrary({ onClose }: { onClose: () => void }) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className="card train-library" aria-labelledby={`${id}-title`} data-train-library>
    <div className="train-library__head">
      <h3 id={`${id}-title`} ref={heading} tabIndex={-1} className="card-title">Exercise library</h3>
      <button type="button" className="btn-secondary routine-inline" onClick={onClose}>BACK TO WORKOUT</button>
    </div>
    <Suspense fallback={<p className="meta" role="status">Opening the library…</p>}><ExerciseLibraryScreen /></Suspense>
    <button type="button" className="btn-secondary" style={{ marginTop: 12 }} onClick={onClose}>BACK TO WORKOUT</button>
  </section>;
}
