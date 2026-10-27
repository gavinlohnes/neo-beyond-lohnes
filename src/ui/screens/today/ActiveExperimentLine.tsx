import { useEffect, useState } from "react";
import { activeExperiments, experimentDay, getExperiments, type Experiment } from "../../../application/tryExperiment";

/**
 * LOOP step 3 — TRY: on the days an experiment covers, one quiet line under the mode name. No
 * reminder, no red, no action; it only says what you are trying. Renders nothing without one.
 */
export function ActiveExperimentLine({ now }: { now: Date }) {
  const [active, setActive] = useState<Experiment[]>([]);
  const day = now.toDateString();
  useEffect(() => {
    let live = true;
    void getExperiments().then((all) => { if (live) setActive(activeExperiments(all, new Date())); }, () => { if (live) setActive([]); });
    return () => { live = false; };
  }, [day]);
  if (!active.length) return null;
  return <div className="cc-mode-meta" data-try-active>
    {active.map((e) => <span key={e.entry.id} style={{ display: "block" }}>Trying: {e.what} · day {Math.min(experimentDay(e, now), e.days)} of {e.days}</span>)}
  </div>;
}
