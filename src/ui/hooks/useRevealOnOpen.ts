import { useEffect, useRef } from "react";
import { positionRevealedSurface } from "../navigationPosition";

/**
 * Shared FIELD reveal contract. It reacts only to a closed -> open
 * transition, after React has committed the actionable surface.
 */
export function useRevealOnOpen<T extends HTMLElement>(
  open: boolean,
  { focusOnOpen = false, revealOnMount = false }: { focusOnOpen?: boolean; revealOnMount?: boolean } = {},
) {
  const targetRef = useRef<T>(null);
  const previouslyOpen = useRef(revealOnMount ? false : open);

  useEffect(() => {
    const justOpened = open && !previouslyOpen.current;
    previouslyOpen.current = open;
    if (!justOpened) return;

    const frame = window.requestAnimationFrame(() => {
      const target = targetRef.current;
      if (!target) return;
      if (focusOnOpen) target.focus({ preventScroll: true });
      positionRevealedSurface(target);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusOnOpen, open]);

  return targetRef;
}
