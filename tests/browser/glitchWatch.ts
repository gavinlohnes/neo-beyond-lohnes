/** SUIT-001 test helper. */
/**
 * Records every data-signal that ever carried the glitch class, so a 0.72 s glitch is
 * observed deterministically however fast or slow the runner is. Start it before the signal appears.
 */
let observer: MutationObserver | null = null;
export const glitched = new Set<string>();
export function watchGlitches() {
  glitched.clear();
  const note = (element: Element) => { if (element.classList.contains("signal-glitch")) glitched.add(element.getAttribute("data-signal") ?? ""); };
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        note(mutation.target as Element);
        if (mutation.oldValue?.split(" ").includes("signal-glitch")) glitched.add((mutation.target as Element).getAttribute("data-signal") ?? "");
      }
      for (const node of mutation.addedNodes) if (node instanceof Element) { note(node); node.querySelectorAll(".signal-glitch").forEach(note); }
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ["class"] });
}
export function stopWatching() { observer?.disconnect(); observer = null; }
