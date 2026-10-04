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

/**
 * UNDO-001: true for UNDO_WINDOW_MS after `token` is set, false once the
 * window has passed or `token` is null. For a confirmation that stays up
 * longer than its UNDO (BODY's banners keep CORRECT afterwards).
 */
export function useUndoOpen(token: object | null): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (token === null) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const timer = setTimeout(() => setOpen(false), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [token]);
  return open;
}
