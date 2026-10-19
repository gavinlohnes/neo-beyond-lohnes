import { CcIcon } from "../../cc/ccIcons";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
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
export function ConsoleControls({ onOpenWater, onOpenMeal, onOpenLog, onWaterVisibilityChange, onLogWater, lastWaterAmount = null, busy = false, isInFlight }: {
  onWaterVisibilityChange?: ((visible: boolean) => void) | undefined;
  onLogWater?: ((amount: number) => Promise<boolean>) | undefined;
  lastWaterAmount?: number | null;
  onOpenWater?: (() => void) | undefined;
  onOpenMeal?: (() => void) | undefined;
  /** + LOG's destinations; an entry whose route is missing is left out. */
  onOpenLog?: Partial<Record<LogEntryKey, () => void>> | undefined;
  busy?: boolean;
  isInFlight: () => boolean;
}) {
  const controlsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => onWaterVisibilityChange?.(entry?.isIntersecting ?? false));
    if (controlsRef.current) observer.observe(controlsRef.current);
    return () => { observer.disconnect(); onWaterVisibilityChange?.(false); };
  }, [onWaterVisibilityChange]);
  const [waterOpen, setWaterOpen] = useState(false);
  const [waterError, setWaterError] = useState<string | null>(null);
  const waterDialog = useRef<HTMLDialogElement>(null);
  const waterTrigger = useRef<HTMLButtonElement>(null);
  const restoreWaterTrigger = useRef(true);
  const waterWrite = useRef(false);
  useEffect(() => {
    if (!waterOpen) return;
    const element = waterDialog.current!;
    element.showModal();
    return () => {
      element.close();
      if (restoreWaterTrigger.current) requestAnimationFrame(() => waterTrigger.current?.getClientRects().length && waterTrigger.current.focus({ preventScroll: true }));
    };
  }, [waterOpen]);
  async function addWater(amount: number) {
    if (waterWrite.current || isInFlight()) return;
    waterWrite.current = true;
    setWaterError(null);
    try { if (await onLogWater?.(amount)) setWaterOpen(false); }
    catch { setWaterError("Water didn't save. Try again."); }
    finally { waterWrite.current = false; }
  }
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
      if (restoreLogTrigger.current) window.requestAnimationFrame(() => logTrigger.current?.getClientRects().length && logTrigger.current.focus({ preventScroll: true }));
    };
  }, [logOpen]);
  function closeLog(restoreFocus = true) {
    restoreLogTrigger.current = restoreFocus;
    setLogOpen(false);
  }
  const logEntries = LOG_ENTRIES.filter((entry) => onOpenLog?.[entry.key]);
  return <>
    <div ref={controlsRef} className="console-controls cc-actions" role="group" aria-label="Optional operator controls">
      <button type="button" ref={waterTrigger} disabled={busy || (!onOpenWater && !onLogWater)} onClick={() => { if (isInFlight()) return; if (onLogWater) { restoreWaterTrigger.current = true; setWaterError(null); setWaterOpen(true); } else onOpenWater?.(); }} className="cc-act" aria-label="Log water" aria-haspopup={onLogWater ? "dialog" : undefined} aria-expanded={onLogWater ? waterOpen : undefined}>
        <CcIcon.water /><span>WATER</span>
      </button>
      <button type="button" className="cc-act" disabled={busy || !onOpenMeal} onClick={() => { if (!isInFlight()) onOpenMeal?.(); }} aria-label="Log a meal in BODY">
        <CcIcon.meal /><span>MEAL</span>
      </button>
      <button type="button" ref={logTrigger} className="console-controls__log cc-act cc-log" disabled={busy || logEntries.length === 0}
        onClick={() => { if (!isInFlight()) setLogOpen(true); }} aria-label="Open LOG" aria-haspopup="dialog" aria-expanded={logOpen}>
        <CcIcon.plus /><span>LOG</span>
      </button>
    </div>
    {waterOpen && <dialog ref={waterDialog} className="today-sheet" aria-labelledby="water-sheet-title"
      onCancel={(event) => { event.preventDefault(); if (!waterWrite.current) setWaterOpen(false); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled)")];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header className="today-sheet__header"><h2 id="water-sheet-title" className="card-title">WATER</h2><button type="button" className="chip" disabled={busy} onClick={() => setWaterOpen(false)}>CLOSE</button></header>
      {/* POLISH-002: the prototype's amount tiles. */}
      <div className="cc-amounts">
        {[8, 12, 16].map((amount, i) => <button key={amount} type="button" aria-label={`+${amount} oz`} autoFocus={i === 0} disabled={busy} onClick={() => void addWater(amount)}>{amount}<small>oz</small></button>)}
      </div>
      <button type="button" className="today-sheet__option" disabled={busy || lastWaterAmount === null} onClick={() => lastWaterAmount !== null && void addWater(lastWaterAmount)}>{lastWaterAmount === null ? "Repeat last" : `Repeat last (${lastWaterAmount} oz)`}</button>
      {onOpenWater && <button type="button" className="today-sheet__option" disabled={busy} onClick={() => { if (isInFlight()) return; restoreWaterTrigger.current = false; waterDialog.current?.close(); waterTrigger.current?.focus({ preventScroll: true }); setWaterOpen(false); onOpenWater(); }}>More → BODY water</button>}
      {waterError && <p className="meta today-sheet__note" role="alert">{waterError}</p>}
    </dialog>}
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
