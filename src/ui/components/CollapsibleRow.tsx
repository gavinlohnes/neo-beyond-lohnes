import type { ReactNode } from "react";

/**
 * Harvest Checkpoint 1: the collapsed-summary-row pattern — an eyebrow
 * (optionally icon-prefixed) + a one-line summary + an OPEN button — was
 * hand-copied identically three times in TodayScreen.tsx (RESET, SHIFT
 * DOWN, WORK CONTEXT), each time it wasn't the thing needing attention.
 * Extracted verbatim from that shared shape; not a new visual pattern.
 *
 * FIELD ALPHA Phase 1: re-skinned onto the .equipment-row silhouette
 * (Suit Implementation 01B) and the interaction itself changed — the
 * whole row is now the control (a real <button>, full-width, ≥44px
 * tall) instead of a small rectangular "OPEN" button bolted onto a
 * static row. `.eyebrow` (now specifically the identity/RED-authority
 * role) is replaced with `.tool-label`, matching every other TOOLS-tier
 * header on the screen. A lean chevron replaces the boxed secondary
 * button as the visual "there's more here" affordance — not a new icon
 * *concept*, just a disclosure indicator, so it's inlined here rather
 * than added to the locked pilot icon family in ui/icons/Icon.tsx.
 *
 * `name` is a plain string (not part of `icon`) specifically so it can
 * double as the button's accessible name — several of these can appear
 * on one screen at once, and "OPEN" alone is ambiguous to a screen
 * reader navigating by control, even though sighted users read it next
 * to its own label. The accessible name (`aria-label="Open {name}"`) is
 * unchanged from the original implementation on purpose, so existing
 * tests querying `getByRole("button", { name: "Open RESET" })` etc.
 * keep working — this is a visual/interaction change, not a semantic one.
 */
export interface CollapsibleRowProps {
  name: string;
  icon?: ReactNode;
  summary: ReactNode;
  onOpen: () => void;
}

export function CollapsibleRow({ name, icon, summary, onOpen }: CollapsibleRowProps) {
  return (
    <button type="button" className="equipment-row equipment-row--control" aria-label={`Open ${name}`} onClick={onOpen}>
      {/* <button>'s content model is phrasing content only — <p> (flow
          content) isn't valid inside it, so this uses <span> with an
          explicit display:block rather than the <p> every other
          TOOLS-tier header uses. */}
      <span style={{ display: "block", minWidth: 0 }}>
        <span className="tool-label" style={{ marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
          {icon}
          {name}
        </span>
        <span className="meta" style={{ display: "block" }}>
          {summary}
        </span>
      </span>
      <svg aria-hidden="true" width={16} height={16} viewBox="0 0 24 24" className="disclosure-chevron">
        <path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" />
      </svg>
    </button>
  );
}
