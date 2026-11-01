import { ContextSourceDetails } from "./OperatorContextPanel";
import { useEffect, useRef, useState } from "react";
import { inspectContextSource, readPersonalSources, type ContextSource, type PlanningContext } from "../../application/alfred/personalContext";

const canOpen = (kind: ContextSource["kind"]) => ["MISSION", "MEMORY", "ALFRED_MEMORY", "PERSONAL_FACT", "DAY", "OBLIGATION", "SCHEDULE", "ROUTINE", "PROJECT"].includes(kind);
const date = (at: string) => new Date(at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Local inspection never calls the model. Inclusion is explicit and lasts only for this conversation. */
export function AlfredContextPanel({ included, onIncluded, busy, snapshot, selected, onSelected, onOpenRecord }: {
  included: boolean; onIncluded: (value: boolean) => void; busy: boolean; snapshot: PlanningContext | null;
  selected: ContextSource | null; onSelected: (source: ContextSource | null) => void;
  onOpenRecord?: ((source: ContextSource) => void) | undefined;
}) {
  const inspection = useRef<HTMLElement | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [open, setOpen] = useState(false), [limit, setLimit] = useState(5);
  const [available, setAvailable] = useState<ContextSource[]>([]), [error, setError] = useState<string | null>(null);
  const [sourceReadAt, setSourceReadAt] = useState<string | null>(null);
  const [current, setCurrent] = useState<ContextSource | null>(null), [reading, setReading] = useState(false);
  useEffect(() => {
    if (!open) return;
    let alive = true, sequence = 0;
    const read = () => { const request = ++sequence; setPreviewLoading(true); void readPersonalSources().then((s) => { if (alive && request === sequence) { setAvailable(s); setError(null); } }).catch(() => { if (alive && request === sequence) { setAvailable([]); setError("Personal context is unavailable, not empty. Reopen this panel to retry."); } }).finally(() => { if (alive && request === sequence) setPreviewLoading(false); }); };
    read(); window.addEventListener("beyond:memory-changed", read); window.addEventListener("focus", read);
    return () => { alive = false; window.removeEventListener("beyond:memory-changed", read); window.removeEventListener("focus", read); };
  }, [open, included]);
  useEffect(() => {
    setCurrent(null); if (!selected) return;
    let alive = true; setReading(true); setError(null);
    void inspectContextSource(selected, included).then((s) => { if (alive) { setCurrent(s); setSourceReadAt(new Date().toISOString()); if (!s) setError("That source is no longer available in the current context."); } })
      .catch(() => { if (alive) setError("That source could not be read. It is unavailable, not empty."); })
      .finally(() => { if (alive) setReading(false); });
    return () => { alive = false; };
  }, [selected, included]);
  useEffect(() => {
    if (!selected) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => inspection.current?.focus());
    return () => { cancelAnimationFrame(frame); if (trigger?.isConnected) trigger.focus(); };
  }, [selected]);
  return <section className="alfred-context" aria-label="Alfred context">
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>CONTEXT & SOURCES</summary>
      <p className="meta">Claude already receives your current day, recent recorded days, schedule, tasks, notes, targets, saved meals and active personal facts (including unconverted Alfred entries) when you send. Read tools can retrieve older records. Sending needs a connection.</p>
      <label><input type="checkbox" checked={included} disabled={busy} onChange={(e) => onIncluded(e.target.checked)} /> Include my Missions and confirmed personal memory in this conversation</label>
      <p className="meta">Off for this conversation by default. Missions, direction and constraints stay out of automatic briefs and weekly reviews; those keep their existing prep/recovery context. Changing this choice starts a fresh model conversation; earlier requests sent to Claude cannot be recalled.</p>
      {open && <>
        <h3>Personal sources available on this phone</h3>
        {previewLoading && <p role="status">Reading local personal sources…</p>}
        {!available.length && !previewLoading && !error && <p className="meta">No active personal sources recorded.</p>}
        {available.slice(0, limit).map((s) => <details key={s.key}><summary>{s.title}</summary><ContextSourceDetails source={s} />
          {onOpenRecord && canOpen(s.kind) && <button className="btn-secondary" type="button" disabled={busy} onClick={() => onOpenRecord(s)}>OPEN ORIGINAL RECORD</button>}
        </details>)}
        {available.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 5)}>SHOW MORE PERSONAL SOURCES</button>}
        {snapshot && <details><summary>Records supplied for the last request ({snapshot.sources.length})</summary>
          <p className="meta">Read {date(snapshot.readAt)}. Supplied does not mean the answer used every record. {snapshot.omitted ? `${snapshot.omitted} sources omitted by the limit.` : ""}</p>
          {snapshot.coverage.map((c) => <p className="meta" key={c.category}>{c.category}: {c.state} · {c.supplied} of {c.count} supplied</p>)}
          {snapshot.sources.slice(0, limit).map((s) => <button type="button" className="btn-secondary" key={s.key} disabled={busy} onClick={() => onSelected(s)}>INSPECT {s.title}</button>)}
          {snapshot.sources.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 5)}>SHOW MORE SUPPLIED SOURCES</button>}
        </details>}
      </>}
    </details>
    {error && <p role="alert">{error}</p>}
    {selected && <section ref={inspection} tabIndex={-1} aria-label="Source record">
      <h3>Source record</h3>{reading && <p role="status">Reading current source…</p>}
      {current && <><ContextSourceDetails source={current} /><p className="meta">{current.kind} · {sourceReadAt ? `read ${date(sourceReadAt)} · ` : ""}{current.revision !== selected.revision ? "Changed since this answer. Current record shown." : "Current record matches the supplied revision."}</p>
        {onOpenRecord && canOpen(current.kind) && <button type="button" className="btn-secondary" disabled={busy} onClick={() => onOpenRecord(current)}>{["PROJECT", "ROUTINE"].includes(current.kind) ? "OPEN SOURCE AREA" : "OPEN ORIGINAL RECORD"}</button>}</>}

      <button type="button" className="btn-secondary" disabled={reading} onClick={() => onSelected({ ...selected })}>RELOAD SOURCE</button>
      <button type="button" className="btn-secondary" onClick={() => onSelected(null)}>CLOSE SOURCE</button>
    </section>}
  </section>;
}
