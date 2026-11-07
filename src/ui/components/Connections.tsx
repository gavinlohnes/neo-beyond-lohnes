import { useEffect, useState } from "react";
import { getConnections, type Connection, type ConnectionKind } from "../../application/connectionQueries";
import type { SectionRead } from "../../application/sectionRead";
import { Section, SectionEmpty, SectionUnavailable } from "./Section";

/** Open and active items need no word; finished ones say how they ended. */
const STATUS_WORD: Record<string, string> = { WAITING: "Waiting", SATISFIED: "Done", RELEASED: "Let go", PAUSED: "Paused", COMPLETED: "Done", CLOSED: "Closed" };
const KIND_WORD: Record<ConnectionKind, string> = { DAY: "Daily note", JOURNAL: "Decision journal", HIGHLIGHT: "Highlight", TASK: "Task", PROJECT: "Project" };

/** CONNECT-001: what links here. Read-only; reflects only [[links]] the operator wrote. */
export function Connections({ id, label, self, refreshKey = 0 }: { id: string; label: string; self?: { kind: ConnectionKind; id: string }; refreshKey?: number }) {
  const [read, setRead] = useState<SectionRead<Connection[]> | null>(null);
  useEffect(() => {
    let current = true; setRead(null);
    void getConnections(label, self).then((next) => { if (current) setRead(next); });
    return () => { current = false; };
  }, [label, self?.kind, self?.id, refreshKey]);
  return <Section id={id} eyebrow="CONNECTIONS" title={`Linked to ${label}`} className="bx-connections">
    {!read ? <p className="meta" role="status">Reading links…</p>
      : read.state === "unavailable" ? <SectionUnavailable>Links could not be read. Try again in a moment.</SectionUnavailable>
      : read.value.length ? <ul className="bx-connection-list">{read.value.map((item) => <li key={`${item.kind}:${item.id}`}><span>{item.label}</span><small>{KIND_WORD[item.kind]}{item.status && STATUS_WORD[item.status] ? ` · ${STATUS_WORD[item.status]}` : ""}</small></li>)}</ul>
      : <SectionEmpty line="Nothing links here yet." detail={`Type [[${label}]] in a daily note, task or journal entry to connect it.`} />}
  </Section>;
}
