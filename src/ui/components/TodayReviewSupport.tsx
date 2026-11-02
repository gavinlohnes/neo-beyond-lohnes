import { useRef, useState, type ReactNode } from "react";
import type { ShiftClockPhase } from "../screens/today/shiftClock";
import { WeeklyReviewReadyLine } from "./WeeklyReviewReadyLine";

/** Placement only. Children stay mounted; opening depth never generates another review. */
export function TodayReviewSupport({ phase, now, active, review, onOpen }: {
  phase: ShiftClockPhase | null; now: Date; active: boolean;
  review?: ((onAvailable: (value: boolean) => void) => ReactNode) | undefined;
  onOpen?: (() => void) | undefined;
}) {
  const [alfredAvailable, setAlfredAvailable] = useState(false);
  const [structuredAvailable, setStructuredAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const summary = useRef<HTMLElement>(null);
  // An operator already reading keeps that deliberate depth across a phase change.
  const visible = open || phase === "OFF" && (alfredAvailable || structuredAvailable);
  return <div hidden={!visible}>
    <details className="support-disclosure today-review-support" onToggle={(event) => {
      const nextOpen = event.currentTarget.open;
      setOpen(nextOpen);
      if (!nextOpen && (phase !== "OFF" || !(alfredAvailable || structuredAvailable))) {
        const target = event.currentTarget.closest(".redesign-today")?.querySelector<HTMLElement>('[aria-label="Next action"] button, [aria-label="Log"] button');
        requestAnimationFrame(() => target?.focus());
      }
    }}>
      <summary ref={summary} aria-label="Review when you want"><span>REVIEW</span><span className="support-disclosure__hint">When you want</span></summary>
      <div className="support-disclosure__body">
        {review?.(setAlfredAvailable)}
        {onOpen && <WeeklyReviewReadyLine phase={phase} now={now} active={active} onOpen={onOpen} onAvailabilityChange={setStructuredAvailable} />}
        {!alfredAvailable && !structuredAvailable && <p className="meta">No review waiting. Saved Alfred reviews remain in DATA → MONTH.</p>}
        <button type="button" className="alfred-link" onClick={() => { const details = summary.current?.parentElement as HTMLDetailsElement | null; if (details) details.open = false; summary.current?.focus(); }}>CLOSE REVIEW</button>
      </div>
    </details>
  </div>;
}
