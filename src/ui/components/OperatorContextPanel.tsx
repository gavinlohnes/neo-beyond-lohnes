import { useEffect, useRef, useState } from "react";
import { readOperatorContext } from "../../application/operatorContext";
import type { ContextSource, OperatorContext } from "../../domain/operatorContext";

export function ContextSourceDetails({ source }: { source: ContextSource }) {
  const format = (at: string) => new Date(at).toLocaleString();
  return <div style={{ overflowWrap: "anywhere" }}>
    <p>{source.text}</p>
    <p className="meta">{source.classification} · {source.lifecycle}</p>
    {source.at && <p className="meta">Source date: {format(source.at)}</p>}
    {source.confirmedAt && <p className="meta">Last confirmed: {format(source.confirmedAt)}</p>}
    <p className="meta">{source.freshness}</p>
    {source.kind === "ALFRED_MEMORY" && <p className="meta">This legacy entry has no revision history. Forget deletes the local entry; old exports and earlier external requests are not recalled.</p>}
    {(source.kind === "MEMORY" || source.kind === "PERSONAL_FACT") && <p className="meta">Corrections and no-longer-relevant status retain revision history.</p>}
  </div>;
}

/** Deliberate local inspection. No key, model call, persisted projection or required profile setup. */
export function OperatorContextPanel({ active, onMemory }: { active: boolean; onMemory?: (id: string) => void }) {
  const [open, setOpen] = useState(false), [limit, setLimit] = useState(5), [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<(OperatorContext & { records: ContextSource[] }) | null>(null);
  const [error, setError] = useState(false), [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ContextSource | null>(null);
  const detail = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active || !open) return;
    let alive = true; setLoading(true); setError(false); setSnapshot(null); setSelected(null);
    void readOperatorContext({ purpose: "local", includePersonal: true }).then((value) => { if (alive) setSnapshot(value); })
      .catch(() => { if (alive) setError(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [active, open, attempt]);
  useEffect(() => {
    if (!selected) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    detail.current?.focus();
    return () => { if (trigger?.isConnected) trigger.focus(); };
  }, [selected]);
  return <section aria-label="Operator context" style={{ overflowWrap: "anywhere" }}>
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>WHAT BEYOND KNOWS</summary>
      <p className="meta">A local view of your existing records. Opening it sends nothing. Two memory systems still exist; their histories and forget behavior differ. Statements may overlap or disagree; nothing is merged automatically.</p>
      {loading && <p role="status">Reading local context…</p>}
      {error && <p role="alert">Context is unavailable, not empty. Your records have not changed.</p>}
      <button type="button" className="btn-secondary" disabled={loading} onClick={() => setAttempt((v) => v + 1)}>RELOAD CONTEXT</button>
      {snapshot && <>
        <p className="meta">Read {new Date(snapshot.readAt).toLocaleString()}. Missions, direction and constraints are conversation opt-in. Active personal facts and unconverted Alfred entries are available to Alfred by default; automatic prep/recovery keep their existing allowance. This local view grants no additional sharing.</p>
        {([true, false] as const).map((statements) => {
          const records = snapshot.records.filter((s) => (s.classification === "Operator statement") === statements);
          return <details key={String(statements)}><summary>{statements ? "Your statements" : "Current records and recorded history"} ({records.length})</summary>
            {records.length === 0 && <p className="meta">No records in this group.</p>}
            {records.slice(0, limit).map((s) => <div key={s.key}><button type="button" className="btn-secondary" onClick={() => setSelected(s)}>INSPECT {s.title}</button></div>)}
            {records.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((v) => v + 5)}>SHOW MORE SOURCES</button>}
          </details>;
        })}
        <details><summary>Coverage and limits</summary>
          <p className="meta">Inspection includes sources that do not fit a bounded Alfred request. Supplied counts describe the bounded catalog, not what has been sent. No projection is a complete account of your life.</p>
          {snapshot.coverage.map((c) => <p className="meta" key={c.category}>{c.category}: {c.state} · {c.supplied} of {c.count} in catalog</p>)}
        </details>
      </>}
      {selected && <section ref={detail} tabIndex={-1} aria-label="Local source record">
        <h3>{selected.title}</h3><ContextSourceDetails source={selected} />
        <p className="meta">Snapshot at {snapshot ? new Date(snapshot.readAt).toLocaleString() : "unknown time"}. Reload to check for changes.</p>
        {(selected.kind === "MEMORY" || selected.kind === "PERSONAL_FACT") && onMemory && <button type="button" className="btn-secondary" onClick={() => onMemory(selected.id)}>OPEN MEMORY EDITOR</button>}
        <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>CLOSE SOURCE</button>
      </section>}
    </details>
  </section>;
}
