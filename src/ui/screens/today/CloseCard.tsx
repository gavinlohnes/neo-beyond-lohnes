import { useNoteAsk } from "../../hooks/useNoteAsk";
import { useEffect, useState } from "react";
import { CLOSE_GAP_WEIGH_MAX, CLOSE_GAP_WEIGH_MIN, CLOSE_PROMPTS, MAX_CLOSE_PROMPTS, closeNoteText, getCloseGaps, getDayClose, saveCloseNote, type CloseGaps, type ClosePromptId } from "../../../application/dayClose";
import { askAlfred } from "../../components/AlfredSheet";
import { closeDone, markCloseDone, readCloseGapSettings, readClosePrompts, writeCloseGapSettings, writeClosePrompts } from "./closeStore";
import { readLogNudgeSettings } from "./logNudgeStore";

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
  // GRAYSON-CLOSE-GAPS-001: what didn't get logged, read when the close opens and whenever his gap settings change.
  const [gapSettings, setGapSettings] = useState(() => readCloseGapSettings());
  const [gaps, setGaps] = useState<CloseGaps | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getDayClose().then((c) => { if (!cancelled && c && c.dayId === dayId) setView({ label: c.label, next: c.next }); }, () => { if (!cancelled) setView({ label: "", next: null }); });
    return () => { cancelled = true; };
  }, [dayId]);
  useEffect(() => {
    let cancelled = false;
    void getCloseGaps(dayId, gapSettings, readLogNudgeSettings()).then((g) => { if (!cancelled) setGaps(g); }, () => { if (!cancelled) setGaps(null); });
    return () => { cancelled = true; };
  }, [dayId, gapSettings.enabled, gapSettings.weighGapDays]);

  // GRAYSON-ASKS-COUNT-001: counted when shown, once per lived day.
  useNoteAsk("TODAY", "FIELD", prompts.map((id) => `close.prompt.${id}`), !closeDone(dayId));
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
  const changeGaps = (next: typeof gapSettings) => { setGapSettings(next); writeCloseGapSettings(next); };
  const gapText = gaps?.gaps.map((g) => g.text).join(" ");

  return (
    <section className="today-close" aria-label="Close the day">
      <div className="today-close__head">
        <h2 className="today-close__label">CLOSE THE DAY</h2>
        <span className="today-close__hint">Under a minute. Skip anytime.</span>
      </div>
      {/* GRAYSON-CLOSE-GAPS-001: one muted line, no red, no counts; the tap opens Delta with the words ready, nothing sent. */}
      {gapSettings.enabled && gaps && gapText && <button type="button" className="today-close__gaps" aria-label={`${gapText} Tell Delta`}
        onClick={() => askAlfred(gaps.ask)}>{gapText} <span aria-hidden="true">TELL DELTA</span></button>}
      {view?.next && <p className="today-close__next">{view.next}</p>}
      {choosing ? (
        <fieldset className="today-close__choose">
          <legend>Pick up to two questions. They stay until you change them.</legend>
          {(Object.keys(CLOSE_PROMPTS) as ClosePromptId[]).map((id) => (
            <label key={id}><input type="checkbox" checked={prompts.includes(id)} onChange={() => toggle(id)} /> {CLOSE_PROMPTS[id]}</label>
          ))}
          <label><input type="checkbox" checked={gapSettings.enabled} onChange={() => changeGaps({ ...gapSettings, enabled: !gapSettings.enabled })} /> Tell me what's missing</label>
          {gapSettings.enabled && <label className="today-close__gapdays">Weigh-in gap, days ({CLOSE_GAP_WEIGH_MIN}–{CLOSE_GAP_WEIGH_MAX})
            <input type="number" inputMode="numeric" min={CLOSE_GAP_WEIGH_MIN} max={CLOSE_GAP_WEIGH_MAX} value={gapSettings.weighGapDays}
              onChange={(e) => { const v = Number(e.target.value); if (Number.isInteger(v) && v >= CLOSE_GAP_WEIGH_MIN && v <= CLOSE_GAP_WEIGH_MAX) changeGaps({ ...gapSettings, weighGapDays: v }); }} /></label>}
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
