import { DEFAULT_VOICE, VOICES, type DeltaVoice } from "../../../application/deltaVoice";

/**
 * GRAYSON C1.6: which voice Delta speaks in, kept on this device only. A preference, not a record: it isn't in the
 * database or a backup, and losing it only means the default (MENTOR) again.
 */
const KEY = "beyond.delta.voice.v1";

export function readVoice(): DeltaVoice {
  try {
    const v = localStorage.getItem(KEY);
    return VOICES.some((x) => x.id === v) ? (v as DeltaVoice) : DEFAULT_VOICE;
  } catch { return DEFAULT_VOICE; }
}
export function writeVoice(voice: DeltaVoice): void {
  try { localStorage.setItem(KEY, voice); } catch { /* not remembered */ }
}
