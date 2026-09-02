import { useEffect, useState } from "react";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { Icon } from "../../icons/Icon";
import type { BeyondDay, HydrationEntry, SavedMeal } from "../../../domain/common/types";
import {
  logWater,
  correctWater,
  logSleep,
  correctSleep,
  logBodyweight,
  correctBodyweight,
  logProtein,
  correctProtein,
  ensureActiveDay,
} from "../../../application/commands";
import {
  getActiveDay,
  getEffectiveHydrationTotal,
  getHydrationEntries,
  getSleepEntries,
  getBodyweightEntries,
  getProteinEntries,
  type SleepEntry,
  type BodyweightEntry,
  type ProteinEntry,
} from "../../../application/queries";
import {
  archiveSavedMeal,
  correctMealLog,
  createSavedMeal,
  logMeal,
  updateSavedMeal,
} from "../../../application/nutritionCommands";
import { getMealEntries, getSavedMeals, type NutritionEntry } from "../../../application/nutritionQueries";
import { searchFoods, type FoodSearchResult } from "../../../application/foodLookupQueries";
import {
  BODYWEIGHT_PLAUSIBLE_RANGE,
  describeBodyweightLogged,
  describeImplausibleBodyweight,
  describeImplausibleProtein,
  describeImplausibleSleep,
  describeProteinLogged,
  describeSleepLogged,
  describeWaterLogged,
  formatDuration,
  hoursAndMinutesToTotalMinutes,
  isImplausible,
  PROTEIN_PLAUSIBLE_RANGE,
  SLEEP_PRIMARY_PLAUSIBLE_RANGE,
  SLEEP_SUPPLEMENTAL_PLAUSIBLE_RANGE,
  totalMinutesToHoursAndMinutes,
  WATER_QUICK_ADD_OZ,
} from "./bodyScreenCopy";
import { describeMacros, describeMealLogged, MEALS_TODAY_EMPTY, SAVED_MEALS_EMPTY } from "./nutritionCopy";

type Confirmation = { message: string; headEventId: string } | null;

interface MealFormState {
  name: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}
const EMPTY_MEAL_FORM: MealFormState = { name: "", calories: "", proteinG: "", carbsG: "", fatG: "" };

interface MealMacroFormState {
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}
const EMPTY_MEAL_MACRO_FORM: MealMacroFormState = { calories: "", proteinG: "", carbsG: "", fatG: "" };

/**
 * NUTRITION-001: the same four-numeric-field group is needed by the add-
 * meal form, the edit-meal form, and the correct-a-logged-meal form —
 * extracted once (a module-level function, not a component: pure JSX
 * from props, no state of its own) rather than repeated three times.
 */
/**
 * `labelPrefix` (e.g. "New meal" / "Edit meal" / "Corrected") makes each
 * field's accessible NAME unique, not just its DOM id — the add-meal
 * form, an in-progress edit, and a correction can all be open on screen
 * at once (independent disclosure/edit/correction state), and a bare
 * "Protein (g)" would also collide with BODY's own PROTEIN station
 * field of the same name. idPrefix only needs to be unique for the
 * id/htmlFor pairing; labelPrefix is what a screen reader user actually
 * hears, so it has to disambiguate on its own.
 */
function renderMealMacroInputs(
  form: MealMacroFormState,
  onChange: (patch: Partial<MealMacroFormState>) => void,
  idPrefix: string,
  labelPrefix: string,
) {
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor={`${idPrefix}-calories`}><span>{labelPrefix} calories</span></label>
          <input
            id={`${idPrefix}-calories`}
            type="number"
            min={0}
            value={form.calories}
            onChange={(e) => onChange({ calories: e.target.value })}
            className="input"
          />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor={`${idPrefix}-protein`}><span>{labelPrefix} protein (g)</span></label>
          <input
            id={`${idPrefix}-protein`}
            type="number"
            min={0}
            value={form.proteinG}
            onChange={(e) => onChange({ proteinG: e.target.value })}
            className="input"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor={`${idPrefix}-carbs`}><span>{labelPrefix} carbs (g)</span></label>
          <input
            id={`${idPrefix}-carbs`}
            type="number"
            min={0}
            value={form.carbsG}
            onChange={(e) => onChange({ carbsG: e.target.value })}
            className="input"
          />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor={`${idPrefix}-fat`}><span>{labelPrefix} fat (g)</span></label>
          <input
            id={`${idPrefix}-fat`}
            type="number"
            min={0}
            value={form.fatG}
            onChange={(e) => onChange({ fatG: e.target.value })}
            className="input"
          />
        </div>
      </div>
    </>
  );
}

function parseMealMacros(form: MealMacroFormState): { calories: number; proteinG: number; carbsG: number; fatG: number } | null {
  const calories = Number(form.calories);
  const proteinG = Number(form.proteinG);
  const carbsG = Number(form.carbsG);
  const fatG = Number(form.fatG);
  if (![calories, proteinG, carbsG, fatG].every((n) => Number.isFinite(n) && n >= 0)) return null;
  return { calories, proteinG, carbsG, fatG };
}

