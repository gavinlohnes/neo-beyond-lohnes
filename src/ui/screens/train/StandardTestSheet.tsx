import { useEffect, useId, useRef, useState } from "react";
import type { StandardTestKind } from "../../../domain/common/types";
import {
  fixStandardTest, recordStandardTest, removeStandardTest, type StandardFix,
} from "../../../application/standardTestCommands";
import { writeStandardTarget } from "../../../application/standardTestQueries";
import {
  formatRunTime, formatStandardValue, STANDARD_LIMITS, STANDARD_NOTE_MAX, STANDARD_TEST, standardValueProblem, type StandardResult,
} from "../../../domain/workout/standardTests";
import { restEndBuzz } from "../../feel/restEndBuzz";
import { describeError } from "../../errorMessage";
import "./standardTests.css";

/**
 * GRAYSON-TRAIN-STANDARDS-001 (Gavin, 2026-11-24): TRAIN → PROGRESS → STANDARDS. RECORD a result in a few taps (value,
 * SAVE), see and fix or remove every result (RECORDS), and set his own target (TARGET). The one-minute timer and the
 * stopwatch run only while this sheet is open with the screen on, and write nothing.
 */

export type StandardSheetMode =
  | { kind: "RECORD" }
  | { kind: "FIX"; result: StandardResult }
  | { kind: "RECORDS" }
  | { kind: "TARGET" };

export type StandardChange =
  | { kind: "RECORDED" }
  | { kind: "FIXED"; fix: StandardFix; test: StandardTestKind }
  | { kind: "REMOVED"; voidEventId: string; test: StandardTestKind }
  | { kind: "TARGET" };

/** The value as typed: one field, or minutes and seconds for the run. */
interface Typed { main: string; minutes: string; seconds: string }
const EMPTY: Typed = { main: "", minutes: "", seconds: "" };

function typedFrom(test: StandardTestKind, value: number | undefined): Typed {
  if (value === undefined) return EMPTY;
  if (STANDARD_TEST[test].unit === "seconds") return { main: "", minutes: String(Math.floor(value / 60)), seconds: String(Math.round(value % 60)) };
  return { ...EMPTY, main: String(value) };
}

function valueOf(test: StandardTestKind, typed: Typed): number | null {
  if (STANDARD_TEST[test].unit === "seconds") {
    if (typed.minutes.trim() === "" && typed.seconds.trim() === "") return null;
    const m = Number(typed.minutes || "0"), s = Number(typed.seconds || "0");
    if (!Number.isInteger(m) || !Number.isInteger(s) || m < 0 || s < 0 || s > 59) return NaN;
    return m * 60 + s;
  }
  if (typed.main.trim() === "") return null;
  return Number(typed.main);
}

