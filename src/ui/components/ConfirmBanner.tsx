import type { ReactNode } from "react";
import { ConfirmIcon } from "../icons/Icon";

/**
 * Harvest Checkpoint 1: the "here's what just happened, with one action
 * to correct/undo it" banner — ConfirmIcon + message + a single action
 * button — was hand-copied identically five times (BODY's water/sleep/
 * bodyweight/protein CORRECT banners, Capture's UNDO banner). Extracted
 * verbatim from that shared shape.
 *
 * `divider` captures the one real layout difference between the two
 * groups: Capture's banner sits directly below a list of other rows and
 * uses a top divider + tighter message margin + a reserved button gap;
 * BODY's four sit directly under a just-submitted action and use none
 * of that. Every prop below reproduces the ORIGINAL per-site styling
 * exactly — this is not a new, "cleaner" unified layout, it's the same
 * two variants that already existed, just written once.
 */
export interface ConfirmBannerProps {
  message: ReactNode;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  divider?: boolean;
}

export function ConfirmBanner({ message, actionLabel, onAction, disabled, divider }: ConfirmBannerProps) {
  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: divider ? 8 : undefined,
        marginTop: 8,
        paddingTop: divider ? 8 : undefined,
        borderTop: divider ? "1px solid var(--border-subtle)" : undefined,
      }}
    >
      <p className="meta" style={{ display: "flex", alignItems: "center", gap: 6, margin: divider ? 0 : undefined }}>
        <ConfirmIcon size={20} />
        {message}
      </p>
      <button
        type="button"
        className="btn-secondary"
        style={{ width: "auto", padding: "6px 12px", fontSize: 16, flexShrink: divider ? 0 : undefined }}
        disabled={disabled}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}
