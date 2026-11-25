import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../../components/exerciseHowTo.css";

/**
 * GRAYSON-WINDOW-REVIEW-001: WHY A WINDOW. Bundled plain words from the brief's listed sources only (design §12 source
 * register), each claim with its link. General information, not medical advice. Same full-screen sheet pattern as the
 * exercise HOW TO sheet; Escape or CLOSE returns focus to the button that opened it.
 */
export const WHY_WINDOW_SOURCES = {
  treLifting: "https://pubmed.ncbi.nlm.nih.gov/41687432/",
  proteinTrial: "https://jn.nutrition.org/article/S0022-3166%2826%2900371-8/fulltext",
  healthyHeroes: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9536325/",
  shiftReview: "https://pubmed.ncbi.nlm.nih.gov/42383913/",
} as const;

function Source({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="why-window__source">{children}<span className="visually-hidden"> (opens in a new tab)</span></a>;
}

export function WhyWindowSheet({ onClose }: { onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, []);
  const containFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = [...(root.current?.querySelectorAll<HTMLElement>("button, [href]") ?? [])];
    if (!focusable.length) return;
    const first = focusable[0]!, last = focusable.at(-1)!;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return createPortal(<div ref={root} tabIndex={-1} className="howto-sheet" role="dialog" aria-modal="true" aria-labelledby="why-window-title" onKeyDown={containFocus} data-why-window>
    <header className="howto-sheet__head">
      <div><p className="tool-label">EATING WINDOW</p><h2 id="why-window-title">Why a window</h2></div>
      <button type="button" className="btn-secondary howto-sheet__close" onClick={onClose}>CLOSE</button>
    </header>
    <section className="howto-sheet__body">
      <h3>Fat loss</h3>
      <p>Fat comes off when you eat less than you burn. A window can make that easier, mostly by ending late grazing. The
        hours themselves don't burn extra fat. In trials of people who also lifted weights, a window brought a modest drop
        in fat mass, but the studies are few and short.</p>
      <div className="why-window__sources"><Source href={WHY_WINDOW_SOURCES.treLifting}>Meta-analysis of windows with resistance training</Source></div>
      <h3>Keeping muscle</h3>
      <p>Keeping muscle takes enough protein and continued training. A tight window can make your protein harder to fit
        in. That's why the review watches protein and strength, not just the hours.</p>
      <div className="why-window__sources"><Source href={WHY_WINDOW_SOURCES.proteinTrial}>12-week trial</Source></div>
      <h3>Shift work</h3>
      <p>In one trial, people working 24-hour shifts found a 10-hour window workable. The evidence for shift work is still
        thin.</p>
      <div className="why-window__sources"><Source href={WHY_WINDOW_SOURCES.healthyHeroes}>Healthy Heroes trial</Source><Source href={WHY_WINDOW_SOURCES.shiftReview}>2026 systematic review</Source></div>
      <h3>The timer's lines</h3>
      <p>What the timer says about your body during a fast is typical, not measured in you.</p>
      <h3>Safety first</h3>
      <p>Your medicine directions and your clinician's advice come before any window. If you feel faint, dizzy or unusually
        weak, eat and stop the fast. Never push on.</p>
      <p className="meta">General information, not medical advice.</p>
    </section>
  </div>, document.body);
}
