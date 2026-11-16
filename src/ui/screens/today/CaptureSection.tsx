import { Signal } from "../../components/Signal";
import type { CaptureItem } from "../../../domain/common/types";
import type { CaptureDateSuggestion } from "../../../domain/capture/types";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { CapturePromotionForm, type CapturePromotionDraft } from "../../components/CapturePromotionForm";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former `renderCaptureListRow`/`renderCaptureToolsCard`
 * closures. CaptureListRow is used both here (TOOLS-tier) and directly by
 * TodayScreen for the ATTENTION-tier capture list — same component either
 * way, matching the pre-extraction "hand-copied markup, now shared"
 * history this row already had (see its original doc comment, preserved
 * in git history).
 */
export function CaptureListRow({
  item,
  busy,
  captureConversion,
  conversionDraft,
  setConversionDraft,
  conversionDateSuggestion,
  onRequestConversion,
  onCancelConversion,
  onConfirmConversion,
  onResolve,
}: {
  item: CaptureItem;
  busy: boolean;
  captureConversion: { id: string; text: string } | null;
  conversionDraft: CapturePromotionDraft;
  setConversionDraft: (draft: CapturePromotionDraft) => void;
  conversionDateSuggestion: CaptureDateSuggestion | null;
  onRequestConversion: (item: CaptureItem) => void;
  onCancelConversion: () => void;
  onConfirmConversion: () => void;
  onResolve: (item: CaptureItem) => void;
}) {
  const converting = captureConversion?.id === item.id;
  return (
    <div key={item.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span className="card-body" style={{ margin: 0 }}>{item.text}</span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            className="btn-secondary"
            style={{ width: "auto", padding: "6px 10px", fontSize: 16 }}
            disabled={busy}
            onClick={() => (converting ? onCancelConversion() : onRequestConversion(item))}
          >
            {converting ? "CANCEL" : "→ TASK"}
          </button>
          <button
            className="btn-secondary"
            style={{ width: "auto", padding: "6px 12px", fontSize: 16 }}
            disabled={busy}
            onClick={() => onResolve(item)}
          >
            RESOLVE
          </button>
        </div>
      </div>
      {converting && (
        <div style={{ marginTop: 8 }}>
          {/* CAPTURE-PARITY-001: the same confirm-first form quick capture uses; the row's own CANCEL closes it. */}
          <CapturePromotionForm
            draft={conversionDraft}
            onChange={setConversionDraft}
            busy={busy}
            onConfirm={onConfirmConversion}
            dueHint={
              conversionDateSuggestion && conversionDateSuggestion.dueAt === conversionDraft.dueAt ? (
                <p className="meta">
                  {conversionDateSuggestion.confidence === "STRONG" ? "Detected" : "Possibly detected"} from “
                  {conversionDateSuggestion.matchedText}” — clear the due date above if this isn't right.
                </p>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

export function CaptureToolsCard({
  openCaptureItems,
  captureInAttention,
  captureText,
  feedback,
  setCaptureText,
  busy,
  onCapture,
  justResolvedCapture,
  onUndoResolve,
  captureConversion,
  conversionDraft,
  setConversionDraft,
  conversionDateSuggestion,
  onRequestConversion,
  onCancelConversion,
  onConfirmConversion,
  onResolve,
}: {
  openCaptureItems: CaptureItem[];
  captureInAttention: boolean;
  captureText: string;
  feedback?: { kind: "SUCCESS" | "ERROR"; message: string } | null;
  setCaptureText: (text: string) => void;
  busy: boolean;
  onCapture: () => void;
  justResolvedCapture: { id: string; text: string } | null;
  onUndoResolve: () => void;
  captureConversion: { id: string; text: string } | null;
  conversionDraft: CapturePromotionDraft;
  setConversionDraft: (draft: CapturePromotionDraft) => void;
  conversionDateSuggestion: CaptureDateSuggestion | null;
  onRequestConversion: (item: CaptureItem) => void;
  onCancelConversion: () => void;
  onConfirmConversion: () => void;
  onResolve: (item: CaptureItem) => void;
}) {
  const hasOpenItems = openCaptureItems.length > 0;
  const showListHere = hasOpenItems && !captureInAttention;
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>
        CAPTURE{hasOpenItems ? ` (${openCaptureItems.length})` : ""}
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: showListHere ? 12 : 0 }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1 }}
          placeholder="Capture a thought..."
          aria-label="Capture a thought"
          value={captureText}
          disabled={busy}
          onChange={(e) => setCaptureText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCapture();
          }}
        />
        <button
          className="btn-secondary"
          style={{ width: "auto", padding: "8px 16px" }}
          disabled={busy || !captureText.trim()}
          onClick={onCapture}
        >
          CAPTURE
        </button>
      </div>
      {feedback && <p className="meta" role={feedback.kind === "ERROR" ? "alert" : "status"}>{feedback.kind === "ERROR" ? <Signal key={feedback.message} data-signal="save-failed">{feedback.message}</Signal> : feedback.message}</p>}
      {showListHere && (
        <>
          {openCaptureItems.map((item) => (
            <CaptureListRow
              key={item.id}
              item={item}
              busy={busy}
              captureConversion={captureConversion}
              conversionDraft={conversionDraft}
              setConversionDraft={setConversionDraft}
              conversionDateSuggestion={conversionDateSuggestion}
              onRequestConversion={onRequestConversion}
              onCancelConversion={onCancelConversion}
              onConfirmConversion={onConfirmConversion}
              onResolve={onResolve}
            />
          ))}
          {justResolvedCapture && (
            <ConfirmBanner
              message={`Resolved "${justResolvedCapture.text}"`}
              actionLabel="UNDO"
              onAction={onUndoResolve}
              disabled={busy}
              divider
            />
          )}
        </>
      )}
    </div>
  );
}
