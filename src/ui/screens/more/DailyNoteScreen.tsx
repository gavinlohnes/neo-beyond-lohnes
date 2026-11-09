import { useEffect, useState } from "react";
import { saveDailyNote } from "../../../application/dailyNoteCommands";
import { getDailyNoteWorkspace } from "../../../application/dailyNoteQueries";
import { WikiTextArea } from "../../components/WikiTextArea";
import { describeError } from "../../errorMessage";
import { TagPatternsSection } from "./TagPatternsSection";
import { deltaQuestion } from "../../../application/delta";
import { useDeltaKnowledge } from "../../components/DeltaViews";
import { getTagChoices, noteTags, normalizeTag, toggleNoteTag } from "../../../application/noteTags";

type Workspace = NonNullable<Awaited<ReturnType<typeof getDailyNoteWorkspace>>>;

const NOTE_TEMPLATES = {
  "WORK DAY PROMPTS": "How the shift went:\nOne thing to hand off:\nHow I'm feeling:\n",
  "DAY OFF PROMPTS": "What I did for me:\nWho I spent time with:\nOne thing for tomorrow:\n",
} as const;

function matchingTemplate(workContext: string | undefined): keyof typeof NOTE_TEMPLATES | null {
  return workContext === "WORK" ? "WORK DAY PROMPTS" : workContext === "OFF" ? "DAY OFF PROMPTS" : null;
}

export function DailyNoteScreen({ active, dayId = null }: { active: boolean; dayId?: string | null }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [draft, setDraft] = useState("");
  const [savedText, setSavedText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tagChoices, setTagChoices] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const knowledge = useDeltaKnowledge(active);
  useEffect(() => { if (active) void getTagChoices().then(setTagChoices).catch(() => {}); }, [active]);
  useEffect(() => {
    if (!active) return;
    void getDailyNoteWorkspace(dayId ?? undefined).then((next) => {
      setWorkspace(next);
      if (!next) return;
      const stored = next.note?.text ?? "";
      setSavedText(stored); setDraft(sessionStorage.getItem(`beyond.daily-note.draft.${next.day.id}`) ?? stored);
    });
  }, [active, dayId]);
  useEffect(() => {
    if (!workspace) return;
    const key = `beyond.daily-note.draft.${workspace.day.id}`;
    if (draft !== savedText) sessionStorage.setItem(key, draft);
    else sessionStorage.removeItem(key);
  }, [draft, savedText, workspace]);
  if (!workspace) return <section className="daily-note-screen"><p className="meta">Start a lived day to open its daily note.</p></section>;
  const dirty = draft !== savedText;
  return <section className="daily-note-screen" aria-label="Daily note">
    <p className="tool-label">LIVED DAY · {workspace.day.startedAt.slice(0, 10)}</p><h2>Daily note</h2>
    <section className="daily-note-log" aria-label="Recorded day"><p className="section-label">Recorded today</p>
      {workspace.logs.length ? <ol>{workspace.logs.map((log) => <li key={log.id}><span>{log.label}</span><time dateTime={log.at}>{new Date(log.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></li>)}</ol> : <p className="meta">No recorded actions yet.</p>}
    </section>
    {/* NOTE-TEMPLATES-001 (APPS-PICKS-003 pick 12, after Obsidian templates): prompts, only while the note is empty. */}
    {/* JOURNAL-LEARN-001: today's kind of day comes first, so the prompts that fit are one tap away. */}
    {!draft.trim() && <div className="button-row" role="group" aria-label="Start from prompts">
      {(Object.keys(NOTE_TEMPLATES) as (keyof typeof NOTE_TEMPLATES)[]).sort((a, b) => Number(b === matchingTemplate(workspace.day.workContext)) - Number(a === matchingTemplate(workspace.day.workContext))).map((key) => <button type="button" key={key} className={key === matchingTemplate(workspace.day.workContext) ? "btn-primary" : "btn-secondary"} onClick={() => setDraft(NOTE_TEMPLATES[key])}>{key}</button>)}
    </div>}
    {/* DELTA-GROWS-001: one question a day, aimed at what DELTA knows least. Answering goes into the note. */}
    {knowledge && knowledge !== "ERROR" && (() => { const q = deltaQuestion(knowledge, workspace.day.workContext); return <div className="delta-question" role="group" aria-label="DELTA's question">
      <p className="card-body" style={{ margin: 0 }}><span className="tool-label">DELTA ASKS · </span>{q.text}</p>
      <p className="meta" style={{ margin: "2px 0 6px" }}>Answering teaches me {q.teaches}.</p>
      {/* DELTA-NEXT 7: answer in one tap, or write it out. Either only drafts; SAVE NOTE saves. */}
      {!draft.includes(q.text) && <div className="button-row">
        {(["Rough", "OK", "Good"] as const).map((word) => <button type="button" key={word} className="btn-secondary" onClick={() => { const line = `${q.text} ${word}.`; setDraft(draft.trim() ? `${draft.trimEnd()}\n\n${line}\n` : `${line}\n`); setMessage(""); }}>{word.toUpperCase()}</button>)}
        <button type="button" className="btn-secondary" onClick={() => { setDraft(draft.trim() ? `${draft.trimEnd()}\n\n${q.text}\n` : `${q.text}\n`); setMessage(""); }}>ANSWER IN NOTE</button>
      </div>}
    </div>; })()}
    <WikiTextArea label="Your note" value={draft} onChange={(next) => { setDraft(next); setMessage(""); }} />
    {/* JOURNAL-LEARN-001: one-tap #tags, written into the note as words. BEYOND compares tagged days later. */}
    <div className="daily-note-tags" role="group" aria-label="Tags for today">
      <p className="meta" style={{ margin: "8px 0 4px" }}>Tag today. After a few days, BEYOND shows what each tag lines up with.</p>
      <div className="button-row">
        {[...new Set([...noteTags(draft), ...tagChoices])].slice(0, 12).map((tag) => {
          const on = noteTags(draft).includes(tag);
          return <button type="button" key={tag} className={on ? "btn-primary" : "btn-secondary"} aria-pressed={on} onClick={() => { setDraft(toggleNoteTag(draft, tag)); setMessage(""); }}>#{tag}</button>;
        })}
      </div>
      <form className="button-row" onSubmit={(e) => { e.preventDefault(); const tag = normalizeTag(newTag); if (!tag) return; if (!noteTags(draft).includes(tag)) setDraft(toggleNoteTag(draft, tag)); setNewTag(""); }}>
        <input className="input" aria-label="Your own tag" placeholder="your own tag" value={newTag} onChange={(e) => setNewTag(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
        <button type="submit" className="btn-secondary" disabled={!normalizeTag(newTag)}>ADD TAG</button>
      </form>
    </div>
    <div className="button-row"><button type="button" className="btn-primary" disabled={!dirty || !draft.trim()} onClick={() => {
      setError(""); setMessage(""); void saveDailyNote(workspace.day.id, draft).then((note) => {
        setDraft(note.text); setSavedText(note.text); sessionStorage.removeItem(`beyond.daily-note.draft.${workspace.day.id}`); setMessage("Daily note saved.");
      }, (cause) => setError(describeError(cause, "Daily note could not be saved.")));
    }}>SAVE NOTE</button>{dirty && <span className="meta">Draft stays on this phone until SAVE.</span>}</div>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    <details className="more-inspection"><summary>What your tags line up with</summary><TagPatternsSection active={active} /></details>
  </section>;
}
