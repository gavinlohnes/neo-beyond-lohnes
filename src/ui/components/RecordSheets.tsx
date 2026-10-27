import { captureCommitFeedback } from "../feel/feedback";
import { useHiddenFeatures } from "../hiddenFeatures";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LogSheet } from "./LogSheet";
import { BodyScreen } from "../screens/body/BodyScreen";
import type { RecordCorrectionRequest, RecordSheetTarget } from "../recordSheets";
import type { SavedMeal } from "../../domain/common/types";
import { ensureActiveDay, logWater, voidWaterLog, captureItem, deleteCaptureItem, voidProteinLog } from "../../application/commands";
import { getActiveDay, getHydrationEntries } from "../../application/queries";
import { getSavedMeals, getLikelySavedMeals } from "../../application/nutritionQueries";
import { logMeal, logManualMeal, updateSavedMeal, archiveSavedMeal, voidMealLog } from "../../application/nutritionCommands";
import { getDuplicateMealCheck, getSameFoodCheck } from "../../application/sameFoodQueries";
import type { DuplicateMealPair, SameFoodPair } from "../../engine/sameFood";
import { describeDuplicateMealQuestion, describeSameFoodQuestion, describeSameFoodRemoveOne } from "../screens/body/nutritionCopy";
import { useDayRolloverRefresh } from "../hooks/useDayRolloverRefresh";
import { useUndoOpen } from "../hooks/useUndoWindow";
import { useSessionDraft } from "../sessionDrafts";
import { HoldButton } from "./HoldButton";
import { describeError } from "../errorMessage";
import { CcIcon } from "../cc/ccIcons";

type MealQuestion = { message: string; detail?: string; removeLabel: string; remove: () => Promise<unknown>; removedMessage: string };
type Receipt = { question?: MealQuestion | undefined; message: string; undo: () => Promise<unknown>; warning?: string; history?: "water" | "protein"; notes?: boolean };
function ReceiptItem({ receipt, busy, undo, dismiss, history, keep, remove }: { receipt: Receipt; busy: boolean; undo: () => void; dismiss: () => void; history: () => void; keep: () => void; remove: () => void }) {
  const undoOpen = useUndoOpen(receipt);
  return <div className="record-receipt confirm-banner"><p>{receipt.message}</p>{receipt.warning && <p>{receipt.warning}</p>}
    {receipt.question && <div role="group" aria-label={receipt.question.removeLabel === "REMOVE ONE" ? "Same food?" : "Same meal?"}>
      <p>{receipt.question.message}</p>{receipt.question.detail && <p>{receipt.question.detail}</p>}
      <button type="button" className="btn-secondary" disabled={busy} onClick={keep}>KEEP BOTH</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={remove}>{receipt.question.removeLabel}</button>
    </div>}
    {undoOpen ? <button type="button" className="btn-secondary" disabled={busy} onClick={undo}>UNDO</button> : <button type="button" className="btn-secondary" onClick={history}>HISTORY / CORRECT</button>}
    <button type="button" className="btn-secondary" onClick={dismiss}>DISMISS</button>
  </div>;
}
type MealForm = { name: string; calories: string; proteinG: string; carbsG: string; fatG: string };
const EMPTY: MealForm = { name: "", calories: "", proteinG: "", carbsG: "", fatG: "" };
const TITLE = { protein: "PROTEIN ONLY", water: "WATER", meal: "MEAL", log: "LOG", sleep: "SLEEP", weight: "BODYWEIGHT", note: "NOTE", urge: "URGE", myMeals: "MY MEALS", foodLookup: "FOOD LOOKUP", record: "CORRECT RECORD" } as const;
const FIELDS = { calories: "Calories", proteinG: "Protein (g)", carbsG: "Carbs (g), optional", fatG: "Fat (g), optional" } as const;
function parse(form: MealForm) {
  if (!form.name.trim() || !form.calories.trim() || !form.proteinG.trim()) throw new Error("Enter a name, calories and protein.");
  const macros = { name: form.name.trim(), calories: Number(form.calories), proteinG: Number(form.proteinG), carbsG: Number(form.carbsG || 0), fatG: Number(form.fatG || 0) };
  if (![macros.calories, macros.proteinG, macros.carbsG, macros.fatG].every((n) => Number.isFinite(n) && n >= 0)) throw new Error("Use nonnegative amounts.");
  return macros;
}

