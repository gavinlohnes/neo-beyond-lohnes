import type { ReactNode } from "react";

/**
 * Harvest Checkpoint 1: the collapsed-summary-row pattern — an eyebrow
 * (optionally icon-prefixed) + a one-line summary + an OPEN button — was
 * hand-copied identically three times in TodayScreen.tsx (RESET, SHIFT
 * DOWN, WORK CONTEXT), each time it wasn't the thing needing attention.
 * Extracted verbatim from that shared shape; not a new visual pattern.
 *
 * `name` is a plain string (not part of `icon`) specifically so it can
 * double as the button's accessible name — several of these can appear
 * on one screen at once, and "OPEN" alone is ambiguous to a screen
 * reader navigating by control, even though sighted users read it next
 * to its own label.
 */
export interface CollapsibleRowProps {
  name: string;
  icon?: ReactNode;
  summary: ReactNode;
  onOpen: () => void;
}

export function CollapsibleRow({ name, icon, summary, onOpen }: CollapsibleRowProps) {
  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <div>
        <p className="eyebrow" style={{ marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
          {icon}
          {name}
        </p>
        <p className="meta">{summary}</p>
      </div>
      <button
        type="button"
        className="btn-secondary"
        style={{ width: "auto", padding: "8px 16px" }}
        aria-label={`Open ${name}`}
        onClick={onOpen}
      >
        OPEN
      </button>
    </div>
  );
}
