import { useEffect, useState } from "react";
import { CLOSE_PROMPTS, MAX_CLOSE_PROMPTS, closeNoteText, getDayClose, saveCloseNote, type ClosePromptId } from "../../../application/dayClose";
import { closeDone, markCloseDone, readClosePrompts, writeClosePrompts } from "./closeStore";

/**
 * GRAYSON C1.3 + C1.4 (Gavin, 2026-11-20): after SHIFT DOWN, a quiet, optional close. What's next when it differs,
 * up to two short prompts he picked once, SAVE TO NOTE or SKIP. Nothing is written unless he saves; the answers land
 * in that day's Daily Note as a #close block. No red: it never competes with the day's real next step.
 */
export function CloseCard({ dayId, busy, onClosed }: { dayId: string; busy: boolean; onClosed: () => void }) {
  const [view, setView] = useState<{ label: string; next: string | null } | null>(null);
  const [prompts, setPrompts] = useState<ClosePromptId[]>(() => readClosePrompts());
  const [answers, setAnswers] = useState<Partial<Record<ClosePromptId, string>>>({});
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getDayClose().then((c) => { if (!cancelled && c && c.dayId === dayId) setView({ label: c.label, next: c.next }); }, () => { if (!cancelled) setView({ label: "", next: null }); });
    return () => { cancelled = true; };
  }, [dayId]);

  if (closeDone(dayId)) return null;
  const finish = () => { markCloseDone(dayId); onClosed(); };
  const save = async () => {
    if (saving) return;
    const block = closeNoteText(view?.label ?? "", prompts.map((id) => ({ prompt: CLOSE_PROMPTS[id], answer: answers[id] ?? "" })));
    if (!block) { finish(); return; }
    setSaving(true); setError(null);
    try { await saveCloseNote(dayId, block); finish(); }
    catch { setError("The note didn't save. Your answers are still here; try again."); }
    finally { setSaving(false); }
  };
  const toggle = (id: ClosePromptId) => {
    const next = prompts.includes(id) ? prompts.filter((p) => p !== id) : [...prompts, id].slice(-MAX_CLOSE_PROMPTS);
    if (next.length === 0) return;
    setPrompts(next); writeClosePrompts(next);
  };

  return (
    <section className="today-close" aria-label="Close the day">
      <div className="today-close__head">
        <h2 className="today-close__label">CLOSE THE DAY</h2>
        <span className="today-close__hint">Under a minute. Skip anytime.</span>
      </div>
      {view?.next && <p className="today-close__next">{view.next}</p>}
      {choosing ? (
        <fieldset className="today-close__choose">
          <legend>Pick up to two questions. They stay until you change them.</legend>
          {(Object.keys(CLOSE_PROMPTS) as ClosePromptId[]).map((id) => (
            <label key={id}><input type="checkbox" checked={prompts.includes(id)} onChange={() => toggle(id)} /> {CLOSE_PROMPTS[id]}</label>
          ))}
          <button type="button" className="btn-secondary" onClick={() => setChoosing(false)}>DONE</button>
        </fieldset>
      ) : prompts.map((id) => (
        <label key={id} className="today-close__field">
          <span>{CLOSE_PROMPTS[id]}</span>
          <textarea id={`close-${id}`} rows={2} maxLength={1000} value={answers[id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [id]: e.target.value }))} />
        </label>
      ))}
      {error && <p role="alert" className="meta">{error}</p>}
      {!choosing && <div className="today-close__acts">
        <button type="button" className="btn-secondary" disabled={busy || saving} onClick={() => void save()}>SAVE TO NOTE</button>
        <button type="button" className="btn-secondary" disabled={saving} onClick={finish}>SKIP</button>
        <button type="button" className="today-close__change" onClick={() => setChoosing(true)}>CHANGE QUESTIONS</button>
      </div>}
    </section>
  );
}
