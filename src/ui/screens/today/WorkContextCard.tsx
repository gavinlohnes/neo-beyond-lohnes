import type { BeyondDay } from "../../../domain/common/types";
import type { ScheduledContext } from "../../../engine/scheduledContext";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { ConfirmIcon } from "../../icons/Icon";
import { describeSchedulePrediction } from "./workContextCopy";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former inline WORK CONTEXT IIFE. The outer
 * "does this render at all" gate (`(!workEndInAttention || workContextOpen)
 * && day && scheduledContext`) stays in TodayScreen — this component
 * always receives a real `day`/`scheduledContext`, matching that gate.
 */
export function WorkContextCard({
  day,
  scheduledContext,
  workContextOpen,
  setWorkContextOpen,
  workPeriodEndedAt,
  busy,
  onSetWorkContext,
  onMarkWorkEnded,
}: {
  day: BeyondDay;
  scheduledContext: ScheduledContext;
  workContextOpen: boolean;
  setWorkContextOpen: (open: boolean) => void;
  workPeriodEndedAt: string | null;
  busy: boolean;
  onSetWorkContext: (value: "WORK" | "OFF") => void;
  onMarkWorkEnded: () => void;
}) {
  const settled = day.workContext === "OFF" || (day.workContext === "WORK" && workPeriodEndedAt !== null);
  const awaitingWorkEnd = day.workContext === "WORK" && workPeriodEndedAt === null;
  const open = workContextOpen || day.workContext === "UNKNOWN";
  if (!open) {
    if (awaitingWorkEnd) {
      return (
        <div className="equipment-row">
          <p className="tool-label" style={{ marginBottom: 4 }}>WORK CONTEXT</p>
          <h2 className="card-title">Working today</h2>
          <p className="meta" style={{ marginBottom: 12 }}>
            Setup recorded. When your shift is actually over, mark it — BEYOND never guesses this from the clock.
          </p>
          <button className="btn-primary" disabled={busy} onClick={onMarkWorkEnded}>
            MARK WORK ENDED
          </button>
          <button
            className="btn-secondary"
            style={{ marginTop: 8 }}
            disabled={busy}
            onClick={() => setWorkContextOpen(true)}
          >
            CHANGE WORK CONTEXT
          </button>
        </div>
      );
    }
    const summary =
      day.workContext === "OFF"
        ? "Off today."
        : `Working today — ended ${new Date(workPeriodEndedAt!).toLocaleTimeString()}.`;
    return <CollapsibleRow name="WORK CONTEXT" summary={summary} onOpen={() => setWorkContextOpen(true)} />;
  }
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>WORK CONTEXT</p>
      <h2 className="card-title">Are you working today?</h2>
      <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12 }}>
        <button
          type="button"
          className={`chip ${day.workContext === "WORK" ? "chip--selected" : ""}`}
          aria-pressed={day.workContext === "WORK"}
          disabled={busy}
          onClick={() => onSetWorkContext("WORK")}
        >
          YES
        </button>
        <button
          type="button"
          className={`chip ${day.workContext === "OFF" ? "chip--selected" : ""}`}
          aria-pressed={day.workContext === "OFF"}
          disabled={busy}
          onClick={() => onSetWorkContext("OFF")}
        >
          NO
        </button>
      </div>
      <p className="card-body" style={{ fontSize: 16 }}>{describeSchedulePrediction(scheduledContext)}</p>
      {day.workContext !== "UNKNOWN" && (
        <p className="meta" style={{ marginTop: 8 }}>
          Currently set: {day.workContext === "WORK" ? "working today" : "off today"}.
        </p>
      )}
      {day.workContext === "WORK" && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
          {workPeriodEndedAt ? (
            <p className="meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ConfirmIcon size={20} />
              Work ended at {new Date(workPeriodEndedAt).toLocaleTimeString()}.
            </p>
          ) : (
            <>
              <p className="meta" style={{ marginBottom: 8 }}>
                When your shift is actually over, mark it — BEYOND never guesses this from the clock.
              </p>
              <button className="btn-secondary" disabled={busy} onClick={onMarkWorkEnded}>
                MARK WORK ENDED
              </button>
            </>
          )}
        </div>
      )}
      {settled && (
        <button
          className="btn-secondary"
          style={{ marginTop: 12 }}
          onClick={() => setWorkContextOpen(false)}
        >
          COLLAPSE
        </button>
      )}
    </div>
  );
}
