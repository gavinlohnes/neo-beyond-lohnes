import { useEffect } from "react";
import { noteAsk } from "../../application/askCounts";
import type { AskArea, AskKind } from "../../domain/askCounts";

/**
 * GRAYSON-ASKS-COUNT-001: counts an ask once when it's shown (`visible`), never when it's answered. Re-renders and
 * reloads on the same lived day add nothing (noteAsk keeps one row per key per lived day).
 */
export function useNoteAsk(area: AskArea, kind: AskKind, key: string | readonly string[], visible = true): void {
  const keys = (typeof key === "string" ? [key] : key).filter(Boolean).join("\n");
  useEffect(() => {
    if (!visible || !keys) return;
    for (const k of keys.split("\n")) void noteAsk({ area, kind, key: k });
  }, [area, kind, keys, visible]);
}
