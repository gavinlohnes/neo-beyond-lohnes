import { useId } from "react";
import "./routineEditor.css";
import { SET_KINDS, type SetKind } from "../../../domain/workout/types";
import { SET_KIND_EFFECT, SET_KIND_LABEL } from "./trainCopy";

export interface SetDetailsValue { setKind?: SetKind; repsInReserve?: string }

/**
 * GRAYSON-SET-TYPES-001: one set's kind, four choices in one row (one tap each), with what it does to his numbers.
 * Missing means Working. A drop set follows the set above it.
 */
export function SetKindPicker({ value, onChange, disabled = false, allowDrop = true, name }: {
  value: SetKind | undefined; onChange: (kind: SetKind) => void; disabled?: boolean; allowDrop?: boolean; name?: string;
}) {
  const id = useId();
  const current = value ?? "WORKING";
  return <fieldset className="set-kind" disabled={disabled}>
    <legend className="meta">{name ? `${name}: set type` : "Set type"}</legend>
    <div className="set-kind__choices">
      {SET_KINDS.filter((k) => allowDrop || k !== "DROP" || current === "DROP").map((k) => <label key={k} className={`chip set-kind__choice ${current === k ? "chip--selected" : ""}`}>
        <input type="radio" name={`${id}-kind`} value={k} checked={current === k} onChange={() => onChange(k)} />{SET_KIND_LABEL[k]}
      </label>)}
    </div>
    <p className="meta" aria-live="polite">{SET_KIND_EFFECT[current]}</p>
  </fieldset>;
}

/** Optional recording only; effort never enters progression. */
export function SetDetails({ value, onChange, disabled = false, allowDrop = true }: {
  value: SetDetailsValue; onChange: (patch: SetDetailsValue) => void; disabled?: boolean; allowDrop?: boolean;
}) {
  const kind = value.setKind ?? "WORKING";
  return <fieldset className="train-set-details" disabled={disabled}>
    <legend className="meta">SET DETAILS</legend>
    <SetKindPicker value={kind} allowDrop={allowDrop} disabled={disabled} onChange={(setKind) => onChange({ setKind })} />
    {kind === "WARMUP" || kind === "FAILURE" ? null : <label className="meta">How many reps left? (optional)
      <select className="input" value={value.repsInReserve ?? ""} onChange={(e) => onChange({ repsInReserve: e.target.value })}>
        <option value="">Not recorded</option>
        {Array.from({ length: 11 }, (_, n) => <option key={n} value={String(n)}>{n === 0 ? "0 — no more reps" : String(n)}</option>)}
      </select>
    </label>}
  </fieldset>;
}