/** The shell owns one stable modal. Drafts live here, never in persistent storage. */
export function RecordSheets({ mealRequest, correctionRequest, target, open, close, onSaved, onBusy, onHistory, onWorkout, onNotes }: {
  mealRequest?: { id: string; key: number } | null;
  correctionRequest?: RecordCorrectionRequest | null;
  target: RecordSheetTarget | null; open: (target: RecordSheetTarget) => void; close: () => void;
  onSaved: () => void; onBusy: (busy: boolean) => void; onHistory: (metric: "water" | "protein") => void; onWorkout: () => void; onNotes: () => void;
}) {
  const hiddenFeatures = useHiddenFeatures();
  const [busy, setBusyState] = useState(false); const busyRef = useRef(false);
  function setBusy(next: boolean) { busyRef.current = next; setBusyState(next); onBusy(next); }
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(""); const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [likely, setLikely] = useState<SavedMeal[]>([]); const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useDayRolloverRefresh(() => setRetry((key) => key + 1)); const [lastWater, setLastWater] = useState<number | null>(null);
  const [page, setPage] = useState<"list" | "new" | "quick" | "portion" | "edit" | "waterDetails" | "mealTools">("list");
  const [mealId, setMealId] = useState<string | null>(null); const [servings, setServings] = useState(1);
  const [form, setForm] = useState<MealForm>(EMPTY); const [quick, setQuick] = useState<MealForm>({ ...EMPTY, name: "Quick add" });
  const [saveNext, setSaveNext] = useState(false); const [edit, setEdit] = useState<MealForm>(EMPTY);
  const [note, setNote] = useState("");
  const [receipts, setReceipts] = useState<(Receipt & { id: number })[]>([]);
  const receiptId = useRef(0);
  const receiptKind = (receipt: Receipt) => receipt.notes ? "note" : receipt.history ?? "meal";
  function addReceipt(receipt: Receipt) {
    const next = { ...receipt, id: ++receiptId.current };
    setReceipts((old) => [...old.filter((entry) => receiptKind(entry) !== receiptKind(receipt)), next]);
  }
  const dismissReceipt = (id: number) => setReceipts((old) => old.filter((entry) => entry.id !== id));
  useSessionDraft("record-sheet-meal", Object.values(form).some(Boolean) || !!quick.calories || !!quick.proteinG);
  useSessionDraft("record-sheet-note", !!note);
  useSessionDraft("record-sheet-edit", page === "edit");
  const [bodyFocus, setBodyFocus] = useState<"water" | "sleep" | "weight" | "urge" | "meal" | "foodLookup" | "protein" | null>(null);
  const [bodyRequest, setBodyRequest] = useState(0);
  useLayoutEffect(() => {
    if (!target) return;
    setError(null); setPage("list");
    if (target === "record" && correctionRequest) {
      const kind = correctionRequest.record.kind;
      setBodyFocus(kind === "MEAL" ? "meal" : kind === "PROTEIN" ? "protein" : kind === "WEIGHT" ? "weight" : kind === "WATER" ? "water" : "sleep"); setBodyRequest((key) => key + 1);
    }
    if (target === "protein" || target === "sleep" || target === "weight" || target === "urge" || target === "foodLookup") { setBodyFocus(target); setBodyRequest((key) => key + 1); }
  }, [target, correctionRequest]);
  useEffect(() => {
    if (!target) return;
    let current = true; setReadState("loading");
    Promise.all([getSavedMeals(), getLikelySavedMeals(), getActiveDay().then(async (day) => day ? (await getHydrationEntries(day.id)).at(-1)?.effectiveAmountOz ?? null : null)])
      .then(([all, ranked, water]) => { if (current) { setMeals(all); setLikely(ranked); setLastWater(water); setReadState("ready"); } })
      .catch(() => { if (current) setReadState("error"); });
    return () => { current = false; };
  }, [target, retry]);
  const appliedMeal = useRef<number | null>(null);
  useEffect(() => {
    if (target !== "meal" || !mealRequest || readState !== "ready" || appliedMeal.current === mealRequest.key) return;
    appliedMeal.current = mealRequest.key;
    if (meals.some((meal) => meal.id === mealRequest.id)) { setMealId(mealRequest.id); setServings(1); setPage("portion"); }
    else setError("That saved meal is unavailable. Choose another meal or retry.");
  }, [target, mealRequest, readState, meals]);
  async function commit(action: () => Promise<Receipt>) {
    const acknowledge = captureCommitFeedback();
    if (busyRef.current) return;
    setBusy(true); setError(null);
    try {
      const saved = await action(); acknowledge("LIGHT"); addReceipt(saved); onSaved();
      setBusy(false); close();
    } catch (cause) { setError(`${target === "water" ? "Water" : target === "note" ? "Note" : "Meal"} didn't save. ${describeError(cause, "Nothing saved.")} Try again.`); }
    finally { setBusy(false); }
  }
  async function mealReceipt(dayId: string, eventId: string, name: string) {
    let warning: string | undefined;
    let question: MealQuestion | undefined;
    try {
      const duplicate: DuplicateMealPair | undefined = await getDuplicateMealCheck(dayId, eventId);
      const sameFood: SameFoodPair | undefined = duplicate ? undefined : await getSameFoodCheck(dayId, { kind: "MEAL", id: eventId });
      if (duplicate) question = {
        message: describeDuplicateMealQuestion(duplicate.justLogged, duplicate.earlier),
        removeLabel: "REMOVE THIS ONE", remove: () => voidMealLog(dayId, eventId),
        removedMessage: `${name} removed. The earlier meal stays.`,
      };
      else if (sameFood) question = {
        message: describeSameFoodQuestion(sameFood.protein, sameFood.meal),
        detail: describeSameFoodRemoveOne(sameFood.protein.grams),
        removeLabel: "REMOVE ONE", remove: () => voidProteinLog(dayId, sameFood.protein.id),
        removedMessage: "Protein-only entry removed. The meal stays.",
      };
    } catch { warning = "Meal saved. Duplicate check unavailable; review history."; }
    return { message: `${name} logged.`, undo: () => voidMealLog(dayId, eventId), ...(warning ? { warning } : {}), ...(question ? { question } : {}) };
  }

  function chooseMeal(meal: SavedMeal) { setMealId(meal.id); setServings(1); setPage("portion"); }
  const selected = meals.find((meal) => meal.id === mealId);
  const displayed = query.trim() ? meals.filter((meal) => meal.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : target === "myMeals" ? meals : likely;
  const formFields = (value: MealForm, update: (value: MealForm) => void, prefix: string, simple = false) => <>
    {!simple && <label className="field">Name<input className="input" aria-label={`${prefix} name`} value={value.name} onChange={(event) => update({ ...value, name: event.target.value })} /></label>}
    {(Object.entries(FIELDS) as [keyof typeof FIELDS, string][]).filter(([key]) => !simple || key === "calories" || key === "proteinG").map(([key, label]) => <label className="field" key={key}>{label}<input className="input" aria-label={`${prefix} ${label}`} type="number" min="0" step="any" value={value[key]} onChange={(event) => update({ ...value, [key]: event.target.value })} /></label>)}
  </>;
  const bodyVisible = target === "protein" || target === "sleep" || target === "weight" || target === "urge" || (target === "water" && page === "waterDetails") || target === "foodLookup" && hiddenFeatures.foodLookup || page === "mealTools" || target === "record" && !!correctionRequest;
  let title: string = target ? TITLE[target] : "LOG";
  if (target === "meal" || target === "myMeals") title = target === "myMeals" && page === "list" ? "MY MEALS" : { list: "MEAL", new: "NEW MEAL", quick: "QUICK ADD", portion: "SERVINGS", edit: "EDIT SAVED MEAL", waterDetails: "MEAL", mealTools: "MEAL TOOLS" }[page];
  return <>
    <LogSheet open={target !== null} title={title} onClose={close} canClose={() => !busyRef.current}>
      {target === "foodLookup" && !hiddenFeatures.foodLookup && <p className="meta">Show online food lookup in MORE → Hidden features.</p>}
      {busy && <p role="status">Saving…</p>}
      {error && <p role="alert">{error}</p>}
      {target === "water" && page !== "waterDetails" && <>
        <div className="cc-amounts">{[8, 12, 16, 24].map((amount) => <button type="button" key={amount} className="today-sheet__option" disabled={busy} onClick={() => void commit(async () => { const day = await ensureActiveDay(); const id = await logWater(day.id, amount); return { message: `${amount} oz recorded.`, history: "water" as const, undo: () => voidWaterLog(day.id, id) }; })}>+{amount} oz</button>)}</div>
        <button type="button" className="today-sheet__option" disabled={busy || lastWater === null || readState !== "ready"} onClick={() => lastWater !== null && void commit(async () => { const day = await ensureActiveDay(); const amount = lastWater; const id = await logWater(day.id, amount); return { message: `${amount} oz recorded.`, history: "water" as const, undo: () => voidWaterLog(day.id, id) }; })}>Repeat last{lastWater === null ? "" : ` (${lastWater} oz)`}</button>
        <button type="button" className="btn-secondary" onClick={() => { setBodyFocus("water"); setBodyRequest((key) => key + 1); setPage("waterDetails"); }}>Custom amount & entries</button>
        <button type="button" className="btn-secondary" onClick={() => onHistory("water")}>WATER HISTORY</button>
      </>}
      {(target === "meal" || target === "myMeals") && <>
        {page !== "list" && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPage("list")}>BACK TO MY MEALS</button>}
        {page === "list" && <>
          {/* NAV-001: starting a new meal comes first, not after the whole list. */}
          <div className="record-meal-start">
            <button type="button" className="btn-secondary" onClick={() => { if (!form.name) setForm({ ...form, name: query.trim() }); setPage("new"); }}>NEW MEAL{query.trim() ? ` ‘${query.trim()}’` : ""}</button>
            <button type="button" className="btn-secondary" onClick={() => setPage("quick")}>QUICK ADD</button>
          </div>
          <label className="field">Search your meals<input className="input" type="search" aria-label="Search your meals" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          {readState === "loading" ? <p role="status">Reading meals…</p> : readState === "error" ? <p role="alert">Could not read your meals.<button type="button" className="btn-secondary" onClick={() => setRetry((key) => key + 1)}>RETRY MEALS</button></p> : <>
            <h3>{target === "myMeals" ? "MY MEALS" : query.trim() ? "MATCHES" : "LIKELY NOW"}</h3>
            {(target === "myMeals" && !query.trim() ? meals : displayed).map((meal) => <div className="record-meal-row" key={meal.id}>
              <button type="button" className="btn-secondary" disabled={busy} aria-label={`Servings for ${meal.name}`} onClick={() => chooseMeal(meal)}><strong>{meal.name}</strong><span className="meta">{meal.calories} kcal · {meal.proteinG} g protein · 1 serving</span></button>
              <button type="button" className="btn-secondary" disabled={busy} aria-label={`Log ${meal.name}`} onClick={() => void commit(async () => { const day = await ensureActiveDay(); const result = await logMeal(day.id, meal.id); return mealReceipt(day.id, result.eventId, result.name); })}>LOG</button>
            </div>)}
            {!displayed.length && <p>No matching meals.</p>}
          </>}
          <button type="button" className="btn-secondary" onClick={() => { setBodyFocus("meal"); setBodyRequest((key) => key + 1); setPage("mealTools"); }}>More meal tools & corrections</button>
        </>}
        {(page === "new" || page === "quick") && <>
          <p className="meta">Carbs and fat default to 0 when not entered.</p>
          {formFields(page === "quick" ? quick : form, page === "quick" ? setQuick : setForm, page === "quick" ? "Quick add" : "New meal", page === "quick")}
          {page === "new" && <label className="save-meal-choice"><input type="checkbox" disabled={busy} checked={saveNext} onChange={(event) => setSaveNext(event.target.checked)} />Save for next time</label>}
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void commit(async () => {
            const input = parse(page === "quick" ? quick : form); const day = await ensureActiveDay();
            const result = await logManualMeal(day.id, input, page === "new" && saveNext);
            if (page === "quick") setQuick({ ...EMPTY, name: "Quick add" }); else { setForm(EMPTY); setSaveNext(false); }
            return mealReceipt(day.id, result.eventId, result.name);
          })}>LOG</button>
        </>}
        {page === "portion" && selected && <>
          <h3>{selected.name}</h3><div className="cc-amounts">{[.5, 1, 1.5, 2].map((amount) => <button type="button" className="chip" aria-pressed={servings === amount} disabled={busy} key={amount} onClick={() => setServings(amount)}>{amount} serving{amount === 1 ? "" : "s"}</button>)}</div>
          <p>{selected.calories * servings} kcal · {selected.proteinG * servings} g protein</p>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void commit(async () => { const day = await ensureActiveDay(); const result = await logMeal(day.id, selected.id, servings); return mealReceipt(day.id, result.eventId, result.name); })}>LOG</button>
          <button type="button" className="btn-secondary" onClick={() => { setEdit({ name: selected.name, calories: String(selected.calories), proteinG: String(selected.proteinG), carbsG: String(selected.carbsG), fatG: String(selected.fatG) }); setPage("edit"); }}>EDIT SAVED MEAL</button>
        </>}
        {page === "edit" && selected && <>
          {formFields(edit, setEdit, "Saved meal")}
          <button type="button" className="btn-primary" disabled={busy} onClick={async () => {
    const acknowledge = captureCommitFeedback(); if (busyRef.current) return; setBusy(true); setError(null); try { await updateSavedMeal(selected.id, parse(edit)); acknowledge("LIGHT"); setRetry((key) => key + 1); setPage("portion"); } catch (cause) { setError(describeError(cause, "Meal not updated.")); } finally { setBusy(false); } }}>SAVE CHANGES</button>
          <HoldButton className="btn-secondary" disabled={busy} hint="Hold to archive this preset. Existing logs stay." onConfirm={async () => {
    const acknowledge = captureCommitFeedback(); if (busyRef.current) return; setBusy(true); try { if (await archiveSavedMeal(selected.id)) acknowledge("HEAVY"); setRetry((key) => key + 1); setPage("list"); } catch (cause) { setError(describeError(cause, "Could not archive meal.")); } finally { setBusy(false); } }}>ARCHIVE MEAL</HoldButton>
        </>}
      </>}
      {target === "log" && <>{(["water", "meal", "sleep", "weight", "note", "urge"] as const).map((kind) => <button type="button" className="today-sheet__option" key={kind} onClick={() => open(kind)}>{TITLE[kind]}</button>)}<button type="button" className="today-sheet__option" onClick={onWorkout}>WORKOUT SET → TRAIN</button></>}
      {target === "note" && <><label className="field">Note<textarea className="input" aria-label="Capture a thought" value={note} onChange={(event) => setNote(event.target.value)} /></label><button type="button" className="btn-primary" disabled={busy || !note.trim()} onClick={() => void commit(async () => { const result = await captureItem(note); setNote(""); return { message: "Note captured.", notes: true, undo: () => deleteCaptureItem(result.id) }; })}>CAPTURE</button></>}
      <div hidden={!bodyVisible}>{bodyFocus && <BodyScreen foodLookupEnabled={hiddenFeatures.foodLookup} correctionRequest={target === "record" ? correctionRequest : null} sheetFocus={bodyFocus === "foodLookup" ? "meal" : bodyFocus} focus={bodyFocus === "protein" ? null : bodyFocus} focusRequest={bodyRequest} visible={bodyVisible && target !== null} onMealJourneyInFlightChange={(next) => { const wasBusy = busyRef.current; setBusy(next); if (wasBusy && !next) onSaved(); }} />}</div>
    </LogSheet>
    {receipts.length > 0 && <div className="redesign-toast" role="status">{receipts.map((receipt) => <ReceiptItem key={receipt.id} receipt={receipt} busy={busy}
      keep={() => setReceipts((old) => old.map((entry) => entry.id === receipt.id ? { ...entry, question: undefined } : entry))}
      remove={() => {
        if (busyRef.current || !receipt.question) return;
        const question = receipt.question; setBusy(true); setError(null);
        const acknowledge = captureCommitFeedback();
        void question.remove().then((changed) => {
          if (changed) acknowledge("HEAVY");
          if (question.removeLabel === "REMOVE THIS ONE") dismissReceipt(receipt.id);
          else setReceipts((old) => old.map((entry) => entry.id === receipt.id ? { ...entry, question: undefined, message: question.removedMessage } : entry));
          onSaved();
        }).catch((cause) => setError(`Could not remove the entry. ${describeError(cause, "Try again.")}`)).finally(() => setBusy(false));
      }}
      dismiss={() => dismissReceipt(receipt.id)} history={() => { dismissReceipt(receipt.id); if (receipt.notes) onNotes(); else onHistory(receipt.history ?? "protein"); }}
      undo={() => { const acknowledge = captureCommitFeedback(); if (busyRef.current) return; setBusy(true); setError(null); void receipt.undo().then((changed) => { if (changed) acknowledge("HEAVY"); dismissReceipt(receipt.id); onSaved(); }).catch((cause) => setError(describeError(cause, "Could not undo. Try again."))).finally(() => setBusy(false)); }} />)}
      {error && !target && <p role="alert">{error}</p>}
    </div>}
  </>;
}

/** NAV-001: WATER and MEAL stay as one-tap shortcuts; LOG is the floating + for every record type. */
export function LogActions({ open, busy = false, isInFlight = () => busy }: { open: (target: RecordSheetTarget) => void; busy?: boolean; isInFlight?: () => boolean }) {
  return <div className="console-controls cc-actions cc-actions--two" role="group" aria-label="Log actions">{([['water', 'WATER'], ['meal', 'MEAL'], ['log', 'LOG']] as const).map(([target, label]) => <button type="button" className={target === "log" ? "cc-act cc-fab" : "cc-act"} aria-label={target === 'water' ? 'Log water' : target === 'meal' ? 'Log a meal' : 'Open LOG'} aria-haspopup="dialog" disabled={busy} key={target} onClick={() => { if (!isInFlight()) open(target); }}>{CcIcon[target === "log" ? "plus" : target === "meal" ? "meal" : "water"]()}{label}</button>)}</div>;
}
