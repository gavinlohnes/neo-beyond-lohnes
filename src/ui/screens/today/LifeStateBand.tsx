import "./lifeState.css";
import type { LifeStateReading } from "../../../application/lifeState";
import type { LifeMomentReading } from "../../../application/lifeTransition";

/**
 * LIFE-STATE-001: what state BEYOND believes today is in (WORK RUN, RECOVERY, FLIP, FREE), in one calm line, with
 * where it came from one tap away. LIFE-STATE-002: on the day a state changes, the moment leads ("RUN OVER The run is
 * over. This is the first day off."); TODAY puts slice 3's post-run report and recovery contract just below its next
 * card. Read only; TODAY derives both readings in render. With no reading it shows nothing.
 */
export function LifeStateBand({ reading, moment = null }: { reading: LifeStateReading | null; moment?: LifeMomentReading | null }) {
  if (!reading) return null;
  return (
    <section className="today-life-state" data-life-state={reading.state} data-life-moment={moment?.moment} aria-label="Operating state">
      {moment && <p className="today-life-state__moment"><strong>{moment.label}</strong> <span>{moment.line}</span></p>}
      <p className="today-life-state__line"><strong>{reading.label}</strong> <span>{reading.line}</span></p>
      <details className="today-life-state__why">
        <summary>WHY {reading.label}</summary>
        <ul>{reading.why.map((line) => <li key={line} className="meta">{line}</li>)}</ul>
      </details>
    </section>
  );
}
