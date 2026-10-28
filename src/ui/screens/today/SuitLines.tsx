import { useEffect, useRef, useState } from "react";
import { describeComms, getCaveTonight } from "../../../application/caveTonight";
import { describeIn, getCaveRoute, nextWaypoints, routeCallout, type CaveRoute } from "../../../application/caveRoute";
import type { CaveTab } from "../systems/CaveVitals";
import "../systems/systems.css";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * SUIT-ALIVE S3/S4 (owner approvals 2026-10-28): the lines that close TODAY's mode hero, so they are
 * not phase rows. ROUTE shows the next three points of the lived day (once one is more than the
 * rollover) and opens the full route.
 * COMMS reports how you sit against your own normal — never the call, which stays on the NEXT card —
 * and, for a point passed within the last half hour, says that point instead. It opens TONIGHT.
 * Read only; each line is hidden if its reading fails. TODAY re-reads both on its own changes and
 * every five minutes, so preparation and passing points show without a reload.
 */
export function SuitLines({ refreshKey, now, onOpen }: { refreshKey: string; now: Date; onOpen: (tab: Exclude<CaveTab, "vitals">) => void }) {
  const [comms, setComms] = useState<{ text: string; off: boolean } | null>(null);
  const [route, setRoute] = useState<CaveRoute | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    getCaveTonight()
      .then((t) => { if (request === sequence.current) setComms({ text: describeComms(t), off: t.off.length > 0 }); })
      .catch(() => { if (request === sequence.current) setComms(null); });
    getCaveRoute()
      .then((r) => { if (request === sequence.current) setRoute(r); })
      .catch(() => { if (request === sequence.current) setRoute(null); });
  }, [refreshKey]);

  // Only the rollover ahead says nothing worth a line, so the route band waits for a real point.
  const next = route ? nextWaypoints(route, now) : [];
  const showRoute = next.some((w) => w.kind !== "DAY_END");
  const callout = route ? routeCallout(route, now) : null;
  const spokenRoute = next.map((w, i) => `${clock(w.at)} ${w.label.toLowerCase()}${w.fixed ? "" : ", usual"}${i === 0 ? `, ${describeIn(w.at, now)}` : ""}`).join("; ");
  const text = callout ?? comms?.text;
  return <>
    {showRoute && <button type="button" className="route-line" aria-label={`Route, next: ${spokenRoute}. Open the full route in the cave`} onClick={() => onOpen("route")}>
      <span className="route-line__key" aria-hidden="true">ROUTE ›</span>
      <span className="route-line__ways" aria-hidden="true">{next.map((w, i) => (
        <span key={w.kind} className={`route-line__way${w.fixed ? "" : " route-line__way--usual"}`}>
          <time>{clock(w.at)}</time><span>{w.label}{w.fixed ? "" : " · USUAL"}</span><span className="route-line__in">{i === 0 ? describeIn(w.at, now) : ""}</span>
        </span>
      ))}</span>
    </button>}
    {text && <button type="button" className={`comms-line${comms?.off && !callout ? " comms-line--off" : ""}`} aria-label={`Comms: ${text} Open tonight in the cave`} onClick={() => onOpen("tonight")}>
      <span className="comms-line__head" aria-hidden="true"><span className="comms-line__key">COMMS</span><span className="comms-line__go">TONIGHT ›</span></span>
      <span className="comms-line__text" aria-hidden="true">{text}</span>
    </button>}
  </>;
}