const hhmmOf = (at: string) => {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const whenOf = (at: string) => new Date(at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function ValueFields({ test, typed, setTyped, idBase }: { test: StandardTestKind; typed: Typed; setTyped: (t: Typed) => void; idBase: string }) {
  const { unit } = STANDARD_TEST[test];
  if (unit === "seconds") {
    return <div className="standard-sheet__time" role="group" aria-label="Time">
      <label className="standard-sheet__field" htmlFor={`${idBase}-min`}>Minutes
        <input id={`${idBase}-min`} type="number" inputMode="numeric" min={5} max={60} step={1} value={typed.minutes}
          onChange={(e) => setTyped({ ...typed, minutes: e.target.value })} /></label>
      <label className="standard-sheet__field" htmlFor={`${idBase}-sec`}>Seconds
        <input id={`${idBase}-sec`} type="number" inputMode="numeric" min={0} max={59} step={1} value={typed.seconds}
          onChange={(e) => setTyped({ ...typed, seconds: e.target.value })} /></label>
    </div>;
  }
  const { min, max, step } = STANDARD_LIMITS[unit];
  return <label className="standard-sheet__field" htmlFor={`${idBase}-value`}>{unit === "in" ? "Inches" : "Reps"}
    <input id={`${idBase}-value`} type="number" inputMode={unit === "in" ? "decimal" : "numeric"} min={min} max={max} step={step}
      value={typed.main} onChange={(e) => setTyped({ ...typed, main: e.target.value })} /></label>;
}

/** START 1:00: counts down from his tap and buzzes once at zero. Writes nothing. */
function MinuteTimer() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const buzzed = useRef(false);
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);
  const left = endsAt === null ? 60_000 : Math.max(0, endsAt - now);
  useEffect(() => {
    if (endsAt !== null && left === 0 && !buzzed.current) { buzzed.current = true; restEndBuzz("LONG"); }
  }, [endsAt, left]);
  const done = endsAt !== null && left === 0;
  return <div className="standard-sheet__timer" data-minute-timer>
    <p className="standard-sheet__clock" aria-live="off">{formatRunTime(Math.ceil(left / 1000))}</p>
    {done && <p className="standard-sheet__line" role="status">Time. Enter your reps.</p>}
    {endsAt === null || done
      ? <button type="button" className="btn-secondary" onClick={() => { buzzed.current = false; const t = Date.now(); setNow(t); setEndsAt(t + 60_000); }}>START 1:00</button>
      : <button type="button" className="btn-secondary" onClick={() => setEndsAt(null)}>STOP</button>}
  </div>;
}

