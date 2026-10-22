import { useState, type ComponentProps } from "react";
import { HealthDayBrowser } from "./HealthDayBrowser";
import { ImportedActivityEvidence } from "../health/ImportedActivityEvidence";
import { ImportedSleepEvidence } from "../health/ImportedSleepEvidence";

/**
 * UX-COHESION-001 (owner approval 2026-10-22): one HEALTH HISTORY destination in BODY. It replaces the
 * separate "Browse health days" and "Garmin history" disclosures. Closed by default; inside, DAYS (your
 * recorded days) and GARMIN (measured days and imported sleep) are deliberate choices, and the Garmin
 * lists stop at ten until SHOW MORE. Nothing is removed, merged or reinterpreted.
 */
export function HealthHistory({ open, onOpenChange, active, days }: {
  open: boolean; onOpenChange: (open: boolean) => void; active: boolean;
  days: Omit<ComponentProps<typeof HealthDayBrowser>, "visible">;
}) {
  const [view, setView] = useState<"DAYS" | "GARMIN">("DAYS");
  return <details className="health-history" open={open} onToggle={(event) => {
    const next = event.currentTarget.open;
    // Closing history returns BODY to today, so a past day never stays selected out of sight.
    if (!next && days.selected) days.onSelect(null);
    onOpenChange(next);
  }}>
    <summary>Health history</summary>
    {open && <>
      <div role="group" aria-label="Health history view" className="health-history-views">
        {(["DAYS", "GARMIN"] as const).map((id) => <button key={id} type="button" className="btn-secondary" aria-pressed={view === id} disabled={days.disabled}
          onClick={() => { if (id === "GARMIN" && days.selected) days.onSelect(null); setView(id); }}>{id === "DAYS" ? "DAYS" : "GARMIN"}</button>)}
      </div>
      {view === "DAYS" ? <HealthDayBrowser {...days} visible={active} />
        : <><ImportedActivityEvidence active={active} /><ImportedSleepEvidence active={active} /></>}
    </>}
  </details>;
}
