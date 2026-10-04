import type { Ref } from "react";
import { Icon, ConfirmIcon, SignalIcon } from "../../icons/Icon";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import {
  describeShiftDownInProgress,
  describeShiftDownResult,
  SHIFT_DOWN_DURATION_PRESETS,
  SHIFT_DOWN_EXPLANATION,
  type SessionOutcome,
} from "./resetShiftDownCopy";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former `renderShiftDownCard` closure. Same
 * unreachable-internal-`day`-check removal as ResetCard.tsx (all three
 * call sites already gated on `day &&`). `startButtonRef` forwards what
 * used to be TodayScreen's own `shiftDownStartRef` — `handleRecommendationHandoff`
 * still scrolls/focuses this exact button when a recommendation hands off
 * to SHIFT DOWN, unchanged.
 */
export function ShiftDownCard({
  prominent,
  isDominant,
  activeShiftDownId,
  shiftDownDuration,
  setShiftDownDuration,
  openShiftDownStartedAt,
  lastShiftDownOutcome,
  shiftDownOpen,
  setShiftDownOpen,
  busy,
  onStartShiftDown,
  onCompleteShiftDown,
  onCancelShiftDown,
  startButtonRef,
  postShiftPlan,
  forceOpen = false,
  onMarkWorkEnded,
}: {
  prominent: boolean;
  isDominant: boolean;
  activeShiftDownId: string | null;
  shiftDownDuration: number;
  setShiftDownDuration: (minutes: number) => void;
  openShiftDownStartedAt: string | null;
  lastShiftDownOutcome: SessionOutcome | null;
  shiftDownOpen: boolean;
  setShiftDownOpen: (open: boolean) => void;
  busy: boolean;
  onStartShiftDown: () => void;
  onCompleteShiftDown: () => void;
  onCancelShiftDown: () => void;
  startButtonRef: Ref<HTMLButtonElement>;
  /** Drop 6: the owner's own post-shift plan from the quit tracker, shown whenever the card is open. */
  postShiftPlan?: string | undefined;
  /** Drop 2 (Shift Clock): the post-shift row keeps the card open, with no COLLAPSE. */
  forceOpen?: boolean;
  /**
   * Drop 2: MARK WORK ENDED folded into the post-shift row while work isn't
   * marked ended yet. It's the next step, so it takes the primary button and
   * START SHIFT DOWN steps down to secondary until it's done.
   */
  onMarkWorkEnded?: (() => void) | undefined;
}) {
  const active = activeShiftDownId !== null;
  const open = forceOpen || prominent || active || shiftDownOpen;
  if (!open) {
    return (
      <CollapsibleRow
        name="SHIFT DOWN"
        icon={<Icon name="shiftDown" size={20} />}
        onOpen={() => setShiftDownOpen(true)}
      />
    );
  }
  const isCommand = active && isDominant;
  return (
    <div
      key={active ? "shift-down-in-progress" : "shift-down-picker"}
      className={`fade-in ${isCommand ? "command-surface" : active ? "equipment-row" : prominent ? "card signal-row" : "equipment-row"}`}
    >
      <p
        className={isCommand ? "command-title" : "tool-label"}
        style={{ marginBottom: 4, color: active ? "var(--accent-strong)" : undefined, display: "flex", alignItems: "center", gap: 6 }}
      >
        {prominent ? <SignalIcon key="on" name="shiftDown" size={20} /> : <Icon key="off" name="shiftDown" size={20} />}
        {active && <span aria-hidden="true" className="diamond" />}
        {active ? "SHIFT DOWN IN PROGRESS" : prominent ? "RECOMMENDED — SHIFT DOWN" : "SHIFT DOWN"}
      </p>
      <p className="card-body" style={{ marginBottom: 12 }}>{SHIFT_DOWN_EXPLANATION}</p>
      {onMarkWorkEnded && !active && (
        <button className="btn-primary" style={{ marginBottom: 12 }} disabled={busy} onClick={onMarkWorkEnded}>
          MARK WORK ENDED
        </button>
      )}
      {postShiftPlan && (
        <p className="meta-strong" style={{ marginBottom: 12 }}>
          Your plan: {postShiftPlan}
        </p>
      )}
      {active ? (
        <>
          <p className="card-body" style={{ marginBottom: 12 }}>
            {describeShiftDownInProgress(shiftDownDuration)}
            {openShiftDownStartedAt ? ` Started ${new Date(openShiftDownStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : ""}
          </p>
          {isCommand ? (
            <>
              <button
                className="btn-primary"
                style={{ fontSize: 18, padding: "18px var(--space-4)" }}
                disabled={busy}
                onClick={onCompleteShiftDown}
              >
                COMPLETE SHIFT DOWN
              </button>
              <p className="field-divider">OR</p>
              <button className="btn-secondary" disabled={busy} onClick={onCancelShiftDown}>
                CANCEL SHIFT DOWN
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }} disabled={busy} onClick={onCompleteShiftDown}>
                COMPLETE SHIFT DOWN
              </button>
              <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={onCancelShiftDown}>
                CANCEL SHIFT DOWN
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {lastShiftDownOutcome && (
            <p className="meta" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <ConfirmIcon size={20} />
              {describeShiftDownResult(lastShiftDownOutcome)}
            </p>
          )}
          <p className="meta" style={{ marginBottom: 8 }}>How many minutes?</p>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {SHIFT_DOWN_DURATION_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                className={`chip ${shiftDownDuration === n ? "chip--selected" : ""}`}
                style={{ minWidth: 50 }}
                aria-pressed={shiftDownDuration === n}
                disabled={busy}
                onClick={() => setShiftDownDuration(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
            <span className="meta" id="shift-down-custom-minutes-label">Custom:</span>
            <input
              type="number"
              min={1}
              value={shiftDownDuration}
              onChange={(e) => {
                const v = Number(e.target.value);
                setShiftDownDuration(Number.isNaN(v) || v < 1 ? 1 : v);
              }}
              className="input"
              style={{ flex: 1 }}
              aria-label="Custom minutes"
              aria-describedby="shift-down-custom-minutes-label"
            />
            <span className="meta">min</span>
          </div>
          <button
            ref={startButtonRef}
            className={onMarkWorkEnded ? "btn-secondary" : "btn-primary"}
            disabled={busy}
            onClick={onStartShiftDown}
          >
            START SHIFT DOWN
          </button>
          {!prominent && !forceOpen && (
            <button
              className="btn-secondary"
              style={{ marginTop: 8 }}
              disabled={busy}
              onClick={() => setShiftDownOpen(false)}
            >
              COLLAPSE
            </button>
          )}
        </>
      )}
    </div>
  );
}
