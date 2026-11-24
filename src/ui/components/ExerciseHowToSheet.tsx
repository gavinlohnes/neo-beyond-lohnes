import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { effectiveHowTo, isHttpsUrl, resetHowTo, writeHowToEdit } from "../screens/train/exerciseHowToStore";
import "./exerciseHowTo.css";

/**
 * GRAYSON-TRAIN-HOWTO-001 (Gavin, 2026-11-24): "how do I do this?" for any library exercise, offline, with one tap
 * out to a free ACE demonstration. Opens over the library or the live workout (rest keeps counting behind it).
 * EDIT changes the setup, cues, mistakes and link for this exercise; his version wins; RESET brings the bundled text
 * back. A sheet he opens: nothing appears unasked.
 */
export function ExerciseHowToSheet({ exerciseId, name, onClose }: { exerciseId: string; name: string; onClose: () => void }) {
  const [version, setVersion] = useState(0);
  const guide = effectiveHowTo(exerciseId);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const titleId = `howto-${exerciseId}`;
  // The caller re-renders often (TRAIN's rest tick); the open/close effect must run once, not on every new onClose.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    // Escape closes even when focus has fallen to <body> (a button that just disappeared, like RESET).
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !root.current?.contains(event.target as Node)) closeRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, []);

  function containFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...(root.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), summary') ?? [])];
    if (!focusable.length) return;
    const first = focusable[0]!, last = focusable.at(-1)!;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  // A portal to <body>: TRAIN's live view sits inside transformed containers, which would trap a fixed overlay.
  return createPortal(<div ref={root} tabIndex={-1} className="howto-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={containFocus} data-howto-sheet data-version={version}>
    <header className="howto-sheet__head">
      <div><p className="tool-label">HOW TO</p><h2 id={titleId}>{name}</h2></div>
      <button type="button" className="btn-secondary howto-sheet__close" onClick={onClose}>CLOSE</button>
    </header>
    {!guide ? <section className="howto-sheet__body"><p>Your own exercise: its note is the guide. Library exercises have a full how-to.</p></section>
      : editing ? <HowToEditor exerciseId={exerciseId} guide={guide}
          onDone={(text) => { setEditing(false); setNotice(text); setVersion((n) => n + 1); }} onCancel={() => setEditing(false)} />
      : <section className="howto-sheet__body">
          <p className="meta-strong">{guide.role}{guide.edited ? " · your version" : ""}</p>
          {notice && <p className="meta" role="status">{notice}</p>}
          <h3>Setup</h3>
          <p>{guide.setup}</p>
          <h3>Cues</h3>
          <ol className="howto-sheet__list">{guide.cues.map((c) => <li key={c}>{c}</li>)}</ol>
          <h3>Common mistakes</h3>
          <ul className="howto-sheet__list">{guide.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
          <h3>Alternative</h3>
          <p>{guide.alternatives}</p>
          <div className="howto-sheet__acts">
            {guide.videoUrl
              ? <a className="btn-primary howto-sheet__watch" href={guide.videoUrl} target="_blank" rel="noopener noreferrer">
                  {guide.bundledVideo ? "WATCH ON ACE" : "WATCH"}<span className="visually-hidden"> (opens in a new tab, needs internet)</span></a>
              : <p className="meta">No video link for this one yet. EDIT to add one.</p>}
            <button type="button" className="btn-secondary" onClick={() => { setNotice(null); setEditing(true); }}>EDIT</button>
            {guide.edited && <button type="button" className="btn-secondary" onClick={() => {
              setNotice(resetHowTo(exerciseId) ? "Back to the original guide." : "Couldn't reset on this device.");
              setVersion((n) => n + 1);
              root.current?.focus();
            }}>RESET</button>}
          </div>
          {guide.bundledVideo && <p className="meta">Video on the American Council on Exercise's free library. Opens in your browser.</p>}
        </section>}
  </div>, document.body);
}

function HowToEditor({ exerciseId, guide, onDone, onCancel }: {
  exerciseId: string;
  guide: { setup: string; cues: string[]; mistakes: string[]; videoUrl?: string };
  onDone: (text: string) => void;
  onCancel: () => void;
}) {
  const [setup, setSetup] = useState(guide.setup);
  const [cues, setCues] = useState<string[]>([0, 1, 2].map((i) => guide.cues[i] ?? ""));
  const [mistakes, setMistakes] = useState<string[]>([0, 1].map((i) => guide.mistakes[i] ?? ""));
  const [videoUrl, setVideoUrl] = useState(guide.videoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { first.current?.focus(); }, []);

  const save = () => {
    if (!setup.trim()) { setError("Setup can't be empty."); return; }
    if (cues.filter((c) => c.trim()).length === 0) { setError("Keep at least one cue."); return; }
    if (videoUrl.trim() && !isHttpsUrl(videoUrl.trim())) { setError("The link needs to start with https://, or leave it empty for no link."); return; }
    const ok = writeHowToEdit(exerciseId, { setup, cues, mistakes, videoUrl });
    if (!ok) { setError("Couldn't save on this device. Nothing changed."); return; }
    onDone("Saved as your version.");
  };

  return <section className="howto-sheet__body howto-edit" aria-label="Edit this guide">
    <label className="howto-edit__field">Setup<textarea ref={first} rows={3} value={setup} onChange={(e) => setSetup(e.target.value)} /></label>
    {cues.map((c, i) => <label key={`c${i}`} className="howto-edit__field">Cue {i + 1}<input type="text" value={c} onChange={(e) => setCues((all) => all.map((x, j) => (j === i ? e.target.value : x)))} /></label>)}
    {mistakes.map((m, i) => <label key={`m${i}`} className="howto-edit__field">Mistake {i + 1}<input type="text" value={m} onChange={(e) => setMistakes((all) => all.map((x, j) => (j === i ? e.target.value : x)))} /></label>)}
    <label className="howto-edit__field">Video link (empty for none)<input type="url" inputMode="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} /></label>
    {error && <p className="meta" role="alert">{error}</p>}
    <div className="howto-sheet__acts">
      <button type="button" className="btn-primary" onClick={save}>SAVE</button>
      <button type="button" className="btn-secondary" onClick={onCancel}>CANCEL</button>
    </div>
  </section>;
}
