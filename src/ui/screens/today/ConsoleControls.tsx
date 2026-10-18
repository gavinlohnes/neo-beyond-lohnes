import { useEffect, useRef, useState } from "react";
import { Droplets, Utensils, ArrowUpRight, Plus } from "lucide-react";
import { LineIcon } from "../../icons/LineIcon";
import type { BodyFocus } from "../../shortcuts";
import "./console.css";

/** COMMAND-CENTER-001: + LOG lists every record type; each opens its existing canonical form. */
export const LOG_ENTRIES = [
  { key: "water", label: "Water", description: "BODY · Add water to today" },
  { key: "meal", label: "Meal", description: "BODY · Saved meals or manual entry" },
  { key: "sleep", label: "Sleep", description: "BODY · Main sleep or nap" },
  { key: "weight", label: "Bodyweight", description: "BODY · Weigh-in" },
  { key: "note", label: "Note", description: "TODAY · Quick Capture" },
  { key: "urge", label: "Urge", description: "BODY · Quit tracker entry" },
  { key: "workout", label: "Workout set", description: "Opens TRAIN" },
] as const;
export type LogEntryKey = (typeof LOG_ENTRIES)[number]["key"];

/**
 * Navigation only: all logging and execution stay in existing workspaces.
 * COMMAND-CENTER-001: WATER · MEAL · LOG in fixed positions. The SYSTEM dialog
 * that sat here is retired; its catalog is COMMAND's search.
 */
export function ConsoleControls({ onOpenWater, onOpenMeal, onOpenLog, busy = false, isInFlight }: {
  onOpenWater?: (() => void) | undefined;
  onOpenMeal?: (() => void) | undefined;
  /** + LOG's destinations; an entry whose route is missing is left out. */
  onOpenLog?: Partial<Record<LogEntryKey, () => void>> | undefined;
  busy?: boolean;
  isInFlight: () => boolean;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const logDialog = useRef<HTMLDialogElement>(null);
  const logTrigger = useRef<HTMLButtonElement>(null);
  const restoreLogTrigger = useRef(true);
  useEffect(() => {
    if (!logOpen) return;
    const element = logDialog.current!;
    element.showModal();
    return () => {
      element.close();
      // Native close runs during cleanup. Restore only afterwards, and
      // leave a chosen destination in charge of focus.
      if (restoreLogTrigger.current) window.requestAnimationFrame(() => logTrigger.current?.focus({ preventScroll: true }));
    };
  }, [logOpen]);
  function closeLog(restoreFocus = true) {
    restoreLogTrigger.current = restoreFocus;
    setLogOpen(false);
  }
  const logEntries = LOG_ENTRIES.filter((entry) => onOpenLog?.[entry.key]);
  return <>
    <div className="console-controls" role="group" aria-label="Optional operator controls">
      <button type="button" disabled={busy || !onOpenWater} onClick={() => { if (!isInFlight()) onOpenWater?.(); }} aria-label="Log water in BODY">
        <LineIcon icon={Droplets} /><span>WATER</span>
      </button>
      <button type="button" disabled={busy || !onOpenMeal} onClick={() => { if (!isInFlight()) onOpenMeal?.(); }} aria-label="Log a meal in BODY">
        <LineIcon icon={Utensils} /><span>MEAL</span>
      </button>
      <button type="button" ref={logTrigger} className="console-controls__log" disabled={busy || logEntries.length === 0}
        onClick={() => { if (!isInFlight()) setLogOpen(true); }} aria-label="Open LOG" aria-haspopup="dialog" aria-expanded={logOpen}>
        <LineIcon icon={Plus} /><span>LOG</span>
      </button>
    </div>
    {logOpen && <dialog ref={logDialog} className="today-sheet" aria-labelledby="console-log-title"
      onCancel={(event) => { event.preventDefault(); closeLog(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled)")];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header className="today-sheet__header">
        <h2 id="console-log-title" className="card-title">LOG</h2>
        <button type="button" className="chip" onClick={() => closeLog()} aria-label="Close LOG">CLOSE</button>
      </header>
      {logEntries.map((entry, index) => <button key={entry.key} type="button" className="today-sheet__option" autoFocus={index === 0}
        onClick={() => { if (isInFlight()) return; closeLog(false); onOpenLog?.[entry.key]?.(); }}>
        <span><strong>{entry.label}</strong><span>{entry.description}</span></span><LineIcon icon={ArrowUpRight} />
      </button>)}
      <p className="meta today-sheet__note">Each opens the form you already use. Nothing logs until you save it there.</p>
    </dialog>}
  </>;
}
