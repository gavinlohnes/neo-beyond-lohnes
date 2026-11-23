import { useEffect, useState } from "react";
import { getShiftSleepPlan } from "../../../application/shiftSleepPlan";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * C4.4 (TRAIN finish 2): when to train before the coming shift, from the shift sleep plan's own numbers (your usual
 * wake time and the shift start). Shown only when the plan has a window; never chooses the workout or its form.
 */
export function TrainWindowLine({ active }: { active: boolean }) {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void getShiftSleepPlan().then((plan) => {
      if (!live) return;
      const w = plan?.trainWindow;
      setLine(w && plan ? `Train window: ${clock(w.start)}–${clock(w.end)} · an hour after your usual wake (${clock(w.wake)}), done 2 h before your ${clock(plan.shift.start)} shift.` : null);
    }, () => { if (live) setLine(null); });
    return () => { live = false; };
  }, [active]);
  return line ? <p className="meta train-window" data-train-window>{line}</p> : null;
}
