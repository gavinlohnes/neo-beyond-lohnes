import "./lifeState.css";
import type { LifeStateReading } from "../../../application/lifeState";

/**
 * LIFE-STATE-001: what state BEYOND believes today is in (WORK RUN, RECOVERY, FLIP, FREE), in one calm line, with
 * where it came from one tap away. Read only; TODAY derives the reading in render. With no reading it shows nothing.
 */
export function LifeStateBand({ reading }: { reading: LifeStateReading | null }) {
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
