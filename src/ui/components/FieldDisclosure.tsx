import type { ReactNode } from "react";

/**
 * VISUAL-003 (BODY Field Instrument): the "SHOW X / HIDE X" collapsible
 * pattern BODY's manual-entry forms and today's-entries lists both
 * hand-rolled identically — seven real call sites (water/bodyweight/
 * protein manual entry, plus water/sleep/bodyweight/protein today's-
 * entries) before this component existed, each a button toggling a
 * boolean plus a conditionally-rendered div. A native <details>/<summary>
 * gives keyboard and screen-reader disclosure semantics for free (the
 * mission's own explicit ask) with no behavior change — `open`/`onToggle`
 * stay controlled rather than left to the browser's own uncontrolled
 * default because some callers (a just-logged confirmation's CORRECT
 * action) need to force a today's-entries disclosure open
 * programmatically, which an uncontrolled <details> can't do from React
 * state alone.
 *
 * `role="button"` on the summary is an explicit correction, not
 * decoration: a bare `<summary>` (as a `<details>`'s sole summary child)
 * is exposed to Chromium's accessibility tree as role "group", not
 * "button" — confirmed directly against this repo's real-Chromium test
 * stack. Native keyboard operability (Space/Enter) and the browser's own
 * open/close toggling are unaffected either way; this only corrects what
 * assistive tech is told the control is.
 */
export function FieldDisclosure({
  summary,
  open,
  onToggle,
  children,
}: {
  summary: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary role="button" className="btn-secondary disclosure-summary">{summary}</summary>
      <div className="fade-in" style={{ marginTop: 12 }}>
        {children}
      </div>
    </details>
  );
}
