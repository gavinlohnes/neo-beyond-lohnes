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
 * Deliberately dumb: no `variant`/`tone`/`mood` prop, and no `className`
 * escape hatch either — no real call site needs one, and an unrestricted
 * className would let a future caller silently combine command-surface's
 * territory with an incompatible visual mood, which is exactly the
 * speculative surface this Drop's own doctrine rejects. `children` is the
 * only input; meaning stays entirely in what the caller renders inside.
 *
 * `.command-surface` remains the source of truth (still directly usable,
 * as `renderResetCard`/`renderShiftDownCard` continue to do for their own
 * more complex four-way conditional wrapper choice — this component is an
 * additional convenience for the clean, unconditional call sites, not a
 * replacement for the CSS class itself).
 */
export function CommandSurface({ children }: { children: ReactNode }) {
  return <div className="command-surface fade-in">{children}</div>;
}
