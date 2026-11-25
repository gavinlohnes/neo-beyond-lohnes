/**
 * GRAYSON-DICTATE-001: his two voice switches (MORE → Settings → Voice), saved on this phone and carried by the backup.
 * `talk`: the TALK buttons in quick capture, the meal log and the check-in (Drive Home and Alfred keep their own voice).
 * `sort`: sort what he says into logs; off, TALK only fills the box, like the keyboard mic. Both default on.
 */
export const DICTATION_KEY = "beyond.dictation.v1";
const PRIVACY_SEEN = "beyond.dictation.privacySeen.v1";
export interface DictationSettings { talk: boolean; sort: boolean }
export const DEFAULT_DICTATION: DictationSettings = { talk: true, sort: true };

export function readDictationSettings(): DictationSettings {
  try {
    const v = JSON.parse(localStorage.getItem(DICTATION_KEY) ?? "null") as Partial<Record<keyof DictationSettings, unknown>> | null;
    if (!v || typeof v !== "object" || Array.isArray(v)) return { ...DEFAULT_DICTATION };
    return { talk: typeof v.talk === "boolean" ? v.talk : true, sort: typeof v.sort === "boolean" ? v.sort : true };
  } catch { return { ...DEFAULT_DICTATION }; }
}
export function writeDictationSettings(next: DictationSettings): void {
  try { localStorage.setItem(DICTATION_KEY, JSON.stringify({ talk: next.talk, sort: next.sort })); } catch { /* not remembered */ }
}
/** The privacy line shows under the first TALK he ever taps, once. */
export function dictationPrivacySeen(): boolean { try { return localStorage.getItem(PRIVACY_SEEN) === "1"; } catch { return true; } }
export function markDictationPrivacySeen(): void { try { localStorage.setItem(PRIVACY_SEEN, "1"); } catch { /* shows again next time */ } }
