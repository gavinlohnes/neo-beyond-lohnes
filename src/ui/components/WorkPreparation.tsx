import { captureFeedback } from "../feel/feedback";
import { useEffect, useRef, useState } from "react";
import { getPreparation, recordPreparation } from "../../application/preparation";
import { PREPARATION_LABELS, type PreparationItem, type PreparationState, type PreparationValue } from "../../domain/preparation";
import { LogSheet } from "./LogSheet";
import { ConfirmBanner } from "./ConfirmBanner";
import { useUndoWindow } from "../hooks/useUndoWindow";
import { describeError } from "../errorMessage";
import "./workPreparation.css";
import { MemoryPanel } from "./MemoryPanel";

export function WorkPreparation({ dayId, beforeWork, active, busy = false }: {
  dayId: string | null; beforeWork: boolean; active: boolean; busy?: boolean;
}) {
  const [read, setRead] = useState<{ dayId: string; state: PreparationState } | null>(null), [error, setError] = useState<string | null>(null);
  const state = read?.dayId === dayId ? read.state : null;
  const [open, setOpen] = useState(false), [saving, setSaving] = useState(false), [attempt, setAttempt] = useState(0);
  const [receipt, setReceipt] = useUndoWindow<{ item: PreparationItem; id: string; value: PreparationValue }>();
  const writing = useRef(false), epoch = useRef(0);
  useEffect(() => {
    const current = ++epoch.current;
    setRead(null); setError(null); setReceipt(null); setOpen(false);
    if (active && dayId) void getPreparation(dayId).then((next) => { if (epoch.current === current) setRead({ dayId, state: next }); })
      .catch(() => { if (epoch.current === current) setError("Preparation could not be read. Your records are unchanged."); });
    return () => { ++epoch.current; };
  }, [dayId, active, attempt]);
  async function save(item: PreparationItem, value: PreparationValue, previousId = state?.[item].id ?? null, undo = false) {
    const acknowledge = captureFeedback();
    if (!state || !dayId || writing.current || busy || !active) return;
    writing.current = true; setSaving(true); setError(null); const current = epoch.current;
    try {
      const result = await recordPreparation({ dayId, item, value, expectedPreviousId: previousId });
      if (result.changed) acknowledge(undo ? "HEAVY" : "LIGHT");
      if (current !== epoch.current) return;
      setRead({ dayId, state: result.state });
      if (result.changed && result.id && !undo) setReceipt({ item, id: result.id, value: result.previousValue });
      else setReceipt(null);
    } catch (failure) { if (current === epoch.current) setError(describeError(failure, "Preparation didn't save. Try again.")); }
    finally { writing.current = false; setSaving(false); }
  }
  const disabled = busy || saving || !state;
  const covered = state && state.FOOD.value !== "UNCONFIRMED" && state.BOTTLE.value !== "UNCONFIRMED";
  const confirmation = receipt && <ConfirmBanner message="Preparation updated." actionLabel="UNDO" disabled={disabled}
    onAction={() => void save(receipt.item, receipt.value, receipt.id, true)} />;
  const failure = error && <div role="alert"><p className="meta">{error}</p><button type="button" className="btn-secondary" disabled={saving} onClick={() => setAttempt((n) => n + 1)}>RELOAD PREPARATION</button></div>;
  return <div hidden={!dayId} className="work-preparation" aria-label="Work preparation">
    {beforeWork ? <>
      <h2 className="tool-label">READY FOR TONIGHT</h2>
      {!state && !error && <p role="status" className="meta">Reading preparation…</p>}
      {state && <p className="meta" role="status">{covered ? "Preparation: no action required." : `Food and snacks: ${PREPARATION_LABELS[state.FOOD.value]}. Bottle: ${state.BOTTLE.value === "READY" ? "Filled" : PREPARATION_LABELS[state.BOTTLE.value]}.`}</p>}
      {!covered && <div className="preparation-actions">
        <button type="button" className="btn-secondary" disabled={disabled || state?.FOOD.value !== "UNCONFIRMED"} onClick={() => void save("FOOD", "READY")}>FOOD READY</button>
        <button type="button" className="btn-secondary" disabled={disabled || state?.BOTTLE.value !== "UNCONFIRMED"} onClick={() => void save("BOTTLE", "READY")}>BOTTLE FILLED</button>
      </div>}
      <button type="button" className="btn-secondary" disabled={saving || busy} onClick={() => setOpen(true)}>{covered ? "CHANGE PREPARATION" : "PREPARATION OPTIONS"}</button>
      {!open && <>{confirmation}{failure}</>}
    </> : <button type="button" className="btn-secondary preparation-entry" disabled={saving || busy} onClick={() => setOpen(true)}>PREPARE FOR WORK</button>}
    <LogSheet open={active && Boolean(dayId) && open} title="PREPARATION" onClose={() => setOpen(false)} canClose={() => !writing.current}>
      <p className="meta">For this BEYOND day. Packing food doesn't log it as eaten. Filling your bottle doesn't log water drunk.</p>
      <p className="meta">Homemade, frozen and other practical arrangements all count. Nothing carries over as an unfinished task.</p>
      <MemoryPanel scope="PREP" contextual active={active && Boolean(dayId) && open} blocked={saving || busy} />
      {!state && !error && <p role="status">Reading preparation…</p>}
      {state && (["FOOD", "BOTTLE"] as const).map((item) => <section key={item} className="preparation-options" aria-label={item === "FOOD" ? "Food and snacks preparation" : "Bottle preparation"}>
        <h3>{item === "FOOD" ? "Food and snacks" : "Bottle"}</h3>
        <p className="meta">{item === "BOTTLE" && state[item].value === "READY" ? "Filled" : PREPARATION_LABELS[state[item].value]}</p>
        {(item === "FOOD" ? ["READY", "HOMEMADE", "FROZEN", "OTHER", "NOT_NEEDED", "UNCONFIRMED"] as const : ["READY", "NOT_NEEDED", "UNCONFIRMED"] as const).map((value) => <button type="button" className="btn-secondary" key={value} aria-pressed={state[item].value === value} disabled={disabled}
          onClick={() => void save(item, value)}>{value === "UNCONFIRMED" ? "NOT CONFIRMED" : item === "BOTTLE" && value === "READY" ? "BOTTLE FILLED" : PREPARATION_LABELS[value]}</button>)}
      </section>)}
      {confirmation}{failure}
      <p className="meta">Your changes remain in HISTORY. Preparation doesn't change BEYOND’s advice.</p>
    </LogSheet>
  </div>;
}
