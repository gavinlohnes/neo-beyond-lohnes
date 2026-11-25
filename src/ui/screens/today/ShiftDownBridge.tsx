import { useEffect, useId, useRef, useState } from "react";
import { captureItem } from "../../../application/commands";
import { describeError } from "../../errorMessage";
import { BREATH_CYCLE_MS, BREATH_WORDS, breathPhaseAt, ringScale } from "./breathPacer";
import {
  BREATH_MINUTES, HOME_CHIP_MAX, HOME_FIRST_EVENT, homeFirstFor, HOME_CHIPS_MAX, HOME_OTHER_MAX, SOMETHING_ELSE, cleanChips, homeChips, readBridgeSettings,
  setHomeFirst, writeBridgeSettings, type BridgeSettings, type BreathMinutes,
} from "./shiftDownBridgeStore";
import "./shiftDownBridge.css";

const reducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

/**
 * GRAYSON-SHIFTDOWN-TAPS-001 (C2.2): "Before you go", inside SHIFT DOWN while it runs. Three optional rows, each one
 * tap to start and nothing to skip: PARK IT (a raw capture), BREATHE (a slow-exhale ring, no sound, no record) and
 * FIRST AT HOME (tonight's pick, shown on TODAY after COMPLETE). COMPLETE SHIFT DOWN works the same either way.
 */
export function ShiftDownBridge({ dayId, dayStartedAt }: { dayId: string; dayStartedAt: string }) {
  const uid = useId();
  const [pick, setPick] = useState<string | null>(() => homeFirstFor(dayId, dayStartedAt));
  useEffect(() => {
    const update = () => setPick(homeFirstFor(dayId, dayStartedAt));
    update(); window.addEventListener(HOME_FIRST_EVENT, update);
    return () => window.removeEventListener(HOME_FIRST_EVENT, update);
  }, [dayId, dayStartedAt]);
  const [settings, setSettings] = useState<BridgeSettings>(() => readBridgeSettings());
  const [editing, setEditing] = useState(false);
  const save = (next: BridgeSettings) => { writeBridgeSettings(next); setSettings(readBridgeSettings()); };
  if (!settings.show && !editing) return <p className="meta shiftdown-bridge__off">Before you go is off. <button type="button" className="shiftdown-bridge__link" onClick={() => setEditing(true)}>CHANGE</button></p>;
  return <section className="shiftdown-bridge" aria-labelledby={`${uid}-h`}>
    <div className="shiftdown-bridge__head">
      <p id={`${uid}-h`} className="tool-label">BEFORE YOU GO</p>
      <button type="button" className="shiftdown-bridge__link" aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? "DONE" : "CHANGE"}</button>
    </div>
    {editing ? <BridgeSettingsPanel settings={settings} onChange={save} /> : <>
      {settings.park && <ParkRow />}
      {settings.breathe && <BreatheRow minutes={settings.minutes} />}
      {settings.home && <HomeRow dayId={dayId} pick={pick} chips={homeChips(settings)} />}
      {!settings.park && !settings.breathe && !settings.home && <p className="meta">All three rows are off. CHANGE to turn one back on.</p>}
    </>}
  </section>;
}

function ParkRow() {
  const uid = useId();
  const [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null), [error, setError] = useState<string | null>(null);
  const park = async () => {
    if (busy || !text.trim()) return;
    setBusy(true); setError(null); setStatus(null);
    try { await captureItem(text); setText(""); setStatus("Parked. It's in Capture."); }
    catch (cause) { setError(describeError(cause, "That didn't park. Your words are still here.")); }
    finally { setBusy(false); }
  };
  return <form className="shiftdown-bridge__row" onSubmit={(e) => { e.preventDefault(); void park(); }}>
    <label htmlFor={`${uid}-park`}>Anything unfinished? Park it.</label>
    <div className="shiftdown-bridge__inline">
      <input id={`${uid}-park`} className="input" value={text} maxLength={500} disabled={busy} onChange={(e) => { setText(e.target.value); setStatus(null); }} />
      <button type="submit" className="btn-secondary" disabled={busy || !text.trim()}>PARK</button>
    </div>
    {status && <p role="status" className="meta">{status}</p>}
    {error && <p role="alert" className="meta">{error}</p>}
  </form>;
}

function BreatheRow({ minutes }: { minutes: BreathMinutes }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [done, setDone] = useState(false);
  const length = minutes * 60_000;
  const still = useRef(reducedMotion());
  useEffect(() => {
    if (startedAt === null) return;
    const t = window.setInterval(() => {
      const n = Date.now();
      if (n - startedAt >= length) { setStartedAt(null); setDone(true); } else setNow(n);
    }, 100);
    return () => window.clearInterval(t);
  }, [startedAt, length]);
  if (startedAt === null) return <div className="shiftdown-bridge__row">
    <p>{minutes === 1 ? "One slow minute" : `${minutes} slow minutes`}, breathing out longer than in.</p>
    <div className="shiftdown-bridge__inline">
      <button type="button" className="btn-secondary" onClick={() => { const n = Date.now(); setDone(false); setNow(n); setStartedAt(n); }}>BREATHE {minutes} MIN</button>
      {done && <span role="status" className="meta">Done.</span>}
    </div>
    <details className="shiftdown-bridge__why"><summary>Why breathe out slowly?</summary>
      <p className="meta">In a Stanford study, five minutes a day of "cyclic sighing", two breaths in then a long, slow breath out, improved mood more than the same time of mindfulness meditation. The study used 5 minutes; you can set up to 5 under CHANGE.
        {" "}<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947" target="_blank" rel="noreferrer">The study (2023)</a> · <a href="https://med.stanford.edu/news/insights/2023/02/cyclic-sighing-can-help-breathe-away-anxiety.html" target="_blank" rel="noreferrer">How to do it</a></p>
    </details>
  </div>;
  const elapsed = Math.max(0, now - startedAt);
  const phase = breathPhaseAt(elapsed);
  const left = Math.max(0, Math.ceil((length - elapsed) / 1000));
  return <div className="shiftdown-bridge__row shiftdown-bridge__breath" role="group" aria-label="Breathing">
    <div className="shiftdown-bridge__ring-wrap" aria-hidden="true">
      <div className="shiftdown-bridge__ring" data-phase={phase.phase} style={still.current ? undefined : { transform: `scale(${ringScale(phase).toFixed(3)})` }} />
    </div>
    <p className="shiftdown-bridge__word" aria-live="polite" data-breath-word>{BREATH_WORDS[phase.phase]}</p>
    <p className="meta" data-breath-left>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left · breath {Math.floor(elapsed / BREATH_CYCLE_MS) + 1} of {Math.ceil(length / BREATH_CYCLE_MS)}</p>
    <button type="button" className="btn-secondary" onClick={() => { setStartedAt(null); setDone(false); }}>STOP</button>
  </div>;
}

