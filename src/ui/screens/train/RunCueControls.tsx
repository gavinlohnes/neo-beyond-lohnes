import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RunCueOp } from "../../../application/runCueBridge";
import { runCueSeconds, runCueText } from "../../../application/runCueBridge";
import {
  readRunCuePrefs,
  resetRunCueWords,
  RUN_CUE_KINDS,
  RUN_CUE_WORDS_MAX,
  runCueSpeaks,
  runCueSwitchDefault,
  runCueSwitchOn,
  writeRunCuePrefs,
  type RunCuePrefs,
} from "../../../application/runCuePrefs";
import type { RunningSession } from "../../../domain/common/types";
import { runningCueTimeline, type RunningCueKind } from "../../../domain/workout/runningCues";
import type { RunningSegment } from "../../../domain/workout/runningPlan";
import { sendRunCues, watchBridgeOpened, type RunCueSend } from "./runCueLink";
import {
  RUN_CUE_BRIDGE_MISSING,
  RUN_CUE_INSTALL,
  RUN_CUE_NAME,
  RUN_CUE_NOT_ANDROID,
  RUN_CUE_PLACEHOLDERS,
  RUN_CUE_SWITCH,
  RUN_CUE_TOO_LARGE,
  RUN_CUE_VOICE_SETTINGS,
} from "./trainCopy";

/**
 * GRAYSON-TRAIN-RUN-CUES-001 (Gavin, 2026-11-24): the VOICE CUES switch, its voice and buzz sub-switches, and the CUE
 * WORDS sheet. Everything is his to change and is remembered (beyond.runCues.v1). The switch only decides whether
 * BEYOND's taps also tell Health Bridge; the run itself is unchanged either way.
 */

export interface RunCues {
  prefs: RunCuePrefs;
  /** True once Health Bridge has sent BEYOND data; null while that's being read. */
  bridgeSeen: boolean | null;
  on: boolean;
  /** Whether the Bridge has anything to do: the switch on and voice or buzz on. */
  active: boolean;
  missing: RunCueSend | "NOT_OPENED" | null;
  update: (next: RunCuePrefs, session?: RunningSession) => void;
  /** Tells Health Bridge about a tap, if cues are on. Call inside the tap handler. */
  send: (op: RunCueOp, session: RunningSession) => void;
}

const isActive = (prefs: RunCuePrefs, bridgeSeen: boolean) => runCueSwitchOn(prefs, bridgeSeen) && (prefs.voice || prefs.buzz);

export function useRunCues(): RunCues {
  const [prefs, setPrefs] = useState(readRunCuePrefs);
  const [bridgeSeen, setBridgeSeen] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<RunCues["missing"]>(null);
  const stopWatch = useRef<(() => void) | null>(null);
  useEffect(() => {
    let live = true;
    void runCueSwitchDefault().then((seen) => { if (live) setBridgeSeen(seen); });
    return () => { live = false; stopWatch.current?.(); };
  }, []);
  const seen = bridgeSeen ?? false;
  const on = runCueSwitchOn(prefs, seen);

  const open = useCallback((op: RunCueOp, session: RunningSession, using: RunCuePrefs) => {
    const result = sendRunCues(op, session, using);
    if (result !== "SENT") { setMissing((m) => m ?? result); return; }
    // Default 8: say once if nothing answered; the run carries on with the on-screen cues.
    stopWatch.current?.();
    stopWatch.current = watchBridgeOpened(() => setMissing((m) => m ?? "NOT_OPENED"));
  }, []);

  const send = useCallback((op: RunCueOp, session: RunningSession) => {
    if (isActive(prefs, seen)) open(op, session, prefs);
  }, [prefs, seen, open]);

  const update = useCallback((next: RunCuePrefs, session?: RunningSession) => {
    const was = isActive(prefs, seen);
    writeRunCuePrefs(next);
    setPrefs(next);
    // Mid-run, a change is a tap too: start or update the Bridge, or stop it.
    if (!session) return;
    if (isActive(next, seen)) open("start", session, next);
    else if (was) open("end", session, next);
  }, [prefs, seen, open]);

  return { prefs, bridgeSeen, on, active: isActive(prefs, seen), missing, update, send };
}

const MISSING_LINE: Record<NonNullable<RunCues["missing"]>, string> = {
  NOT_OPENED: RUN_CUE_BRIDGE_MISSING,
  NOT_ANDROID: RUN_CUE_NOT_ANDROID,
  TOO_LARGE: RUN_CUE_TOO_LARGE,
  SENT: "",
};

