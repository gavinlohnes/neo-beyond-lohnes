import { useEffect, useState } from "react";
import { saveDailyNote } from "../../../application/dailyNoteCommands";
import { getDailyNoteWorkspace } from "../../../application/dailyNoteQueries";
import { WikiTextArea } from "../../components/WikiTextArea";
import { describeError } from "../../errorMessage";

type Workspace = NonNullable<Awaited<ReturnType<typeof getDailyNoteWorkspace>>>;

export function DailyNoteScreen({ active }: { active: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [draft, setDraft] = useState("");
  const [savedText, setSavedText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!active) return;
    void getDailyNoteWorkspace().then((next) => {
      setWorkspace(next);
      if (!next) return;
      const stored = next.note?.text ?? "";
      setSavedText(stored); setDraft(sessionStorage.getItem(`beyond.daily-note.draft.${next.day.id}`) ?? stored);
    });
  }, [active]);
  useEffect(() => {
    if (workspace && draft !== savedText) sessionStorage.setItem(`beyond.daily-note.draft.${workspace.day.id}`, draft);
  }, [draft, savedText, workspace]);
  if (!workspace) return <section className="daily-note-screen"><p className="meta">Start a lived day to open its daily note.</p></section>;
  const dirty = draft !== savedText;
  return <section className="daily-note-screen" aria-label="Daily note">
    <p className="tool-label">LIVED DAY · {workspace.day.startedAt.slice(0, 10)}</p><h2>Daily note</h2>
    <section className="daily-note-log" aria-label="Recorded day"><p className="section-label">Recorded today</p>
      {workspace.logs.length ? <ol>{workspace.logs.map((log) => <li key={log.id}><span>{log.label}</span><time dateTime={log.at}>{new Date(log.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></li>)}</ol> : <p className="meta">No recorded actions yet.</p>}
    </section>
    <WikiTextArea label="Your note" value={draft} onChange={(next) => { setDraft(next); setMessage(""); }} />
    <div className="button-row"><button type="button" className="btn-primary" disabled={!dirty || !draft.trim()} onClick={() => {
      setError(""); setMessage(""); void saveDailyNote(workspace.day.id, draft).then((note) => {
        setDraft(note.text); setSavedText(note.text); sessionStorage.removeItem(`beyond.daily-note.draft.${workspace.day.id}`); setMessage("Daily note saved.");
      }, (cause) => setError(describeError(cause, "Daily note could not be saved.")));
    }}>SAVE NOTE</button>{dirty && <span className="meta">Draft stays on this phone until SAVE.</span>}</div>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
