/** FIELD-NAV-001: document position is shell state, not tab state. */
export function positionPrimaryDestination() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

const REVEAL_TOP_INSET_PX = 12;
const REVEAL_BOTTOM_INSET_PX = 88;

/**
 * Put the beginning of a newly revealed surface inside the usable phone
 * viewport. Existing in-view content is left alone; this is positioning,
 * not a request to animate every disclosure.
 */
export function positionRevealedSurface(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const usableBottom = window.innerHeight - REVEAL_BOTTOM_INSET_PX;
  if (rect.top >= REVEAL_TOP_INSET_PX && rect.top <= usableBottom) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollBy({
    top: rect.top - REVEAL_TOP_INSET_PX,
    left: 0,
    behavior: reducedMotion ? "auto" : "smooth",
  });
}
