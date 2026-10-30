import { captureCommitFeedback } from "../feel/feedback";
import { useHiddenFeatures } from "../hiddenFeatures";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LogSheet } from "./LogSheet";
import { resolveWhen, type WhenChoice } from "../../application/logTimes";
import { BodyScreen } from "../screens/body/BodyScreen";
import type { RecordCorrectionRequest, RecordSheetTarget } from "../recordSheets";
import type { SavedMeal } from "../../domain/common/types";
import { ensureActiveDay, logWater, voidWaterLog, captureItem, deleteCaptureItem } from "../../application/commands";
import { getActiveDay, getHydrationEntries } from "../../application/queries";
import { getSavedMeals, getLikelySavedMeals } from "../../application/nutritionQueries";
import { logMeal, logManualMeal, updateSavedMeal, archiveSavedMeal, voidMealLog, createSavedMeal, MAX_SERVINGS } from "../../application/nutritionCommands";
import { getFoodDiary, type FoodDiary } from "../../application/foodDiaryQueries";
import { searchFoods, type FoodSearchResult } from "../../application/foodLookupQueries";
import { lookupBarcode } from "../../application/barcodeLookup";
import { BarcodeScanner } from "./BarcodeScanner";
import { useDayRolloverRefresh } from "../hooks/useDayRolloverRefresh";
import { useSessionDraft } from "../sessionDrafts";
import { HoldButton } from "./HoldButton";
import { describeError } from "../errorMessage";
import { CcIcon } from "../cc/ccIcons";

type Receipt = { message: string; undo: () => Promise<unknown>; warning?: string; history?: "water" | "protein"; notes?: boolean };
/**
 * OWNER-GO-001 (Gavin: "When I log some stuff it says delete or undo. That can go away"): the receipt
 * is the message only, and it leaves by itself. Corrections stay in DATA's history.
 */
