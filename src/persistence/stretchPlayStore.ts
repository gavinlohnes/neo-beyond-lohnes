import type { StretchClock } from "../domain/workout/stretchCues";
import type { StretchRoutine } from "../domain/workout/stretchLibrary";

/**
 * GRAYSON-HOME-STRETCH-001 slice B: the stretch routine playing in the open RECOVERY session, and its clock, so a
 * reload or a locked phone picks up where it is. Live state on this phone only (like a gym draft): it never travels,
 * and it's cleared when the session is saved. Never throws.
 */
export const STRETCH_PLAY_KEY = "beyond.stretchPlay.v1";
export interface StretchPlay { sessionId: string; routine: StretchRoutine; clock: StretchClock }

export function readStretchPlay(sessionId: string): StretchPlay | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STRETCH_PLAY_KEY) ?? "null") as StretchPlay | null;
    if (!raw || raw.sessionId !== sessionId || !raw.routine || !Array.isArray(raw.routine.steps) || !raw.clock || typeof raw.clock.startedAt !== "number") return null;
    return { ...raw, clock: { startedAt: raw.clock.startedAt, pausedMs: Number(raw.clock.pausedMs) || 0, pausedAt: typeof raw.clock.pausedAt === "number" ? raw.clock.pausedAt : null, shift: Number(raw.clock.shift) || 0, extra: raw.clock.extra && typeof raw.clock.extra === "object" ? raw.clock.extra : {} } };
  } catch {
    return null;
  }
}

export function writeStretchPlay(play: StretchPlay): void {
  try { localStorage.setItem(STRETCH_PLAY_KEY, JSON.stringify(play)); } catch { /* storage blocked: the player still runs this visit */ }
}

export function clearStretchPlay(): void {
  try { localStorage.removeItem(STRETCH_PLAY_KEY); } catch { /* nothing to clear */ }
}
