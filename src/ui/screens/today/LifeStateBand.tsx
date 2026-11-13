import { useEffect, useState } from "react";
import "./lifeState.css";
import { getLifeState, type LifeState, type LifeStateReading } from "../../../application/lifeState";

/**
 * LIFE-STATE-001: what state BEYOND believes today is in (WORK RUN, RECOVERY, FLIP, FREE), in one calm line, with
 * where it came from one tap away. Read only. With no way to know today, it shows nothing. `onState` lets TODAY
 * order its own sections by state.
 */
export function LifeStateBand({ now, dayId, workContext, onState }: {
  now: Date; dayId: string; workContext: "WORK" | "OFF" | "UNKNOWN" | undefined;
  onState?: (state: LifeState | null) => void;
}) {
  const [reading, setReading] = useState<LifeStateReading | null>(null);
  // Re-read when the lived day, its recorded context or the hour changes (the schedule can say more at a boundary).
  const hour = Math.floor(now.getTime() / 3_600_000);
  useEffect(() => {
    let current = true;
    void getLifeState(now, workContext).then((next) => { if (current) { setReading(next); onState?.(next?.state ?? null); } })
      .catch(() => { if (current) { setReading(null); onState?.(null); } });
    return () => { current = false; };
  }, [dayId, workContext, hour]);
  if (!reading) return null;
  return (
    <section className="today-life-state" data-life-state={reading.state} aria-label="Operating state">
      <p className="today-life-state__line"><strong>{reading.label}</strong> <span>{reading.line}</span></p>
      <details className="today-life-state__why">
        <summary>WHY {reading.label}</summary>
        <ul>{reading.why.map((line) => <li key={line} className="meta">{line}</li>)}</ul>
      </details>
    </section>
  );
}
