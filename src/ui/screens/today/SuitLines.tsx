import { useEffect, useRef, useState } from "react";
import { commsOff, describeComms, getCaveTonight } from "../../../application/caveTonight";
import { describeIn, getCaveRoute, nextWaypoints, routeCallout, type CaveRoute } from "../../../application/caveRoute";
import { describeBrief, getCaveBrief } from "../../../application/caveBrief";
import "../systems/systems.css";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * SUIT-ALIVE S3/S4 (owner approvals 2026-10-28): the lines that close TODAY's mode hero, so they are
 * not phase rows. ROUTE shows the next three points of the lived day (once one is more than the
 * rollover) and opens the full route.
 * COMMS reports how you sit against your own normal — never the call, which stays on the NEXT card —
 * and, for a point passed within the last half hour, says that point instead. It opens TONIGHT.
 * S6: for 3 hours before a shift and 3 after it, PREFLIGHT / DEBRIEF takes the route line's place and
 * opens the cave's BRIEF. Read only; each line is hidden if its reading fails. TODAY re-reads both on its own changes and
 * every five minutes, so preparation and passing points show without a reload.
 */
const BRIEF_WINDOW_MS = 3 * 3600_000;

/** Before the shift (3 h) or after it (3 h, from the end or work marked ended): the brief's window on TODAY. */
function briefWindow(route: CaveRoute, now: Date): { kind: "BEFORE" | "AFTER"; label: string; tMinus: string } | null {
  const start = route.waypoints.find((w) => w.kind === "SHIFT_START"), end = route.waypoints.find((w) => w.kind === "SHIFT_END");
  if (!start || !end) return null;
  const t = now.getTime(), s = Date.parse(start.at), e = Date.parse(end.at);
  const m = Math.max(0, Math.round((s - t) / 60000));
  if (t < s && s - t <= BRIEF_WINDOW_MS) return { kind: "BEFORE", label: clock(start.at), tMinus: `T–${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` };
  // Work marked ended early passes the end at load, so the report is ready from then until 3 h after the scheduled end.
  if (t >= s && ((end.passed && t < e) || (t >= e && t - e <= BRIEF_WINDOW_MS))) return { kind: "AFTER", label: clock(end.at), tMinus: "" };
  return null;
}

/**
 * SUIT-VOLUME-001 (owner go 2026-10-28): TODAY's suit bands are Volume 2 only when one of them truly
 * needs you, and only one may carry the amber accent at a time: a LATE preflight, then a point just
 * passed, then a reading off your normal. The others keep their calm text. Pure; presentation only.
 */
export function bandAccent(s: { briefLate: boolean; callout: boolean; commsOff: boolean }): "brief" | "callout" | "comms" | null {
  return s.briefLate ? "brief" : s.callout ? "callout" : s.commsOff ? "comms" : null;
}

export function SuitLines({ refreshKey, now, onOpen }: { refreshKey: string; now: Date; onOpen: (tab: "tonight" | "route" | "brief") => void }) {
  const [comms, setComms] = useState<{ text: string; off: boolean } | null>(null);
  const [route, setRoute] = useState<CaveRoute | null>(null);
  const [brief, setBrief] = useState<{ text: string; late: boolean } | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    getCaveTonight()
      .then((t) => { if (request === sequence.current) setComms({ text: describeComms(t), off: commsOff(t).length > 0 }); })
      .catch(() => { if (request === sequence.current) setComms(null); });
    getCaveRoute()
      .then((r) => { if (request === sequence.current) setRoute(r); })
      .catch(() => { if (request === sequence.current) setRoute(null); });
  }, [refreshKey]);

  // SUIT-ALIVE S6: for 3 hours before a shift and 3 after it, the brief takes the route line's place.
  const window = route ? briefWindow(route, now) : null;
  useEffect(() => {
    if (!window) { setBrief(null); return; }
    let current = true;
    getCaveBrief().then((b) => { if (current) setBrief(b ? { text: describeBrief(b), late: b.items.some((i) => i.state === "LATE") } : null); })
      .catch(() => { if (current) setBrief(null); });
    return () => { current = false; };
  }, [refreshKey, window?.kind]);

  // Only the rollover ahead says nothing worth a line, so the route band waits for a real point.
  const next = route ? nextWaypoints(route, now) : [];
  const showRoute = next.some((w) => w.kind !== "DAY_END");
  const callout = route ? routeCallout(route, now) : null;
  const spokenRoute = next.map((w, i) => `${clock(w.at)} ${w.label.toLowerCase()}${w.fixed ? "" : ", usual"}${i === 0 ? `, ${describeIn(w.at, now)}` : ""}`).join("; ");
  const text = callout ?? comms?.text;
  const accent = bandAccent({ briefLate: !!(window && brief?.late), callout: !!callout, commsOff: !!comms?.off });
  return <>
    {window && brief ? <button type="button" className={`route-line brief-line${accent === "brief" ? " brief-line--late" : ""}`} aria-label={`${window.kind === "BEFORE" ? `Preflight, shift ${window.label}` : "After-action ready"}. ${brief.text} Open the brief in the cave`} onClick={() => onOpen("brief")}>
      <span className="route-line__key" aria-hidden="true">{window.kind === "BEFORE" ? "PREFLIGHT ›" : "DEBRIEF ›"}</span>
      <span className="route-line__ways" aria-hidden="true">
        <span className="route-line__way"><time>{window.kind === "BEFORE" ? window.tMinus : "DONE"}</time><span>{window.kind === "BEFORE" ? `SHIFT ${window.label}` : "AFTER-ACTION READY"}</span><span /></span>
        <span className="brief-line__text">{brief.text}</span>
      </span>
    </button> : showRoute && <button type="button" className="route-line" aria-label={`Route, next: ${spokenRoute}. Open the full route in the cave`} onClick={() => onOpen("route")}>
      <span className="route-line__key" aria-hidden="true">ROUTE ›</span>
      <span className="route-line__ways" aria-hidden="true">{next.map((w, i) => (
        <span key={w.kind} className={`route-line__way${w.fixed ? "" : " route-line__way--usual"}`}>
          <time>{clock(w.at)}</time><span>{w.label}{w.fixed ? "" : " · USUAL"}</span><span className="route-line__in">{i === 0 ? describeIn(w.at, now) : ""}</span>
        </span>
      ))}</span>
    </button>}
    {text && <button type="button" className={`comms-line${accent === "comms" ? " comms-line--off" : ""}`} aria-label={`Comms: ${text} Open tonight in the cave`} onClick={() => onOpen("tonight")}>
      <span className="comms-line__head" aria-hidden="true"><span className="comms-line__key">COMMS</span><span className="comms-line__go">TONIGHT ›</span></span>
      <span className="comms-line__text" aria-hidden="true">{text}</span>
    </button>}
  </>;
}
