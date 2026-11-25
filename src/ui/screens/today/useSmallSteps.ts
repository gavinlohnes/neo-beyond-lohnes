import { useRef, useState } from "react";

/**
 * GRAYSON-TODAY-SPLIT-003 slice C (small local state): Small Steps navigation, moved out of TodayScreen unchanged:
 * whether Small Steps is on, which tool it has isolated, its two focus targets, and the return and exit taps.
 * Opening a tool reads TODAY's placement, so `openSmallTool` stays with TodayScreen until slice D.
 */
export function useSmallSteps(setToolsOpen: (open: boolean) => void) {
  const [smallSteps, setSmallSteps] = useState(false);
  const [smallTool, setSmallTool] = useState<"MINIMUM_DAY" | "CAPTURE" | null>(null);
  const smallStepsRef = useRef<HTMLDivElement>(null);
  const smallStepsEntryRef = useRef<HTMLButtonElement>(null);

  function returnToSmallSteps() {
    setSmallTool(null);
    const trigger = smallStepsRef.current?.querySelector<HTMLElement>("button");
    trigger?.focus({ preventScroll: true });
    smallStepsRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  function exitSmallSteps() {
    setSmallSteps(false);
    setSmallTool(null);
    setToolsOpen(true);
    window.requestAnimationFrame(() => {
      smallStepsEntryRef.current?.focus({ preventScroll: true });
      smallStepsEntryRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
    });
  }

  return { smallSteps, setSmallSteps, smallTool, setSmallTool, smallStepsRef, smallStepsEntryRef, returnToSmallSteps, exitSmallSteps };
}
