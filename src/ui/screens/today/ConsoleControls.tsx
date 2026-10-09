import { useEffect, useRef, useState } from "react";
import { Droplets, Utensils, Layers, ArrowUpRight } from "lucide-react";
import { LineIcon } from "../../icons/LineIcon";
import { findCapabilities, type SystemDestination } from "../../systemCatalog";
import "./console.css";


/** Navigation only: all logging and execution stay in existing workspaces. */
export function ConsoleControls({ onOpenWater, onOpenMeal, onOpenTools, onOpenDestination, busy = false, isInFlight }: {
  onOpenWater?: (() => void) | undefined;
  onOpenMeal?: (() => void) | undefined;
  onOpenTools: () => void;
  onOpenDestination?: ((destination: SystemDestination) => boolean) | undefined;
  busy?: boolean;
  isInFlight: () => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = findCapabilities(query);
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
      <button type="button" ref={trigger} disabled={busy} onClick={() => { if (!isInFlight()) { setQuery(""); setOpen(true); } }} aria-label="Open SYSTEM" aria-haspopup="dialog" aria-expanded={open}>
        <LineIcon icon={Layers} /><span>SYSTEM</span>
      </button>
    </div>
    {open && <dialog ref={dialog} className="console-system" aria-labelledby="console-system-title" aria-describedby="console-system-description"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        // A populated native search consumes Escape to clear itself before
        // dialog cancel. Dismiss the modal through its existing focus path.
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)")];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header className="console-system-header">
        <h2 id="console-system-title" className="card-title">SYSTEM</h2>
        <button type="button" className="chip" onClick={() => close()} aria-label="Close SYSTEM" autoFocus>CLOSE</button>
      </header>
      <p id="console-system-description" className="meta">Open existing tools. Nothing starts or logs automatically.</p>
      <div className="console-catalog-search">
        <label htmlFor="console-capability-query">Find a capability</label>
        <div>
          <input id="console-capability-query" className="input" type="search" value={query} placeholder="Water, history, schedule…"
            onChange={(event) => setQuery(event.target.value)} />
          <button type="button" className="chip" disabled={!query} onClick={() => {
            setQuery(""); document.getElementById("console-capability-query")?.focus();
          }}>CLEAR</button>
        </div>
      </div>
      <p className="meta" role="status" aria-live="polite">{matches.length ? `${matches.length} ${matches.length === 1 ? "capability" : "capabilities"}` : "No matching capability. Clear the search to browse."}</p>
      <div className="console-catalog-results">
      {(["Workspaces", "Daily actions", "Training and planning", "Records"] as const).map((group) => {
        const entries = matches.filter((entry) => entry.group === group);
        if (!entries.length) return null;
        return <section key={group} aria-label={group}>
          <h3 className="section-label">{group}</h3>
          {entries.map((entry) => <button key={entry.label} type="button" className="console-destination"
            disabled={entry.destination.kind !== "tools" && !onOpenDestination}
            onClick={() => {
              if (isInFlight()) return;
              if (entry.destination.kind === "tools") { close(false); onOpenTools(); }
              else if (onOpenDestination?.(entry.destination)) close(false);
            }}>
            <span><strong>{entry.label}</strong><span>{entry.description}</span></span><LineIcon icon={ArrowUpRight} />
          </button>)}
        </section>;
      })}
      </div>
    </dialog>}
  </>;
}
