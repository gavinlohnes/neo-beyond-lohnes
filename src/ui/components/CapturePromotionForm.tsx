import type { ReactNode, Ref } from "react";
import { describeError } from "../errorMessage";
import "./capturePromotion.css";

/**
 * CAPTURE-PARITY-001: the one confirm-first "turn this capture into a task"
 * form. Quick capture (FastCapture), the older Capture list (CaptureSection)
 * and Notes Sweep all render this, so an old capture processed later offers
 * the same optional title, planned day and due date as a thought promoted
 * the moment it was saved. Only the primary button writes, through the
 * existing atomic `convertCaptureToObligation`; nothing here infers a date.
 */
export interface CapturePromotionDraft {
  title: string;
  plannedAt: string;
  dueAt: string;
}

export function emptyCapturePromotionDraft(title = ""): CapturePromotionDraft {
  return { title, plannedAt: "", dueAt: "" };
}

/** The exact input quick capture sends: a trimmed title and only the dates the operator chose. */
export function capturePromotionInput(draft: CapturePromotionDraft): { title: string; plannedAt?: string; dueAt?: string } {
  const plannedAt = draft.plannedAt.trim();
  const dueAt = draft.dueAt.trim();
  return { title: draft.title.trim(), ...(plannedAt ? { plannedAt } : {}), ...(dueAt ? { dueAt } : {}) };
}

export function canConfirmCapturePromotion(draft: CapturePromotionDraft): boolean {
  return draft.title.trim().length > 0;
}

export function capturePromotionConfirmLabel(draft: CapturePromotionDraft): "CREATE PLAN ITEM" | "CREATE TASK" {
  return draft.plannedAt.trim() ? "CREATE PLAN ITEM" : "CREATE TASK";
}

/** Success copy shared by every path; a planned day never silently becomes a deadline. */
export function capturePromotionSuccess(draft: CapturePromotionDraft): string {
  return draft.plannedAt.trim()
    ? "Plan item created. Its planned day is separate from its deadline."
    : "Task created. No planned day was added.";
}

/** A capture processed or removed elsewhere is named plainly; the typed draft stays. */
export function capturePromotionError(cause: unknown, fallback: string): string {
  const message = cause instanceof Error ? cause.message : "";
  return message.startsWith("CAPTURE_NOT_OPEN") || message.startsWith("CAPTURE_NOT_FOUND")
    ? "This capture was already processed or removed elsewhere. Your task draft is kept; open Capture to inspect it."
    : describeError(cause, fallback);
}

export function CapturePromotionForm({
  draft,
  onChange,
  busy,
  onConfirm,
  onCancel,
  cancelLabel = "KEEP RAW",
  titleRef,
  dueHint,
  className,
}: {
  draft: CapturePromotionDraft;
  onChange: (draft: CapturePromotionDraft) => void;
  busy: boolean;
  onConfirm: () => void;
  /** Omitted where the surrounding row already offers its own CANCEL. */
  onCancel?: () => void;
  cancelLabel?: string;
  titleRef?: Ref<HTMLTextAreaElement>;
  /** Evidence for a proposed due date (the older Capture list's detected-date line). */
  dueHint?: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={["capture-promotion", className].filter(Boolean).join(" ")} disabled={busy}>
      <legend className="tool-label">OPTIONAL · CREATE A TASK OR PLAN ITEM</legend>
      <p className="meta">Only this confirmation creates a task. Your original capture stays in history.</p>
      <label className="field">
        Task title
        <textarea ref={titleRef} className="input" aria-label="Task title" rows={2} value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} />
      </label>
      <label className="field">
        Planned day (optional)
        <input className="input" type="date" aria-label="Planned day (optional)" value={draft.plannedAt} onChange={(e) => onChange({ ...draft, plannedAt: e.target.value })} />
      </label>
      <label className="field">
        Due date (optional)
        <input className="input" type="date" aria-label="Due date (optional)" value={draft.dueAt} onChange={(e) => onChange({ ...draft, dueAt: e.target.value })} />
      </label>
      {dueHint}
      <button type="button" className="btn-primary" disabled={busy || !canConfirmCapturePromotion(draft)} onClick={onConfirm}>
        {capturePromotionConfirmLabel(draft)}
      </button>
      {onCancel && (
        <button type="button" className="btn-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
      )}
    </fieldset>
  );
}
