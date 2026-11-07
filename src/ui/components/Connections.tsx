import { useEffect, useState } from "react";
import { getConnections, getUnlinkedMentions, type Connection, type ConnectionKind, type UnlinkedMention } from "../../application/connectionQueries";
import { linkMentionInDailyNote } from "../../application/dailyNoteCommands";
import type { SectionRead } from "../../application/sectionRead";
import { Section, SectionEmpty, SectionUnavailable } from "./Section";
import { openRecord } from "../openRecordEvent";

/** Open and active items need no word; finished ones say how they ended. */
const STATUS_WORD: Record<string, string> = { WAITING: "Waiting", SATISFIED: "Done", RELEASED: "Let go", PAUSED: "Paused", COMPLETED: "Done", CLOSED: "Closed" };
const KIND_WORD: Record<ConnectionKind, string> = { DAY: "Daily note", JOURNAL: "Decision journal", HIGHLIGHT: "Highlight", TASK: "Task", PROJECT: "Project" };

/** CONNECT-001: what links here. Read-only; reflects only [[links]] the operator wrote. */
export function Connections({ id, label, self, refreshKey = 0 }: { id: string; label: string; self?: { kind: ConnectionKind; id: string }; refreshKey?: number }) {
  const [read, setRead] = useState<SectionRead<Connection[]> | null>(null);
  const [unlinked, setUnlinked] = useState<UnlinkedMention[]>([]);
  const [linkKey, setLinkKey] = useState(0);
  const [linkError, setLinkError] = useState<string | null>(null);
  useEffect(() => {
    let current = true; setRead(null);
    void getConnections(label, self).then((next) => { if (current) setRead(next); });
    void getUnlinkedMentions(label).then((next) => { if (current) setUnlinked(next); }).catch(() => { if (current) setUnlinked([]); });
    return () => { current = false; };
  }, [label, self?.kind, self?.id, refreshKey, linkKey]);
  return <Section id={id} eyebrow="CONNECTIONS" title={`Linked to ${label}`} className="bx-connections">
    {!read ? <p className="meta" role="status">Reading links…</p>
      : read.state === "unavailable" ? <SectionUnavailable>Links could not be read. Try again in a moment.</SectionUnavailable>
      : read.value.length ? <ul className="bx-connection-list">{read.value.map((item) => <li key={`${item.kind}:${item.id}`}><button type="button" className="bx-connection" aria-label={`Open ${KIND_WORD[item.kind].toLowerCase()}: ${item.label}`} onClick={() => openRecord({ kind: item.kind, id: item.id })}><span>{item.label}</span><small>{KIND_WORD[item.kind]}{item.status && STATUS_WORD[item.status] ? ` · ${STATUS_WORD[item.status]}` : ""}</small></button></li>)}</ul>
      : <SectionEmpty line="Nothing links here yet." detail={`Type [[${label}]] in a daily note, task or journal entry to connect it.`} />}
    {/* UNLINKED-001: plain-word mentions, suggested only; LINK is one tap through the daily-note save. */}
    {unlinked.length > 0 && <details className="bx-unlinked"><summary>Mentioned without a link ({unlinked.length})</summary>
      <ul className="bx-connection-list">{unlinked.map((item) => <li key={item.dayId} className="plan-shutdown-row"><span>“…{item.excerpt}…”<small> {item.date}</small></span>
        <button type="button" className="btn-secondary" aria-label={`Link ${label} in the note from ${item.date}`} onClick={() => { setLinkError(null); void linkMentionInDailyNote(item.dayId, label).then(() => setLinkKey((n) => n + 1), () => setLinkError("That note didn't change. Nothing was saved.")); }}>LINK</button></li>)}</ul>
      {linkError && <p role="alert">{linkError}</p>}
    </details>}
  </Section>;
}
