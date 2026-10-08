import { useEffect, useRef, useState } from "react";
import { Droplets, Utensils, Layers, ArrowUpRight } from "lucide-react";
import { LineIcon } from "../../icons/LineIcon";
import { Icon } from "../../icons/Icon";
import "./console.css";

type Destination = "TRAIN" | "BODY" | "MORE";

/** Navigation only: all logging and execution stay in existing workspaces. */
export function ConsoleControls({ onOpenWater, onOpenMeal, onOpenTools, onOpenDestination, busy = false, isInFlight }: {
  onOpenWater?: (() => void) | undefined;
  onOpenMeal?: (() => void) | undefined;
  onOpenTools: () => void;
  onOpenDestination?: ((destination: Destination) => void) | undefined;
  busy?: boolean;
  isInFlight: () => boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreTrigger = useRef(true);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    element.showModal();
    return () => {
      element.close();
      // Native close runs during cleanup. Restore only afterwards, and
      // leave selected workspace/tool destinations in charge of focus.
      if (restoreTrigger.current) window.requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
    };
  }, [open]);
  function close(restoreFocus = true) {
    restoreTrigger.current = restoreFocus;
    setOpen(false);
  }
  return <>
    <div className="console-controls" role="group" aria-label="Optional operator controls">
      <button type="button" disabled={busy || !onOpenWater} onClick={() => { if (!isInFlight()) onOpenWater?.(); }} aria-label="Log water in BODY">
        <LineIcon icon={Droplets} /><span>WATER</span>
      </button>
      <button type="button" disabled={busy || !onOpenMeal} onClick={() => { if (!isInFlight()) onOpenMeal?.(); }} aria-label="Log a meal in BODY">
        <LineIcon icon={Utensils} /><span>MEAL</span>
      </button>
      <button type="button" ref={trigger} disabled={busy} onClick={() => { if (!isInFlight()) setOpen(true); }} aria-label="Open SYSTEM" aria-haspopup="dialog" aria-expanded={open}>
        <LineIcon icon={Layers} /><span>SYSTEM</span>
      </button>
    </div>
    {open && <dialog ref={dialog} className="console-system" aria-labelledby="console-system-title" aria-describedby="console-system-description"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header className="console-system-header">
        <h2 id="console-system-title" className="card-title">SYSTEM</h2>
        <button type="button" className="chip" onClick={() => close()} aria-label="Close SYSTEM" autoFocus>CLOSE</button>
      </header>
      <p id="console-system-description" className="meta">Choose a workspace. Nothing starts or logs until you decide.</p>
      <button type="button" className="console-destination" onClick={() => { close(false); onOpenTools(); }}>
        <Icon name="mission" size={24} /><span><strong>TODAY TOOLS</strong><span>Check-in, work context and daily controls</span></span><LineIcon icon={ArrowUpRight} />
      </button>
      {([
        ["TRAIN", "Workouts, recovery and records", "train"],
        ["BODY", "Nutrition, water, sleep and bodyweight", "body"],
        ["MORE", "History, planning, insights and backups", "more"],
      ] as const).map(([destination, description, icon]) => <button key={destination} type="button" className="console-destination" disabled={!onOpenDestination}
        onClick={() => { close(false); onOpenDestination?.(destination); }}>
        <Icon name={icon} size={24} /><span><strong>{destination}</strong><span>{description}</span></span><LineIcon icon={ArrowUpRight} />
      </button>)}
    </dialog>}
  </>;
}
