import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import "./section.css";

/**
 * LIFE-PATTERN-001 shared section shape (see docs/agent/LIFE-PATTERN-001.md):
 * small eyebrow label, plain heading, one or two lines, one clear way in.
 * Presentation only: these primitives never read, rank or save anything.
 */
export interface SectionWayIn { label: string; onClick: () => void; disabled?: boolean; ariaLabel?: string }

export function Section({ id, eyebrow, title, wayIn, children, className }: {
  id: string; eyebrow: string; title: string; wayIn?: SectionWayIn | undefined; children?: ReactNode; className?: string;
}) {
  return <section className={`bx-section${className ? ` ${className}` : ""}`} aria-labelledby={`${id}-title`}>
    <header className="bx-head">
      <div><p className="bx-eyebrow">{eyebrow}</p><h3 id={`${id}-title`} className="bx-title">{title}</h3></div>
      {wayIn && <WayIn {...wayIn} />}
    </header>
    {children}
  </section>;
}

export function WayIn({ label, onClick, disabled, ariaLabel }: SectionWayIn) {
  return <button type="button" className="bx-way-in" disabled={disabled} aria-label={ariaLabel} onClick={onClick}>{label}<ArrowUpRight size={18} aria-hidden="true" /></button>;
}

/** A source that could not be read. Missing data says missing; it is never shown as empty. */
export function SectionUnavailable({ children = "Records unavailable. Refresh to try again." }: { children?: ReactNode }) {
  return <p className="bx-unavailable">{children}</p>;
}

/** Calm, true wording for an empty section. Never a "0", never a nudge. */
export function SectionEmpty({ line, detail, wayIn }: { line: string; detail?: string; wayIn?: SectionWayIn }) {
  return <div className="bx-empty"><p>{line}</p>{detail && <span>{detail}</span>}{wayIn && <WayIn {...wayIn} />}</div>;
}

/** Recorded numbers only ("2 / 3 steps recorded"). There is no estimate mode by design. */
export function RecordedCount({ done, total, unit }: { done: number; total: number; unit: string }) {
  return <p className="bx-count">{done}<span> / {total} {unit} recorded</span></p>;
}

/** The "more" section that always comes last, folded on phones so the top sections do the work. */
export function MoreSections({ label = "More", children, defaultOpen = false }: { label?: string; children: ReactNode; defaultOpen?: boolean }) {
  return <details className="bx-more" open={defaultOpen || undefined}><summary>{label}</summary><div className="bx-more-body">{children}</div></details>;
}