function ReceiptItem({ receipt, dismiss }: { receipt: Receipt; dismiss: () => void }) {
  useEffect(() => { const timer = setTimeout(dismiss, 3500); return () => clearTimeout(timer); }, []);
  return <div className="record-receipt confirm-banner"><p>{receipt.message}</p>{receipt.warning && <p>{receipt.warning}</p>}</div>;
}
type MealForm = { name: string; calories: string; proteinG: string; carbsG: string; fatG: string };
const EMPTY: MealForm = { name: "", calories: "", proteinG: "", carbsG: "", fatG: "" };
/** FOOD-001: a food from the USDA search or an Open Food Facts barcode, before it is logged. */
type FoundFood = FoodSearchResult & { source: "USDA" | "OFF" };
const SOURCE_CREDIT = { USDA: "Food data: USDA FoodData Central.", OFF: "Product data © Open Food Facts contributors (ODbL)." } as const;
/** "100 g" → 100: a per-weight food is logged by grams, anything else by servings. */
const gramsOf = (serving: string) => { const m = /^(\d+(?:\.\d+)?)\s*g$/i.exec(serving.trim()); return m ? Number(m[1]) : null; };
const round1 = (n: number) => Math.round(n * 10) / 10;
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
  // LOG-TIME-001: when the drink or meal happened; NOW unless the operator says otherwise.
  const [when, setWhen] = useState<WhenChoice>({ kind: "NOW" });
  const whenAt = (dayStartedAt: string) => resolveWhen(when, dayStartedAt, new Date());
  function setBusy(next: boolean) { busyRef.current = next; setBusyState(next); onBusy(next); }
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(""); const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [likely, setLikely] = useState<SavedMeal[]>([]); const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useDayRolloverRefresh(() => setRetry((key) => key + 1)); const [lastWater, setLastWater] = useState<number | null>(null);
  const [page, setPage] = useState<"list" | "new" | "quick" | "portion" | "edit" | "waterDetails" | "mealTools" | "food" | "scan">("list");
  // FOOD-001: the day's diary, the online search's results, and the food chosen from them.
  const [diary, setDiary] = useState<FoodDiary | null>(null);
  const [online, setOnline] = useState<{ query: string; state: "searching" | "done"; results: FoodSearchResult[] } | null>(null);
  const [food, setFood] = useState<FoundFood | null>(null); const [amount, setAmount] = useState("1");
  const [scanNote, setScanNote] = useState<string | null>(null);
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
    Promise.all([getSavedMeals(), getLikelySavedMeals(), getActiveDay().then(async (day) => day ? { water: (await getHydrationEntries(day.id)).at(-1)?.effectiveAmountOz ?? null, diary: await getFoodDiary(day.id) } : { water: null, diary: null })])
      .then(([all, ranked, { water, diary: today }]) => { if (current) { setMeals(all); setLikely(ranked); setLastWater(water); setDiary(today); setReadState("ready"); } })
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
    return { message: `${name} logged.`, undo: () => voidMealLog(dayId, eventId) };
  }

  async function searchAllFoods() {
    const q = query.trim(); if (!q) return;
    setOnline({ query: q, state: "searching", results: [] });
    const results = await searchFoods(q);
    setOnline((now) => now?.query === q ? { query: q, state: "done", results } : now);
  }
  function chooseFood(found: FoundFood) { setFood(found); const grams = gramsOf(found.servingDescription); setAmount(String(grams ?? 1)); setPage("food"); }
  async function readBarcode(code: string) {
    setScanNote("Looking it up…");
    const found = await lookupBarcode(code);
    if (found) { setScanNote(null); chooseFood({ ...found, source: "OFF" }); }
    else setScanNote("Not found in Open Food Facts. Search by name, or add it with NEW MEAL.");
  }
  /** Servings of the food's own serving that this amount is: grams ÷ base grams, or the number itself. */
  const foodServings = food ? Number(amount) / (gramsOf(food.servingDescription) ?? 1) : 0;
  const foodAmountOk = Number.isFinite(foodServings) && foodServings > 0 && foodServings <= MAX_SERVINGS;
  async function logFood(found: FoundFood, servingsOfFood: number) {
    const day = await ensureActiveDay();
    // Saved like MyFitnessPal's recent foods, so next time it's one tap in LIKELY NOW; an identical one is reused.
    const name = `${found.description}${found.brandOwner ? ` (${found.brandOwner})` : ""} · ${found.servingDescription}`;
    const input = { name, calories: round1(found.calories), proteinG: round1(found.proteinG), carbsG: round1(found.carbsG), fatG: round1(found.fatG) };
    const existing = meals.find((m) => m.name === input.name && m.calories === input.calories && m.proteinG === input.proteinG);
    const meal = existing ?? await createSavedMeal(input);
    const result = await logMeal(day.id, meal.id, servingsOfFood, whenAt(day.startedAt)); setWhen({ kind: "NOW" });
    return mealReceipt(day.id, result.eventId, found.description);
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
  if (target === "meal" || target === "myMeals") title = target === "myMeals" && page === "list" ? "MY MEALS" : { list: "MEAL", new: "NEW MEAL", quick: "QUICK ADD", portion: "SERVINGS", edit: "EDIT SAVED MEAL", waterDetails: "MEAL", mealTools: "MEAL TOOLS", food: "FOOD", scan: "SCAN BARCODE" }[page];
  return <>
    <LogSheet open={target !== null} title={title} onClose={close} canClose={() => !busyRef.current}>
      {target === "foodLookup" && !hiddenFeatures.foodLookup && <p className="meta">Show online food lookup in MORE → Hidden features.</p>}
      {busy && <p role="status">Saving…</p>}
      {error && <p role="alert">{error}</p>}
      {target === "water" && page !== "waterDetails" && <>
        <WhenRow when={when} onChange={setWhen} disabled={busy} />
        <div className="cc-amounts">{[8, 12, 16, 24].map((amount) => <button type="button" key={amount} className="today-sheet__option" disabled={busy} onClick={() => void commit(async () => { const day = await ensureActiveDay(); const at = whenAt(day.startedAt); const id = await logWater(day.id, amount, at); setWhen({ kind: "NOW" }); return { message: `${amount} oz recorded${at ? ` at ${clockOf(at)}` : ""}.`, history: "water" as const, undo: () => voidWaterLog(day.id, id) }; })}>+{amount} oz</button>)}</div>
        <button type="button" className="today-sheet__option" disabled={busy || lastWater === null || readState !== "ready"} onClick={() => lastWater !== null && void commit(async () => { const day = await ensureActiveDay(); const amount = lastWater; const at = whenAt(day.startedAt); const id = await logWater(day.id, amount, at); setWhen({ kind: "NOW" }); return { message: `${amount} oz recorded${at ? ` at ${clockOf(at)}` : ""}.`, history: "water" as const, undo: () => voidWaterLog(day.id, id) }; })}>Repeat last{lastWater === null ? "" : ` (${lastWater} oz)`}</button>
        <button type="button" className="btn-secondary" onClick={() => { setBodyFocus("water"); setBodyRequest((key) => key + 1); setPage("waterDetails"); }}>Custom amount & entries</button>
        <button type="button" className="btn-secondary" onClick={() => onHistory("water")}>WATER HISTORY</button>
      </>}
      {(target === "meal" || target === "myMeals") && <>
        {target === "meal" && page === "list" && diary && <FoodDiaryHeader diary={diary} />}
        {(page === "list" || page === "new" || page === "quick" || page === "portion" || page === "food") && <WhenRow when={when} onChange={setWhen} disabled={busy} />}
        {page !== "list" && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPage("list")}>BACK TO MY MEALS</button>}
        {page === "list" && <>
          {/* NAV-001: starting a new meal comes first, not after the whole list. */}
          <div className="record-meal-start">
            <button type="button" className="btn-secondary" onClick={() => { if (!form.name) setForm({ ...form, name: query.trim() }); setPage("new"); }}>NEW MEAL{query.trim() ? ` ‘${query.trim()}’` : ""}</button>
            <button type="button" className="btn-secondary" onClick={() => setPage("quick")}>QUICK ADD</button>
            <button type="button" className="btn-secondary" onClick={() => { setScanNote(null); setPage("scan"); }}>SCAN BARCODE</button>
          </div>
          <label className="field">Search your meals and foods<input className="input" type="search" aria-label="Search your meals and foods" value={query} onChange={(event) => { setQuery(event.target.value); setOnline(null); }} /></label>
          {readState === "loading" ? <p role="status">Reading meals…</p> : readState === "error" ? <p role="alert">Could not read your meals.<button type="button" className="btn-secondary" onClick={() => setRetry((key) => key + 1)}>RETRY MEALS</button></p> : <>
            <h3>{target === "myMeals" ? "MY MEALS" : query.trim() ? "MATCHES" : "LIKELY NOW"}</h3>
            {(target === "myMeals" && !query.trim() ? meals : displayed).map((meal) => <div className="record-meal-row" key={meal.id}>
              <button type="button" className="btn-secondary" disabled={busy} aria-label={`Servings for ${meal.name}`} onClick={() => chooseMeal(meal)}><strong>{meal.name}</strong><span className="meta">{meal.calories} kcal · {meal.proteinG} g protein · 1 serving</span></button>
              <button type="button" className="btn-secondary" disabled={busy} aria-label={`Log ${meal.name}`} onClick={() => void commit(async () => { const day = await ensureActiveDay(); const result = await logMeal(day.id, meal.id, 1, whenAt(day.startedAt)); setWhen({ kind: "NOW" }); return mealReceipt(day.id, result.eventId, result.name); })}>LOG</button>
            </div>)}
            {!displayed.length && <p>No matching meals.</p>}
            {/* FOOD-001: MyFitnessPal's "search all foods" — online only when asked, so nothing leaves the phone by typing. */}
            {query.trim() && target === "meal" && <>
              {online?.query !== query.trim() && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void searchAllFoods()}>SEARCH ALL FOODS FOR ‘{query.trim()}’</button>}
              {online?.query === query.trim() && <>
                <h3>ALL FOODS</h3>
                {online.state === "searching" ? <p role="status">Searching USDA FoodData Central…</p> : online.results.length === 0 ? <p>No foods found. Try other words, or add it with NEW MEAL.</p> : <>
                  {online.results.map((r) => <div className="record-meal-row" key={r.fdcId}>
                    <button type="button" className="btn-secondary" disabled={busy} aria-label={`Amount for ${r.description}`} onClick={() => chooseFood({ ...r, source: "USDA" })}><strong>{r.description}</strong><span className="meta">{r.brandOwner ? `${r.brandOwner} · ` : ""}{Math.round(r.calories)} kcal · {round1(r.proteinG)} g protein per {r.servingDescription}</span></button>
                  </div>)}
                  <p className="meta">{SOURCE_CREDIT.USDA}</p>
                </>}
              </>}
            </>}
          </>}
          <button type="button" className="btn-secondary" onClick={() => { setBodyFocus("meal"); setBodyRequest((key) => key + 1); setPage("mealTools"); }}>More meal tools & corrections</button>
        </>}
        {(page === "new" || page === "quick") && <>
          <p className="meta">Carbs and fat default to 0 when not entered.</p>
          {formFields(page === "quick" ? quick : form, page === "quick" ? setQuick : setForm, page === "quick" ? "Quick add" : "New meal", page === "quick")}
          {page === "new" && <label className="save-meal-choice"><input type="checkbox" disabled={busy} checked={saveNext} onChange={(event) => setSaveNext(event.target.checked)} />Save for next time</label>}
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void commit(async () => {
            const input = parse(page === "quick" ? quick : form); const day = await ensureActiveDay();
            const result = await logManualMeal(day.id, input, page === "new" && saveNext, whenAt(day.startedAt)); setWhen({ kind: "NOW" });
            if (page === "quick") setQuick({ ...EMPTY, name: "Quick add" }); else { setForm(EMPTY); setSaveNext(false); }
            return mealReceipt(day.id, result.eventId, result.name);
          })}>LOG</button>
        </>}
        {page === "scan" && <>
          <BarcodeScanner disabled={busy} onCode={(code) => void readBarcode(code)} />
          {scanNote && <p role="status">{scanNote}</p>}
          <p className="meta">{SOURCE_CREDIT.OFF}</p>
        </>}
        {page === "food" && food && <>
          <h3>{food.description}</h3>
          <p className="meta">{food.brandOwner ? `${food.brandOwner} · ` : ""}Per {food.servingDescription}: {Math.round(food.calories)} kcal · {round1(food.proteinG)} g protein</p>
          <label className="field">{gramsOf(food.servingDescription) !== null ? "Amount (g)" : "Servings"}<input className="input" type="number" inputMode="decimal" min="0" step="any" aria-label={gramsOf(food.servingDescription) !== null ? "Amount in grams" : "Number of servings"} value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          {foodAmountOk ? <p>{Math.round(food.calories * foodServings)} kcal · {round1(food.proteinG * foodServings)} g protein</p> : <p role="alert">Enter an amount above 0.</p>}
          <button type="button" className="btn-primary" disabled={busy || !foodAmountOk} onClick={() => void commit(() => logFood(food, foodServings))}>LOG</button>
          <p className="meta">{SOURCE_CREDIT[food.source]}</p>
        </>}
        {page === "portion" && selected && <>
          <h3>{selected.name}</h3><div className="cc-amounts">{[.5, 1, 1.5, 2].map((amount) => <button type="button" className="chip" aria-pressed={servings === amount} disabled={busy} key={amount} onClick={() => setServings(amount)}>{amount} serving{amount === 1 ? "" : "s"}</button>)}</div>
          {/* FOOD-001: any number of servings, as MyFitnessPal allows. */}
          <label className="field">Servings<input className="input" type="number" inputMode="decimal" min="0" step="any" aria-label="Number of servings" value={servings} onChange={(event) => setServings(Number(event.target.value))} /></label>
          <p>{Math.round(selected.calories * servings)} kcal · {round1(selected.proteinG * servings)} g protein</p>
          <button type="button" className="btn-primary" disabled={busy || !(servings > 0 && servings <= MAX_SERVINGS)} onClick={() => void commit(async () => { const day = await ensureActiveDay(); const result = await logMeal(day.id, selected.id, servings, whenAt(day.startedAt)); setWhen({ kind: "NOW" }); return mealReceipt(day.id, result.eventId, result.name); })}>LOG</button>
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
    {receipts.length > 0 && <div className="redesign-toast" role="status">{receipts.map((receipt) => <ReceiptItem key={receipt.id} receipt={receipt} dismiss={() => dismissReceipt(receipt.id)} />)}
      {error && !target && <p role="alert">{error}</p>}
    </div>}
  </>;
}

