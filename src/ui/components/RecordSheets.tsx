import { FastCapture } from "./FastCapture";
import { MealPlanPanel } from "../screens/body/MealPlanPanel";
import { captureCommitFeedback } from "../feel/feedback";
import { useHiddenFeatures } from "../hiddenFeatures";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LogSheet } from "./LogSheet";
import { getEatingWindowView, windowFuelLine } from "../../application/eatingWindow";
import { resolveWhen, shiftPointAt, type ShiftPoint, type WhenChoice } from "../../application/logTimes";
import { getLoggableDays, type LoggableDay } from "../../application/loggableDays";
import { BodyScreen } from "../screens/body/BodyScreen";
import type { RecordCorrectionRequest, RecordSheetTarget } from "../recordSheets";
import type { SavedMeal } from "../../domain/common/types";
import { ensureActiveDay, logWater, voidWaterLog } from "../../application/commands";
import { getActiveDay, getHydrationEntries } from "../../application/queries";
import { getSavedMeals, getLikelySavedMeals } from "../../application/nutritionQueries";
import { logMeal, logManualMeal, updateSavedMeal, archiveSavedMeal, voidMealLog, createSavedMeal, MAX_SERVINGS } from "../../application/nutritionCommands";
import { getFoodDiary, type FoodDiary } from "../../application/foodDiaryQueries";
import { LogEntrySheet, type LogEntryTarget } from "./LogEntrySheet";
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
export function RecordSheets({ mealRequest, correctionRequest, target, open, close, onSaved, onBusy, onHistory, onWorkout, onNotes, onAlfred }: {
  mealRequest?: { id?: string; query?: string; key: number } | null;
  correctionRequest?: RecordCorrectionRequest | null;
  target: RecordSheetTarget | null; open: (target: RecordSheetTarget) => void; close: () => void;
  onSaved: () => void; onBusy: (busy: boolean) => void; onHistory: (metric: "water" | "protein") => void; onWorkout: () => void; onNotes: () => void;
  /** ALFRED-001: LOG's first option — say it in plain words. */
  onAlfred?: () => void;
}) {
  const hiddenFeatures = useHiddenFeatures();
  const [busy, setBusyState] = useState(false); const busyRef = useRef(false);
  // LOG-TIME-001: when the drink or meal happened; NOW unless the operator says otherwise.
  const [when, setWhen] = useState<WhenChoice>({ kind: "NOW" });
  // GRAYSON WHEN upgrade: which lived day it lands on (null = today) and the recent days he can choose.
  const [logDayId, setLogDayId] = useState<string | null>(null);
  const [loggableDays, setLoggableDays] = useState<LoggableDay[]>([]);
  const chosenDay = logDayId ? loggableDays.find((d) => d.id === logDayId) ?? null : null;
  const todayShift = loggableDays.find((d) => d.isToday)?.shift ?? null;
  /** Where the next log lands: the chosen earlier day, or today's (opened if needed), and when on it. */
  async function place(): Promise<{ id: string; at: string | undefined; on: string }> {
    const day = chosenDay ?? await ensureActiveDay();
    const shift = chosenDay ? chosenDay.shift : todayShift;
    const at = resolveWhen(when, day.startedAt, new Date(), day.createdAt, shift);
    if (chosenDay && at === undefined) throw new Error(`LOG_TIME_NEEDED: pick when on ${dayWords(chosenDay)}.`);
    return { id: day.id, at, on: chosenDay ? (chosenDay.label === "Yesterday" ? " yesterday" : ` on ${chosenDay.label}`) : "" };
  }
  const resetWhen = () => { setWhen({ kind: "NOW" }); setLogDayId(null); };
  function setBusy(next: boolean) { busyRef.current = next; setBusyState(next); onBusy(next); }
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(""); const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [likely, setLikely] = useState<SavedMeal[]>([]); const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useDayRolloverRefresh(() => setRetry((key) => key + 1)); const [lastWater, setLastWater] = useState<number | null>(null);
  const [page, setPage] = useState<"list" | "new" | "quick" | "portion" | "edit" | "waterDetails" | "mealTools" | "food" | "scan">("list");
  // FOOD-001: the day's diary, the online search's results, and the food chosen from them.
  const [diary, setDiary] = useState<FoodDiary | null>(null);
  // TIMELINE-EDIT-001: the day the diary belongs to, and the entry open for a fix.
  const [diaryDayId, setDiaryDayId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<LogEntryTarget | null>(null);
  const [online, setOnline] = useState<{ query: string; state: "searching" | "done"; results: FoodSearchResult[] } | null>(null);
  const [food, setFood] = useState<FoundFood | null>(null); const [amount, setAmount] = useState("1");
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [mealId, setMealId] = useState<string | null>(null); const [servings, setServings] = useState(1);
  const [form, setForm] = useState<MealForm>(EMPTY); const [quick, setQuick] = useState<MealForm>({ ...EMPTY, name: "Quick add" });
  const [saveNext, setSaveNext] = useState(false); const [edit, setEdit] = useState<MealForm>(EMPTY);
  const [receipts, setReceipts] = useState<(Receipt & { id: number })[]>([]);
  const receiptId = useRef(0);
  const receiptKind = (receipt: Receipt) => receipt.notes ? "note" : receipt.history ?? "meal";
  function addReceipt(receipt: Receipt) {
    const next = { ...receipt, id: ++receiptId.current };
    setReceipts((old) => [...old.filter((entry) => receiptKind(entry) !== receiptKind(receipt)), next]);
  }
  const dismissReceipt = (id: number) => setReceipts((old) => old.filter((entry) => entry.id !== id));
  useSessionDraft("record-sheet-meal", Object.values(form).some(Boolean) || !!quick.calories || !!quick.proteinG);
  useSessionDraft("record-sheet-edit", page === "edit");
  const [bodyFocus, setBodyFocus] = useState<"water" | "sleep" | "weight" | "urge" | "meal" | "foodLookup" | "protein" | null>(null);
  const [bodyRequest, setBodyRequest] = useState(0);
  useEffect(() => {
    if (target !== "water" && target !== "meal" && target !== "myMeals") return;
    setLogDayId(null);
    let live = true;
    getLoggableDays().then((days) => { if (live) setLoggableDays(days); }, () => { if (live) setLoggableDays([]); });
    return () => { live = false; };
  }, [target, retry]);
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
    Promise.all([getSavedMeals(), getLikelySavedMeals(), getActiveDay().then(async (day) => day ? { water: (await getHydrationEntries(day.id)).at(-1)?.effectiveAmountOz ?? null, diary: await getFoodDiary(day.id), dayId: day.id } : { water: null, diary: null, dayId: null })])
      .then(([all, ranked, { water, diary: today, dayId }]) => { if (current) { setMeals(all); setLikely(ranked); setLastWater(water); setDiary(today); setDiaryDayId(dayId); setReadState("ready"); } })
      .catch(() => { if (current) setReadState("error"); });
    return () => { current = false; };
  }, [target, retry]);
  // GRAYSON C4.8b · 8: while logging a meal, where the eating window stands and protein against it.
  const [windowLine, setWindowLine] = useState<string | null>(null);
  useEffect(() => {
    if (target !== "meal") return;
    let current = true;
    void getEatingWindowView().then((v) => {
      if (!current) return;
      if (!v) { setWindowLine(null); return; }
      const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      setWindowLine(v.state.kind === "FASTING" ? `Eating window: fasting since ${clock(v.state.since)}. Logging food doesn't end it; TODAY will offer that.`
        : v.state.kind === "OPEN" ? (v.fuel ? `Eating window open. ${windowFuelLine(v.fuel, v.state)}` : "Eating window open.")
        : null);
    }, () => { if (current) setWindowLine(null); });
    return () => { current = false; };
  }, [target, retry]);
  const appliedMeal = useRef<number | null>(null);
  useEffect(() => {
    if (target !== "meal" || !mealRequest || readState !== "ready" || appliedMeal.current === mealRequest.key) return;
    appliedMeal.current = mealRequest.key;
    // FREE-HELPER-002: "find this food free" from Alfred's sheet runs the same SEARCH ALL FOODS.
    if (mealRequest.query) { setPage("list"); setQuery(mealRequest.query); void searchAllFoods(mealRequest.query); return; }
    if (mealRequest.id && meals.some((meal) => meal.id === mealRequest.id)) { setMealId(mealRequest.id); setServings(1); setPage("portion"); }
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
  async function mealReceipt(dayId: string, eventId: string, name: string, on = "") {
    return { message: `${name} logged${on}.`, undo: () => voidMealLog(dayId, eventId) };
  }

  async function searchAllFoods(asked = query) {
    const q = asked.trim(); if (!q) return;
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
    const day = await place();
    // Saved like MyFitnessPal's recent foods, so next time it's one tap in LIKELY NOW; an identical one is reused.
    const name = `${found.description}${found.brandOwner ? ` (${found.brandOwner})` : ""} · ${found.servingDescription}`;
    const input = { name, calories: round1(found.calories), proteinG: round1(found.proteinG), carbsG: round1(found.carbsG), fatG: round1(found.fatG),
      // NUTRIENTS-001: kept when the database gives them, so the log carries them, scaled by the amount.
      ...(found.fiberG !== undefined ? { fiberG: round1(found.fiberG) } : {}), ...(found.sodiumMg !== undefined ? { sodiumMg: Math.round(found.sodiumMg) } : {}) };
    const existing = meals.find((m) => m.name === input.name && m.calories === input.calories && m.proteinG === input.proteinG);
    const meal = existing ?? await createSavedMeal(input);
    const result = await logMeal(day.id, meal.id, servingsOfFood, day.at); resetWhen();
    return mealReceipt(day.id, result.eventId, found.description, day.on);
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
        <WhenRow when={when} onChange={setWhen} disabled={busy} days={loggableDays} dayId={logDayId} onDay={(id) => { setLogDayId(id); setWhen({ kind: "NOW" }); }} shift={chosenDay ? chosenDay.shift : todayShift} />
        <div className="cc-amounts">{[8, 12, 16, 24].map((amount) => <button type="button" key={amount} className="today-sheet__option" disabled={busy} onClick={() => void commit(async () => { const day = await place(); const at = day.at; const id = await logWater(day.id, amount, at); resetWhen(); return { message: `${amount} oz recorded${day.on}${at ? ` at ${clockOf(at)}` : ""}.`, history: "water" as const, undo: () => voidWaterLog(day.id, id) }; })}>+{amount} oz</button>)}</div>
        <button type="button" className="today-sheet__option" disabled={busy || lastWater === null || readState !== "ready"} onClick={() => lastWater !== null && void commit(async () => { const day = await place(); const amount = lastWater; const at = day.at; const id = await logWater(day.id, amount, at); resetWhen(); return { message: `${amount} oz recorded${day.on}${at ? ` at ${clockOf(at)}` : ""}.`, history: "water" as const, undo: () => voidWaterLog(day.id, id) }; })}>Repeat last{lastWater === null ? "" : ` (${lastWater} oz)`}</button>
        <button type="button" className="btn-secondary" onClick={() => { setBodyFocus("water"); setBodyRequest((key) => key + 1); setPage("waterDetails"); }}>Custom amount & entries</button>
        <button type="button" className="btn-secondary" onClick={() => onHistory("water")}>WATER HISTORY</button>
      </>}
      {(target === "meal" || target === "myMeals") && <>
        {target === "meal" && page === "list" && diary && <FoodDiaryHeader diary={diary} onEdit={diaryDayId ? (rootEventId) => setEditTarget({ beyondDayId: diaryDayId, rootEventId }) : undefined} />}
        {target === "meal" && page === "list" && windowLine && <p className="meta food-diary__window" data-eating-window-line>{windowLine}</p>}
        <LogEntrySheet target={editTarget} onClose={() => setEditTarget(null)} onChanged={async () => { if (diaryDayId) setDiary(await getFoodDiary(diaryDayId)); }} />
        {(page === "list" || page === "new" || page === "quick" || page === "portion" || page === "food") && <WhenRow when={when} onChange={setWhen} disabled={busy} days={loggableDays} dayId={logDayId} onDay={(id) => { setLogDayId(id); setWhen({ kind: "NOW" }); }} shift={chosenDay ? chosenDay.shift : todayShift} />}
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
              <button type="button" className="btn-secondary" disabled={busy} aria-label={`Log ${meal.name}`} onClick={() => void commit(async () => { const day = await place(); const result = await logMeal(day.id, meal.id, 1, day.at); resetWhen(); return mealReceipt(day.id, result.eventId, result.name, day.on); })}>LOG</button>
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
          {target === "meal" && <MealPlanPanel />}
        </>}
        {(page === "new" || page === "quick") && <>
          <p className="meta">Carbs and fat default to 0 when not entered.</p>
          {formFields(page === "quick" ? quick : form, page === "quick" ? setQuick : setForm, page === "quick" ? "Quick add" : "New meal", page === "quick")}
          {page === "new" && <label className="save-meal-choice"><input type="checkbox" disabled={busy} checked={saveNext} onChange={(event) => setSaveNext(event.target.checked)} />Save for next time</label>}
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void commit(async () => {
            const input = parse(page === "quick" ? quick : form); const day = await place();
            const result = await logManualMeal(day.id, input, page === "new" && saveNext, day.at); resetWhen();
            if (page === "quick") setQuick({ ...EMPTY, name: "Quick add" }); else { setForm(EMPTY); setSaveNext(false); }
            return mealReceipt(day.id, result.eventId, result.name, day.on);
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
          <button type="button" className="btn-primary" disabled={busy || !(servings > 0 && servings <= MAX_SERVINGS)} onClick={() => void commit(async () => { const day = await place(); const result = await logMeal(day.id, selected.id, servings, day.at); resetWhen(); return mealReceipt(day.id, result.eventId, result.name, day.on); })}>LOG</button>
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
      {target === "log" && <>{onAlfred && <button type="button" className="today-sheet__option" onClick={() => { close(); onAlfred(); }}>SAY IT TO ALFRED</button>}{(["water", "meal", "sleep", "weight", "note", "urge"] as const).map((kind) => <button type="button" className="today-sheet__option" key={kind} onClick={() => open(kind)}>{TITLE[kind]}</button>)}<button type="button" className="today-sheet__option" onClick={onWorkout}>WORKOUT SET → TRAIN</button></>}
      <div hidden={target !== "note"}><FastCapture busy={busy} onBusy={setBusy} onSaved={onSaved} onOpenCapture={onNotes} /></div>
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
 *
 * GRAYSON WHEN upgrade (Gavin, 2026-11-23: "Day picker plus shift-shaped times"): a DAY row puts the log on
 * today, yesterday or an earlier lived day from the last week, and the day's own shift offers START / MID / END /
 * AFTER as one tap. An earlier day has no "now", so it asks for one of those or a time.
 */
const dayWords = (day: LoggableDay) => day.label === "Yesterday" ? "yesterday" : day.label;
const SHIFT_POINTS: { point: ShiftPoint; label: string }[] = [
  { point: "START", label: "START" }, { point: "MID", label: "MID" }, { point: "END", label: "END" }, { point: "AFTER", label: "AFTER" },
];
function WhenRow({ when, onChange, disabled, days, dayId, onDay, shift }: {
  when: WhenChoice; onChange: (w: WhenChoice) => void; disabled: boolean;
  days: readonly LoggableDay[]; dayId: string | null; onDay: (id: string | null) => void; shift: { start: Date; end: Date } | null;
}) {
  const ago = (minutes: number) => when.kind === "AGO" && when.minutes === minutes;
  const earlier = days.filter((d) => !d.isToday);
  const yesterday = earlier[0]?.label === "Yesterday" ? earlier[0] : null;
  const older = earlier.filter((d) => d !== yesterday);
  const chosen = dayId ? days.find((d) => d.id === dayId) ?? null : null;
  const past = chosen !== null;
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return <div className="log-when-block">
    {earlier.length > 0 && <div className="log-when" role="group" aria-label="Day">
      <span className="log-when__key">DAY</span>
      <button type="button" className="chip" aria-pressed={!past} disabled={disabled} onClick={() => onDay(null)}>TODAY</button>
      {yesterday && <button type="button" className="chip" aria-pressed={dayId === yesterday.id} disabled={disabled} onClick={() => onDay(yesterday.id)}>YESTERDAY</button>}
      {older.length > 0 && <select className="input log-when__day" aria-label="Earlier day" disabled={disabled}
        value={older.some((d) => d.id === dayId) ? dayId! : ""} onChange={(e) => onDay(e.target.value || null)}>
        <option value="">EARLIER…</option>
        {older.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
      </select>}
    </div>}
    <div className="log-when" role="group" aria-label="When">
      <span className="log-when__key">WHEN</span>
      {!past && <button type="button" className="chip" aria-pressed={when.kind === "NOW"} disabled={disabled} onClick={() => onChange({ kind: "NOW" })}>NOW</button>}
      {!past && [30, 60, 120].map((m) => <button type="button" key={m} className="chip" aria-pressed={ago(m)} disabled={disabled} onClick={() => onChange({ kind: "AGO", minutes: m })}>{m < 60 ? `${m} MIN` : `${m / 60} H`} AGO</button>)}
      <input type="time" className="input log-when__at" aria-label="Pick a time" disabled={disabled} value={when.kind === "AT" ? when.hhmm : ""} onChange={(e) => onChange(e.target.value ? { kind: "AT", hhmm: e.target.value } : { kind: "NOW" })} />
    </div>
    {shift && <div className="log-when" role="group" aria-label="Shift">
      <span className="log-when__key">SHIFT</span>
      {SHIFT_POINTS.map(({ point, label }) => <button type="button" key={point} className="chip" aria-pressed={when.kind === "SHIFT" && when.point === point} disabled={disabled}
        aria-label={`${label === "AFTER" ? "After shift" : `Shift ${label.toLowerCase()}`}, ${hhmm(shiftPointAt(point, shift))}`}
        onClick={() => onChange({ kind: "SHIFT", point })}>{label} <span className="log-when__clock">{hhmm(shiftPointAt(point, shift))}</span></button>)}
    </div>}
    {past && when.kind !== "AT" && when.kind !== "SHIFT" && <p className="meta log-when__hint">Pick when on {dayWords(chosen)}.</p>}
  </div>;
}

/**
 * FOOD-001: the top of MEAL — MyFitnessPal's "Goal − Food = Remaining" with protein as the headline
 * (owner ruling), and the day's food in the order it was eaten.
 */
function FoodDiaryHeader({ diary, onEdit }: { diary: FoodDiary; onEdit?: ((rootEventId: string) => void) | undefined }) {
  const protein = Math.round(diary.proteinG), target = diary.proteinTargetG;
  const left = target === undefined ? null : Math.max(0, Math.round(target - protein));
  return <section className="food-diary" aria-label="Today's food">
    <p className="food-diary__left">{left === null ? `${protein} g protein today` : left === 0 ? `Protein target met · ${protein} g` : `${left} g protein left`}</p>
    <p className="meta">{target !== undefined ? `${protein} of ${Math.round(target)} g protein · ` : ""}{Math.round(diary.calories).toLocaleString("en-US")} kcal eaten</p>
    {/* NUTRIENTS-001: only when a meal recorded them, with how many did; a target only if one is ever set (none yet). */}
    {(diary.fiberG || diary.sodiumMg) && <p className="meta" data-food-nutrients>{[
      diary.fiberG && `Fiber ${round1(diary.fiberG.total)} g`,
      diary.sodiumMg && `Sodium ${Math.round(diary.sodiumMg.total).toLocaleString("en-US")} mg`,
    ].filter(Boolean).join(" · ")} · from {Math.max(diary.fiberG?.meals ?? 0, diary.sodiumMg?.meals ?? 0)} of {(diary.fiberG ?? diary.sodiumMg)!.ofMeals} meals</p>}
    {diary.entries.length > 0 && <details className="food-diary__list">
      <summary>TODAY'S FOOD ({diary.entries.length})</summary>
      {/* TIMELINE-EDIT-001: a row opens its fixes (change time, amount, remove). */}
      <ol>{diary.entries.map((e, i) => {
        const text = <><span className="food-diary__time">{clockOf(e.at)}</span> {e.name} · {round1(e.proteinG)} g{e.calories !== null ? ` · ${Math.round(e.calories)} kcal` : ""}</>;
        return <li key={`${e.at}-${i}`}>{onEdit ? <button type="button" className="food-diary__row" aria-label={`Edit ${e.name} at ${clockOf(e.at)}`} onClick={() => onEdit(e.rootEventId)}>{text}<span className="food-diary__edit" aria-hidden="true">EDIT ›</span></button> : text}</li>;
      })}</ol>
    </details>}
  </section>;
}
