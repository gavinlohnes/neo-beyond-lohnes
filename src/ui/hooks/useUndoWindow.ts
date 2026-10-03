import { useEffect, useState } from "react";

/** HOTFIX (BODY logging trust, owner ruling 2026-10-03): how long a save confirmation and its UNDO stay up. */
export const UNDO_WINDOW_MS = 5000;

/**
 * A confirmation that clears itself UNDO_WINDOW_MS after it's set. Setting a
 * new one restarts the window; setting null clears it at once.
 */
export function useUndoWindow<T>(): [T | null, (next: T | null) => void] {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (value === null) return;
    const timer = setTimeout(() => setValue(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return [value, setValue];
}