/**
 * The floating LOG steps aside while you scroll down, so it never sits on the control you are reading
 * toward, and comes back when you scroll up, reach the end, or return to the top. Operator-initiated
 * motion only (SUIT-VOLUME-001); a keyboard focus always brings it back.
 */

/** NAV-001: WATER and MEAL stay as one-tap shortcuts on TODAY. OWNER-GO-001: LOG moved to the bottom bar. */
export function LogActions({ open, busy = false, isInFlight = () => busy }: { open: (target: RecordSheetTarget) => void; busy?: boolean; isInFlight?: () => boolean }) {
  return <div className="console-controls cc-actions cc-actions--two" role="group" aria-label="Log actions">{([['water', 'WATER'], ['meal', 'MEAL']] as const).map(([target, label]) => <button type="button" className="cc-act" aria-label={target === 'water' ? 'Log water' : 'Log a meal'} aria-haspopup="dialog" disabled={busy} key={target} onClick={() => { if (!isInFlight()) open(target); }}>{CcIcon[target === "meal" ? "meal" : "water"]()}{label}</button>)}</div>;
}

const clockOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * LOG-TIME-001: one extra tap to say when it happened. NOW is the default; a time ahead within the day
 * is a pre-log. The choice applies to the next log only, then returns to NOW.
 */