/** START STOPWATCH while the sheet is open; STOP fills the time. Writes nothing. */
function Stopwatch({ onStop }: { onStop: (seconds: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);
  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  return <div className="standard-sheet__timer" data-stopwatch>
    <p className="standard-sheet__clock" aria-live="off">{formatRunTime(elapsed)}</p>
    {startedAt === null
      ? <button type="button" className="btn-secondary" onClick={() => { const t = Date.now(); setNow(t); setStartedAt(t); }}>START STOPWATCH</button>
      : <button type="button" className="btn-secondary" onClick={() => { const secs = Math.floor((Date.now() - startedAt) / 1000); setStartedAt(null); onStop(secs); }}>STOP</button>}
  </div>;
}

export function StandardTestSheet({ test, mode, results, target, onMode, onChanged, onClose }: {
  test: StandardTestKind;
  mode: StandardSheetMode;
  results: readonly StandardResult[];
  target: number | undefined;
  onMode: (mode: StandardSheetMode) => void;
  onChanged: (change: StandardChange) => void;
  onClose: () => void;
}) {
  const info = STANDARD_TEST[test];
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fixing = mode.kind === "FIX" ? mode.result : null;
  const [typed, setTyped] = useState<Typed>(() => typedFrom(test, mode.kind === "FIX" ? mode.result.value : mode.kind === "TARGET" ? target : undefined));
  const [hhmm, setHhmm] = useState(fixing ? hhmmOf(fixing.at) : "");
  const [note, setNote] = useState(fixing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { headingRef.current?.focus(); }, [mode.kind]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); } finally { setBusy(false); }
  };
  const checked = (): number | null => {
    const v = valueOf(test, typed);
    const problem = v === null ? standardValueProblem(test, NaN) : standardValueProblem(test, v);
    if (problem) { setError(problem); return null; }
    return v;
  };

  const title = mode.kind === "RECORD" ? `Record ${info.name.toLowerCase()}` : mode.kind === "FIX" ? `Fix ${info.name.toLowerCase()}`
    : mode.kind === "RECORDS" ? `${info.name}: every result` : `${info.name}: your target`;

  return <div className="standard-sheet" role="group" aria-labelledby={`${id}-title`} data-standard-sheet={mode.kind}>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="standard-sheet__title">{title}</h3>

    {(mode.kind === "RECORD" || mode.kind === "FIX") && <>
      {fixing && <p className="standard-sheet__line">Recorded {formatStandardValue(test, fixing.value)} on {whenOf(fixing.at)}.</p>}
      <ValueFields test={test} typed={typed} setTyped={setTyped} idBase={id} />
      {test === "SIT_UPS_1MIN" && <MinuteTimer />}
      {test === "RUN_1_5_MILE" && <Stopwatch onStop={(s) => setTyped({ ...typed, minutes: String(Math.floor(s / 60)), seconds: String(s % 60) })} />}
      <label className="standard-sheet__field" htmlFor={`${id}-when`}>{fixing ? "Time" : "Time (blank is now)"}
        <input id={`${id}-when`} type="time" value={hhmm} onChange={(e) => setHhmm(e.target.value)} /></label>
      <label className="standard-sheet__field" htmlFor={`${id}-note`}>Note (optional)
        <input id={`${id}-note`} type="text" maxLength={STANDARD_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      {error && <p className="standard-sheet__line" role="alert">{error}</p>}
      <div className="standard-sheet__acts">
        <button type="button" className="btn-secondary standard-sheet__save" disabled={busy} onClick={() => {
          const value = checked();
          if (value === null) return;
          void run(async () => {
            const input = { value, ...(hhmm ? { hhmm } : {}), ...(note.trim() ? { note } : {}) };
            if (fixing) onChanged({ kind: "FIXED", fix: await fixStandardTest(fixing.eventId, input), test });
            else { await recordStandardTest({ test, ...input }); onChanged({ kind: "RECORDED" }); }
          });
        }}>SAVE</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={fixing ? () => onMode({ kind: "RECORDS" }) : onClose}>CANCEL</button>
      </div>
    </>}

    {mode.kind === "RECORDS" && <>
      {results.length === 0 ? <p className="standard-sheet__line">No results yet.</p>
        : <ul className="standard-sheet__list">{results.map((r) => <li key={r.eventId} className="standard-sheet__result" data-result={r.eventId}>
            <p className="standard-sheet__line"><strong>{formatStandardValue(test, r.value)}</strong> · {whenOf(r.at)}{r.note ? ` · ${r.note}` : ""}</p>
            <div className="standard-sheet__acts">
              <button type="button" className="btn-secondary" disabled={busy} aria-label={`Fix ${formatStandardValue(test, r.value)} from ${whenOf(r.at)}`}
                onClick={() => onMode({ kind: "FIX", result: r })}>FIX</button>
              <button type="button" className="btn-secondary" disabled={busy} aria-label={`Remove ${formatStandardValue(test, r.value)} from ${whenOf(r.at)}`}
                onClick={() => void run(async () => onChanged({ kind: "REMOVED", voidEventId: await removeStandardTest(r.eventId), test }))}>REMOVE</button>
            </div>
          </li>)}</ul>}
      {error && <p className="standard-sheet__line" role="alert">{error}</p>}
      <div className="standard-sheet__acts"><button type="button" className="btn-secondary" onClick={onClose}>CLOSE</button></div>
    </>}

    {mode.kind === "TARGET" && <>
      <p className="standard-sheet__line">Your own target. BEYOND shows how far you are from it, never pass or fail.</p>
      <ValueFields test={test} typed={typed} setTyped={setTyped} idBase={id} />
      {error && <p className="standard-sheet__line" role="alert">{error}</p>}
      <div className="standard-sheet__acts">
        <button type="button" className="btn-secondary standard-sheet__save" onClick={() => {
          const value = checked();
          if (value === null) return;
          void run(async () => { writeStandardTarget(test, value); onChanged({ kind: "TARGET" }); });
        }}>SAVE</button>
        {target !== undefined && <button type="button" className="btn-secondary" onClick={() => void run(async () => { writeStandardTarget(test, null); onChanged({ kind: "TARGET" }); })}>CLEAR</button>}
        <button type="button" className="btn-secondary" onClick={onClose}>CANCEL</button>
      </div>
    </>}
  </div>;
}
