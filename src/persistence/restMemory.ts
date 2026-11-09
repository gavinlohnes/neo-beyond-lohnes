/**
 * REST-MEMORY-001: your rest length per exercise, learned from the ± taps you make during rest. Device
 * bookkeeping in localStorage like the other training preferences: not domain history, not in the backup
 * file, no schema change. Never throws on missing or malformed data.
 */
const KEY = "beyond:restSecondsByExercise";

export function readRestMemory(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1])));
  } catch {
    return {};
  }
}

export function writeRestMemory(memory: Record<string, number>): void {
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* storage full or blocked: keep the default */ }
}
