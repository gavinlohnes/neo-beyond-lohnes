import { useEffect, useRef, useState, type ReactNode } from "react";
import { MODE_DESCRIPTIONS, MODE_NAMES, MODE_ORDER, type LivedDayStrip, type ShiftClockPhase } from "./shiftClock";
import "./modeHeader.css";
import { ModeCity, ModeScene } from "./ModeIdentity";
import { describeMap, type PlacedMark } from "../../../application/livedDayMap";

const KEY: { kind: PlacedMark["kind"]; label: string }[] = [
  { kind: "SLEEP", label: "Sleep" }, { kind: "WORK", label: "Work" }, { kind: "WORKOUT", label: "Lift" },
  { kind: "MEAL", label: "Meal" }, { kind: "WATER", label: "Water" }, { kind: "CHECK_IN", label: "Check-in" },
  { kind: "NAP_PLAN", label: "Planned nap" }, { kind: "SLEEP_PLAN", label: "Planned sleep" },
];

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
  now,
  children,
  systems,
  countdown,
  hasAction,
  scheduledPhase,
  pin,
  strip,
  dayStart,
  dayOff,
  busy,
  onPin,
  onRecordWorkDay,
  run,
  marks,
  onOpenSleepPlan,
  markActions,
  eyebrow,
}: {
  /** VISUAL-FOUNDATION-003: the foundation's red slashes and the date, above the mode. */
  eyebrow?: string | undefined;
  /** DAY-MAP-001 slice 3: where each kind of mark opens (its existing screen). Kinds left out are facts only. */
  markActions?: Partial<Record<PlacedMark["kind"], { label: string; open: () => void }>> | undefined;
  /** DAY-MAP-001 slice 2: opens ROUTE's shift sleep plan (the cards, sources, SAVE/SKIP). */
  onOpenSleepPlan?: (() => void) | undefined;
  /** DAY-MAP-001: what has been recorded on this lived day, placed on the bar. */
  marks?: PlacedMark[] | undefined;
  /** SHIFT-RUN-001: "scheduled: night 2 of 3 · next day off Thu", from the saved schedule only. */
  run?: string | null;
  now: Date;
  children?: ReactNode;
  /** POLISH-002: the SYSTEMS line, inside the hero's frame as in the prototype. */
  systems?: ReactNode;
  /** Drop 2: before and during a shift, the countdown leads the meta line ("Shift in 50m"). */
  countdown?: string | undefined;
  hasAction: boolean;
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
  const [nightOpen, setNightOpen] = useState(false);
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
      window.requestAnimationFrame(() => trigger.current?.getClientRects().length && trigger.current.focus({ preventScroll: true }));
    };
  }, [open]);

  function choose(phase: ShiftClockPhase | null) {
    // Every manual pick holds, even when it agrees with the schedule now.
    onPin(phase);
    if (phase === "SCHEDULED_SHIFT" && dayOff && onRecordWorkDay) setStep("WORK_DAY");
    else setOpen(false);
  }

  // POLISH-002: the prototype's meta line — the mode's own sentence, or the pin and when it resets.
  // The schedule's countdown leads either way (Drop 2): a pin never hides when the shift starts.
  const source = pin
    ? <>{countdown && `${countdown} · `}<span className="cc-pin">Pinned</span> · schedule says {scheduledPhase ? MODE_NAMES[scheduledPhase] : "nothing yet"} · resets 16:30</>
    : mode
      ? `${countdown ?? "Per schedule"} · ${MODE_DESCRIPTIONS[mode]}`
      : "Answer the work question and the mode follows.";

  // The sweep plays once when the mode changes, never on first paint.
  const lastMode = useRef(mode);
  const [sweep, setSweep] = useState(0);
  useEffect(() => {
    if (lastMode.current !== mode) setSweep((n) => n + 1);
    lastMode.current = mode;
  }, [mode]);

  return (
    <section className={`mode-header cc-mode${scheduledPhase ? "" : " cc-mode--thin"}`} data-mode={mode ?? "UNSET"} aria-label="Mode">
      {eyebrow && <p className="mode-header__eyebrow" data-today-date><span className="bf-slashes" aria-hidden="true">///</span>{` ${eyebrow}`}</p>}
      <button
        ref={trigger}
        type="button"
        className="mode-header__name cc-mode-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Mode ${mode ? MODE_NAMES[mode] : "not set"}${pin ? ", pinned" : mode ? ", per schedule" : ""}. Change mode`}
        onClick={() => { setStep("PICK"); setOpen(true); }}
      >
        <span className="mode-header__value cc-mode-name">{mode ? MODE_NAMES[mode] : "Mode: not set"}</span>
        <span className="mode-header__change cc-mode-chev" aria-hidden="true">CHANGE</span>
      </button>
      {children}
      <div className="mode-header__source cc-mode-meta">{source}</div>
      {run && <div className="mode-header__run cc-mode-meta">{run}</div>}
      <div className="cc-timeline mode-strip" aria-hidden="true">
        <div className="cc-tl-bar">
          {strip.segments.map((segment) => (
            <div key={segment.phase} className={`cc-tl-seg${segment.phase === mode ? " cc-on" : ""}`} style={{ flex: (segment.to - segment.from).toFixed(4) }} />
          ))}
          <div className="cc-tl-now mode-strip__now" style={{ left: `${(strip.now * 100).toFixed(1)}%` }} />
        </div>
        {marks && marks.length > 0 && <div className="cc-tl-marks" data-day-map>
          {marks.map((m, i) => m.to !== null
            ? <span key={i} className={`cc-tl-span cc-tl-span--${m.kind.toLowerCase()}${m.fresh ? " cc-tl-fresh" : ""}`} style={{ left: `${(m.from * 100).toFixed(2)}%`, width: `${Math.max((m.to - m.from) * 100, 0.8).toFixed(2)}%` }} />
            : <span key={i} className={`cc-tl-pin cc-tl-pin--${m.kind.toLowerCase()}${m.fresh ? " cc-tl-fresh" : ""}`} style={{ left: `${(m.from * 100).toFixed(2)}%` }} />)}
        </div>}
        <div className="cc-tl-ruler">
          {Array.from({ length: 24 }, (_, i) => <i key={i} className={i === 1 || i === 13 ? "cc-maj" : undefined} style={{ left: `${(((i + .5) / 24) * 100).toFixed(2)}%` }} />)}
        </div>
        <div className="cc-tl-names">
          {strip.segments.map((segment) => (
            <span key={segment.phase} className={segment.phase === mode ? "cc-on" : undefined} style={{ flex: (segment.to - segment.from).toFixed(4) }}>
              {segment.to - segment.from > 0.12 ? MODE_NAMES[segment.phase] : ""}
            </span>
          ))}
        </div>
        {marks && marks.length > 0 && <div className="cc-tl-key">
          {KEY.filter((k) => marks.some((m) => m.kind === k.kind)).map((k) => <span key={k.kind}><i className={`cc-tl-key__swatch cc-tl-key__swatch--${k.kind.toLowerCase()}`} />{k.label}</span>)}
        </div>}
        <div className="cc-tl-legend">
          <span style={{ left: 0 }}>{clock(dayStart)}</span>
          {!dayOff && <span style={{ left: "56.25%" }}>06:00</span>}
          <span style={{ left: "100%" }}>{clock(dayStart)}</span>
        </div>
      </div>
      {marks && <p className="visually-hidden" data-day-map-summary>{describeMap(marks)}</p>}
      <div className="cc-tl-links">
        {marks && marks.length > 0 && <button type="button" className="cc-tl-plan-link" aria-expanded={nightOpen} aria-controls="day-map-list" onClick={() => setNightOpen((o) => !o)}>
          {nightOpen ? "HIDE THE NIGHT" : `THE NIGHT SO FAR · ${marks.length}${marks.some((m) => m.fresh) ? ` · ${marks.filter((m) => m.fresh).length} NEW` : ""}`}</button>}
        {marks?.some((m) => m.planned) && onOpenSleepPlan && <button type="button" className="cc-tl-plan-link" onClick={onOpenSleepPlan}>SLEEP PLAN ›</button>}
      </div>
      {/* DAY-MAP-001 slice 3: the map as a list, each item with its time and, where one exists, its own screen. Reads only. */}
      {marks && nightOpen && <ol id="day-map-list" className="cc-tl-list" aria-label="The night so far">
        {marks.map((m, i) => {
          const action = markActions?.[m.kind];
          return <li key={i} className={m.planned ? "cc-tl-list__planned" : undefined}>
            <span>{m.planned ? "PLANNED · " : m.fresh ? <strong className="cc-tl-list__new">NEW · </strong> : ""}{m.label}</span>
            {action && <button type="button" className="cc-tl-list__open" onClick={action.open}>{action.label} ›</button>}
          </li>;
        })}
      </ol>}
      <ModeScene now={now} workDay={!dayOff} hasAction={hasAction} onShift={mode === "SCHEDULED_SHIFT"} />
      {systems}
      <ModeCity now={now} workDay={!dayOff} />
      {sweep > 0 && <div key={sweep} className="cc-sweep cc-go mode-header__sweep" aria-hidden="true" />}
      {open && (
        <dialog
          ref={dialog}
          className="today-sheet"
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
          <header className="today-sheet__header">
            <h2 id="mode-picker-title" className="card-title">{step === "PICK" ? "MODE" : "ON SHIFT TODAY?"}</h2>
            <button type="button" className="chip" onClick={() => setOpen(false)} aria-label="Close mode picker">CLOSE</button>
          </header>
          {step === "PICK" ? (
            <>
              <button type="button" className="today-sheet__option" aria-pressed={pin === null} autoFocus={pin === null} onClick={() => choose(null)}>
                <span>
                  <strong>Follow schedule</strong>
                  <span>{scheduledPhase ? `Now ${MODE_NAMES[scheduledPhase]}. It moves with your day.` : "No mode until the work question is answered."}</span>
                </span>
                {pin === null && <span className="today-sheet__tag">ON</span>}
              </button>
              {MODE_ORDER.map((phase) => (
                <button key={phase} type="button" className="today-sheet__option" aria-pressed={pin === phase} autoFocus={pin === phase} onClick={() => choose(phase)}>
                  <span>
                    <strong>{MODE_NAMES[phase]}</strong>
                    <span>{MODE_DESCRIPTIONS[phase]}</span>
                  </span>
                  {phase === scheduledPhase && <span className="today-sheet__tag">SCHEDULE</span>}
                  {pin === phase && <span className="today-sheet__tag">PINNED</span>}
                </button>
              ))}
              <p className="meta today-sheet__note">A pin changes this screen. Nothing else. Your records and BEYOND’s advice stay the same. Back on schedule at 16:30.</p>
            </>
          ) : (
            <>
              <p className="card-body today-sheet__note">Today is set as a day off. The pin only changes this screen. Record today as a work day too?</p>
              <div className="today-sheet__actions">
                <button type="button" className="btn-secondary" autoFocus onClick={() => setOpen(false)}>NOT NOW</button>
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => { onRecordWorkDay?.(); setOpen(false); }}>RECORD WORK DAY</button>
              </div>
            </>
          )}
        </dialog>
      )}
    </section>
  );
}