export function BodyScreen() {
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Water
  const [entries, setEntries] = useState<HydrationEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [input, setInput] = useState("");
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");
  const [waterConfirmation, setWaterConfirmation] = useState<Confirmation>(null);
  const [waterHistoryOpen, setWaterHistoryOpen] = useState(false);
  // Overdrive Phase 18 (REAL-DEVICE ACCEPTANCE CORRECTION, BODY
  // GLANCEABILITY): the manual custom-amount entry is a fallback once
  // quick-add already covers the common case — defaults collapsed so
  // each card reads as "fast action, then more if you need it" instead
  // of a permanently-open form. Progressively disclosed, never removed.
  const [waterManualOpen, setWaterManualOpen] = useState(false);

  // Sleep
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [sleepKind, setSleepKind] = useState<"PRIMARY" | "SUPPLEMENTAL">("PRIMARY");
  const [sleepHoursInput, setSleepHoursInput] = useState("");
  const [sleepMinutesInput, setSleepMinutesInput] = useState("");
  const [sleepPendingConfirm, setSleepPendingConfirm] = useState(false);
  const [sleepCorrectingId, setSleepCorrectingId] = useState<string | null>(null);
  const [sleepCorrectionHours, setSleepCorrectionHours] = useState("");
  const [sleepCorrectionMinutes, setSleepCorrectionMinutes] = useState("");
  const [sleepConfirmation, setSleepConfirmation] = useState<Confirmation>(null);
  const [sleepHistoryOpen, setSleepHistoryOpen] = useState(false);

  // Bodyweight
  const [bodyweightEntries, setBodyweightEntries] = useState<BodyweightEntry[]>([]);
  const [bodyweightInput, setBodyweightInput] = useState("");
  const [bodyweightPendingConfirm, setBodyweightPendingConfirm] = useState(false);
  const [bodyweightCorrectingId, setBodyweightCorrectingId] = useState<string | null>(null);
  const [bodyweightCorrectionInput, setBodyweightCorrectionInput] = useState("");
  const [bodyweightConfirmation, setBodyweightConfirmation] = useState<Confirmation>(null);
  const [bodyweightHistoryOpen, setBodyweightHistoryOpen] = useState(false);
  // Manual entry only has a real "fast path" alternative (SAME AS LAST)
  // once a prior entry exists — see the `lastBodyweightEntry ? ... : ...`
  // branch further down (FieldDisclosure vs. always-open).
  const [bodyweightManualOpen, setBodyweightManualOpen] = useState(false);

  // Protein
  const [proteinEntries, setProteinEntries] = useState<ProteinEntry[]>([]);
  const [proteinInput, setProteinInput] = useState("");
  const [proteinPendingConfirm, setProteinPendingConfirm] = useState(false);
  const [proteinCorrectingId, setProteinCorrectingId] = useState<string | null>(null);
  const [proteinCorrectionInput, setProteinCorrectionInput] = useState("");
  const [proteinConfirmation, setProteinConfirmation] = useState<Confirmation>(null);
  const [proteinHistoryOpen, setProteinHistoryOpen] = useState(false);
  const [proteinManualOpen, setProteinManualOpen] = useState(false);

  // Meal Memory (NUTRITION-001)
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [mealEntries, setMealEntries] = useState<NutritionEntry[]>([]);
  const [mealConfirmation, setMealConfirmation] = useState<Confirmation>(null);
  const [mealHistoryOpen, setMealHistoryOpen] = useState(false);
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [newMealForm, setNewMealForm] = useState<MealFormState>(EMPTY_MEAL_FORM);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editMealForm, setEditMealForm] = useState<MealFormState>(EMPTY_MEAL_FORM);
  const [correctingMealEventId, setCorrectingMealEventId] = useState<string | null>(null);
  const [mealCorrectionForm, setMealCorrectionForm] = useState<MealMacroFormState>(EMPTY_MEAL_MACRO_FORM);
  // NUTRITION-002 (2026-09-02): USDA FoodData Central search, scoped to the
  // "ADD MEAL" form only — see application/foodLookupQueries.ts's own doc
  // comment. A selected result only ever pre-fills newMealForm below; the
  // operator still reviews/edits and clicks SAVE MEAL themselves.
  const [foodQuery, setFoodQuery] = useState("");
  const [foodSearchBusy, setFoodSearchBusy] = useState(false);
  const [foodResults, setFoodResults] = useState<FoodSearchResult[] | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const activeDay = (await getActiveDay()) ?? null;
    setDay(activeDay);
    // SavedMeal presets are not day-scoped (same as SchedulePattern) —
    // loaded regardless of whether a day exists yet, since creating one
    // doesn't require ensureActiveDay (only logMeal does).
    setSavedMeals(await getSavedMeals());
    if (activeDay) {
      setEntries(await getHydrationEntries(activeDay.id));
      setTotal(await getEffectiveHydrationTotal(activeDay.id));
      setSleepEntries(await getSleepEntries(activeDay.id));
      setBodyweightEntries(await getBodyweightEntries(activeDay.id));
      setProteinEntries(await getProteinEntries(activeDay.id));
      setMealEntries(await getMealEntries(activeDay.id));
    } else {
      setMealEntries([]);
    }
  }

  const proteinTotal = proteinEntries.reduce((sum, e) => sum + e.effectiveGrams, 0);
  const lastWaterAmount = entries.length > 0 ? entries[entries.length - 1]!.effectiveAmountOz : null;
  const lastSleepEntry = sleepEntries.length > 0 ? sleepEntries[sleepEntries.length - 1]! : null;
  const lastBodyweightEntry = bodyweightEntries.length > 0 ? bodyweightEntries[bodyweightEntries.length - 1]! : null;
  const lastProteinEntry = proteinEntries.length > 0 ? proteinEntries[proteinEntries.length - 1]! : null;

  // ---- SLEEP ----

  async function handleLogSleep(skipConfirm = false) {
    if (busy) return;
    const hours = Number(sleepHoursInput) || 0;
    const minutes = Number(sleepMinutesInput) || 0;
    const totalMinutes = hoursAndMinutesToTotalMinutes(hours, minutes);
    if (totalMinutes <= 0) {
      setError("Enter a sleep duration.");
      return;
    }
    const range = sleepKind === "PRIMARY" ? SLEEP_PRIMARY_PLAUSIBLE_RANGE : SLEEP_SUPPLEMENTAL_PLAUSIBLE_RANGE;
    if (!skipConfirm && isImplausible(totalMinutes, range)) {
      setSleepPendingConfirm(true);
      return;
    }
    setBusy(true);
    setError(null);
    setSleepPendingConfirm(false);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logSleep(activeDay.id, totalMinutes, sleepKind);
      setSleepHoursInput("");
      setSleepMinutesInput("");
      setSleepKind("PRIMARY");
      setSleepConfirmation({ message: describeSleepLogged(totalMinutes), headEventId: eventId });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function beginCorrectSleep(entry: SleepEntry) {
    setSleepCorrectingId(entry.headEventId);
    const { hours, minutes } = totalMinutesToHoursAndMinutes(entry.effectiveDurationMinutes);
    setSleepCorrectionHours(String(hours));
    setSleepCorrectionMinutes(String(minutes));
    setError(null);
    // The correction row lives inside the collapsed history disclosure —
    // called from the just-logged confirmation banner too, where that
    // disclosure may still be closed.
    setSleepHistoryOpen(true);
  }

  async function handleSaveSleepCorrection() {
    if (busy || !day || !sleepCorrectingId) return;
    const hours = Number(sleepCorrectionHours) || 0;
    const minutes = Number(sleepCorrectionMinutes) || 0;
    const totalMinutes = hoursAndMinutesToTotalMinutes(hours, minutes);
    if (totalMinutes <= 0) {
      setError("Enter a sleep duration.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await correctSleep(day.id, sleepCorrectingId, totalMinutes);
      setSleepCorrectingId(null);
      if (sleepConfirmation?.headEventId === sleepCorrectingId) setSleepConfirmation(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  // ---- BODYWEIGHT ----

  async function handleLogBodyweightAmount(weight: number) {
    if (busy || weight <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logBodyweight(activeDay.id, weight);
      setBodyweightInput("");
      setBodyweightConfirmation({ message: describeBodyweightLogged(weight), headEventId: eventId });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLogBodyweight(skipConfirm = false) {
    if (busy) return;
    const weight = Number(bodyweightInput);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("Enter a positive weight in lbs.");
      return;
    }
    if (!skipConfirm && isImplausible(weight, BODYWEIGHT_PLAUSIBLE_RANGE)) {
      setBodyweightPendingConfirm(true);
      return;
    }
    setBodyweightPendingConfirm(false);
    await handleLogBodyweightAmount(weight);
  }

  function beginCorrectBodyweight(entry: BodyweightEntry) {
    setBodyweightCorrectingId(entry.headEventId);
    setBodyweightCorrectionInput(String(entry.effectiveWeightLbs));
    setError(null);
    setBodyweightHistoryOpen(true);
  }

  async function handleSaveBodyweightCorrection() {
    if (busy || !day || !bodyweightCorrectingId) return;
    const weight = Number(bodyweightCorrectionInput);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("Enter a positive weight in lbs.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await correctBodyweight(day.id, bodyweightCorrectingId, weight);
      setBodyweightCorrectingId(null);
      if (bodyweightConfirmation?.headEventId === bodyweightCorrectingId) setBodyweightConfirmation(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  // ---- PROTEIN ----

  async function handleLogProteinAmount(grams: number) {
    if (busy || grams <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logProtein(activeDay.id, grams);
      setProteinInput("");
      setProteinConfirmation({ message: describeProteinLogged(grams), headEventId: eventId });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLogProtein(skipConfirm = false) {
    if (busy) return;
    const grams = Number(proteinInput);
    if (!Number.isFinite(grams) || grams <= 0) {
      setError("Enter a positive number of grams.");
      return;
    }
    if (!skipConfirm && isImplausible(grams, PROTEIN_PLAUSIBLE_RANGE)) {
      setProteinPendingConfirm(true);
      return;
    }
    setProteinPendingConfirm(false);
    await handleLogProteinAmount(grams);
  }

  function beginCorrectProtein(entry: ProteinEntry) {
    setProteinCorrectingId(entry.headEventId);
    setProteinCorrectionInput(String(entry.effectiveGrams));
    setError(null);
    setProteinHistoryOpen(true);
  }

  async function handleSaveProteinCorrection() {
    if (busy || !day || !proteinCorrectingId) return;
    const grams = Number(proteinCorrectionInput);
    if (!Number.isFinite(grams) || grams <= 0) {
      setError("Enter a positive number of grams.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await correctProtein(day.id, proteinCorrectingId, grams);
      setProteinCorrectingId(null);
      if (proteinConfirmation?.headEventId === proteinCorrectingId) setProteinConfirmation(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  // ---- MEAL MEMORY (NUTRITION-001) ----

  async function handleSearchFoods() {
    if (foodSearchBusy || !foodQuery.trim()) return;
    setFoodSearchBusy(true);
    try {
      setFoodResults(await searchFoods(foodQuery));
    } finally {
      setFoodSearchBusy(false);
    }
  }

  // A selection only ever pre-fills the form below — it is not saved until
  // the operator reviews it and clicks SAVE MEAL themselves (same "always a
  // proposal, never silently committed" treatment as Capture Intelligence's
  // due-date suggestions).
  function handleSelectFoodResult(result: FoodSearchResult) {
    setNewMealForm({
      name: result.description,
      calories: String(result.calories),
      proteinG: String(result.proteinG),
      carbsG: String(result.carbsG),
      fatG: String(result.fatG),
    });
    setFoodResults(null);
    setFoodQuery("");
  }

  async function handleCreateSavedMeal() {
    if (busy) return;
    const name = newMealForm.name.trim();
    const macros = parseMealMacros(newMealForm);
    if (!name) {
      setError("Enter a meal name.");
      return;
    }
    if (!macros) {
      setError("Enter calories/protein/carbs/fat as numbers 0 or more.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createSavedMeal({ name, ...macros });
      setNewMealForm(EMPTY_MEAL_FORM);
      setAddMealOpen(false);
      setFoodQuery("");
      setFoodResults(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save meal.");
    } finally {
      setBusy(false);
    }
  }

  function beginEditSavedMeal(meal: SavedMeal) {
    setEditingMealId(meal.id);
    setEditMealForm({
      name: meal.name,
      calories: String(meal.calories),
      proteinG: String(meal.proteinG),
      carbsG: String(meal.carbsG),
      fatG: String(meal.fatG),
    });
    setError(null);
  }

  async function handleSaveMealEdit() {
    if (busy || !editingMealId) return;
    const name = editMealForm.name.trim();
    const macros = parseMealMacros(editMealForm);
    if (!name) {
      setError("Enter a meal name.");
      return;
    }
    if (!macros) {
      setError("Enter calories/protein/carbs/fat as numbers 0 or more.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateSavedMeal(editingMealId, { name, ...macros });
      setEditingMealId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update meal.");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveSavedMeal(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await archiveSavedMeal(id);
      if (editingMealId === id) setEditingMealId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLogMeal(mealId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      const result = await logMeal(activeDay.id, mealId);
      setMealConfirmation({ message: describeMealLogged(result.name), headEventId: result.eventId });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log meal.");
    } finally {
      setBusy(false);
    }
  }

  function beginCorrectMeal(entry: NutritionEntry) {
    setCorrectingMealEventId(entry.headEventId);
    setMealCorrectionForm({
      calories: String(entry.effectiveCalories),
      proteinG: String(entry.effectiveProteinG),
      carbsG: String(entry.effectiveCarbsG),
      fatG: String(entry.effectiveFatG),
    });
    setError(null);
    setMealHistoryOpen(true);
  }

  async function handleSaveMealCorrection() {
    if (busy || !day || !correctingMealEventId) return;
    const macros = parseMealMacros(mealCorrectionForm);
    if (!macros) {
      setError("Enter calories/protein/carbs/fat as numbers 0 or more.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await correctMealLog(day.id, correctingMealEventId, macros);
      setCorrectingMealEventId(null);
      if (mealConfirmation?.headEventId === correctingMealEventId) setMealConfirmation(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  // ---- WATER ----

  async function handleLogWaterAmount(amount: number) {
    if (busy || amount <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const activeDay = await ensureActiveDay();
      const eventId = await logWater(activeDay.id, amount);
      setInput("");
      setWaterConfirmation({ message: describeWaterLogged(amount), headEventId: eventId });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLog() {
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive number of ounces.");
      return;
    }
    await handleLogWaterAmount(amount);
  }

  async function handleCorrect(entry: HydrationEntry) {
    if (busy || !day) return;
    const amount = Number(correctionInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive number of ounces.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await correctWater(day.id, entry.headEventId, amount);
      setCorrectingId(null);
      setCorrectionInput("");
      if (waterConfirmation?.headEventId === entry.headEventId) setWaterConfirmation(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  // VISUAL-003: the manual-entry form's own markup is identical whether
  // it's reached through FieldDisclosure (a prior entry exists, so it's
  // a subordinate fallback) or shown unconditionally (no prior entry, no
  // faster path exists yet) — extracted once so that real duplication
  // isn't repeated across the two branches below.
  const bodyweightManualEntryForm = (
    <>
      <div className="field">
        <label htmlFor="bodyweight-lbs"><span>Weight (lbs)</span></label>
        <input
          id="bodyweight-lbs"
          type="number"
          min={0}
          value={bodyweightInput}
          onChange={(e) => {
            setBodyweightInput(e.target.value);
            setBodyweightPendingConfirm(false);
          }}
          className="input"
        />
      </div>
      {bodyweightPendingConfirm && (
        <div style={{ marginBottom: 12 }}>
          <p className="meta" style={{ color: "var(--warning)", marginBottom: 8 }}>
            {describeImplausibleBodyweight(Number(bodyweightInput) || 0)}
          </p>
          <button className="btn-secondary" disabled={busy} onClick={() => void handleLogBodyweight(true)}>
            LOG ANYWAY
          </button>
        </div>
      )}
      {!bodyweightPendingConfirm && (
        <button className="btn-primary" disabled={busy} onClick={() => void handleLogBodyweight()}>
          LOG BODYWEIGHT
        </button>
      )}
    </>
  );

  const proteinManualEntryForm = (
    <>
      <div className="field">
        <label htmlFor="protein-grams"><span>Protein (g)</span></label>
        <input
          id="protein-grams"
          type="number"
          min={0}
          value={proteinInput}
          onChange={(e) => {
            setProteinInput(e.target.value);
            setProteinPendingConfirm(false);
          }}
          className="input"
        />
      </div>
      {proteinPendingConfirm && (
        <div style={{ marginBottom: 12 }}>
          <p className="meta" style={{ color: "var(--warning)", marginBottom: 8 }}>
            {describeImplausibleProtein(Number(proteinInput) || 0)}
          </p>
          <button className="btn-secondary" disabled={busy} onClick={() => void handleLogProtein(true)}>
            LOG ANYWAY
          </button>
        </div>
      )}
      {!proteinPendingConfirm && (
        <button className="btn-primary" disabled={busy} onClick={() => void handleLogProtein()}>
          LOG PROTEIN
        </button>
      )}
    </>
  );

  return (
    <div className="screen fade-in body-field">
      {/* FIELD ALPHA Phase 3: identity zone quieted, same principle
          TODAY/TRAIN applied — freed territory belongs to the
          instrument cluster below, not screen chrome.
          FIELD-001: wrapped in .field-header, matching TODAY/TRAIN's own
          identity treatment. The existing descriptive sentence becomes
          the tagline's sub-line verbatim (reused, not duplicated) under
          a new truthful headline stating what BODY actually is —
          evidence, not a second recommendation authority. */}
      <div className="field-header">
        <Icon name="body" size={22} />
        <h1 className="eyebrow">BODY // ESSENTIALS</h1>
      </div>
      <div className="field-tagline">
        <h2 className="field-tagline__headline">Evidence, not noise.</h2>
        <p className="field-tagline__sub">Fast inputs, kept as a permanent record. Correct mistakes without erasing what happened.</p>
      </div>

      {/* Overdrive Phase 5: a single glanceable status strip before the
          four separate logging cards, so BODY reads as one physical-status
          subsystem at a glance instead of four unrelated forms you have to
          scroll through to piece together. Purely a summary of state
          already computed below (total/proteinTotal/lastSleepEntry/
          lastBodyweightEntry) — no new query, no new fact, nothing this
          strip shows isn't already the source of truth for its own card.
          FIELD ALPHA Phase 3: now .instrument-cluster (see global.css) —
          a real orientation-layer primitive instead of a bare .card with
          an inline CSS grid, still no corner-flag/red accent, deliberately
          — BODY's four trackers are peer subsystems, not one leading
          recommendation the way TODAY/TRAIN have; marking any single one
          of them as "the leader" would manufacture a hierarchy that
          doesn't exist in the product. */}
      <p className="section-label section-label--field">Status</p>

      {/* VISUAL-003: reordered to match the LOG section's own station
          order (Water, Sleep, Weight, Protein) below — Status previously
          listed Protein before Sleep/Weight, a mismatch that cost a
          re-scan when moving from "what's recorded" to "where do I log
          it." Same four facts, same instrument-cluster primitive, no new
          value. */}
      <div className="instrument-cluster">
        <div>
          <p className="meta" style={{ margin: 0 }}>WATER</p>
          <p className="status-value">{total} oz</p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>SLEEP</p>
          <p className={lastSleepEntry ? "status-value" : "status-value status-value--empty"}>
            {lastSleepEntry ? formatDuration(lastSleepEntry.effectiveDurationMinutes) : "Not logged"}
          </p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>WEIGHT</p>
          <p className={lastBodyweightEntry ? "status-value" : "status-value status-value--empty"}>
            {lastBodyweightEntry ? `${lastBodyweightEntry.effectiveWeightLbs} lbs` : "Not logged"}
          </p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>PROTEIN</p>
          <p className="status-value">{proteinTotal} g</p>
        </div>
      </div>

      {/* FIELD-001 (Review Correction): the owner review found the first
          pass too incremental — a bigger STATUS plane sitting atop
          essentially the same station stack still read as one
          continuous scroll. .field-recede (the same structural cut
          TODAY-006's own Support zone established, generalized —
          see global.css) marks LOG as genuinely subordinate equipment,
          not a second peer plane. Every station's own capability,
          correction flow, and history disclosure is unchanged —
          this is spatial hierarchy only, nothing hidden or removed. */}
      <div className="field-recede">
      <p className="section-label">Log</p>

      {/* WATER — one consolidated instrument row: current total, fastest
          actions, custom fallback, collapsed history. FIELD ALPHA Phase
          3: .equipment-row, not .card — a logging tool, not a floating
          card; .tool-label, not .eyebrow — that's reserved for identity. */}
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>HYDRATION</p>
        <p className="recommendation-title" style={{ marginBottom: 12 }}>{total} oz today</p>
        {/* Overdrive Phase 18 (PHONE WIDTH + BODY GLANCEABILITY): quick-add
            and "repeat last" used to share one flexWrap row — at a real
            narrow-Android content width their combined minimum widths sat
            right at the wrap boundary, an unpredictable break. Separate
            rows remove the ambiguity entirely and read as two distinct
            fast actions rather than one crowded strip. */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {WATER_QUICK_ADD_OZ.map((amount) => (
            <button
              key={amount}
              className="btn-secondary"
              style={{ flex: 1, minWidth: 60 }}
              disabled={busy}
              onClick={() => void handleLogWaterAmount(amount)}
            >
              +{amount} oz
            </button>
          ))}
        </div>
        <button
          className="btn-secondary"
          style={{ marginBottom: 8 }}
          disabled={busy || lastWaterAmount === null}
          onClick={() => lastWaterAmount !== null && void handleLogWaterAmount(lastWaterAmount)}
        >
          {lastWaterAmount !== null ? `Repeat last (${lastWaterAmount} oz)` : "Repeat last"}
        </button>
        <FieldDisclosure
          summary={`${waterManualOpen ? "HIDE" : "SHOW"} MANUAL ENTRY`}
          open={waterManualOpen}
          onToggle={setWaterManualOpen}
        >
          <div className="field">
            <label htmlFor="water-custom-oz"><span>Custom (oz)</span></label>
            <input id="water-custom-oz" type="number" min={0} value={input} onChange={(e) => setInput(e.target.value)} className="input" />
          </div>
          <button className="btn-primary" disabled={busy} onClick={() => void handleLog()}>
            LOG WATER
          </button>
        </FieldDisclosure>
        {waterConfirmation && (
          <ConfirmBanner
            message={waterConfirmation.message}
            actionLabel="CORRECT"
            onAction={() => {
              const entry = entries.find((e) => e.headEventId === waterConfirmation.headEventId);
              if (entry) {
                setCorrectingId(entry.headEventId);
                setCorrectionInput(String(entry.effectiveAmountOz));
                setError(null);
                setWaterHistoryOpen(true);
              }
            }}
          />
        )}
        {error && <p className="meta" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}

        {entries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <FieldDisclosure
              summary={`${waterHistoryOpen ? "HIDE" : "SHOW"} TODAY'S ENTRIES (${entries.length})`}
              open={waterHistoryOpen}
              onToggle={setWaterHistoryOpen}
            >
                <p className="card-body" style={{ marginBottom: 12 }}>
                  Correcting an entry keeps the original and shows the corrected number — nothing is deleted.
                </p>
                {entries.map((entry) => (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>{entry.effectiveAmountOz} oz</p>
                        <p className="meta">
                          {new Date(entry.recordedAt).toLocaleTimeString()}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </p>
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ width: "auto", padding: "8px 14px" }}
                        onClick={() => {
                          setCorrectingId(entry.headEventId);
                          setCorrectionInput(String(entry.effectiveAmountOz));
                          setError(null);
                        }}
                      >
                        CORRECT
                      </button>
                    </div>
                    {correctingId === entry.headEventId && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <input
                          type="number"
                          aria-label="Corrected amount (oz)"
                          value={correctionInput}
                          onChange={(e) => setCorrectionInput(e.target.value)}
                          className="input"
                          style={{ flex: 1 }}
                        />
                        <button
                          className="btn-primary"
                          style={{ width: "auto", padding: "10px 16px" }}
                          disabled={busy}
                          onClick={() => void handleCorrect(entry)}
                        >
                          SAVE
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </FieldDisclosure>
          </div>
        )}
      </div>

      {/* SLEEP — FIELD ALPHA Phase 3: .equipment-row, not .card; leads
          with the reading itself (duration, .recommendation-title, same
          value-forward register HYDRATION already used) with kind/
          timestamp as .meta machine metadata underneath, instead of one
          undifferentiated prose sentence. */}
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>SLEEP</p>
        <p className="recommendation-title" style={{ marginBottom: 2 }}>
          {lastSleepEntry ? formatDuration(lastSleepEntry.effectiveDurationMinutes) : "Not logged"}
        </p>
        <p className="meta" style={{ marginBottom: 12 }}>
          {lastSleepEntry
            ? `${lastSleepEntry.kind === "PRIMARY" ? "Main sleep" : "Nap"} · ${new Date(lastSleepEntry.recordedAt).toLocaleTimeString()}`
            : "No sleep logged yet today."}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            className={`chip ${sleepKind === "PRIMARY" ? "chip--selected" : ""}`}
            aria-pressed={sleepKind === "PRIMARY"}
            onClick={() => {
              setSleepKind("PRIMARY");
              setSleepPendingConfirm(false);
            }}
          >
            MAIN SLEEP
          </button>
          <button
            type="button"
            className={`chip ${sleepKind === "SUPPLEMENTAL" ? "chip--selected" : ""}`}
            aria-pressed={sleepKind === "SUPPLEMENTAL"}
            onClick={() => {
              setSleepKind("SUPPLEMENTAL");
              setSleepPendingConfirm(false);
            }}
          >
            NAP
          </button>
        </div>
        <p className="card-body" style={{ marginBottom: 12 }}>
          {sleepKind === "PRIMARY"
            ? "Main sleep suggests ending your day on TODAY once logged."
            : "A nap doesn't suggest ending your day — log the sleep that actually closes it out as Main Sleep."}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="sleep-hours"><span>Hours</span></label>
            <input
              id="sleep-hours"
              type="number"
              min={0}
              value={sleepHoursInput}
              onChange={(e) => {
                setSleepHoursInput(e.target.value);
                setSleepPendingConfirm(false);
              }}
              className="input"
            />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="sleep-minutes"><span>Minutes</span></label>
            <input
              id="sleep-minutes"
              type="number"
              min={0}
              max={59}
              value={sleepMinutesInput}
              onChange={(e) => {
                setSleepMinutesInput(e.target.value);
                setSleepPendingConfirm(false);
              }}
              className="input"
            />
          </div>
        </div>
        {sleepPendingConfirm && (
          <div style={{ marginBottom: 12 }}>
            <p className="meta" style={{ color: "var(--warning)", marginBottom: 8 }}>
              {describeImplausibleSleep(
                hoursAndMinutesToTotalMinutes(Number(sleepHoursInput) || 0, Number(sleepMinutesInput) || 0),
              )}
            </p>
            <button className="btn-secondary" disabled={busy} onClick={() => void handleLogSleep(true)}>
              LOG ANYWAY
            </button>
          </div>
        )}
        {!sleepPendingConfirm && (
          <button className="btn-primary" disabled={busy} onClick={() => void handleLogSleep()}>
            LOG SLEEP
          </button>
        )}
        {sleepConfirmation && (
          <ConfirmBanner
            message={sleepConfirmation.message}
            actionLabel="CORRECT"
            onAction={() => {
              const entry = sleepEntries.find((e) => e.headEventId === sleepConfirmation.headEventId);
              if (entry) beginCorrectSleep(entry);
            }}
          />
        )}

        {sleepEntries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <FieldDisclosure
              summary={`${sleepHistoryOpen ? "HIDE" : "SHOW"} TODAY'S SLEEP (${sleepEntries.length})`}
              open={sleepHistoryOpen}
              onToggle={setSleepHistoryOpen}
            >
                {sleepEntries.map((entry) => (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>
                          {entry.kind === "PRIMARY" ? "Main sleep" : "Nap"} — {formatDuration(entry.effectiveDurationMinutes)}
                        </p>
                        <p className="meta">
                          {new Date(entry.recordedAt).toLocaleTimeString()}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </p>
                      </div>
                      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => beginCorrectSleep(entry)}>
                        CORRECT
                      </button>
                    </div>
                    {sleepCorrectingId === entry.headEventId && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                          <label htmlFor={`sleep-correction-hours-${entry.headEventId}`}><span>Hours</span></label>
                          <input id={`sleep-correction-hours-${entry.headEventId}`} type="number" min={0} value={sleepCorrectionHours} onChange={(e) => setSleepCorrectionHours(e.target.value)} className="input" />
                        </div>
                        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                          <label htmlFor={`sleep-correction-minutes-${entry.headEventId}`}><span>Minutes</span></label>
                          <input id={`sleep-correction-minutes-${entry.headEventId}`} type="number" min={0} max={59} value={sleepCorrectionMinutes} onChange={(e) => setSleepCorrectionMinutes(e.target.value)} className="input" />
                        </div>
                        <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSaveSleepCorrection()}>
                          SAVE
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </FieldDisclosure>
          </div>
        )}
      </div>

      {/* BODYWEIGHT — FIELD ALPHA Phase 3: same reading-forward pattern as SLEEP. */}
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>BODYWEIGHT</p>
        <p className="recommendation-title" style={{ marginBottom: 2 }}>
          {lastBodyweightEntry ? `${lastBodyweightEntry.effectiveWeightLbs} lbs` : "Not logged"}
        </p>
        <p className="meta" style={{ marginBottom: 12 }}>
          {lastBodyweightEntry
            ? `Logged ${new Date(lastBodyweightEntry.recordedAt).toLocaleTimeString()}`
            : "No bodyweight logged yet today."}
          {" "}A fact only — no goal.
        </p>
        {/* Overdrive Phase 18 (BODY GLANCEABILITY): manual entry only has
            a genuine fast-path alternative once a prior weight exists
            (SAME AS LAST) — collapsed by default in that case, always
            open when it's the only path (first-ever log). */}
        {lastBodyweightEntry && (
          <button
            className="btn-secondary"
            style={{ marginBottom: 12 }}
            disabled={busy}
            onClick={() => void handleLogBodyweightAmount(lastBodyweightEntry.effectiveWeightLbs)}
          >
            SAME AS LAST ({lastBodyweightEntry.effectiveWeightLbs} lbs)
          </button>
        )}
        {lastBodyweightEntry ? (
          <FieldDisclosure
            summary={`${bodyweightManualOpen ? "HIDE" : "SHOW"} MANUAL ENTRY`}
            open={bodyweightManualOpen}
            onToggle={setBodyweightManualOpen}
          >
            {bodyweightManualEntryForm}
          </FieldDisclosure>
        ) : (
          <div className="fade-in">{bodyweightManualEntryForm}</div>
        )}
        {bodyweightConfirmation && (
          <ConfirmBanner
            message={bodyweightConfirmation.message}
            actionLabel="CORRECT"
            onAction={() => {
              const entry = bodyweightEntries.find((e) => e.headEventId === bodyweightConfirmation.headEventId);
              if (entry) beginCorrectBodyweight(entry);
            }}
          />
        )}

        {bodyweightEntries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <FieldDisclosure
              summary={`${bodyweightHistoryOpen ? "HIDE" : "SHOW"} TODAY'S ENTRIES (${bodyweightEntries.length})`}
              open={bodyweightHistoryOpen}
              onToggle={setBodyweightHistoryOpen}
            >
                {bodyweightEntries.map((entry) => (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>{entry.effectiveWeightLbs} lbs</p>
                        <p className="meta">
                          {new Date(entry.recordedAt).toLocaleTimeString()}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </p>
                      </div>
                      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => beginCorrectBodyweight(entry)}>
                        CORRECT
                      </button>
                    </div>
                    {bodyweightCorrectingId === entry.headEventId && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <input type="number" aria-label="Corrected weight (lbs)" value={bodyweightCorrectionInput} onChange={(e) => setBodyweightCorrectionInput(e.target.value)} className="input" style={{ flex: 1 }} />
                        <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSaveBodyweightCorrection()}>
                          SAVE
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </FieldDisclosure>
          </div>
        )}
      </div>

      {/* PROTEIN — FIELD ALPHA Phase 3: same value-forward pattern as
          HYDRATION (a cumulative daily total, not a single point-in-time
          reading like SLEEP/BODYWEIGHT). */}
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>PROTEIN</p>
        <p className="recommendation-title" style={{ marginBottom: 2 }}>{proteinTotal} g today</p>
        <p className="meta" style={{ marginBottom: 12 }}>
          No daily target — logs the amount only.
        </p>
        {lastProteinEntry && (
          <button
            className="btn-secondary"
            style={{ marginBottom: 12 }}
            disabled={busy}
            onClick={() => void handleLogProteinAmount(lastProteinEntry.effectiveGrams)}
          >
            REPEAT LAST ({lastProteinEntry.effectiveGrams} g)
          </button>
        )}
        {lastProteinEntry ? (
          <FieldDisclosure
            summary={`${proteinManualOpen ? "HIDE" : "SHOW"} MANUAL ENTRY`}
            open={proteinManualOpen}
            onToggle={setProteinManualOpen}
          >
            {proteinManualEntryForm}
          </FieldDisclosure>
        ) : (
          <div className="fade-in">{proteinManualEntryForm}</div>
        )}
        {proteinConfirmation && (
          <ConfirmBanner
            message={proteinConfirmation.message}
            actionLabel="CORRECT"
            onAction={() => {
              const entry = proteinEntries.find((e) => e.headEventId === proteinConfirmation.headEventId);
              if (entry) beginCorrectProtein(entry);
            }}
          />
        )}

        {proteinEntries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <FieldDisclosure
              summary={`${proteinHistoryOpen ? "HIDE" : "SHOW"} TODAY'S ENTRIES (${proteinEntries.length})`}
              open={proteinHistoryOpen}
              onToggle={setProteinHistoryOpen}
            >
                {proteinEntries.map((entry) => (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>{entry.effectiveGrams} g</p>
                        <p className="meta">
                          {new Date(entry.recordedAt).toLocaleTimeString()}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </p>
                      </div>
                      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => beginCorrectProtein(entry)}>
                        CORRECT
                      </button>
                    </div>
                    {proteinCorrectingId === entry.headEventId && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <input type="number" aria-label="Corrected amount (g)" value={proteinCorrectionInput} onChange={(e) => setProteinCorrectionInput(e.target.value)} className="input" style={{ flex: 1 }} />
                        <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSaveProteinCorrection()}>
                          SAVE
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </FieldDisclosure>
          </div>
        )}
      </div>

      {/* MEAL MEMORY — NUTRITION-001 (High-Risk Drop): a small reusable
          preset library ("the sandwich I always make"), not a food
          database — no barcode, no recipe, no serving ontology, no goal.
          Logging a SavedMeal snapshots its current macros into immutable
          MEAL_LOGGED history (hydration-style correction chain); editing
          or archiving the preset afterward never touches a past log.
          Effective meal protein also counts toward Minimum Day, alongside
          protein-only logs (application/queries.ts's getMinimumDayStatus) —
          this station's own reading stays a meal COUNT, distinct from the
          PROTEIN station's own gram total above, so the two are never
          visually conflated. */}
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>MEAL MEMORY</p>
        <p className="recommendation-title" style={{ marginBottom: 2 }}>
          {mealEntries.length} {mealEntries.length === 1 ? "meal" : "meals"} logged today
        </p>
        <p className="meta" style={{ marginBottom: 12 }}>
          Protein from meals counts toward Minimum Day, alongside protein-only logs.
        </p>

        {savedMeals.length === 0 ? (
          <p className="card-body" style={{ marginBottom: 12 }}>{SAVED_MEALS_EMPTY}</p>
        ) : (
          savedMeals.map((meal) => (
            <div
              key={meal.id}
              style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
            >
              <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>{meal.name}</p>
              <p className="meta" style={{ marginBottom: 8 }}>
                {describeMacros(meal.calories, meal.proteinG, meal.carbsG, meal.fatG)}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleLogMeal(meal.id)}>
                  LOG
                </button>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  disabled={busy}
                  onClick={() => (editingMealId === meal.id ? setEditingMealId(null) : beginEditSavedMeal(meal))}
                >
                  {editingMealId === meal.id ? "CANCEL" : "EDIT"}
                </button>
                <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleArchiveSavedMeal(meal.id)}>
                  ARCHIVE
                </button>
              </div>
              {editingMealId === meal.id && (
                <div className="fade-in" style={{ marginTop: 12 }}>
                  <div className="field">
                    <label htmlFor={`edit-meal-name-${meal.id}`}><span>Edit meal name</span></label>
                    <input
                      id={`edit-meal-name-${meal.id}`}
                      type="text"
                      value={editMealForm.name}
                      onChange={(e) => setEditMealForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="input"
                    />
                  </div>
                  {renderMealMacroInputs(
                    editMealForm,
                    (patch) => setEditMealForm((prev) => ({ ...prev, ...patch })),
                    `edit-meal-${meal.id}`,
                    "Edit meal",
                  )}
                  <button className="btn-primary" disabled={busy} onClick={() => void handleSaveMealEdit()}>
                    SAVE MEAL
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        <FieldDisclosure
          summary={`${addMealOpen ? "HIDE" : "SHOW"} ADD MEAL`}
          open={addMealOpen}
          onToggle={setAddMealOpen}
        >
          <div className="field">
            <label htmlFor="food-search"><span>Search USDA food database</span></label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="food-search"
                type="text"
                value={foodQuery}
                disabled={foodSearchBusy}
                onChange={(e) => setFoodQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearchFoods();
                }}
                className="input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "auto", padding: "8px 16px" }}
                disabled={foodSearchBusy || !foodQuery.trim()}
                onClick={() => void handleSearchFoods()}
              >
                {foodSearchBusy ? "SEARCHING..." : "SEARCH"}
              </button>
            </div>
          </div>
          {foodResults !== null && (
            <div style={{ marginBottom: 8 }}>
              {foodResults.length === 0 ? (
                <p className="meta">No results — enter macros manually below.</p>
              ) : (
                foodResults.map((result) => (
                  <button
                    key={result.fdcId}
                    type="button"
                    className="btn-secondary"
                    style={{ width: "100%", textAlign: "left", marginBottom: 4 }}
                    onClick={() => handleSelectFoodResult(result)}
                  >
                    {result.description}
                    {result.brandOwner ? ` (${result.brandOwner})` : ""} —{" "}
                    {describeMacros(result.calories, result.proteinG, result.carbsG, result.fatG)} per{" "}
                    {result.servingDescription}
                  </button>
                ))
              )}
            </div>
          )}
          <div className="field">
            <label htmlFor="new-meal-name"><span>New meal name</span></label>
            <input
              id="new-meal-name"
              type="text"
              value={newMealForm.name}
              onChange={(e) => setNewMealForm((prev) => ({ ...prev, name: e.target.value }))}
              className="input"
            />
          </div>
          {renderMealMacroInputs(
            newMealForm,
            (patch) => setNewMealForm((prev) => ({ ...prev, ...patch })),
            "new-meal",
            "New meal",
          )}
          <button className="btn-primary" disabled={busy} onClick={() => void handleCreateSavedMeal()}>
            SAVE MEAL
          </button>
        </FieldDisclosure>

        {mealConfirmation && (
          <ConfirmBanner
            message={mealConfirmation.message}
            actionLabel="CORRECT"
            onAction={() => {
              const entry = mealEntries.find((e) => e.headEventId === mealConfirmation.headEventId);
              if (entry) beginCorrectMeal(entry);
            }}
          />
        )}

        {mealEntries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <FieldDisclosure
              summary={`${mealHistoryOpen ? "HIDE" : "SHOW"} TODAY'S MEALS (${mealEntries.length})`}
              open={mealHistoryOpen}
              onToggle={setMealHistoryOpen}
            >
                {mealEntries.length === 0 && <p className="card-body">{MEALS_TODAY_EMPTY}</p>}
                {mealEntries.map((entry) => (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>{entry.name}</p>
                        <p className="meta">
                          {describeMacros(entry.effectiveCalories, entry.effectiveProteinG, entry.effectiveCarbsG, entry.effectiveFatG)}
                        </p>
                        <p className="meta">
                          {new Date(entry.recordedAt).toLocaleTimeString()}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </p>
                      </div>
                      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => beginCorrectMeal(entry)}>
                        CORRECT
                      </button>
                    </div>
                    {correctingMealEventId === entry.headEventId && (
                      <div className="fade-in" style={{ marginTop: 12 }}>
                        {renderMealMacroInputs(
                          mealCorrectionForm,
                          (patch) => setMealCorrectionForm((prev) => ({ ...prev, ...patch })),
                          `correct-meal-${entry.headEventId}`,
                          "Corrected",
                        )}
                        <button className="btn-primary" disabled={busy} onClick={() => void handleSaveMealCorrection()}>
                          SAVE
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </FieldDisclosure>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
