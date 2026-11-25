import { useCallback, useEffect, useRef, useState } from "react";

/**
 * GRAYSON-DICTATE-001 (C7.1): the one copy of BEYOND's Web Speech code, shared by Drive Home, Alfred's sheet and the
 * TALK buttons in quick capture, the meal log and the check-in. `en-US`, as before. Starting cancels any spoken reply
 * (unless the caller is itself mid-conversation, like Drive Home), a new start aborts the one before, and unmount
 * stops listening. An error is reported once (`failed` on `onDone`); the hook never restarts on its own (#381 review).
 */
type Recognition = {
  lang: string; interimResults: boolean; continuous?: boolean; start(): void; stop(): void; abort?(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
};

export function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface DictationStart {
  /** Words as he speaks (interim results). Off: only the final words. */
  interim?: boolean;
  /** Cancel a spoken reply first. Default on. */
  cancelSpeech?: boolean;
  /** Everything heard so far, each time it changes. */
  onWords?: (words: string) => void;
  /** Right when recognition reports an error. */
  onError?: () => void;
  /** Once, when listening ends: the words heard and whether it ended on an error. */
  onDone?: (words: string, failed: boolean) => void;
}

export function useDictation() {
  const rec = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const supported = !!recognitionCtor();

  useEffect(() => () => { const r = rec.current; rec.current = null; if (r) (r.abort ? r.abort() : r.stop()); }, []);

  const start = useCallback((opts: DictationStart = {}): boolean => {
    const Ctor = recognitionCtor();
    if (!Ctor) return false;
    rec.current?.abort?.();
    if (opts.cancelSpeech !== false && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    const r = new Ctor(); r.lang = "en-US"; r.interimResults = !!opts.interim;
    let words = "", failed = false;
    r.onresult = (e) => { words = Array.from(e.results).map((res) => res[0]!.transcript).join(" "); opts.onWords?.(words); };
    r.onerror = () => { failed = true; if (rec.current === r) setListening(false); opts.onError?.(); };
    r.onend = () => { if (rec.current === r) { rec.current = null; setListening(false); } opts.onDone?.(words, failed); };
    rec.current = r; setListening(true); r.start();
    return true;
  }, []);
  /** Stop listening and keep what was heard (onDone still runs). */
  const stop = useCallback(() => { rec.current?.stop(); }, []);
  /** Drop it: no more words. onDone may still run; callers that closed ignore it. */
  const abort = useCallback(() => { const r = rec.current; rec.current = null; setListening(false); r?.abort?.(); }, []);
  return { supported, listening, start, stop, abort };
}
