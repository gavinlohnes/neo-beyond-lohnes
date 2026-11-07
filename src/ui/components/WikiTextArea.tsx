import { useEffect, useMemo, useState } from "react";
import { getMentions, getWikiTargets, wikiLabels } from "../../application/dailyNoteQueries";
import type { WikiTarget } from "../../domain/dailyNotes";
import { openRecord } from "../openRecordEvent";

export function WikiLinkList({ text, emptyMessage = "Only this unsaved draft mentions it." }: { text: string; emptyMessage?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [mentions, setMentions] = useState<Awaited<ReturnType<typeof getMentions>>>([]);
  const [person, setPerson] = useState<string | null>(null);
  useEffect(() => {
    if (selected) { void getMentions(selected).then(setMentions); void getWikiTargets(selected).then((targets) => setPerson(targets.find((t) => t.kind === "PERSON" && t.label.toLowerCase() === selected.toLowerCase())?.label ?? null)); }
    else { setMentions([]); setPerson(null); }
  }, [selected]);
  const linked = useMemo(() => [...new Set(wikiLabels(text))], [text]);
  if (!linked.length) return null;
  return <>
    <div className="wiki-links" aria-label="Links in this text">{linked.map((item) =>
      <button type="button" className="text-button" key={item} onClick={() => setSelected(selected === item ? null : item)}>[[{item}]]</button>)}</div>
    {selected && <section className="wiki-mentions" aria-label={`Mentioned in ${selected}`}>{person && <button type="button" className="text-button" onClick={() => openRecord({ kind: "PERSON", id: person })}>Open {person}'s page</button>}<p className="section-label">Mentioned in</p>
      {mentions.length ? <ul>{mentions.map((item) => <li key={`${item.kind}:${item.id}`}><button type="button" className="text-button" aria-label={`Open ${item.kind.toLowerCase()}: ${item.label}`} onClick={() => openRecord({ kind: item.kind, id: item.id })}>{item.label} · {item.kind.toLowerCase()}</button></li>)}</ul> : <p className="meta">{emptyMessage}</p>}
    </section>}
  </>;
}

export function WikiTextArea({ label, value, onChange, rows = 8, disabled = false }: { label: string; value: string; onChange: (value: string) => void; rows?: number; disabled?: boolean }) {
  const [caret, setCaret] = useState(value.length);
  const [targets, setTargets] = useState<WikiTarget[]>([]);
  const open = value.slice(0, caret).match(/\[\[([^\]\n]*)$/);
  useEffect(() => { if (open) void getWikiTargets(open[1]).then(setTargets); else setTargets([]); }, [open?.[1]]);
  const insert = (target: WikiTarget) => {
    if (!open) return;
    const start = caret - open[0].length;
    onChange(`${value.slice(0, start)}[[${target.label}]]${value.slice(caret)}`);
    setCaret(start + target.label.length + 4); setTargets([]);
  };
  return <div className="wiki-editor">
    <label>{label}<textarea className="input" rows={rows} disabled={disabled} value={value} onChange={(event) => { onChange(event.target.value); setCaret(event.target.selectionStart); }}
      onSelect={(event) => setCaret(event.currentTarget.selectionStart)} placeholder="Write freely. Type [[ to link a person, project, or lived day." /></label>
    {open && <div className="wiki-suggestions" role="listbox" aria-label="Link suggestions">
      {targets.length ? targets.map((target) => <button type="button" role="option" key={`${target.kind}:${target.id}`} onClick={() => insert(target)}>
        <span>{target.label}</span><small>{target.kind.replace("_", " ")}</small>
      </button>) : <p className="meta">No matching link target.</p>}
    </div>}
    <WikiLinkList text={value} />
  </div>;
}