export function RunCueControls({ cues, session }: { cues: RunCues; session?: RunningSession }) {
  const [wordsOpen, setWordsOpen] = useState(false);
  const wordsButton = useRef<HTMLButtonElement>(null);
  const edited = useRef(false);
  const { prefs, on, bridgeSeen, missing, update } = cues;
  return <fieldset className="run-cues" data-run-cues>
    <legend className="section-label">VOICE CUES</legend>
    <label className="running-option"><input type="checkbox" role="switch" checked={on} disabled={bridgeSeen === null}
      onChange={(e) => update({ ...prefs, on: e.target.checked }, session)} />{RUN_CUE_SWITCH}</label>
    {!on && bridgeSeen === false && <p className="meta">{RUN_CUE_INSTALL}</p>}
    <div className="run-cues__subs">
      <label className="running-option"><input type="checkbox" checked={prefs.voice} onChange={(e) => update({ ...prefs, voice: e.target.checked }, session)} />Voice</label>
      <label className="running-option"><input type="checkbox" checked={prefs.buzz} onChange={(e) => update({ ...prefs, buzz: e.target.checked }, session)} />Buzz</label>
    </div>
    {missing && missing !== "SENT" && <p className="meta" role="status">{MISSING_LINE[missing]}</p>}
    <button ref={wordsButton} type="button" className="btn-secondary run-cues__words" onClick={() => setWordsOpen(true)}>CUE WORDS</button>
    {wordsOpen && <RunCueWordsSheet prefs={prefs} onChange={(next) => { edited.current = true; update(next); }}
      onClose={() => {
        // Mid-run, new words reach the Bridge once, on the closing tap, never on each keystroke.
        if (edited.current && session) cues.send("start", session);
        edited.current = false;
        setWordsOpen(false);
        requestAnimationFrame(() => wordsButton.current?.focus());
      }} />}
  </fieldset>;
}

/** A short sample run, so each cue's default words and the placeholders show with real lengths. */
const SAMPLE: RunningSegment[] = [
  { kind: "WARMUP", seconds: 300 }, { kind: "RUN", seconds: 60 }, { kind: "WALK", seconds: 90 },
  { kind: "RUN", seconds: 60 }, { kind: "COOLDOWN", seconds: 300 },
];
const SAMPLE_TIMELINE = runningCueTimeline(SAMPLE);
function sample(kind: RunningCueKind): { text: string; seconds: number } {
  const index = SAMPLE_TIMELINE.findIndex((c) => c.cue === kind);
  return { text: SAMPLE_TIMELINE[index]!.text, seconds: runCueSeconds(SAMPLE_TIMELINE, index) };
}

const canSpeak = () => typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";

/** CUE WORDS: his wording for each of the six cues, which ones speak, a PLAY preview and RESET. */
export function RunCueWordsSheet({ prefs, onChange, onClose }: { prefs: RunCuePrefs; onChange: (next: RunCuePrefs) => void; onClose: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const id = useId();
  useEffect(() => {
    headingRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); if (canSpeak()) speechSynthesis.cancel(); };
  }, []);
  const speech = canSpeak();
  const play = (line: string) => { if (!speech) return; speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(line)); };

  return createPortal(<div className="run-words" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} data-run-words>
    <div className="run-words__head">
      <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">Cue words</h2>
      <button type="button" className="btn-secondary run-words__done" onClick={onClose}>CLOSE</button>
    </div>
    <p className="meta">{RUN_CUE_PLACEHOLDERS}</p>
    <ul className="run-words__list">
      {RUN_CUE_KINDS.map((kind) => {
        const { text, seconds } = sample(kind);
        const line = runCueText(prefs, kind, text, seconds);
        const speaks = runCueSpeaks(prefs, kind);
        const name = RUN_CUE_NAME[kind];
        return <li key={kind} className="run-words__row" data-cue={kind}>
          <h3 className="run-words__kind">{name}</h3>
          <label className="running-option"><input type="checkbox" checked={speaks}
            onChange={(e) => onChange({ ...prefs, speak: { ...prefs.speak, [kind]: e.target.checked } })} />Say it</label>
          <label className="running-field run-words__field">
            <span>Words</span>
            <input type="text" aria-label={`Words for ${name}`} value={prefs.words[kind] ?? ""} placeholder={text} maxLength={RUN_CUE_WORDS_MAX}
              onChange={(e) => {
                const words = { ...prefs.words };
                if (e.target.value === "") delete words[kind]; else words[kind] = e.target.value;
                onChange({ ...prefs, words });
              }} />
          </label>
          <p className="run-words__hear">This is what you'll hear: <span data-hear>{speaks ? line : "nothing (switched off)"}</span></p>
          <button type="button" className="btn-secondary run-words__play" disabled={!speech || !speaks} aria-label={`Play the ${name} cue`} onClick={() => play(line)}>PLAY</button>
        </li>;
      })}
    </ul>
    {!speech && <p className="meta">This browser can't play speech, so PLAY is off here.</p>}
    <p className="meta">{RUN_CUE_VOICE_SETTINGS}</p>
    <div className="run-words__acts">
      <button type="button" className="btn-secondary" onClick={() => onChange(resetRunCueWords(prefs))}>RESET</button>
      <button type="button" className="btn-primary" onClick={onClose}>DONE</button>
    </div>
  </div>, document.body);
}
