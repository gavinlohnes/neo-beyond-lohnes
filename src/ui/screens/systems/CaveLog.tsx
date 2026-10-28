import { useEffect, useRef, useState } from "react";
import { getCaveLogData, type CaveLogData } from "../../../application/caveLog";
import { routeCallout } from "../../../application/caveRoute";
import { describeEvent } from "../history/historyCopy";
import { describePlainRecommendationTitle, describeRecommendationReason } from "../today/recommendationCopy";
import { describeError } from "../../errorMessage";

/**
 * SUIT-ALIVE S8 — the cave, Log. COMMS: what the cave said today, rebuilt from the records (each call
 * as issued, each route callout when its point passed). RECORDER: today's events as recorded, who did
 * what and when. Newest first. Read only.
 */
type Line = { at: string; who: "CAVE" | "YOU" | "SYSTEM"; text: string; key: string };
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const LIMIT = 40;

export function lines(data: CaveLogData, now: Date): { comms: Line[]; recorder: Line[] } {
  const comms: Line[] = data.recommendations.map((r) => ({ key: r.id, at: r.issuedAt, who: "CAVE" as const,
    text: `${describePlainRecommendationTitle(r.kind, r.title)}. ${describeRecommendationReason(r.rationale)}` }));
  for (const w of data.route?.waypoints ?? []) {
    if (Date.parse(w.at) > now.getTime()) continue;
    const said = data.route && routeCallout(data.route, new Date(w.at));
    if (said) comms.push({ key: `route-${w.kind}`, at: w.at, who: "CAVE", text: said });
  }
  const recorder: Line[] = data.events.map((e) => ({ key: e.id, at: e.recordedAt, who: e.source === "USER" ? "YOU" as const : "SYSTEM" as const, text: describeEvent(e) }));
  const newest = (a: Line, b: Line) => b.at.localeCompare(a.at);
  return { comms: comms.sort(newest), recorder: recorder.sort(newest) };
}

export function CaveLogView() {
  const [data, setData] = useState<CaveLogData | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"COMMS" | "RECORDER">("COMMS");
  const [limit, setLimit] = useState(LIMIT);
  const sequence = useRef(0);
  async function load() {
    const request = ++sequence.current;
    setError(null);
    try {
      const d = await getCaveLogData();
      if (request === sequence.current) setData(d);
    } catch (e) {
      if (request === sequence.current) setError(describeError(e, "Could not read the log."));
    }
  }
  useEffect(() => { void load(); }, []);

  if (error) return <div role="alert"><p className="meta meta--error">{error} The log is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void load()}>RETRY</button></div>;
  if (data === undefined) return <p className="meta" role="status">Reading…</p>;
  if (data === null) return <p className="cave__sum">No day started, so there's nothing logged yet.</p>;
  const { comms, recorder } = lines(data, new Date());
  const shown = view === "COMMS" ? comms : recorder;
  return <>
    <div className="cave__seg" role="group" aria-label="Log view">
      <button type="button" className="chip" aria-pressed={view === "COMMS"} onClick={() => { setView("COMMS"); setLimit(LIMIT); }}>COMMS</button>
      <button type="button" className="chip" aria-pressed={view === "RECORDER"} onClick={() => { setView("RECORDER"); setLimit(LIMIT); }}>RECORDER</button>
    </div>
    {shown.length ? <ol className="log__list" aria-label={view === "COMMS" ? "What the cave said today, newest first" : "Today's records, newest first"}>
      {shown.slice(0, limit).map((l) => <li key={l.key} className={`log__line log__line--${l.who.toLowerCase()}`}>
        <time>{clock(l.at)}</time><span className="log__who">{l.who}</span><span className="log__text">{l.text}</span>
      </li>)}
    </ol> : <p className="cave__sum">{view === "COMMS" ? "Nothing said yet today." : "Nothing recorded yet today."}</p>}
    {shown.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + LIMIT)}>SHOW EARLIER</button>}
    <p className="meta">{view === "COMMS" ? "Rebuilt from your records at each moment. Nothing extra is stored to keep it." : "Every record today, as stored. Corrections and deletions show as their own entries."}</p>
  </>;
}
