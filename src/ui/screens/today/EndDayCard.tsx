import { CollapsibleRow } from "../../components/CollapsibleRow";
import { SignalRow } from "../../components/SignalRow";

/**
 * TodayScreen decomposition (2026-09-02): extracted verbatim from
 * TodayScreen.tsx's former `renderEndDayCard` closure. Unlike
 * ResetCard/ShiftDownCard, this one's call sites are NOT all gated on
 * `day &&` (the ATTENTION-tier and SUPPORT-tier call sites call it
 * unconditionally) — `hasDay` preserves that exact guard rather than
 * assuming it's dead.
 */
export function EndDayCard({
  hasDay,
  suggestEndDay,
  endDayOpen,
  setEndDayOpen,
  endDayBlockedByWorkout,
  busy,
  onOpenTrain,
  onEndDay,
}: {
  hasDay: boolean;
  suggestEndDay: boolean;
  endDayOpen: boolean;
  setEndDayOpen: (open: boolean) => void;
  endDayBlockedByWorkout: boolean;
  busy: boolean;
  onOpenTrain?: ((destination: "RECOVERY" | "WORKOUT") => void) | undefined;
  onEndDay: () => void;
}) {
  if (!hasDay) return null;
  const open = suggestEndDay || endDayOpen;
  if (!open) {
    return (
      <CollapsibleRow name="BEYONDDAY" summary="End your day whenever you're ready." onOpen={() => setEndDayOpen(true)} />
    );
  }
  const body = (
    <>
      {suggestEndDay && (
        <p className="card-body" style={{ marginBottom: 12 }}>
          Primary sleep logged — this BeyondDay looks done. End it whenever you're ready.
        </p>
      )}
      {endDayBlockedByWorkout && (
        <div role="alert" className="card card--warning" style={{ marginBottom: 12 }}>
          <p className="card-body" style={{ marginBottom: 8 }}>
            Workout in progress. Finish it, save it as partial, or stop it on TRAIN before ending this BeyondDay.
          </p>
          <button className="btn-primary" disabled={busy} onClick={() => onOpenTrain?.("WORKOUT")}>
            RETURN TO WORKOUT
          </button>
        </div>
      )}
      <button className="btn-secondary" disabled={busy} onClick={onEndDay}>
        END DAY
      </button>
    </>
  );
  if (suggestEndDay) {
    return <SignalRow label="BEYONDDAY">{body}</SignalRow>;
  }
  return (
    <div className="equipment-row">
      <p className="tool-label" style={{ marginBottom: 4 }}>BEYONDDAY</p>
      {body}
    </div>
  );
}
