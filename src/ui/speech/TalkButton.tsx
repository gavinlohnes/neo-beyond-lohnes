import { useState } from "react";
import { useDictation } from "./useDictation";
import { dictationPrivacySeen, markDictationPrivacySeen, readDictationSettings } from "./dictationSettings";
import "./talk.css";

export const PRIVACY_LINE = "Your phone's speech service turns your words into text. BEYOND only keeps what you save.";
export const RETRY_LINE = "Didn't catch that. Tap TALK again or type it.";

/**
 * GRAYSON-DICTATE-001: TALK (STOP while listening). Hidden where the browser has no Web Speech or when his TALK
 * switch is off. Words fill in as he speaks (`onWords`); `onHeard` gets the words when he stops. Silence or an error
 * shows the retry line and keeps whatever was heard. The privacy line shows under the first TALK he ever taps, once.
 */
export function TalkButton({ disabled, label = "TALK", onWords, onHeard }: {
  disabled?: boolean; label?: string; onWords?: (words: string) => void; onHeard: (words: string) => void;
}) {
  const dictation = useDictation();
  const [retry, setRetry] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  if (!dictation.supported || !readDictationSettings().talk) return null;
  function tap() {
    if (dictation.listening) { dictation.stop(); return; }
    setRetry(false);
    if (!dictationPrivacySeen()) { markDictationPrivacySeen(); setPrivacy(true); }
    dictation.start({
      interim: true,
      onWords: (words) => onWords?.(words),
      onDone: (words, failed) => { if (failed || !words.trim()) { setRetry(true); return; } onHeard(words.trim()); },
    });
  }
  return <div className="talk">
    <button type="button" className="btn-secondary talk__button" aria-pressed={dictation.listening} aria-label={dictation.listening ? "STOP" : label} disabled={disabled} onClick={tap}>{dictation.listening ? "STOP" : "TALK"}</button>
    {retry && <p className="meta talk__line" role="status">{RETRY_LINE}</p>}
    {privacy && <p className="meta talk__line">{PRIVACY_LINE}</p>}
  </div>;
}
