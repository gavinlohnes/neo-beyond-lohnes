export interface SetDetailsValue { setKind?: "WORKING" | "WARMUP"; repsInReserve?: string }

/** Optional recording only; effort never enters progression. */
export function SetDetails({ value, onChange, disabled = false }: {
  value: SetDetailsValue; onChange: (patch: SetDetailsValue) => void; disabled?: boolean;
}) {
  const warmup = value.setKind === "WARMUP";
  return <fieldset className="train-set-details" disabled={disabled}>
    <legend className="meta">SET DETAILS</legend>
    <label className="meta">Set type
      <select className="input" value={warmup ? "WARMUP" : "WORKING"} onChange={(e) => onChange({ setKind: e.target.value as "WORKING" | "WARMUP" })}>
        <option value="WORKING">Working set</option><option value="WARMUP">Warm-up</option>
      </select>
    </label>
    {warmup ? <p className="meta">Preparation only. Your next working set stays open.</p> : <label className="meta">How many reps left? (optional)
      <select className="input" value={value.repsInReserve ?? ""} onChange={(e) => onChange({ repsInReserve: e.target.value })}>
        <option value="">Not recorded</option>
        {Array.from({ length: 11 }, (_, n) => <option key={n} value={String(n)}>{n === 0 ? "0 — no more reps" : String(n)}</option>)}
      </select>
    </label>}
  </fieldset>;
}
