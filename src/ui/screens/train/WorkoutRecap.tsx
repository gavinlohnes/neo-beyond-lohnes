import { useEffect, useState } from "react";
import { getWorkoutRecap, type WorkoutRecap as Recap } from "../../../application/trainHistoryQueries";

export function WorkoutRecap({ sessionId }: { sessionId: string }) {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    setRecap(null); setFailed(false);
    getWorkoutRecap(sessionId).then((r) => { if (current) setRecap(r); }, () => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [sessionId]);
  if (failed) return <p className="meta">Session saved. Comparison is temporarily unavailable.</p>;
  if (!recap) return null;
  return <div className="train-workout-recap">
    <h3 className="tool-label">SESSION RECAP</h3>
    <p className="meta">{recap.warmups} warm-ups · effort recorded for {recap.effortRecorded} working sets</p>
    {!recap.previousStartedAt ? <p className="card-body">First saved session in this template and workout variant. Your baseline starts here.</p> : <>
      <p className="meta">Compared with {new Date(recap.previousStartedAt).toLocaleDateString()}{recap.previousStatus === "PARTIAL" ? " (partial)" : ""} · same template and workout variant</p>
      {recap.matchedLifts > 0 ? <>
        <p className="card-body">{recap.matchedLifts} matching lifts · {recap.currentSets} working sets (previously {recap.previousSets})</p>
        <p className="card-body">Working volume: {recap.currentVolume.toLocaleString()} lb (previously {recap.previousVolume.toLocaleString()} lb)</p>
        <p className="meta">Volume is weight × reps, not a strength score.</p>
      </> : <p className="card-body">No matching lifts to compare.</p>}
      {recap.changedLifts > 0 && <p className="meta">Changed or missing lifts are excluded from this comparison.</p>}
    </>}
  </div>;
}
