/** UI-only acknowledgement. Call after a write resolves, never on render or press. */
export type FeedbackMeaning = "LIGHT" | "MEDIUM" | "HEAVY" | "ARMED";
const patterns: Record<FeedbackMeaning, number> = { LIGHT: 10, MEDIUM: 20, HEAVY: 35, ARMED: 8 };
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** Native Vibration API: best effort, no dependency, sound or persisted data. */
export function feedback(meaning: FeedbackMeaning, target?: HTMLElement | null): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try { navigator.vibrate?.(patterns[meaning]); } catch { /* Refusal cannot fail a saved action. */ }
  // ARMED means the hold threshold was reached, not that a write succeeded.
  if (meaning === "ARMED") return;
  const control = target;
  if (!control?.isConnected || !control.getClientRects().length || !control.matches("button, input[type=submit]")) return;
  const previous = timers.get(control);
  if (previous !== undefined) clearTimeout(previous);
  control.classList.remove("commit-pulse");
  // Restart a one-shot pulse for two separate successful commits on the same control.
  void control.offsetWidth;
  control.classList.add("commit-pulse");
  timers.set(control, setTimeout(() => { control.classList.remove("commit-pulse"); timers.delete(control); }, 120));
}

/** Capture the initiating control before awaiting a write; later focus is not provenance. */
export function captureFeedback(): (meaning: FeedbackMeaning) => void {
  const target = typeof document !== "undefined" && document.activeElement instanceof HTMLElement
    ? document.activeElement : null;
  return (meaning) => feedback(meaning, target);
}
