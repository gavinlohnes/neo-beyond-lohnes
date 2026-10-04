/** FIELD-NAV-001: document position is shell state, not tab state. */
export function positionPrimaryDestination() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

const REVEAL_TOP_INSET_PX = 12;
// Used only when the fixed bottom nav isn't rendered (component tests).
const REVEAL_BOTTOM_INSET_PX = 88;

/**
 * The bottom of the usable viewport: the top edge of the fixed bottom nav,
 * measured live so it includes the iPhone home-indicator safe area.
 */
function usableViewportBottom() {
  const nav = document.querySelector(".shell-nav");
  if (nav) return nav.getBoundingClientRect().top;
  return window.innerHeight - REVEAL_BOTTOM_INSET_PX;
}

/**
 * Bring a newly revealed surface into the usable phone viewport: the whole
 * surface when it fits, otherwise its beginning at the top. Content already
 * fully in view is left alone, and the scroll is the smallest that works.
 */
export function positionRevealedSurface(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const usableBottom = usableViewportBottom();
  const needed = Math.min(rect.height, usableBottom - REVEAL_TOP_INSET_PX);
  let delta: number;
  if (rect.top < REVEAL_TOP_INSET_PX) delta = rect.top - REVEAL_TOP_INSET_PX;
  else if (rect.top + needed > usableBottom) delta = Math.min(rect.top + needed - usableBottom, rect.top - REVEAL_TOP_INSET_PX);
  else return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollBy({
    top: delta,
    left: 0,
    behavior: reducedMotion ? "auto" : "smooth",
  });
}
