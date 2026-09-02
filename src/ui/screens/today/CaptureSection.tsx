import type { CaptureItem } from "../../../domain/common/types";
import type { CaptureDateSuggestion } from "../../../domain/capture/types";
import { ConfirmBanner } from "../../components/ConfirmBanner";

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
  conversionTitle,
  setConversionTitle,
  conversionDueAt,
  setConversionDueAt,
  conversionDateSuggestion,
  onRequestConversion,
  onCancelConversion,
  onConfirmConversion,
  onResolve,
}: {
  item: CaptureItem;
  busy: boolean;
  captureConversion: { id: string; text: string } | null;
  conversionTitle: string;
  setConversionTitle: (title: string) => void;
  conversionDueAt: string;
  setConversionDueAt: (dueAt: string) => void;
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
            {converting ? "CANCEL" : "→ OBLIGATION"}
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
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
          <input
            type="text"
            className="input"
            aria-label="New obligation title"
            style={{ marginBottom: 8 }}
            value={conversionTitle}
            disabled={busy}
            onChange={(e) => setConversionTitle(e.target.value)}
          />
          <label className="meta" style={{ display: "block", marginBottom: 4 }} htmlFor={`capture-due-${item.id}`}>
            DUE (OPTIONAL)
          </label>
          <input
            id={`capture-due-${item.id}`}
            type="date"
            className="input"
            aria-label="Due date"
            style={{ marginBottom: 4 }}
            value={conversionDueAt}
            disabled={busy}
            onChange={(e) => setConversionDueAt(e.target.value)}
          />
          {conversionDateSuggestion && conversionDateSuggestion.dueAt === conversionDueAt && (
            <p className="meta" style={{ marginBottom: 8 }}>
              {conversionDateSuggestion.confidence === "STRONG" ? "Detected" : "Possibly detected"} from “
              {conversionDateSuggestion.matchedText}” — clear the date above if this isn't right.
            </p>
          )}
          <button
            className="btn-primary"
            style={{ width: "100%" }}
            disabled={busy || !conversionTitle.trim()}
            onClick={onConfirmConversion}
          >
            CREATE OBLIGATION
          </button>
        </div>
      )}
    </div>
  );
}

export function CaptureToolsCard({
  openCaptureItems,
  captureInAttention,
  captureText,
  setCaptureText,
  busy,
  onCapture,
  justResolvedCapture,
  onUndoResolve,
  captureConversion,
  conversionTitle,
  setConversionTitle,
  conversionDueAt,
  setConversionDueAt,
  conversionDateSuggestion,
  onRequestConversion,
  onCancelConversion,
  onConfirmConversion,
  onResolve,
}: {
  openCaptureItems: CaptureItem[];
  captureInAttention: boolean;
  captureText: string;
  setCaptureText: (text: string) => void;
  busy: boolean;
  onCapture: () => void;
  justResolvedCapture: { id: string; text: string } | null;
  onUndoResolve: () => void;
  captureConversion: { id: string; text: string } | null;
  conversionTitle: string;
  setConversionTitle: (title: string) => void;
  conversionDueAt: string;
  setConversionDueAt: (dueAt: string) => void;
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
      <p className="meta" style={{ marginBottom: 8 }}>
        Jot something down now. Where it belongs is a decision for later, not now.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: showListHere ? 12 : 0 }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1 }}
          placeholder="Capture a thought..."
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
      {showListHere && (
        <>
          {openCaptureItems.map((item) => (
            <CaptureListRow
              key={item.id}
              item={item}
              busy={busy}
              captureConversion={captureConversion}
              conversionTitle={conversionTitle}
              setConversionTitle={setConversionTitle}
              conversionDueAt={conversionDueAt}
              setConversionDueAt={setConversionDueAt}
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
