import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { haptic } from "../feel/haptics";

/**
 * Hold-to-confirm (ROADMAP 1.0 design rule, owner ruling 2026-09-30): for big
 * moments only (finishing a workout, ending the day, logging a clean day),
 * never for routine sets. Press and hold for `durationMs`; a bar fills while
 * held and letting go early cancels. A quick tap confirms nothing: it shows
 * `hint` under the button, or calls `onEarlyRelease` so a caller with several
 * hold buttons in a row can show one shared hint instead. Space/Enter held
 * down works the same way from a keyboard.
 */
export function HoldButton({
  children,
  onConfirm,
  disabled = false,
  className = "btn-primary",
  style,
  hint,
  onEarlyRelease,
  durationMs = 1000,
}: {
  children: ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  hint?: string;
  onEarlyRelease?: () => void;
  durationMs?: number;
}) {
  const [holding, setHolding] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintId = useId();

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => clearTimer, []);

  function start() {
    if (disabled || timerRef.current !== null) return;
    setShowHint(false);
    setHolding(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      haptic("CONFIRMED");
      onConfirm();
    }, durationMs);
  }

  function cancel() {
    if (timerRef.current === null) return;
    clearTimer();
    setHolding(false);
    setShowHint(true);
    onEarlyRelease?.();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!e.repeat) start();
  }

  function onKeyUp(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    cancel();
  }

  return (
    <span style={{ display: "flex", flexDirection: "column", ...style }}>
      <button
        type="button"
        className={`${className} hold-button${holding ? " hold-button--holding" : ""}`}
        style={{ flexGrow: 1, ["--hold-duration" as string]: `${durationMs}ms` }}
        disabled={disabled}
        aria-describedby={hintId}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          // Keeps pointerup on this button even if the finger drifts off it.
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // No active pointer with this id (e.g. a synthetic event); holding still works.
          }
          start();
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={cancel}
      >
        <span aria-hidden="true" className="hold-button__fill" />
        <span className="hold-button__label">{children}</span>
      </button>
      <span id={hintId} className="visually-hidden">Press and hold to confirm.</span>
      {hint !== undefined && (
        <span className="meta" role="status" style={{ marginTop: showHint ? 4 : 0 }}>
          {showHint ? hint : ""}
        </span>
      )}
    </span>
  );
}
