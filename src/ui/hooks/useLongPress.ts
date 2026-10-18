import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

/** SUIT-001: the emblem's long-press threshold (owner choice: about 550 ms). */
export const LONG_PRESS_MS = 550;

/**
 * A press held for LONG_PRESS_MS fires `onLongPress`; the click that follows
 * it is swallowed, so a short tap keeps its existing behavior and a long
 * press never also triggers it. Moving off, cancelling or blurring aborts.
 */
export function useLongPress(onLongPress: () => void, ms = LONG_PRESS_MS) {
  const [pressing, setPressing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const latest = useRef(onLongPress);
  latest.current = onLongPress;

  function clear() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  }
  useEffect(() => clear, []);

  return {
    pressing,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        fired.current = false;
        clear();
        setPressing(true);
        timer.current = setTimeout(() => {
          timer.current = null;
          fired.current = true;
          setPressing(false);
          latest.current();
        }, ms);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onBlur: clear,
      onContextMenu: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
    },
    /** Call first in the element's onClick: true means "this click ended a long press". */
    swallowClick: () => {
      if (!fired.current) return false;
      fired.current = false;
      return true;
    },
  };
}
