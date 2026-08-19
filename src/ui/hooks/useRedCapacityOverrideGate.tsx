import { useState } from "react";
import type { Capacity } from "../../domain/common/types";
import { requiresRedOverrideConfirm } from "../../engine/redOverride";

/**
 * Shared UI mechanism for the confirm-every-time RED-capacity override
 * rule (Context & Safety Decisions, 2026-08-19). Call guard(capacity,
 * action) instead of invoking an overriding action directly: runs
 * immediately when capacity isn't RED, otherwise renders ConfirmPanel and
 * only runs the action once the user explicitly confirms. No component
 * state persists a prior confirmation — every guard() call starts fresh,
 * matching "every time, one shared mechanism app-wide."
 *
 * The real safeguard is engine/redOverride.ts's assertRedOverrideConfirmed,
 * which the underlying command should also call — this hook is a
 * convenience for triggering that confirmation from the UI, not the
 * enforcement point itself.
 */
export function useRedCapacityOverrideGate(): {
  guard: (capacity: Capacity | null, action: () => void | Promise<void>) => void;
  ConfirmPanel: () => React.ReactElement | null;
} {
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);

  function guard(capacity: Capacity | null, action: () => void | Promise<void>): void {
    if (requiresRedOverrideConfirm(capacity)) {
      setPendingAction(() => action);
    } else {
      void action();
    }
  }

  function ConfirmPanel(): React.ReactElement | null {
    if (!pendingAction) return null;
    return (
      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>
          CONFIRM OVERRIDE
        </p>
        <p className="card-body" style={{ marginBottom: 12 }}>
          Capacity is currently RED. Proceeding anyway overrides that guidance.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-primary"
            onClick={() => {
              const action = pendingAction;
              setPendingAction(null);
              void action?.();
            }}
          >
            PROCEED ANYWAY
          </button>
          <button
            className="btn-primary"
            style={{ background: "var(--surface-2)" }}
            onClick={() => setPendingAction(null)}
          >
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  return { guard, ConfirmPanel };
}
