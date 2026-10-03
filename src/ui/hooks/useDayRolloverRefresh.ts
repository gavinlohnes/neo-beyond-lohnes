import { useEffect, useRef } from "react";
import { subscribeToDayRollover } from "../../application/commands";

/**
 * DROP 0 (stale numbers after the 16:30 roll): re-read a mounted screen's
 * data whenever a day rollover actually happens, from any call site (cold
 * load, resume, the open-app boundary timer, or TRAIN's post-workout check).
 * Calls the screen's own refresh — it never remounts — so anything typed into
 * a form and not yet saved stays put. Always calls the latest `refresh`, so a
 * screen can pass its plain inline function.
 */
export function useDayRolloverRefresh(refresh: () => unknown): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(
    () =>
      subscribeToDayRollover(() => {
        void Promise.resolve()
          .then(() => refreshRef.current())
          .catch(() => {
            // Best-effort: a failed re-read leaves the screen as it was, same
            // as before this hook existed; the next action refreshes it.
          });
      }),
    [],
  );
}
