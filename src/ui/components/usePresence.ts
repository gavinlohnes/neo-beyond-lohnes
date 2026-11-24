import { useLayoutEffect, useRef } from "react";

/**
 * GRAYSON-TODAY-CALM-001: a self-loading TODAY line tells TODAY whether it has something to show, so TODAY can count
 * it toward the quiet-line budget (and the after-shift order) without reading its data twice. Reports on mount and
 * whenever the answer changes, before paint, so nothing flashes.
 */
export function useReportPresence<T>(value: T, onPresence: ((value: T) => void) | undefined): void {
  const report = useRef(onPresence);
  report.current = onPresence;
  useLayoutEffect(() => { report.current?.(value); }, [value]);
}
