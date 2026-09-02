import type { StateCheckIn } from "../../../domain/common/types";
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
}) {
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>STATE INPUT</p>
      <h2 className="card-title">State check-in</h2>
      <button
        className="btn-secondary"
        style={{ marginBottom: 4 }}
        disabled={busy}
        onClick={onQuickCheckIn}
      >
        ALL GOOD
      </button>
      <p className="meta" style={{ marginBottom: checkIn && !checkInFormOpen ? 12 : 16 }}>
        Sets {describeCheckInValues(quickCheckInValues)} — submits immediately.
      </p>

      {checkIn && !checkInFormOpen ? (
        <div key="summary" className="fade-in">
          <p className="card-body" style={{ marginBottom: 8 }}>
            Last check-in: {describeCheckInValues(checkIn)}
          </p>
          <p className="meta" style={{ marginBottom: 12 }}>
            recorded {new Date(checkIn.recordedAt).toLocaleTimeString()}
          </p>
          <button className="btn-secondary" onClick={() => setCheckInFormOpen(true)}>
            MANUAL CHECK-IN
          </button>
        </div>
      ) : (
        <div key="form" className="fade-in">
          <p className="card-body" style={{ marginBottom: 12 }}>
            How are you doing right now? Tap a number for each — nothing here is filled in for you.
          </p>
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
            SUBMIT CHECK-IN
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
      )}
    </div>
  );
}
