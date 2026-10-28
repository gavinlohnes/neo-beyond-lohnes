import { useEffect, useRef, useState } from "react";
import { getCaveRoute, type CaveRoute } from "../../../application/caveRoute";
import { describeError } from "../../errorMessage";

/**
 * SUIT-ALIVE S4 — the cave, Route. The whole lived day's points, 16:30 to 16:30: solid points are fixed
 * (schedule, the boundary); hollow points are your usual from your own history, never orders. Read-only.
 */
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function CaveRouteView() {
  const [route, setRoute] = useState<CaveRoute | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  async function load() {
    const request = ++sequence.current;
    setError(null);
    try {
      const r = await getCaveRoute();
      if (request === sequence.current) setRoute(r);
    } catch (e) {
      if (request === sequence.current) setError(describeError(e, "Could not read the route."));
    }
  }
  useEffect(() => { void load(); }, []);

  if (error) return <div role="alert"><p className="meta meta--error">{error} The route is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void load()}>RETRY</button></div>;
  if (route === undefined) return <p className="meta" role="status">Reading…</p>;
  if (route === null) return <p className="cave__sum">No day started, so there's no route yet.</p>;
  const nextIndex = route.waypoints.findIndex((w) => !w.passed);
  return <>
    <p className="cave__sum">{route.dayKind === "WORK" ? "Work day" : "Day off"}, {clock(route.dayStart)} to {clock(route.dayEnd)}. Solid points are fixed. Hollow points are your usual, not orders.</p>
    <ol className="cave__route">{route.waypoints.map((w, i) => (
      <li key={w.kind} className={`cave__stop${w.fixed ? "" : " cave__stop--usual"}${w.passed ? " cave__stop--passed" : ""}${i === nextIndex ? " cave__stop--next" : ""}`}>
        <time>{clock(w.at)}</time>
        <span className="cave__pin" aria-hidden="true" />
        <span className="cave__stop-body">
          <span className="cave__stop-name">{w.label}{w.fixed ? "" : " · usual"}{w.passed ? " · passed" : i === nextIndex ? " · next" : ""}</span>
          <span className="cave__stop-why">{w.why}</span>
        </span>
      </li>
    ))}</ol>
    {route.notes.map((n) => <p key={n} className="meta">{n}</p>)}
    <p className="meta">Callouts come only while BEYOND is open, on the comms line, for half an hour after a point passes. Nothing is sent or scheduled.</p>
  </>;
}
