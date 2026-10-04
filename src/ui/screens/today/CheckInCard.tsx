import type { StateCheckIn } from "../../../domain/common/types";
import type { CheckInDraft } from "../../../engine/checkInDraft";
import { useRevealOnOpen } from "../../hooks/useRevealOnOpen";
import {
  CHECK_IN_FIELDS,
  describeCheckInValues,
  isCheckInComplete,
  rangeForField,
  type CheckInValues,
  type PartialCheckInValues,
} from "./checkInFields";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former inline STATE INPUT JSX block. The
 * "does this section render at all" gate (`!checkInInAttention ||
 * checkInFormOpen`) stays in TodayScreen, same as before — this
 * component only owns the summary-vs-form content it always owned.
 */
export function CheckInCard({
  busy,
  checkIn,
  checkInFormOpen,
  setCheckInFormOpen,
  values,
  setValues,
  quickCheckInValues,
  onQuickCheckIn,
  onSubmitCheckIn,
  draft,
  onStartBlank,
}: {
  busy: boolean;
  checkIn: StateCheckIn | null;
  checkInFormOpen: boolean;
  setCheckInFormOpen: (open: boolean) => void;
  values: PartialCheckInValues;
  setValues: (updater: (values: PartialCheckInValues) => PartialCheckInValues) => void;
  quickCheckInValues: CheckInValues;
  onQuickCheckIn: () => void;
  onSubmitCheckIn: () => void;
  /** Drop 5: the operator's previous answers, carried forward; `values` already includes them. */
  draft?: CheckInDraft | undefined;
  onStartBlank?: () => void;
}) {
  // The ATTENTION layout can remount this card when UPDATE lifts the form
  // into Operate depth, so an initially-open mount is also a real reveal.
  const formRef = useRevealOnOpen<HTMLDivElement>(checkInFormOpen, { focusOnOpen: true, revealOnMount: true });
  const unchangedDraft = draft !== undefined && CHECK_IN_FIELDS.every((f) => values[f.key] === draft.value[f.key]);
  // DECLUTTER-001 (Drop 1): once today's check-in exists and the form isn't
  // open, the whole card is one line — when you checked in, "all good" if it
  // was the quick check-in — with UPDATE to reopen ALL GOOD and the form.
  if (checkIn && !checkInFormOpen) {
    const isQuick = CHECK_IN_FIELDS.every((field) => checkIn[field.key] === quickCheckInValues[field.key]);
    const time = new Date(checkIn.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return (
      <div className="equipment-row fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p className="card-body" style={{ margin: 0 }} title={describeCheckInValues(checkIn)}>
          Checked in {time}
          {isQuick ? " · all good" : ""}
        </p>
        <button
          type="button"
          className="chip"
          style={{ flex: "none", padding: "8px 14px" }}
          aria-label="Update check-in"
          onClick={() => setCheckInFormOpen(true)}
        >
          UPDATE
        </button>
      </div>
    );
  }

  return (
    <div
      ref={formRef}
      className="equipment-row"
      role="group"
      aria-labelledby="state-check-in-title"
      tabIndex={-1}
    >
      <p className="tool-label" style={{ marginBottom: 4 }}>CHECK-IN</p>
      <h2 id="state-check-in-title" className="card-title">Check-in</h2>
      <button
        className="btn-secondary"
        style={{ marginBottom: 4 }}
        disabled={busy}
        onClick={onQuickCheckIn}
      >
        ALL GOOD
      </button>
      <p className="meta" style={{ marginBottom: 16 }}>
        Sets {describeCheckInValues(quickCheckInValues)} — submits immediately.
      </p>

      <div key="form" className="fade-in">
        {draft ? (
          <div style={{ marginBottom: 12 }}>
            {/* Drop 5: a draft, said plainly — never auto-confirmed, one tap from blank. */}
            <p className="card-body" style={{ marginBottom: 4 }}>
              Draft: {draft.reason.charAt(0).toLowerCase() + draft.reason.slice(1)}. Change anything that's different now.
            </p>
            {draft.since.length > 0 && (
              <p className="meta" style={{ marginBottom: 4 }}>Since then: {draft.since.join(" · ")}</p>
            )}
            {onStartBlank && (
              <button type="button" className="chip" disabled={busy} onClick={onStartBlank}>
                START BLANK
              </button>
            )}
          </div>
        ) : (
          <p className="card-body" style={{ marginBottom: 12 }}>
            How are you doing right now? Tap a number for each — nothing here is filled in for you.
          </p>
        )}
        {CHECK_IN_FIELDS.map((field) => (
          <div key={field.key} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span className="card-body" style={{ margin: 0, fontWeight: 600, color: "var(--text-1)" }}>
                {field.label}
              </span>
              <span className="meta">{field.directionLabel}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {rangeForField(field).map((n) => {
                const selected = values[field.key] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    className={`chip ${selected ? "chip--selected" : ""}`}
                    aria-pressed={selected}
                    disabled={busy}
                    onClick={() => setValues((s) => ({ ...s, [field.key]: n }))}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button className="btn-primary" disabled={busy || !isCheckInComplete(values)} onClick={onSubmitCheckIn}>
          {unchangedDraft ? "CONFIRM CHECK-IN" : "SUBMIT CHECK-IN"}
        </button>
        {!isCheckInComplete(values) && (
          <p className="meta" style={{ marginTop: 8 }}>Select all five to submit.</p>
        )}
        {checkIn && (
          <p className="meta" style={{ marginTop: 8 }}>
            last recorded {new Date(checkIn.recordedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
