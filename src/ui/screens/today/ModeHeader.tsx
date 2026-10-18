import { useEffect, useRef, useState } from "react";
import { MODE_DESCRIPTIONS, MODE_NAMES, MODE_ORDER, type LivedDayStrip, type ShiftClockPhase } from "./shiftClock";
import "./modeHeader.css";

function clock(at: Date): string {
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/**
 * COMMAND-CENTER-001: TODAY's mode header — the current Shift Clock phase by
 * name, where it comes from, and the lived day (16:30 → 16:30) with a now
 * marker. Tapping the name opens the picker. A pin only chooses TODAY's rows;
 * the optional work-day step is the one path that writes anything, and only
 * through the existing work-context command the caller supplies.
 */
export function ModeHeader({
  scheduledPhase,
  pin,
  strip,
  dayStart,
  dayOff,
  busy,
  onPin,
  onRecordWorkDay,
}: {
  /** The schedule's phase; null while the work question is unanswered. */
  scheduledPhase: ShiftClockPhase | null;
  pin: ShiftClockPhase | null;
  strip: LivedDayStrip;
  dayStart: Date;
  /** The day is declared OFF: pinning ON SHIFT offers the optional work-day step. */
  dayOff: boolean;
  busy: boolean;
  onPin: (phase: ShiftClockPhase | null) => void;
  /** Absent when the work context can't be recorded from here right now. */
  onRecordWorkDay?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"PICK" | "WORK_DAY">("PICK");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const mode = pin ?? scheduledPhase;

  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    element.showModal();
    return () => {
      element.close();
      window.requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
    };
  }, [open]);

  function choose(phase: ShiftClockPhase | null) {
    // Picking the schedule's own mode is the same as following it.
    const next = phase === scheduledPhase ? null : phase;
    onPin(next);
    if (phase === "SCHEDULED_SHIFT" && dayOff && onRecordWorkDay) setStep("WORK_DAY");
    else setOpen(false);
  }

  // Kept to one line at 320 px: the mode's description lives in the picker.
  const source = pin
    ? `Pinned · schedule says ${scheduledPhase ? MODE_NAMES[scheduledPhase] : "nothing yet"} · resets 16:30`
    : mode
      ? "Per schedule"
      : "Answer the work question and the mode follows.";

  return (
    <div className="mode-header" data-mode={mode ?? "UNSET"}>
      <button
        ref={trigger}
        type="button"
        className="mode-header__name"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Mode ${mode ? MODE_NAMES[mode] : "not set"}${pin ? ", pinned" : mode ? ", per schedule" : ""}. Change mode`}
        onClick={() => { setStep("PICK"); setOpen(true); }}
      >
        <span className="mode-header__text">
          <span className="mode-header__value">{mode ? MODE_NAMES[mode] : "Mode: not set"}</span>
          <span className="mode-header__source">{source}</span>
        </span>
        <span className="mode-header__change" aria-hidden="true">CHANGE</span>
      </button>
      <div className="mode-strip" aria-hidden="true">
        <div className="mode-strip__bar">
          {strip.segments.map((segment) => (
            <span
              key={segment.phase}
              className={`mode-strip__segment${segment.phase === mode ? " mode-strip__segment--on" : ""}`}
              style={{ flexGrow: segment.to - segment.from }}
            />
          ))}
          <span className="mode-strip__now" style={{ left: `${(strip.now * 100).toFixed(2)}%` }} />
        </div>
        <div className="mode-strip__legend">
          <span style={{ left: 0 }}>{clock(dayStart)}</span>
          {strip.shiftEnd && strip.shiftEnd.position > 0.15 && strip.shiftEnd.position < 0.85 && (
            <span style={{ left: `${(strip.shiftEnd.position * 100).toFixed(2)}%` }}>{clock(strip.shiftEnd.at)}</span>
          )}
          <span style={{ left: "100%" }}>{clock(dayStart)}</span>
        </div>
      </div>
      {open && (
        <dialog
          ref={dialog}
          className="mode-picker"
          aria-labelledby="mode-picker-title"
          onCancel={(event) => { event.preventDefault(); setOpen(false); }}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled)")];
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }}
        >
          <header className="mode-picker__header">
            <h2 id="mode-picker-title" className="card-title">{step === "PICK" ? "MODE" : "ON SHIFT TODAY?"}</h2>
            <button type="button" className="chip" onClick={() => setOpen(false)} aria-label="Close mode picker">CLOSE</button>
          </header>
          {step === "PICK" ? (
            <>
              <button type="button" className="mode-picker__option" aria-pressed={pin === null} autoFocus={pin === null} onClick={() => choose(null)}>
                <span>
                  <strong>Follow schedule</strong>
                  <span>{scheduledPhase ? `Now ${MODE_NAMES[scheduledPhase]}. It moves with your day.` : "No mode until the work question is answered."}</span>
                </span>
                {pin === null && <span className="mode-picker__tag">ON</span>}
              </button>
              {MODE_ORDER.map((phase) => (
                <button key={phase} type="button" className="mode-picker__option" aria-pressed={pin === phase} autoFocus={pin === phase} onClick={() => choose(phase)}>
                  <span>
                    <strong>{MODE_NAMES[phase]}</strong>
                    <span>{MODE_DESCRIPTIONS[phase]}</span>
                  </span>
                  {phase === scheduledPhase && <span className="mode-picker__tag">SCHEDULE</span>}
                  {pin === phase && <span className="mode-picker__tag">PINNED</span>}
                </button>
              ))}
              <p className="meta mode-picker__note">A pin changes this screen. Nothing else. Your records and BEYOND’s advice stay the same. Back on schedule at 16:30.</p>
            </>
          ) : (
            <>
              <p className="card-body mode-picker__note">Today is set as a day off. The pin only changes this screen. Record today as a work day too?</p>
              <div className="mode-picker__actions">
                <button type="button" className="btn-secondary" autoFocus onClick={() => setOpen(false)}>NOT NOW</button>
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => { onRecordWorkDay?.(); setOpen(false); }}>RECORD WORK DAY</button>
              </div>
            </>
          )}
        </dialog>
      )}
    </div>
  );
}
