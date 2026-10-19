import type { ReactNode } from "react";
import { describeSystemsLine, describeSystemsStatus, type SystemsLineInput } from "./systemsCopy";
import "./systems.css";

/**
 * SUIT-001: TODAY's one SYSTEMS line, in place of the System Status line.
 * Readings and plain warning words only; tapping it opens the readout.
 */
export function SystemsLine({ input, warnings = [], onOpen, disabled = false }: {
  input: Omit<SystemsLineInput, "warnings">;
  /** Warning words, each rendered with its own node so a signal can mark it. */
  warnings?: readonly { key: string; text: string; node?: ReactNode }[];
  onOpen?: (() => void) | undefined;
  disabled?: boolean;
}) {
  const bits = describeSystemsLine({ ...input, warnings: [] });
  const spoken = [...bits, ...warnings.map((w) => w.text)].join(", ");
  // System Status keeps TODAY's existing dot and capacity segment; its full evidence is in STATE.
  const status = describeSystemsStatus(input.statusLevel);
  const readings = status ? bits.slice(1) : bits;
  const content = <>
    <span className="systems-line__key">SYSTEMS</span>
    <span className="systems-line__value">
      {status && <><span aria-hidden="true" className={`capacity-dot capacity-dot--${input.statusLevel === "NO_READ" ? "unknown" : input.statusLevel === "RED" ? "red" : "yellow"}`} />
        <span className={input.statusLevel === "NO_READ" ? undefined : "status-strip__capacity"}>{status}</span>{readings.length > 0 && " · "}</>}
      {readings.join(" · ")}
      {warnings.map((w) => <span key={w.key}> · <span className="systems-line__warn">{w.node ?? w.text}</span></span>)}
    </span>
  </>;
  const level = input.statusLevel ?? undefined;
  if (!onOpen) return <p className="systems-line" data-system-status={level} aria-label={`Systems: ${spoken}`}>{content}</p>;
  return <button type="button" className="systems-line" data-system-status={level} disabled={disabled} aria-label={`Systems: ${spoken}. Open readout`} onClick={onOpen}>
    {content}<span aria-hidden="true" className="systems-line__go">›</span>
  </button>;
}
