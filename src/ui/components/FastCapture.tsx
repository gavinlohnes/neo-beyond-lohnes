import { useRef, useState } from "react";
import type { CaptureItem } from "../../domain/common/types";
import { captureItem } from "../../application/commands";
import { convertCaptureToObligation } from "../../application/intentCommands";
import { captureCommitFeedback } from "../feel/feedback";
import { describeError } from "../errorMessage";
import { useSessionDraft } from "../sessionDrafts";
import { CapturePromotionForm, capturePromotionError, capturePromotionInput, capturePromotionSuccess, emptyCapturePromotionDraft, type CapturePromotionDraft } from "./CapturePromotionForm";
import "./fastCapture.css";

/** Raw capture and deliberate promotion use the same canonical commands as Capture tools. */
export function FastCapture({ busy, onBusy, onSaved, onOpenCapture }: {
  busy: boolean; onBusy: (busy: boolean) => void; onSaved: () => void; onOpenCapture: () => void;
}) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<CaptureItem | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [draft, setDraft] = useState<CapturePromotionDraft>(emptyCapturePromotionDraft());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [promoted, setPromoted] = useState(false);
  const lock = useRef(false), input = useRef<HTMLTextAreaElement>(null), taskTitle = useRef<HTMLTextAreaElement>(null);
  useSessionDraft("record-sheet-note", Boolean(text || promoting));
  function notifySaved() {
    try { onSaved(); }
    catch { setMessage("Saved. The surrounding view could not refresh; close and reopen it to read the latest records."); }
  }
  async function saveRaw() {
    if (lock.current || busy || !text.trim()) return;
    lock.current = true; onBusy(true); setError(null); setMessage(null);
    const acknowledge = captureCommitFeedback();
    try {
      const item = await captureItem(text);
      setSaved(item); setText(""); setPromoted(false);
      setMessage("Captured. It can stay raw; nothing else is required."); acknowledge("LIGHT"); notifySaved();
    } catch (cause) { setError(describeError(cause, "Could not capture this thought. Your text is kept.")); }
    finally { lock.current = false; onBusy(false); requestAnimationFrame(() => { if (input.current?.getClientRects().length) input.current.focus(); }); }
  }
  async function promote() {
    if (lock.current || busy || !saved || !draft.title.trim() || promoted) return;
    lock.current = true; onBusy(true); setError(null); setMessage(null);
    const acknowledge = captureCommitFeedback();
    try {
      await convertCaptureToObligation(saved.id, capturePromotionInput(draft));
      setPromoted(true); setPromoting(false); setDraft(emptyCapturePromotionDraft());
      setMessage(capturePromotionSuccess(draft));
      acknowledge("LIGHT"); notifySaved();
      requestAnimationFrame(() => input.current?.focus());
    } catch (cause) {
      setError(capturePromotionError(cause, "Could not create the task. Your raw capture and choices are kept."));
    } finally { lock.current = false; onBusy(false); }
  }
  function startPromotion() {
    if (!saved || busy || lock.current || promoted) return;
    setDraft(emptyCapturePromotionDraft(saved.text)); setError(null); setPromoting(true);
    requestAnimationFrame(() => taskTitle.current?.focus());
  }
  function keepRaw() {
    if (busy || lock.current) return;
    setPromoting(false); setDraft(emptyCapturePromotionDraft()); setError(null);
    requestAnimationFrame(() => input.current?.focus());
  }
  return <div className="fast-capture">
    {!promoting && <>
      <label className="field">Capture a thought<textarea ref={input} className="input" aria-label="Capture a thought" rows={4} value={text} disabled={busy} placeholder="Get it down. Decide what it means later." onChange={(e) => setText(e.target.value)} /></label>
      <p className="meta">Raw by default. No destination, type or date needed.</p>
      <button type="button" className="btn-primary" disabled={busy || !text.trim()} onClick={() => void saveRaw()}>CAPTURE</button>
    </>}
    {message && <p role="status" className="fast-capture__message">{message}</p>}
    {saved && <div className="fast-capture__saved">
      <p className="tool-label">{promoted ? "ORIGINAL CAPTURE" : "SAVED RAW"}</p>
      <p className="card-body fast-capture__text">{saved.text}</p>
      {!promoting && !promoted && <button type="button" className="btn-secondary" disabled={busy} onClick={startPromotion}>MAKE A TASK</button>}
    </div>}
    {promoting && <CapturePromotionForm draft={draft} onChange={setDraft} busy={busy} titleRef={taskTitle} onConfirm={() => void promote()} onCancel={keepRaw} />}
    {error && <p role="alert">{error}</p>}
    <button type="button" className="text-button fast-capture__open" disabled={busy} onClick={onOpenCapture}>OPEN CAPTURE</button>
  </div>;
}
