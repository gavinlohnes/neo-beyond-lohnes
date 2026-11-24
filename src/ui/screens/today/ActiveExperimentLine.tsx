import { useEffect, useState } from "react";
import { useReportPresence } from "../../components/usePresence";
import { activeExperiments, experimentDay, getExperiments, type Experiment } from "../../../application/tryExperiment";

/**
 * LOOP step 3 — TRY: on the days an experiment covers, one quiet line under the mode name. No
 * reminder, no red, no action; it only says what you are trying. Renders nothing without one.
 * GRAYSON-TODAY-CALM-001: a quiet line (EXPERIMENT). It tells TODAY when it has one, and stays out of sight while tucked.
 */
export function ActiveExperimentLine({ now, tucked = false, onPresence }: { now: Date; tucked?: boolean; onPresence?: (shown: boolean) => void }) {
  const [active, setActive] = useState<Experiment[]>([]);
  const day = now.toDateString();
  useEffect(() => {
    let live = true;
    void getExperiments().then((all) => { if (live) setActive(activeExperiments(all, new Date())); }, () => { if (live) setActive([]); });
    return () => { live = false; };
  }, [day]);
  useReportPresence(active.length > 0, onPresence);
  if (!active.length || tucked) return null;
  return <div className="cc-mode-meta" data-try-active>
    {active.map((e) => <span key={e.entry.id} style={{ display: "block" }}>Trying: {e.what} · day {Math.min(experimentDay(e, now), e.days)} of {e.days}</span>)}
  </div>;
}
