import type { CSSProperties, ReactNode } from "react";

/**
 * DEPTH-001: shared wrapper for every WHY/diagnostic-detail disclosure —
 * TODAY's RecommendationCard, TRAIN's variant-suggestion and exercise-
 * detail panels, MORE's SYSTEM diagnostics. Plain native `<details>`
 * semantics: instant, unconditional, nothing gating what a test or a
 * screen reader sees.
 *
 * The full-screen "exposed machinery" circuit reveal it once mounted was
 * removed 2026-10-27 at the owner's direction (an experiment that did not
 * work out); see docs/UX_DECISIONS.md.
 */
export function WhyDisclosure({
  summary,
  style,
  children,
}: {
  summary: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <details className="why" style={style}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
