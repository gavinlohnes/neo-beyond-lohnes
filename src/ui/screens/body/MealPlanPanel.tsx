import { useRef, useState } from "react";
import { draftMealPlan, mealPlanGroceryText, mealPlanTotals, type MealPlan } from "../../../application/mealPlan";
import { getMealPlanInputs } from "../../../application/mealPlanQueries";
import { captureItem } from "../../../application/commands";

type Inputs = Awaited<ReturnType<typeof getMealPlanInputs>>;
export function MealPlanPanel({ now }: { now?: Date | undefined }) {
  const [count, setCount] = useState<3 | 7>(3), [inputs, setInputs] = useState<Inputs | null>(null), [plan, setPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false), [receipt, setReceipt] = useState(false);
  const saving = useRef(false);
  async function draft() {
    setBusy(true); setError(null); setConfirm(false); setReceipt(false);
    try { const next = await getMealPlanInputs(count, now); setInputs(next); setPlan(draftMealPlan(next.meals, next.targets, next.window, count)); }
    catch { setError("The saved meals or schedule couldn't be read. Your records have not changed."); }
    finally { setBusy(false); }
  }
  function change(dayIndex: number, slotIndex: number, mealId: string) {
    setConfirm(false); setReceipt(false);
    setPlan((old) => old ? { ...old, days: old.days.map((d, i) => i !== dayIndex ? d : { ...d, slots: d.slots.map((s, j) => j !== slotIndex ? s : { ...s, mealId: mealId || null }) }) } : old);
  }
  async function save() {
    if (!plan || !inputs || saving.current) return;
    saving.current = true; setBusy(true); setError(null);
    try { await captureItem(mealPlanGroceryText(plan.days, inputs.meals)); setConfirm(false); setReceipt(true); }
    catch { setError("The grocery note couldn't be saved. Your draft is still here."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <section className="suit-panel" aria-label="Meal plan" aria-busy={busy}>
    <h2 className="suit-panel__title">PLAN MY MEALS</h2>
    <p className="meta">A free draft from your saved meals. Nothing here is logged as eaten.</p>
    <div className="suit-panel__controls"><label>Plan ahead<select aria-label="Meal plan days" value={count} disabled={busy} onChange={(e) => { setCount(Number(e.target.value) as 3 | 7); setPlan(null); setConfirm(false); setReceipt(false); }}><option value={3}>3 days</option><option value={7}>7 days</option></select></label>
    <button type="button" className="btn-secondary" disabled={busy} onClick={() => void draft()}>PLAN MY MEALS</button></div>
    {error && <p role="alert">{error}</p>}
    {plan?.message && <p className="meta">{plan.message}</p>}
    {plan && inputs && <>
      {!inputs.scheduleSaved && <p className="meta">No saved schedule; regular meal slots are shown.</p>}
      {plan.days.map((day, i) => { const total = mealPlanTotals(day, inputs.meals); return <fieldset key={day.date} disabled={busy}><legend>{day.date} · {!inputs.scheduleSaved ? "Regular meal slots" : day.work ? "Scheduled work day" : "Scheduled day off"}</legend>
        {day.slots.map((slot, j) => <label key={slot.label} style={{ display: "block", marginTop: 8 }}>{slot.label} · {slot.servings} serving{slot.servings === 1 ? "" : "s"}<select aria-label={`${day.date} ${slot.label}`} style={{ width: "100%", minWidth: 0 }} value={slot.mealId ?? ""} onChange={(e) => change(i, j, e.target.value)}><option value="">Clear slot</option>{inputs.meals.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>)}
        <p className="meta suit-panel__totals">{Math.round(total.calories)} kcal{inputs.targets.calories ? ` / ${inputs.targets.calories} target` : " · no calorie target"} · {Math.round(total.proteinG)}g protein{inputs.targets.proteinG ? ` / ${inputs.targets.proteinG}g target` : " · no protein target"}</p>
      </fieldset>; })}
      {plan.days.length > 0 && <><p className="meta">Swaps keep the displayed serving size; totals update. A target may need different meals or portions.</p><button type="button" className="btn-secondary" disabled={busy || !plan.days.some((d) => d.slots.some((s) => s.mealId))} onClick={() => setConfirm(true)}>SAVE GROCERY LIST</button></>}
      {confirm && <div aria-label="Confirm grocery note"><h3>Save this grocery note?</h3><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{mealPlanGroceryText(plan.days, inputs.meals)}</pre><button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>CONFIRM SAVE NOTE</button><button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirm(false)}>CANCEL</button></div>}
      {receipt && <p role="status">Grocery list saved in CAPTURE. No meals were logged.</p>}
    </>}
  </section>;
}