function HomeRow({ dayId, pick, chips }: { dayId: string; pick: string | null; chips: string[] }) {
  const uid = useId();
  const custom = pick !== null && !chips.slice(0, -1).includes(pick);
  const [other, setOther] = useState(custom ? pick! : "");
  const [otherOpen, setOtherOpen] = useState(custom);
  const choose = (value: string | null) => setHomeFirst(dayId, value);
  return <div className="shiftdown-bridge__row" role="group" aria-labelledby={`${uid}-home`}>
    <p id={`${uid}-home`}>What's first at home?</p>
    <div className="shiftdown-bridge__chips">
      {chips.map((c) => {
        const isOther = c === SOMETHING_ELSE;
        const on = isOther ? custom || (otherOpen && !pick) : pick === c;
        return <button key={c} type="button" className={`chip${on ? " chip--selected" : ""}`} aria-pressed={on}
          onClick={() => {
            if (isOther) { if (custom) { choose(null); setOtherOpen(false); setOther(""); } else setOtherOpen(!otherOpen); return; }
            setOtherOpen(false); choose(pick === c ? null : c);
          }}>{c}</button>;
      })}
    </div>
    {otherOpen && <form className="shiftdown-bridge__inline" onSubmit={(e) => { e.preventDefault(); if (other.trim()) choose(other); }}>
      <label className="visually-hidden" htmlFor={`${uid}-other`}>Something else</label>
      <input id={`${uid}-other`} className="input" value={other} maxLength={HOME_OTHER_MAX} placeholder="In a few words" onChange={(e) => setOther(e.target.value)} />
      <button type="submit" className="btn-secondary" disabled={!other.trim()}>PICK</button>
    </form>}
  </div>;
}

function BridgeSettingsPanel({ settings, onChange }: { settings: BridgeSettings; onChange: (next: BridgeSettings) => void }) {
  const uid = useId();
  const [draft, setDraft] = useState(settings.chips.join("\n"));
  const flag = (key: "show" | "park" | "breathe" | "home", label: string) => <label className="shiftdown-bridge__check">
    <input type="checkbox" checked={settings[key]} onChange={() => onChange({ ...settings, [key]: !settings[key] })} /> {label}
  </label>;
  return <div className="shiftdown-bridge__settings">
    {flag("show", 'Show "Before you go"')}
    {flag("park", "Park it")}
    {flag("breathe", "Breathe")}
    {flag("home", "First at home")}
    <div role="group" aria-label="Breathing length" className="shiftdown-bridge__chips">
      {BREATH_MINUTES.map((m) => <button key={m} type="button" className={`chip${settings.minutes === m ? " chip--selected" : ""}`} aria-pressed={settings.minutes === m} onClick={() => onChange({ ...settings, minutes: m })}>{m} min</button>)}
    </div>
    <p className="meta">The study used 5 minutes a day.</p>
    <label htmlFor={`${uid}-chips`}>Home choices, one per line (up to {HOME_CHIPS_MAX - 1}, {HOME_CHIP_MAX} characters each). "{SOMETHING_ELSE}" always stays last.</label>
    <textarea id={`${uid}-chips`} className="input" rows={5} value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { const chips = cleanChips(draft.split("\n")); onChange({ ...settings, chips }); setDraft(chips.join("\n")); }} />
  </div>;
}

/**
 * GRAYSON-SHIFTDOWN-TAPS-001: the quiet TODAY line after COMPLETE SHIFT DOWN (FIRST_AT_HOME): "First at home: Elle."
 * CHANGE reopens the choices in place; CLEAR removes it. One lived day's note, never a record or an input.
 */
export function FirstAtHomeLine({ dayId, pick }: { dayId: string; pick: string }) {
  const [changing, setChanging] = useState(false);
  const settings = readBridgeSettings();
  return <div className="shiftdown-bridge__line" data-first-at-home>
    <p className="meta"><span>First at home: {pick}.</span>
      <button type="button" className="shiftdown-bridge__link" aria-expanded={changing} onClick={() => setChanging(!changing)}>{changing ? "DONE" : "CHANGE"}</button>
      <button type="button" className="shiftdown-bridge__link" onClick={() => setHomeFirst(dayId, null)}>CLEAR</button>
    </p>
    {changing && <HomeRow dayId={dayId} pick={pick} chips={homeChips(settings)} />}
  </div>;
}
