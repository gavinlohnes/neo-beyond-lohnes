import { Icon, ConfirmIcon, SignalIcon } from "../../icons/Icon";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { describeResetInProgress, describeResetResult, RESET_EXPLANATION, RESET_EXPLANATION_SHORT, type SessionOutcome } from "./resetShiftDownCopy";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former `renderResetCard` closure. All three call
 * sites already gated on `day &&` before invoking it, so the original
 * internal `if (!day) return null` was unreachable — dropped here rather
 * than threaded through as a prop nobody needed (verified against all
 * three call sites before removing it). Everything else — markup,
 * conditions, styling — is unchanged.
 */
export function ResetCard({
  prominent,
  isDominant,
  activeResetId,
  resetIntensity,
  setResetIntensity,
  openResetStartedAt,
  lastResetOutcome,
  resetOpen,
  setResetOpen,
  busy,
  onStartReset,
  onCompleteReset,
  onCancelReset,
}: {
  prominent: boolean;
  isDominant: boolean;
  activeResetId: string | null;
  resetIntensity: 1 | 2 | 3 | 4 | 5;
  setResetIntensity: (n: 1 | 2 | 3 | 4 | 5) => void;
  openResetStartedAt: string | null;
  lastResetOutcome: SessionOutcome | null;
  resetOpen: boolean;
  setResetOpen: (open: boolean) => void;
  busy: boolean;
  onStartReset: () => void;
  onCompleteReset: () => void;
  onCancelReset: () => void;
}) {
  const active = activeResetId !== null;
  const open = prominent || active || resetOpen;
  if (!open) {
    return (
      <CollapsibleRow
        name="RESET"
        icon={<Icon name="reset" size={20} />}
        summary={RESET_EXPLANATION_SHORT}
        onOpen={() => setResetOpen(true)}
      />
    );
  }
  const isCommand = active && isDominant;
  return (
    <div
      key={active ? "reset-in-progress" : "reset-picker"}
      className={`fade-in ${isCommand ? "command-surface" : active ? "equipment-row" : prominent ? "card signal-row" : "equipment-row"}`}
    >
      <p
        className={isCommand ? "command-title" : "tool-label"}
        style={{ marginBottom: 4, color: active ? "var(--accent-strong)" : undefined, display: "flex", alignItems: "center", gap: 6 }}
      >
        {prominent ? <SignalIcon key="on" name="reset" size={20} /> : <Icon key="off" name="reset" size={20} />}
        {active && <span aria-hidden="true" className="diamond" />}
        {active ? "RESET IN PROGRESS" : prominent ? "RECOMMENDED — RESET" : "RESET"}
      </p>
      <p className="card-body" style={{ marginBottom: 12 }}>{RESET_EXPLANATION}</p>
      {active ? (
        <>
          <p className="card-body" style={{ marginBottom: 12 }}>
            {describeResetInProgress(resetIntensity)}
            {openResetStartedAt ? ` Started ${new Date(openResetStartedAt).toLocaleTimeString()}.` : ""}
          </p>
          {isCommand ? (
            <>
              <button
                className="btn-primary"
                style={{ fontSize: 18, padding: "18px var(--space-4)" }}
                disabled={busy}
                onClick={onCompleteReset}
              >
                COMPLETE RESET
              </button>
              <p className="field-divider">OR</p>
              <button className="btn-secondary" disabled={busy} onClick={onCancelReset}>
                CANCEL RESET
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }} disabled={busy} onClick={onCompleteReset}>
                COMPLETE RESET
              </button>
              <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={onCancelReset}>
                CANCEL RESET
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {lastResetOutcome && (
            <p className="meta" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <ConfirmIcon size={20} />
              {describeResetResult(lastResetOutcome)}
            </p>
          )}
          <p className="card-body" style={{ marginBottom: 8 }}>
            BODY BEFORE STORY — how much do you need? 1 is a light touch, 5 is fully immersive.
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={`chip ${resetIntensity === n ? "chip--selected" : ""}`}
                aria-pressed={resetIntensity === n}
                disabled={busy}
                onClick={() => setResetIntensity(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="btn-primary" disabled={busy} onClick={onStartReset}>
            START RESET
          </button>
        </>
      )}
    </div>
  );
}
