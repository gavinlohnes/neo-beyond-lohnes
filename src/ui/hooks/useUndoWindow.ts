import { useEffect, useState } from "react";

/** HOTFIX (BODY logging trust, owner ruling 2026-10-03): how long a save confirmation and its UNDO stay up. */
export const UNDO_WINDOW_MS = 5000;

/**
 * GRAYSON undo rule (Gavin, 2026-11-24 02:02 CT, option 1): Undo shows only after a fix or a removal, for this long.
 * Shared by GRAYSON-CHECKIN-EDIT-001, GRAYSON-FIX-UNDO-001 and GRAYSON-TRAIN-EDIT-001. Routine logs keep no Undo.
 */
export const FIX_UNDO_MS = 8000;

/**
 * A confirmation that clears itself `windowMs` (default UNDO_WINDOW_MS) after it's set. Setting a
 * new one restarts the window; setting null clears it at once.
 */
export function useUndoWindow<T>(windowMs: number = UNDO_WINDOW_MS): [T | null, (next: T | null) => void] {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (value === null) return;
    const timer = setTimeout(() => setValue(null), windowMs);
    return () => clearTimeout(timer);
  }, [value, windowMs]);
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
