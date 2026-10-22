import type { StateCheckIn } from "../../../domain/common/types";
import type { CheckInDraft } from "../../../engine/checkInDraft";
import { CHECK_IN_FIELDS, describeCheckInValues, type CheckInValues, type PartialCheckInValues } from "./checkInFields";
import { CheckInSheet } from "./CheckInSheet";

/** The on-demand daily controls use the same blank, stable check-in sheet as TODAY. */
export function CheckInCard({ busy, checkIn, checkInFormOpen, setCheckInFormOpen, values, setValues,
  quickCheckInValues, onQuickCheckIn, onSubmitCheckIn, draft, isInFlight = () => busy,
}: {
  busy: boolean; checkIn: StateCheckIn | null; checkInFormOpen: boolean;
  setCheckInFormOpen: (open: boolean) => void; values: PartialCheckInValues;
  setValues: (updater: (values: PartialCheckInValues) => PartialCheckInValues) => void;
  quickCheckInValues: CheckInValues; onQuickCheckIn: () => void; onSubmitCheckIn: () => void;
  draft?: CheckInDraft | undefined; onStartBlank?: () => void; isInFlight?: () => boolean;
}) {
  const isQuick = checkIn && CHECK_IN_FIELDS.every((field) => checkIn[field.key] === quickCheckInValues[field.key]);
  return <div className="equipment-row">
    {checkIn && <p className="meta" title={describeCheckInValues(checkIn)}>Checked in {new Date(checkIn.recordedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}{isQuick ? " · all good" : ""}</p>}
    <button type="button" className="btn-secondary" disabled={busy} aria-label={checkIn ? "Update check-in" : "CHECK IN"} onClick={() => setCheckInFormOpen(true)}>{checkIn ? "UPDATE" : "CHECK IN"}</button>
    <CheckInSheet open={checkInFormOpen} close={() => setCheckInFormOpen(false)} values={values} setValues={setValues}
      busy={busy} isInFlight={isInFlight} submit={onSubmitCheckIn} quick={onQuickCheckIn} quickValues={quickCheckInValues} previous={draft} />
  </div>;
}
