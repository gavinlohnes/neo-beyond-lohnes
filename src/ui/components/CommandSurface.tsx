import type { ReactNode } from "react";

/**
 * VISUAL-002 (Semantic Component Grammar): the PRIMARY DECISION/EXECUTION
 * role formalized as a real primitive rather than a loose `className`
 * convention six call sites (TodayScreen's dominant recommendation, plus
 * TrainScreen's pre-session picker/active exercise/RECOVERY) already
 * shared identically — every one of them wrote `className="command-surface
 * fade-in"` by hand. This component changes nothing about what
 * `.command-surface`/`.fade-in` do (both defined in global.css, including
 * VISUAL-001's chamfer and Red Budget-governed surface wash) — it only
 * removes the risk of that exact string drifting or being retyped wrong
 * at a seventh call site, which is the actual duplication this Drop is
 * allowed to remove.
 *
 * Deliberately dumb: no `variant`/`tone`/`mood` prop. TODAY's dominant
 * recommendation, TRAIN's pre-session picker, and TRAIN's active exercise
 * do not share content or authority — only the same visual/structural
 * territory (bold red rail, dark wash, the one earned chamfer). Giving
 * this component a prop that pretended those meanings were interchangeable
 * would be exactly the "giant variant prop" this Drop's own doctrine
 * rejects. Meaning stays entirely in whatever the caller renders inside.
 *
 * `.command-surface` remains the source of truth (still directly usable,
 * as `renderResetCard`/`renderShiftDownCard` continue to do for their own
 * more complex four-way conditional wrapper choice — this component is an
 * additional convenience for the clean, unconditional call sites, not a
 * replacement for the CSS class itself).
 */
export function CommandSurface({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={className ? `command-surface fade-in ${className}` : "command-surface fade-in"}>{children}</div>;
}