function WhenRow({ when, onChange, disabled }: { when: WhenChoice; onChange: (w: WhenChoice) => void; disabled: boolean }) {
  const ago = (minutes: number) => when.kind === "AGO" && when.minutes === minutes;
  return <div className="log-when" role="group" aria-label="When">
    <span className="log-when__key">WHEN</span>
    <button type="button" className="chip" aria-pressed={when.kind === "NOW"} disabled={disabled} onClick={() => onChange({ kind: "NOW" })}>NOW</button>
    {[30, 60, 120].map((m) => <button type="button" key={m} className="chip" aria-pressed={ago(m)} disabled={disabled} onClick={() => onChange({ kind: "AGO", minutes: m })}>{m < 60 ? `${m} MIN` : `${m / 60} H`} AGO</button>)}
    <input type="time" className="input log-when__at" aria-label="Pick a time" disabled={disabled} value={when.kind === "AT" ? when.hhmm : ""} onChange={(e) => onChange(e.target.value ? { kind: "AT", hhmm: e.target.value } : { kind: "NOW" })} />
  </div>;
}

/**
 * FOOD-001: the top of MEAL — MyFitnessPal's "Goal − Food = Remaining" with protein as the headline
 * (owner ruling), and the day's food in the order it was eaten.
 */
function FoodDiaryHeader({ diary }: { diary: FoodDiary }) {
  const protein = Math.round(diary.proteinG), target = diary.proteinTargetG;
  const left = target === undefined ? null : Math.max(0, Math.round(target - protein));
  return <section className="food-diary" aria-label="Today's food">
    <p className="food-diary__left">{left === null ? `${protein} g protein today` : left === 0 ? `Protein target met · ${protein} g` : `${left} g protein left`}</p>
    <p className="meta">{target !== undefined ? `${protein} of ${Math.round(target)} g protein · ` : ""}{Math.round(diary.calories).toLocaleString("en-US")} kcal eaten</p>
    {diary.entries.length > 0 && <details className="food-diary__list">
      <summary>TODAY'S FOOD ({diary.entries.length})</summary>
      <ol>{diary.entries.map((e, i) => <li key={`${e.at}-${i}`}><span className="food-diary__time">{clockOf(e.at)}</span> {e.name} · {round1(e.proteinG)} g{e.calories !== null ? ` · ${Math.round(e.calories)} kcal` : ""}</li>)}</ol>
    </details>}
  </section>;
}
