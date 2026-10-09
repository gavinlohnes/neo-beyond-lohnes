import type { ReactNode } from "react";

/**
 * A small matrix of related, read-only facts. Actions, forms, warnings,
 * recommendations, and unrelated domain content do not belong here.
 */
export function ReadoutGrid({ emphasis = "supporting", children, className }: {
  emphasis?: "primary" | "supporting";
  children: ReactNode;
  className?: string;
}) {
  return <div className={`readout-grid readout-grid--${emphasis}${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function Readout({ label, value, detail }: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="readout">
      <p className="tool-label">{label}</p>
      <p className="readout__value">{value}</p>
      {detail ? <div className="meta readout__detail">{detail}</div> : null}
    </div>
  );
}
