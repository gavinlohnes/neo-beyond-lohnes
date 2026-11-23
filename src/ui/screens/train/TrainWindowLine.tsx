import { useEffect, useState } from "react";
import { getShiftSleepPlan, TRAIN_PREP_MINUTES, WAKE_MARGIN_MINUTES } from "../../../application/shiftSleepPlan";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const span = (min: number) => min % 60 === 0 ? `${min / 60} h` : `${min} min`;

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
      if (!w || !plan) { setLine(null); return; }
      // Once the window has begun, it starts "now" rather than at its usual opening (review on #627).
      const usualOpen = Date.parse(w.wake) + WAKE_MARGIN_MINUTES * 60_000;
      const from = Date.parse(w.start) > usualOpen
        ? `Train window: now–${clock(w.end)},`
        : `Train window: ${clock(w.start)}–${clock(w.end)} · ${span(WAKE_MARGIN_MINUTES)} after your usual wake (${clock(w.wake)}),`;
      setLine(`${from} done ${span(TRAIN_PREP_MINUTES)} before your ${clock(plan.shift.start)} shift.`);
    }, () => { if (live) setLine(null); });
    return () => { live = false; };
  }, [active]);
  return line ? <p className="meta train-window" data-train-window>{line}</p> : null;
}
