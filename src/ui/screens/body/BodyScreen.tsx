import { useEffect, useRef, useState, type ReactNode } from "react";
import { TickNumber } from "../../feel/TickNumber";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { HoldButton } from "../../components/HoldButton";
import { useUndoOpen, useUndoWindow } from "../../hooks/useUndoWindow";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { Icon } from "../../icons/Icon";
import { LineIcon } from "../../icons/LineIcon";
import { Drumstick, Moon, Scale } from "lucide-react";
import type { BeyondDay, HydrationEntry, NutritionTargets, SavedMeal } from "../../../domain/common/types";
import {
  logWater,
  correctWater,
  logSleep,
  correctSleep,
  logBodyweight,
  correctBodyweight,
  logProtein,
  correctProtein,
  voidProteinLog,
  voidWaterLog,
  voidSleepLog,
  voidBodyweightLog,
  ensureActiveDay,
} from "../../../application/commands";
import {
  getActiveDay,
  getEffectiveHydrationTotal,
  getHydrationEntries,
  getSleepEntries,
  getBodyweightEntries,
  getProteinEntries,
  getDayProteinTotalG,
  type SleepEntry,
  type BodyweightEntry,
  type ProteinEntry,
} from "../../../application/queries";
import {
  archiveSavedMeal,
  correctMealLog,
  createSavedMeal,
  logMeal,
  logMealsAgain,
  updateSavedMeal,
  voidMealLog,
} from "../../../application/nutritionCommands";
import {
  getMealEntries,
  getPreviousDayMeals,
  type RepeatableMeals,
  getRecentSavedMeals,
  getTotalMealCalories,
  type NutritionEntry,
} from "../../../application/nutritionQueries";
import { searchFoods, type FoodSearchResult } from "../../../application/foodLookupQueries";
import { getBatchDuplicateMealCheck, getDuplicateMealCheck, getSameFoodCheck } from "../../../application/sameFoodQueries";
import type { DuplicateMealPair, SameFoodPair } from "../../../engine/sameFood";
import { getEffectiveProteinTargetG, getNutritionTargets } from "../../../application/nutritionTargetQueries";
import {
  describeBestSince,
  formatShortDate,
  getBodyweightHistory,
  trendDirection,
  type WeighIn,
} from "../../../application/bodyTrendQueries";
import { WeightTrend } from "./WeightTrend";
import { TransformationTimeline } from "./TransformationTimeline";
import { QuitTracker } from "./QuitTracker";
import { SHORTCUT_ANCHOR_IDS, type BodyFocus } from "../../shortcuts";
import {
  BODY_WRITE_FAILED,
  BODYWEIGHT_PLAUSIBLE_RANGE,
  describeBodyweightLogged,
  describeImplausibleBodyweight,
  describeImplausibleProtein,
  describeImplausibleSleep,
  describeImplausibleSleepCorrection,
  describeSleepTileNote,
  readSleepDuration,
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
import {
  describeCalorieProgress,
  describeMacros,
  describeMealLogged,
  describeDuplicateMealQuestion,
  describeDuplicateMealRemoved,
  describeRepeatDuplicatesQuestion,
  describeRepeatDuplicatesRemoved,
  describeMealsRelogged,
  describeRepeatMealsButton,
  describeProteinProgress,
  MEAL_DELETE_HINT,
  PROTEIN_DELETE_HINT,
  PROTEIN_CORRECT_TO_ZERO,
  describeProteinDeleted,
  describeSameFoodQuestion,
  describeSameFoodRemoveOne,
  MEALS_TODAY_EMPTY,
  SAVED_MEALS_EMPTY,
} from "./nutritionCopy";
import { describeError, NO_CHANGES_MESSAGE } from "../../errorMessage";

/** A just-logged entry: UNDO for the first UNDO_WINDOW_MS (voids it), then CORRECT. */
type Confirmation = { message: string; headEventId: string; dayId: string } | null;
type UndoableLog = "WATER" | "SLEEP" | "BODYWEIGHT" | "PROTEIN";
/** The MEAL_LOGGED events the confirmation's UNDO voids — one, or a whole SAME AS YESTERDAY batch. */
type MealConfirmation = {
  message: string;
  dayId: string;
  mealEventIds: string[];
  /** Where it shows: under the saved meal just logged, or at the top for SAME AS YESTERDAY — always next to the tap. */
  anchor: { savedMealId: string } | "REPEAT";
};

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
 * HOTFIX amendment (owner ruling 2026-10-03): the visible labels are just
 * Calories / Protein (g) / Carbs (g) / Fat (g). `labelPrefix` (e.g. "New meal" / "Edit
 * meal" / "Corrected") now lives only in each input's aria-label, which
 * still contains the visible word, so the accessible NAME stays unique, not just its DOM id — the add-meal
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
          <label htmlFor={`${idPrefix}-calories`}><span>Calories</span></label>
          <input
            id={`${idPrefix}-calories`}
            aria-label={`${labelPrefix} calories`}
            type="number"
            min={0}
            value={form.calories}
            onChange={(e) => onChange({ calories: e.target.value })}
            className="input"
          />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor={`${idPrefix}-protein`}><span>Protein (g)</span></label>
          <input
            id={`${idPrefix}-protein`}
            aria-label={`${labelPrefix} protein (g)`}
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
          <label htmlFor={`${idPrefix}-carbs`}><span>Carbs (g)</span></label>
          <input
            id={`${idPrefix}-carbs`}
            aria-label={`${labelPrefix} carbs (g)`}
            type="number"
            min={0}
            value={form.carbsG}
            onChange={(e) => onChange({ carbsG: e.target.value })}
            className="input"
          />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor={`${idPrefix}-fat`}><span>Fat (g)</span></label>
          <input
            id={`${idPrefix}-fat`}
            aria-label={`${labelPrefix} fat (g)`}
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

/** Presentation only: focused meals expose manual fields and disclose secondary tools. */
function MealSection({ direct, summary, open, onToggle, children }: {
  direct: boolean; summary: string; open: boolean; onToggle: (open: boolean) => void; children: ReactNode;
}) {
  return direct ? <div>{children}</div> : (
    <FieldDisclosure summary={summary} open={open} onToggle={onToggle}>
      {children}
    </FieldDisclosure>
  );
}

export function BodyScreen({ focus = null, visible = true, onReturnToToday, onMealJourneyStateChange, onMealJourneyInFlightChange }: {
  focus?: BodyFocus | null;
  visible?: boolean;
  onReturnToToday?: (() => void) | undefined;
  onMealJourneyStateChange?: ((state: { busy: boolean; dirty: boolean }) => void) | undefined;
  /** Synchronous shell guard: publish before awaiting a command or query. */
  onMealJourneyInFlightChange?: ((busy: boolean) => void) | undefined;
} = {}) {
  const [mealFocused, setMealFocused] = useState(focus === "meal");
  const [managingMealId, setManagingMealId] = useState<string | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  useEffect(() => {
    if (visible) setMealFocused(focus === "meal");
  }, [focus, visible]);
  function showMealSurface(next: boolean) {
    if (busyRef.current || foodSearchBusyRef.current) return;
    // An explicit local choice supersedes the initial delayed shortcut handoff.
    mealPositioned.current = true;
    setMealFocused(next);
    requestAnimationFrame(() => document.getElementById(next ? "meal-surface-heading" : "body-meals-entry")?.focus());
  }
  const [day, setDay] = useState<BeyondDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusyState] = useState(false);
  const busyRef = useRef(false);
  const foodSearchBusyRef = useRef(false);
  function setBusy(next: boolean) {
    busyRef.current = next;
    onMealJourneyInFlightChange?.(next || foodSearchBusyRef.current);
    setBusyState(next);
  }
  // POST-QA STABILIZATION: which station's last log write failed. Shown
  // beside that station's controls (BODY_WRITE_FAILED), not at the shared
  // `error` line, which sits in the water card.
  const [writeFailure, setWriteFailure] = useState<"WATER" | "SLEEP" | "BODYWEIGHT" | "PROTEIN" | null>(null);
  // DECLUTTER Drop 2: sleep, bodyweight and protein are once-a-day logs, so
  // each is a one-line row until tapped. A tracker stays open after logging
  // so its confirmation and undo stay visible.
  // Drop 2: TODAY's MAIN SLEEP row opens BODY with the sleep tracker open.
  const [sleepOpen, setSleepOpen] = useState(focus === "sleep");
  const [bodyweightOpen, setBodyweightOpen] = useState(focus === "weight");
  const [proteinOpen, setProteinOpen] = useState(false);

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
  // DROP 3: messages shown inside the sleep form / the entry being corrected, never up at the water card.
  const [sleepNotice, setSleepNotice] = useState<string | null>(null);
  const [sleepCorrectionNotice, setSleepCorrectionNotice] = useState<string | null>(null);
  const [sleepCorrectionPendingConfirm, setSleepCorrectionPendingConfirm] = useState(false);
  const [sleepHistoryOpen, setSleepHistoryOpen] = useState(false);

  // Bodyweight
  const [bodyweightEntries, setBodyweightEntries] = useState<BodyweightEntry[]>([]);
  const [bodyweightInput, setBodyweightInput] = useState("");
  const [bodyweightPendingConfirm, setBodyweightPendingConfirm] = useState(false);
  const [bodyweightCorrectingId, setBodyweightCorrectingId] = useState<string | null>(null);
  const [bodyweightCorrectionInput, setBodyweightCorrectionInput] = useState("");
  const [bodyweightConfirmation, setBodyweightConfirmation] = useState<Confirmation>(null);
  const [bodyweightHistoryOpen, setBodyweightHistoryOpen] = useState(false);
  // BODY-TIMELINE-001: the transformation timeline, closed until asked for.
  const [timelineOpen, setTimelineOpen] = useState(false);
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
  // UNDO-001: each banner offers UNDO for its first UNDO_WINDOW_MS, then CORRECT.
  const waterUndoOpen = useUndoOpen(waterConfirmation);
  const sleepUndoOpen = useUndoOpen(sleepConfirmation);
  const bodyweightUndoOpen = useUndoOpen(bodyweightConfirmation);
  const proteinUndoOpen = useUndoOpen(proteinConfirmation);
  const [undoFailure, setUndoFailure] = useState<{ log: UndoableLog; message: string } | null>(null);
  const [proteinHistoryOpen, setProteinHistoryOpen] = useState(false);
  const [proteinManualOpen, setProteinManualOpen] = useState(false);
  // DROP 1.5: the day's one protein total (protein-only logs + meals), as every screen shows it.
  const [dayProteinG, setDayProteinG] = useState(0);
  // Shown inside the entry being corrected, next to SAVE/DELETE — not up at the water card.
  const [proteinEditNotice, setProteinEditNotice] = useState<string | null>(null);
  const [proteinDeletedMessage, setProteinDeletedMessage] = useState<string | null>(null);
  // "Same food?" after a protein-only log or a meal lands close to the other kind with similar protein.
  const [sameFood, setSameFood] = useState<(SameFoodPair & { anchor: "PROTEIN" | { savedMealId: string } }) | null>(null);
  // What REMOVE ONE did, said where the question was asked.
  const [sameFoodNotice, setSameFoodNotice] = useState<{ anchor: "PROTEIN" | { savedMealId: string }; message: string } | null>(null);
  const [duplicateMeal, setDuplicateMeal] = useState<DuplicateMealPair | null>(null);
  const [duplicateMealNotice, setDuplicateMealNotice] = useState<{ savedMealId: string; message: string } | null>(null);
  // DUP-MEAL-002: SAME AS YESTERDAY meals that repeat a meal logged moments before the tap.
  const [repeatDuplicates, setRepeatDuplicates] = useState<DuplicateMealPair[] | null>(null);
  const [repeatDuplicatesNotice, setRepeatDuplicatesNotice] = useState<string | null>(null);

  // Meal Memory (NUTRITION-001)
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [mealEntries, setMealEntries] = useState<NutritionEntry[]>([]);
  // HOTFIX (owner ruling 2026-10-03): "Dinner logged · 650 kcal · 45g" with
  // UNDO, for a few seconds only (UNDO_WINDOW_MS). Fixing a meal later is
  // tapping it in TODAY'S MEALS (SAVE or DELETE).
  const [mealConfirmation, setMealConfirmation] = useUndoWindow<MealConfirmation>();
  const [mealHistoryOpen, setMealHistoryOpen] = useState(false);
  // SHORTCUTS-001: LOG MEAL opens straight to the meal entry.
  const [addMealOpen, setAddMealOpen] = useState(focus === "meal");
  // BODY-UX-001: manual macro entry starts collapsed — search stays the one
  // visible action until a search comes up empty, a result is picked for
  // review, or the operator explicitly asks for it.
  const [manualMealEntryOpen, setManualMealEntryOpen] = useState(false);
  const [newMealForm, setNewMealForm] = useState<MealFormState>(EMPTY_MEAL_FORM);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editMealForm, setEditMealForm] = useState<MealFormState>(EMPTY_MEAL_FORM);
  const [correctingMealEventId, setCorrectingMealEventId] = useState<string | null>(null);
  const [mealCorrectionForm, setMealCorrectionForm] = useState<MealMacroFormState>(EMPTY_MEAL_MACRO_FORM);
  // Shown inside the open meal's edit view, next to SAVE — not up at the water card where `error` renders.
  const [mealEditNotice, setMealEditNotice] = useState<string | null>(null);
  // NUTRITION-002 (2026-09-02): USDA FoodData Central search, scoped to the
  // "ADD MEAL" form only — see application/foodLookupQueries.ts's own doc
  // comment. A selected result only ever pre-fills newMealForm below; the
  // operator still reviews/edits and clicks SAVE MEAL themselves.
  const [foodQuery, setFoodQuery] = useState("");
  const [foodSearchBusy, setFoodSearchBusyState] = useState(false);
  function setFoodSearchBusy(next: boolean) {
    foodSearchBusyRef.current = next;
    onMealJourneyInFlightChange?.(next || busyRef.current);
    setFoodSearchBusyState(next);
  }
  const [foodResults, setFoodResults] = useState<FoodSearchResult[] | null>(null);
  const [mealError, setMealError] = useState<string | null>(null);
  const [mealPresetNotice, setMealPresetNotice] = useState<string | null>(null);
  const [mealReadFailed, setMealReadFailed] = useState(false);
  // Preserve the whole post-commit read, including duplicate/same-food checks.
  // Retrying this continuation can never call a save/log command.
  const mealReadRetry = useRef<(() => Promise<void>) | null>(null);
  const mealWriteInFlight = useRef(false);
  const mealPositioned = useRef(false);
  const mealRecoveryFocusPending = useRef(false);
  const mealDirty = Boolean(foodQuery.trim() || Object.values(newMealForm).some((value) => value.trim()) || editingMealId || correctingMealEventId);
  useEffect(() => {
    onMealJourneyStateChange?.({ busy: busy || foodSearchBusy, dirty: mealDirty });
  }, [busy, foodSearchBusy, mealDirty, onMealJourneyStateChange]);

  // Nutrition Targets (NUTRITION-003)
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTargets | null>(null);
  const [effectiveProteinTargetG, setEffectiveProteinTargetG] = useState<number | undefined>(undefined);
  // Drop 5: every weigh-in across all days, for the trend, best-since, milestone and goal date.
  const [weightHistory, setWeightHistory] = useState<WeighIn[]>([]);
  // Drop 5: the previous day's saved meals, for one-tap "same as yesterday".
  const [repeatMeals, setRepeatMeals] = useState<RepeatableMeals | undefined>(undefined);
  const [totalMealCalories, setTotalMealCalories] = useState(0);

  useEffect(() => {
    void refresh();
  }, []);
  // The retained BODY screen does not remount on explicit return/reopen.
  // Recover reads only; keep drafts, confirmations and canonical writes intact.
  useEffect(() => {
    mealRecoveryFocusPending.current = Boolean(visible && mealReadFailed && onReturnToToday);
    if (visible && mealReadFailed) void retryMealRead();
  }, [visible]);

  // App's reopen handoff cannot focus RETURN while recovery disables it.
  // Complete that handoff once reads settle, without taking focus from a
  // control the operator has chosen in the meantime.
  useEffect(() => {
    if (!visible || !mealRecoveryFocusPending.current || busyRef.current || foodSearchBusyRef.current) return;
    const control = document.getElementById("meal-return") as HTMLButtonElement | null;
    if (!control || control.disabled) return;
    mealRecoveryFocusPending.current = false;
    const active = document.activeElement;
    if (!active || active === document.body || active.closest("[hidden]")) {
      control.focus({ preventScroll: true });
    }
  }, [visible, busy, foodSearchBusy]);

  async function retryMealRead() {
    if (busyRef.current || foodSearchBusyRef.current) return;
    setBusy(true);
    try {
      await (mealReadRetry.current ?? refresh)();
      mealReadRetry.current = null;
      setMealReadFailed(false);
      setMealError(null);
    } catch {
      setMealError("Could not refresh the meal readings. Retry readings without saving or logging again.");
    } finally {
      setBusy(false);
    }
  }
  // DROP 0: re-read after a 16:30 rollover; form inputs are separate state and survive.
  useDayRolloverRefresh(refresh);

  // Bring a shortcut/catalog destination into view once it
  // has rendered (BODY and the quit tracker load asynchronously).
  useEffect(() => {
    if (!focus || !visible || (onReturnToToday && mealPositioned.current)) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (onReturnToToday && mealPositioned.current) return;
      const el = document.getElementById(SHORTCUT_ANCHOR_IDS[focus]);
      if (el) {
        const surface = focus === "meal" ? el.closest(".body-meals") ?? el : el;
        surface.scrollIntoView({ block: "start" });
        if (onReturnToToday) document.getElementById("meal-return")?.focus({ preventScroll: true });
        else if (document.activeElement === document.body) {
          el.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled)")?.focus({ preventScroll: true });
        }
        mealPositioned.current = true;
        return;
      }
      if (++tries < 40) timer = setTimeout(tick, 50);
    };
    // A short head start lets the STATUS readings above settle first, so the scroll lands where it stays.
    timer = setTimeout(tick, 250);
    return () => clearTimeout(timer);
  }, [focus, visible]);

  async function refresh() {
    const activeDay = (await getActiveDay()) ?? null;
    setDay(activeDay);
    // SavedMeal presets are not day-scoped (same as SchedulePattern) —
    // loaded regardless of whether a day exists yet, since creating one
    // doesn't require ensureActiveDay (only logMeal does).
    setSavedMeals(await getRecentSavedMeals());
    // Nutrition targets aren't day-scoped (same as SchedulePattern) —
    // loaded regardless of whether a day exists yet.
    const targets = await getNutritionTargets();
    setNutritionTargets(targets);
    setEffectiveProteinTargetG(await getEffectiveProteinTargetG());
    setWeightHistory(await getBodyweightHistory());
    setRepeatMeals(await getPreviousDayMeals(activeDay?.id));
    if (activeDay) {
      setEntries(await getHydrationEntries(activeDay.id));
      setTotal(await getEffectiveHydrationTotal(activeDay.id));
      setSleepEntries(await getSleepEntries(activeDay.id));
      setBodyweightEntries(await getBodyweightEntries(activeDay.id));
      setProteinEntries(await getProteinEntries(activeDay.id));
      setDayProteinG(await getDayProteinTotalG(activeDay.id));
      setMealEntries(await getMealEntries(activeDay.id));
      setTotalMealCalories(await getTotalMealCalories(activeDay.id));
    } else {
      setMealEntries([]);
      setTotalMealCalories(0);
      setDayProteinG(0);
    }
  }

  /** "Same food?" — asked where the second log was made; never blocks, never deletes on its own. */
  function renderSameFood(at: "PROTEIN" | string) {
    const matches = (anchor: "PROTEIN" | { savedMealId: string }) =>
      anchor === "PROTEIN" ? at === "PROTEIN" : anchor.savedMealId === at;
    if (sameFood && matches(sameFood.anchor)) {
      return (
        <div className="fade-in" role="group" aria-label="Same food?" style={{ marginTop: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
          <p className="card-body" style={{ marginBottom: 4 }}>{describeSameFoodQuestion(sameFood.protein, sameFood.meal)}</p>
          <p className="meta" style={{ marginBottom: 8 }}>{describeSameFoodRemoveOne(sameFood.protein.grams)}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => setSameFood(null)}>
              KEEP BOTH
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleSameFoodRemoveOne()}>
              REMOVE ONE
            </button>
          </div>
        </div>
      );
    }
    if (sameFoodNotice && matches(sameFoodNotice.anchor)) {
      return <p className="meta" role="status" style={{ marginTop: 8 }}>{sameFoodNotice.message}</p>;
    }
    return null;
  }

  function renderDuplicateMeal(savedMealId: string) {
    if (duplicateMeal?.justLogged.savedMealId === savedMealId) {
      return (
        <div className="fade-in" role="group" aria-label="Same meal?" style={{ marginTop: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
          <p className="card-body" style={{ marginBottom: 8 }}>
            {describeDuplicateMealQuestion(duplicateMeal.justLogged, duplicateMeal.earlier)}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" style={{ flex: 1, minHeight: 44 }} disabled={busy} onClick={() => setDuplicateMeal(null)}>
              KEEP BOTH
            </button>
            <button className="btn-secondary" style={{ flex: 1, minHeight: 44 }} disabled={busy} onClick={() => void handleDuplicateMealRemoveThisOne()}>
              REMOVE THIS ONE
            </button>
          </div>
        </div>
      );
    }
    if (duplicateMealNotice?.savedMealId === savedMealId) {
      return <p className="meta" role="status" style={{ marginTop: 8 }}>{duplicateMealNotice.message}</p>;
    }
    return null;
  }
  const mealBanner = mealConfirmation && (
    <div role="status">
      <ConfirmBanner message={mealConfirmation.message} actionLabel="UNDO" disabled={busy} onAction={() => void handleUndoMealLog()} />
    </div>
  );
  const lastWaterAmount = entries.length > 0 ? entries[entries.length - 1]!.effectiveAmountOz : null;
  const lastSleepEntry = sleepEntries.length > 0 ? sleepEntries[sleepEntries.length - 1]! : null;
  const lastBodyweightEntry = bodyweightEntries.length > 0 ? bodyweightEntries[bodyweightEntries.length - 1]! : null;
  const lastProteinEntry = proteinEntries.length > 0 ? proteinEntries[proteinEntries.length - 1]! : null;

  // ---- SLEEP ----

  async function handleLogSleep(skipConfirm = false) {
    if (busyRef.current) return;
    const reading = readSleepDuration(sleepHoursInput, sleepMinutesInput);
    if (!reading.ok) {
      setSleepNotice(reading.message);
      return;
    }
    setSleepNotice(null);
    const { totalMinutes } = reading;
    const range = sleepKind === "PRIMARY" ? SLEEP_PRIMARY_PLAUSIBLE_RANGE : SLEEP_SUPPLEMENTAL_PLAUSIBLE_RANGE;
    if (!skipConfirm && isImplausible(totalMinutes, range)) {
      setSleepPendingConfirm(true);
      return;
    }
    setBusy(true);
    setError(null);
    setWriteFailure(null);
    setSleepPendingConfirm(false);
    try {
      let eventId: string;
      let dayId: string;
      try {
        const activeDay = await ensureActiveDay();
        dayId = activeDay.id;
        eventId = await logSleep(activeDay.id, totalMinutes, sleepKind);
      } catch {
        // Nothing was written: drop any earlier banner so it can't read as this save.
        setSleepConfirmation(null);
        setWriteFailure("SLEEP");
        return;
      }
      setSleepHoursInput("");
      setSleepMinutesInput("");
      setSleepKind("PRIMARY");
      // Every log handler here sets its confirmation only AFTER refresh():
      // the banner's CORRECT looks the new entry up in the refreshed list,
      // so showing it earlier made an immediate tap a silent no-op.
      await refresh();
      setSleepConfirmation({ message: describeSleepLogged(totalMinutes), headEventId: eventId, dayId });
    } finally {
      setBusy(false);
    }
  }

  function beginCorrectSleep(entry: SleepEntry) {
    setSleepCorrectingId(entry.headEventId);
    const { hours, minutes } = totalMinutesToHoursAndMinutes(entry.effectiveDurationMinutes);
    setSleepCorrectionHours(String(hours));
    setSleepCorrectionMinutes(String(minutes));
    setSleepCorrectionNotice(null);
    setSleepCorrectionPendingConfirm(false);
    // The correction row lives inside the collapsed history disclosure —
    // called from the just-logged confirmation banner too, where that
    // disclosure may still be closed.
    setSleepHistoryOpen(true);
  }

  async function handleSaveSleepCorrection(skipConfirm = false) {
    if (busyRef.current || !day || !sleepCorrectingId) return;
    const reading = readSleepDuration(sleepCorrectionHours, sleepCorrectionMinutes);
    if (!reading.ok) {
      setSleepCorrectionNotice(reading.message);
      return;
    }
    const { totalMinutes } = reading;
    // DROP 3: a correction gets the same "outside the usual range" check a new log does.
    const entry = sleepEntries.find((e) => e.headEventId === sleepCorrectingId);
    const range = entry?.kind === "SUPPLEMENTAL" ? SLEEP_SUPPLEMENTAL_PLAUSIBLE_RANGE : SLEEP_PRIMARY_PLAUSIBLE_RANGE;
    if (!skipConfirm && isImplausible(totalMinutes, range)) {
      setSleepCorrectionNotice(null);
      setSleepCorrectionPendingConfirm(true);
      return;
    }
    setBusy(true);
    setSleepCorrectionNotice(null);
    setSleepCorrectionPendingConfirm(false);
    try {
      await correctSleep(day.id, sleepCorrectingId, totalMinutes);
      setSleepCorrectingId(null);
      if (sleepConfirmation?.headEventId === sleepCorrectingId) setSleepConfirmation(null);
      await refresh();
    } catch (e) {
      setSleepCorrectionNotice(describeError(e, "Correction failed."));
    } finally {
      setBusy(false);
    }
  }

  // ---- BODYWEIGHT ----

  async function handleLogBodyweightAmount(weight: number) {
    if (busyRef.current || weight <= 0) return;
    setBusy(true);
    setError(null);
    setWriteFailure(null);
    try {
      let eventId: string;
      let dayId: string;
      try {
        const activeDay = await ensureActiveDay();
        dayId = activeDay.id;
        eventId = await logBodyweight(activeDay.id, weight);
      } catch {
        setBodyweightConfirmation(null);
        setWriteFailure("BODYWEIGHT");
        return;
      }
      setBodyweightInput("");
      await refresh();
      setBodyweightConfirmation({ message: describeBodyweightLogged(weight), headEventId: eventId, dayId });
    } finally {
      setBusy(false);
    }
  }

  async function handleLogBodyweight(skipConfirm = false) {
    if (busyRef.current) return;
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
    if (busyRef.current || !day || !bodyweightCorrectingId) return;
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
      setError(describeError(e, "Correction failed."));
    } finally {
      setBusy(false);
    }
  }

  // ---- PROTEIN ----

  async function handleLogProteinAmount(grams: number) {
    if (busyRef.current || grams <= 0) return;
    setBusy(true);
    setError(null);
    setWriteFailure(null);
    try {
      let eventId: string;
      let dayId: string;
      try {
        const activeDay = await ensureActiveDay();
        dayId = activeDay.id;
        eventId = await logProtein(activeDay.id, grams);
      } catch {
        setProteinConfirmation(null);
        setWriteFailure("PROTEIN");
        return;
      }
      setProteinInput("");
      setProteinDeletedMessage(null);
      await refresh();
      setProteinConfirmation({ message: describeProteinLogged(grams), headEventId: eventId, dayId });
      await askSameFood(eventId, "PROTEIN", "PROTEIN");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogProtein(skipConfirm = false) {
    if (busyRef.current) return;
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
    setProteinEditNotice(null);
    setProteinCorrectionInput(String(entry.effectiveGrams));
    setError(null);
    setProteinHistoryOpen(true);
  }

  async function handleSaveProteinCorrection() {
    if (busyRef.current || !day || !proteinCorrectingId) return;
    const grams = Number(proteinCorrectionInput);
    // DROP 1.5: "0", "00" and "0.0" all mean "remove it" — say where that is, right here.
    if (proteinCorrectionInput.trim() !== "" && Number.isFinite(grams) && grams === 0) {
      setProteinEditNotice(PROTEIN_CORRECT_TO_ZERO);
      return;
    }
    if (!Number.isFinite(grams) || grams <= 0) {
      setProteinEditNotice("Enter a positive number of grams.");
      return;
    }
    setBusy(true);
    setProteinEditNotice(null);
    try {
      await correctProtein(day.id, proteinCorrectingId, grams);
      setProteinCorrectingId(null);
      if (proteinConfirmation?.headEventId === proteinCorrectingId) setProteinConfirmation(null);
      await refresh();
    } catch (e) {
      setProteinEditNotice(describeError(e, "Correction failed."));
    } finally {
      setBusy(false);
    }
  }

  /** DROP 1.5 — DELETE (hold-to-confirm) on a protein-only entry: a void event, never an erase. */
  async function handleDeleteProteinLog(entry: ProteinEntry) {
    if (busyRef.current || !day) return;
    setBusy(true);
    try {
      await voidProteinLog(day.id, entry.rootEventId);
      setProteinCorrectingId(null);
      setProteinEditNotice(null);
      if (proteinConfirmation && entry.headEventId === proteinConfirmation.headEventId) setProteinConfirmation(null);
      if (sameFood?.protein.id === entry.rootEventId) setSameFood(null);
      await refresh();
      setProteinDeletedMessage(describeProteinDeleted(entry.effectiveGrams, await getDayProteinTotalG(day.id)));
    } catch (e) {
      setProteinEditNotice(describeError(e, "Could not delete this entry."));
    } finally {
      setBusy(false);
    }
  }

  /** Ask "Same food?" when the log just written looks like the other kind logged moments before. */
  async function askSameFood(eventId: string, kind: "PROTEIN" | "MEAL", anchor: "PROTEIN" | { savedMealId: string }) {
    const dayId = (await getActiveDay())?.id;
    if (!dayId) return;
    const pair = await getSameFoodCheck(dayId, { kind, id: eventId });
    setSameFoodNotice(null);
    setSameFood(pair ? { ...pair, anchor } : null);
  }

  /** REMOVE ONE: deletes the protein-only entry — the meal carries calories and macros, so it stays. */
  async function handleSameFoodRemoveOne() {
    if (busyRef.current || !day || !sameFood) return;
    const { protein, anchor } = sameFood;
    setBusy(true);
    try {
      await voidProteinLog(day.id, protein.id);
      setSameFood(null);
      if (proteinConfirmation && proteinEntries.some((e) => e.rootEventId === protein.id && e.headEventId === proteinConfirmation.headEventId)) {
        setProteinConfirmation(null);
      }
      await refresh();
      setSameFoodNotice({ anchor, message: describeProteinDeleted(protein.grams, await getDayProteinTotalG(day.id)) });
    } catch (e) {
      setError(describeError(e, "Could not remove the entry."));
    } finally {
      setBusy(false);
    }
  }

  /** DUP-MEAL-002: REMOVE on the SAME AS YESTERDAY question voids only the repeated new entries. */
  async function handleRepeatDuplicatesRemove() {
    if (busyRef.current || !day || !repeatDuplicates) return;
    const pairs = repeatDuplicates;
    setBusy(true);
    try {
      for (const pair of pairs) await voidMealLog(day.id, pair.justLogged.id);
      setRepeatDuplicates(null);
      // The batch's UNDO would now undo a different set than it says; the totals already show the result.
      if (mealConfirmation?.anchor === "REPEAT") setMealConfirmation(null);
      await refresh();
      setRepeatDuplicatesNotice(describeRepeatDuplicatesRemoved(pairs.map((p) => p.justLogged.name), await getDayProteinTotalG(day.id)));
    } catch (e) {
      setError(describeError(e, "Could not remove the meals."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicateMealRemoveThisOne() {
    if (busyRef.current || !day || !duplicateMeal) return;
    const { justLogged } = duplicateMeal;
    setBusy(true);
    try {
      await voidMealLog(day.id, justLogged.id);
      setDuplicateMeal(null);
      if (mealConfirmation?.mealEventIds.includes(justLogged.id)) setMealConfirmation(null);
      await refresh();
      setDuplicateMealNotice({
        savedMealId: justLogged.savedMealId,
        message: describeDuplicateMealRemoved(justLogged.name, await getDayProteinTotalG(day.id)),
      });
    } catch (e) {
      setError(describeError(e, "Could not remove the meal."));
    } finally {
      setBusy(false);
    }
  }

  // ---- MEAL MEMORY (NUTRITION-001) ----

  async function handleSearchFoods() {
    if (foodSearchBusyRef.current || !foodQuery.trim()) return;
    setFoodSearchBusy(true);
    try {
      const results = await searchFoods(foodQuery);
      setFoodResults(results);
      // BODY-UX-001: a genuine miss is exactly when manual entry becomes the
      // operator's only path forward, so reveal it automatically here.
      if (results.length === 0) setManualMealEntryOpen(true);
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
    // BODY-UX-001: reveal the pre-filled fields so the operator can review/
    // edit them before SAVE MEAL — a selection is a proposal, not a save.
    setManualMealEntryOpen(true);
  }

  async function handleCreateSavedMeal() {
    if (busyRef.current || mealWriteInFlight.current) return;
    const name = newMealForm.name.trim();
    const macros = parseMealMacros(newMealForm);
    if (!name) {
      setMealError("Enter a meal name.");
      return;
    }
    if (!macros) {
      setMealError("Enter calories/protein/carbs/fat as numbers 0 or more.");
      return;
    }
    setBusy(true);
    mealWriteInFlight.current = true;
    setMealError(null);
    try {
      await createSavedMeal({ name, ...macros });
      setMealPresetNotice("Meal saved for reuse. Tap LOG to record it today.");
      setNewMealForm(EMPTY_MEAL_FORM);
      setAddMealOpen(false);
      setManualMealEntryOpen(false);
      setFoodQuery("");
      setFoodResults(null);
      mealReadRetry.current = refresh;
      try {
        await refresh();
        mealReadRetry.current = null;
        setMealReadFailed(false);
      } catch {
        setMealReadFailed(true);
        setMealError("Meal saved for reuse. Could not refresh the readings; retry readings or reopen Meal to refresh them.");
      }
    } catch (e) {
      setMealError(describeError(e, "Could not save meal."));
    } finally {
      setBusy(false);
      mealWriteInFlight.current = false;
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
    if (busyRef.current || !editingMealId) return;
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
      setError(describeError(e, "Could not update meal."));
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveSavedMeal(id: string) {
    if (busyRef.current) return;
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
    if (busyRef.current || mealWriteInFlight.current) return;
    mealWriteInFlight.current = true;
    setBusy(true);
    setMealError(null);
    setMealPresetNotice(null);
    setDuplicateMeal(null);
    setDuplicateMealNotice(null);
    setRepeatDuplicates(null);
    setRepeatDuplicatesNotice(null);
    try {
      const activeDay = await ensureActiveDay();
      const result = await logMeal(activeDay.id, mealId);
      setMealConfirmation({
        message: describeMealLogged(result.name, result.calories, result.proteinG),
        dayId: activeDay.id,
        mealEventIds: [result.eventId],
        anchor: { savedMealId: mealId },
      });
      // Once the write succeeds, a failed read must never be described as a
      // failed log (which invites a duplicate retry).
      mealReadRetry.current = async () => {
        await refresh();
        const duplicate = await getDuplicateMealCheck(activeDay.id, result.eventId);
        setDuplicateMeal(duplicate ?? null);
        if (duplicate) {
          setSameFood(null);
          setSameFoodNotice(null);
        } else {
          await askSameFood(result.eventId, "MEAL", { savedMealId: mealId });
        }
      };
      try {
        await mealReadRetry.current();
        mealReadRetry.current = null;
        setMealReadFailed(false);
      } catch {
        setMealReadFailed(true);
        setMealError("Meal logged. Could not refresh the readings; retry readings or reopen Meal to refresh them.");
      }
    } catch (e) {
      setMealError(describeError(e, "Could not log meal."));
    } finally {
      setBusy(false);
      mealWriteInFlight.current = false;
    }
  }

  async function handleRepeatMeals() {
    if (busyRef.current || !repeatMeals) return;
    setBusy(true);
    setError(null);
    setRepeatDuplicates(null);
    setRepeatDuplicatesNotice(null);
    try {
      const activeDay = await ensureActiveDay();
      const results = await logMealsAgain(
        activeDay.id,
        repeatMeals.meals.map((m) => m.savedMealId),
      );
      await refresh();
      if (results.length > 0) {
        setMealConfirmation({
          message: describeMealsRelogged(
            results.length,
            formatShortDate(repeatMeals.dayStartedAt),
            results.reduce((sum, r) => sum + r.calories, 0),
            results.reduce((sum, r) => sum + r.proteinG, 0),
          ),
          dayId: activeDay.id,
          mealEventIds: results.map((r) => r.eventId),
          anchor: "REPEAT",
        });
        const repeats = await getBatchDuplicateMealCheck(activeDay.id, results.map((r) => r.eventId));
        setRepeatDuplicates(repeats.length > 0 ? repeats : null);
      }
    } catch (e) {
      setError(describeError(e, "Could not log meals."));
      await refresh();
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
    setMealEditNotice(null);
    setMealHistoryOpen(true);
  }

  /** Tapping the open row again cancels; leaving BODY unmounts it, which cancels too. */
  function toggleMealEdit(entry: NutritionEntry) {
    if (correctingMealEventId === entry.headEventId) {
      setCorrectingMealEventId(null);
      setMealEditNotice(null);
    } else {
      beginCorrectMeal(entry);
    }
  }

  async function handleSaveMealCorrection(entry: NutritionEntry) {
    if (busyRef.current || !day || correctingMealEventId !== entry.headEventId) return;
    const macros = parseMealMacros(mealCorrectionForm);
    if (!macros) {
      setMealEditNotice("Enter calories, protein, carbs and fat as numbers 0 or more.");
      return;
    }
    if (
      macros.calories === entry.effectiveCalories &&
      macros.proteinG === entry.effectiveProteinG &&
      macros.carbsG === entry.effectiveCarbsG &&
      macros.fatG === entry.effectiveFatG
    ) {
      setMealEditNotice(NO_CHANGES_MESSAGE);
      return;
    }
    setBusy(true);
    setMealEditNotice(null);
    try {
      await correctMealLog(day.id, entry.headEventId, macros);
      setCorrectingMealEventId(null);
      await refresh();
    } catch (e) {
      setMealEditNotice(describeError(e, "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  /**
   * UNDO-001: UNDO on a just-logged water/sleep/bodyweight/protein banner —
   * a void event, never an erase, the same as protein's DELETE.
   */
  async function handleUndoLog(log: UndoableLog) {
    const confirmation = { WATER: waterConfirmation, SLEEP: sleepConfirmation, BODYWEIGHT: bodyweightConfirmation, PROTEIN: proteinConfirmation }[log];
    if (busyRef.current || !confirmation) return;
    const voidLog = { WATER: voidWaterLog, SLEEP: voidSleepLog, BODYWEIGHT: voidBodyweightLog, PROTEIN: voidProteinLog }[log];
    const clear = { WATER: setWaterConfirmation, SLEEP: setSleepConfirmation, BODYWEIGHT: setBodyweightConfirmation, PROTEIN: setProteinConfirmation }[log];
    setBusy(true);
    setUndoFailure(null);
    try {
      await voidLog(confirmation.dayId, confirmation.headEventId);
      clear(null);
      if (log === "PROTEIN" && sameFood?.protein.id === confirmation.headEventId) setSameFood(null);
      await refresh();
    } catch (e) {
      setUndoFailure({ log, message: describeError(e, "Could not undo.") });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function renderUndoFailure(log: UndoableLog) {
    return undoFailure?.log === log ? (
      <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>{undoFailure.message}</p>
    ) : null;
  }

  /** UNDO on the just-logged banner: voids what it logged, same as DELETE. */
  async function handleUndoMealLog() {
    if (busyRef.current || !mealConfirmation) return;
    const { dayId, mealEventIds } = mealConfirmation;
    setBusy(true);
    setError(null);
    try {
      for (const id of mealEventIds) await voidMealLog(dayId, id);
      setMealConfirmation(null);
      if (duplicateMeal && mealEventIds.includes(duplicateMeal.justLogged.id)) setDuplicateMeal(null);
      if (repeatDuplicates?.some((p) => mealEventIds.includes(p.justLogged.id))) setRepeatDuplicates(null);
      await refresh();
    } catch (e) {
      setError(describeError(e, "Could not undo."));
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  /** DELETE (hold-to-confirm) in TODAY'S MEALS: a void event, never an erase. */
  async function handleDeleteMealLog(entry: NutritionEntry) {
    if (busyRef.current || !day) return;
    setBusy(true);
    setError(null);
    try {
      await voidMealLog(day.id, entry.rootEventId);
      setCorrectingMealEventId(null);
      if (mealConfirmation?.mealEventIds.includes(entry.rootEventId)) setMealConfirmation(null);
      if (duplicateMeal?.justLogged.id === entry.rootEventId) setDuplicateMeal(null);
      await refresh();
    } catch (e) {
      setMealEditNotice(describeError(e, "Could not delete meal."));
    } finally {
      setBusy(false);
    }
  }

  // ---- WATER ----

  async function handleLogWaterAmount(amount: number) {
    if (busyRef.current || amount <= 0) return;
    setBusy(true);
    setError(null);
    setWriteFailure(null);
    try {
      let eventId: string;
      let dayId: string;
      try {
        const activeDay = await ensureActiveDay();
        dayId = activeDay.id;
        eventId = await logWater(activeDay.id, amount);
      } catch {
        setWaterConfirmation(null);
        setWriteFailure("WATER");
        return;
      }
      setInput("");
      await refresh();
      setWaterConfirmation({ message: describeWaterLogged(amount), headEventId: eventId, dayId });
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
    if (busyRef.current || !day) return;
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
      setError(describeError(e, "Correction failed."));
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
    <div className={`screen fade-in body-field${mealFocused ? " body-meals" : ""}`}>
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
        <h1 id="meal-surface-heading" tabIndex={-1} className="eyebrow">{mealFocused ? "BODY // MEALS" : "BODY // ESSENTIALS"}</h1>
      </div>

      <div className="meal-navigation">
        <button id="body-meals-entry" className="btn-secondary" disabled={busy || foodSearchBusy}
          onClick={() => showMealSurface(!mealFocused)}>
          {mealFocused ? "ALL BODY TRACKERS" : "OPEN MEALS"}
        </button>
        {onReturnToToday && <button id="meal-return" className="btn-secondary"
          disabled={busy || foodSearchBusy} onClick={onReturnToToday}>RETURN TO TODAY</button>}
      </div>
      <div hidden={mealFocused}>
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
          <p className="status-value"><TickNumber value={total} /> oz</p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>SLEEP</p>
          <p className={lastSleepEntry ? "status-value" : "status-value status-value--empty"}>
            {lastSleepEntry ? formatDuration(lastSleepEntry.effectiveDurationMinutes) : "Not logged"}
          </p>
          {/* DROP 3: one entry is shown; with more than one, say which (a span, not .meta — the cluster's labels are .meta). */}
          {describeSleepTileNote(sleepEntries.length) && (
            <span className="status-note" style={{ fontSize: 16, color: "var(--text-3-strong)" }}>{describeSleepTileNote(sleepEntries.length)}</span>
          )}
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>WEIGHT</p>
          <p className={lastBodyweightEntry ? "status-value" : "status-value status-value--empty"}>
            {lastBodyweightEntry ? `${lastBodyweightEntry.effectiveWeightLbs} lbs` : "Not logged"}
          </p>
        </div>
        <div>
          <p className="meta" style={{ margin: 0 }}>PROTEIN</p>
          <p className="status-value"><TickNumber value={dayProteinG} /> g</p>
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
      <div className="equipment-row" id={SHORTCUT_ANCHOR_IDS.water}>
        <p className="tool-label" style={{ marginBottom: 12 }}>HYDRATION</p>
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
        {writeFailure === "WATER" && (
          <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
            {BODY_WRITE_FAILED}
          </p>
        )}
        {waterConfirmation && (
          <ConfirmBanner
            message={waterConfirmation.message}
            actionLabel={waterUndoOpen ? "UNDO" : "CORRECT"}
            disabled={waterUndoOpen && busy}
            onAction={() => {
              if (waterUndoOpen) {
                void handleUndoLog("WATER");
                return;
              }
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
        {renderUndoFailure("WATER")}
        {error && <p className="meta meta--error" style={{ marginTop: 8 }}>{error}</p>}

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
                          {new Date(entry.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
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
      <div id={SHORTCUT_ANCHOR_IDS.sleep}>
      {sleepOpen ? (
        <div className="equipment-row">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <p className="tool-label" style={{ margin: 0 }}>SLEEP</p>
            <button type="button" className="chip" style={{ flex: "none", padding: "8px 14px" }} onClick={() => setSleepOpen(false)}>
              DONE
            </button>
          </div>
          {lastSleepEntry && (
            <p className="meta" style={{ marginBottom: 12 }}>
              {`${lastSleepEntry.kind === "PRIMARY" ? "Main sleep" : "Nap"} · ${new Date(lastSleepEntry.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
            </p>
          )}
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
                  setSleepNotice(null);
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
                  setSleepNotice(null);
                }}
                className="input"
              />
            </div>
          </div>
          {sleepPendingConfirm && (
            <div style={{ marginBottom: 12 }}>
              <p className="meta" style={{ color: "var(--warning)", marginBottom: 8 }}>
                {(() => {
                  const reading = readSleepDuration(sleepHoursInput, sleepMinutesInput);
                  return reading.ok ? describeImplausibleSleep(reading.totalMinutes) : "";
                })()}
              </p>
              <button className="btn-secondary" disabled={busy} onClick={() => void handleLogSleep(true)}>
                LOG ANYWAY
              </button>
            </div>
          )}
          {sleepNotice && (
            <p className="meta" role="status" style={{ marginTop: 0, marginBottom: 8 }}>{sleepNotice}</p>
          )}
          {!sleepPendingConfirm && (
            <button className="btn-primary" disabled={busy} onClick={() => void handleLogSleep()}>
              LOG SLEEP
            </button>
          )}
          {writeFailure === "SLEEP" && (
            <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
              {BODY_WRITE_FAILED}
            </p>
          )}
          {sleepConfirmation && (
            <ConfirmBanner
              message={sleepConfirmation.message}
              actionLabel={sleepUndoOpen ? "UNDO" : "CORRECT"}
              disabled={sleepUndoOpen && busy}
              onAction={() => {
                if (sleepUndoOpen) {
                  void handleUndoLog("SLEEP");
                  return;
                }
                const entry = sleepEntries.find((e) => e.headEventId === sleepConfirmation.headEventId);
                if (entry) beginCorrectSleep(entry);
              }}
            />
          )}
          {renderUndoFailure("SLEEP")}

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
                            {new Date(entry.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
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
                            <input
                              id={`sleep-correction-hours-${entry.headEventId}`}
                              type="number"
                              min={0}
                              step={1}
                              value={sleepCorrectionHours}
                              onChange={(e) => {
                                setSleepCorrectionHours(e.target.value);
                                setSleepCorrectionNotice(null);
                                setSleepCorrectionPendingConfirm(false);
                              }}
                              className="input"
                            />
                          </div>
                          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                            <label htmlFor={`sleep-correction-minutes-${entry.headEventId}`}><span>Minutes</span></label>
                            <input
                              id={`sleep-correction-minutes-${entry.headEventId}`}
                              type="number"
                              min={0}
                              max={59}
                              step={1}
                              value={sleepCorrectionMinutes}
                              onChange={(e) => {
                                setSleepCorrectionMinutes(e.target.value);
                                setSleepCorrectionNotice(null);
                                setSleepCorrectionPendingConfirm(false);
                              }}
                              className="input"
                            />
                          </div>
                          <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSaveSleepCorrection()}>
                            SAVE
                          </button>
                        </div>
                      )}
                      {sleepCorrectingId === entry.headEventId && sleepCorrectionNotice && (
                        <p className="meta" role="status" style={{ margin: "8px 0 0" }}>{sleepCorrectionNotice}</p>
                      )}
                      {sleepCorrectingId === entry.headEventId && sleepCorrectionPendingConfirm && (
                        <div style={{ marginTop: 8 }}>
                          <p className="meta" style={{ color: "var(--warning)", marginBottom: 8 }}>
                            {(() => {
                              const reading = readSleepDuration(sleepCorrectionHours, sleepCorrectionMinutes);
                              return reading.ok ? describeImplausibleSleepCorrection(reading.totalMinutes) : "";
                            })()}
                          </p>
                          <button className="btn-secondary" disabled={busy} onClick={() => void handleSaveSleepCorrection(true)}>
                            SAVE ANYWAY
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </FieldDisclosure>
            </div>
          )}
        </div>
      ) : (
        <CollapsibleRow name="SLEEP" icon={<LineIcon icon={Moon} />} onOpen={() => setSleepOpen(true)} />
      )}
      </div>

      {/* BODYWEIGHT — FIELD ALPHA Phase 3: same reading-forward pattern as SLEEP. */}
      {bodyweightOpen ? (
        <div className="equipment-row" id={SHORTCUT_ANCHOR_IDS.weight}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <p className="tool-label" style={{ margin: 0 }}>BODYWEIGHT</p>
            <button type="button" className="chip" style={{ flex: "none", padding: "8px 14px" }} onClick={() => setBodyweightOpen(false)}>
              DONE
            </button>
          </div>
          {lastBodyweightEntry && (
            <p className="meta" style={{ marginBottom: 12 }}>
              Logged {new Date(lastBodyweightEntry.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
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
          {writeFailure === "BODYWEIGHT" && (
            <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
              {BODY_WRITE_FAILED}
            </p>
          )}
          {bodyweightConfirmation && (
            <ConfirmBanner
              message={bodyweightConfirmation.message}
              actionLabel={bodyweightUndoOpen ? "UNDO" : "CORRECT"}
              disabled={bodyweightUndoOpen && busy}
              onAction={() => {
                if (bodyweightUndoOpen) {
                  void handleUndoLog("BODYWEIGHT");
                  return;
                }
                const entry = bodyweightEntries.find((e) => e.headEventId === bodyweightConfirmation.headEventId);
                if (entry) beginCorrectBodyweight(entry);
              }}
            />
          )}
          {renderUndoFailure("BODYWEIGHT")}

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
                            {new Date(entry.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
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
          {/* CLEANUP-003 (walk-through finding 9): one chart at a time — the timeline replaces the 60-day line while open. */}
          <WeightTrend history={weightHistory} goalWeightLbs={nutritionTargets?.goalWeightLbs} hideChart={timelineOpen} />
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <FieldDisclosure summary={`${timelineOpen ? "HIDE" : "SHOW"} TIMELINE`} open={timelineOpen} onToggle={setTimelineOpen}>
              {timelineOpen && <TransformationTimeline />}
            </FieldDisclosure>
          </div>
        </div>
      ) : (
        <CollapsibleRow
          name="BODYWEIGHT"
          icon={<LineIcon icon={Scale} />}
          summary={describeBodyweightRow(weightHistory, nutritionTargets?.goalWeightLbs)}
          onOpen={() => setBodyweightOpen(true)}
        />
      )}

      {/* PROTEIN — FIELD ALPHA Phase 3: same value-forward pattern as
          HYDRATION (a cumulative daily total, not a single point-in-time
          reading like SLEEP/BODYWEIGHT). */}
      {proteinOpen ? (
        <div className="equipment-row">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <p className="tool-label" style={{ margin: 0 }}>PROTEIN</p>
            <button type="button" className="chip" style={{ flex: "none", padding: "8px 14px" }} onClick={() => setProteinOpen(false)}>
              DONE
            </button>
          </div>
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
          {writeFailure === "PROTEIN" && (
            <p className="meta meta--error" role="alert" style={{ marginTop: 8 }}>
              {BODY_WRITE_FAILED}
            </p>
          )}
          {proteinConfirmation && (
            <ConfirmBanner
              message={proteinConfirmation.message}
              actionLabel={proteinUndoOpen ? "UNDO" : "CORRECT"}
              disabled={proteinUndoOpen && busy}
              onAction={() => {
                if (proteinUndoOpen) {
                  void handleUndoLog("PROTEIN");
                  return;
                }
                const entry = proteinEntries.find((e) => e.headEventId === proteinConfirmation.headEventId);
                if (entry) beginCorrectProtein(entry);
              }}
            />
          )}
          {renderUndoFailure("PROTEIN")}
          {proteinDeletedMessage && (
            <p className="meta" role="status" style={{ marginTop: 8 }}>{proteinDeletedMessage}</p>
          )}
          {renderSameFood("PROTEIN")}

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
                            {new Date(entry.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                          </p>
                        </div>
                        <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => beginCorrectProtein(entry)}>
                          CORRECT
                        </button>
                      </div>
                      {proteinCorrectingId === entry.headEventId && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              type="number"
                              aria-label="Corrected amount (g)"
                              value={proteinCorrectionInput}
                              onChange={(e) => {
                                setProteinCorrectionInput(e.target.value);
                                setProteinEditNotice(null);
                              }}
                              className="input"
                              style={{ flex: 1 }}
                            />
                            <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSaveProteinCorrection()}>
                              SAVE
                            </button>
                          </div>
                          {proteinEditNotice && (
                            <p className="meta" role="status" style={{ margin: "8px 0 0" }}>{proteinEditNotice}</p>
                          )}
                          {/* DROP 1.5: the same hold-to-confirm DELETE meals have. */}
                          <HoldButton
                            className="btn-secondary"
                            style={{ marginTop: 8 }}
                            disabled={busy}
                            hint={PROTEIN_DELETE_HINT}
                            onConfirm={() => void handleDeleteProteinLog(entry)}
                          >
                            DELETE
                          </HoldButton>
                        </div>
                      )}
                    </div>
                  ))}
              </FieldDisclosure>
            </div>
          )}
        </div>
      ) : (
        <CollapsibleRow name="PROTEIN" icon={<LineIcon icon={Drumstick} />} onOpen={() => setProteinOpen(true)} />
      )}

      {/* Drop 6: the quit tracker lives on BODY (owner ruling 2026-09-30). */}
      <QuitTracker initiallyOpen={focus === "urge"} />

      {/* NUTRITION TARGETS — NUTRITION-003 (High-Risk Drop, direct owner
          ruling reversing NUTRITION-001's "no calorie/macro goal, no
          nutrition scoring" restriction): calorie target is set directly,
          no formula; protein target is derived from the most recently
          logged bodyweight × an adjustable multiplier, and stays
          undefined — not a guessed number — until a bodyweight exists. */}
      <div className="equipment-row">
        <p className="tool-label" style={{ marginBottom: 4 }}>NUTRITION TARGETS</p>
        <p className="recommendation-title" style={{ marginBottom: 2 }}>
          {describeCalorieProgress(totalMealCalories, nutritionTargets?.calorieTargetKcal)}
        </p>
        <p className="meta" style={{ marginBottom: 8 }}>
          {describeProteinProgress(dayProteinG, effectiveProteinTargetG)}
        </p>
        {/* DECLUTTER Drop 3: target settings moved to MORE → Settings. */}
        <p className="meta" style={{ margin: 0 }}>Change targets in MORE → Settings.</p>
      </div>

      </div>
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
      <div className="equipment-row" id={SHORTCUT_ANCHOR_IDS.meal}>
        {mealFocused && <div className="meal-summary" role="group" aria-label="Nutrition recorded today">
          <p className="card-title">{nutritionTargets?.calorieTargetKcal
            ? describeCalorieProgress(totalMealCalories, nutritionTargets.calorieTargetKcal)
            : `${totalMealCalories} kcal logged today`}</p>
          <p className="meta">{effectiveProteinTargetG !== undefined
            ? describeProteinProgress(dayProteinG, effectiveProteinTargetG)
            : `${dayProteinG} g protein today (meals + protein logs)`}</p>
        </div>}
        {onReturnToToday && mealDirty && <p className="meta" style={{ marginBottom: 12 }}>
          Unsaved details stay here while you return to TODAY.
        </p>}
        {mealFocused && error && <p className="meta" role="alert">{error}</p>}
        {mealError && <p className="meta" role="alert" style={{ marginBottom: 12 }}>{mealError}</p>}
        {mealReadFailed && (
          <button className="btn-secondary" disabled={busy || foodSearchBusy} onClick={() => void retryMealRead()}>
            RETRY READINGS
          </button>
        )}
        {mealPresetNotice && <p className="meta" role="status" style={{ marginBottom: 12 }}>{mealPresetNotice}</p>}
        <p className="tool-label" style={{ marginBottom: 4 }}>MEAL MEMORY</p>
        <p className={mealFocused ? "meta" : "recommendation-title"} style={{ marginBottom: 2 }}>
          {mealEntries.length} {mealEntries.length === 1 ? "meal" : "meals"} logged today
        </p>
        {!mealFocused && <p className="meta" style={{ marginBottom: 12 }}>
          Protein from meals counts toward Minimum Day, alongside protein-only logs.
        </p>}

        {/* Drop 5: one tap logs the previous day's saved meals again. Hidden
            once today already has every one of them, so it can't double up. */}
        {mealConfirmation?.anchor === "REPEAT" && <div style={{ marginBottom: 12 }}>{mealBanner}</div>}
        {repeatDuplicates && (
          <div className="fade-in" role="group" aria-label={repeatDuplicates.length === 1 ? "Same meal?" : "Same meals?"} style={{ marginBottom: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <p className="card-body" style={{ marginBottom: 8 }}>{describeRepeatDuplicatesQuestion(repeatDuplicates)}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1, minHeight: 44 }} disabled={busy} onClick={() => setRepeatDuplicates(null)}>
                {repeatDuplicates.length === 1 ? "KEEP BOTH" : "KEEP ALL"}
              </button>
              <button className="btn-secondary" style={{ flex: 1, minHeight: 44 }} disabled={busy} onClick={() => void handleRepeatDuplicatesRemove()}>
                {repeatDuplicates.length === 1 ? "REMOVE THIS ONE" : "REMOVE THE REPEATS"}
              </button>
            </div>
          </div>
        )}
        {repeatDuplicatesNotice && <p className="meta" role="status" style={{ marginBottom: 12 }}>{repeatDuplicatesNotice}</p>}
        {repeatMeals && !alreadyLoggedAll(repeatMeals, mealEntries) && (
          <div style={{ marginBottom: 12 }}>
            <button className="btn-secondary" disabled={busy} onClick={() => void handleRepeatMeals()}>
              {describeRepeatMealsButton(repeatMeals.isPreviousLivedDay, formatShortDate(repeatMeals.dayStartedAt), repeatMeals.meals.length)}
            </button>
            <p className="meta" style={{ marginTop: 4 }}>
              From {formatShortDate(repeatMeals.dayStartedAt)}: {repeatMeals.meals.map((m) => m.name).join(", ")}
            </p>
          </div>
        )}

        {mealFocused && savedMeals.length > 0 && <h2 className="section-label">Log a saved meal</h2>}
        {savedMeals.length === 0 ? (
          <p className="card-body" style={{ marginBottom: 12 }}>{SAVED_MEALS_EMPTY}</p>
        ) : (
          savedMeals.map((meal) => (
            <div
              key={meal.id}
              role="group"
              aria-label={`Saved meal ${meal.name}`}
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
              </div>
              {mealConfirmation &&
                mealConfirmation.anchor !== "REPEAT" &&
                mealConfirmation.anchor.savedMealId === meal.id &&
                mealBanner}
              {renderSameFood(meal.id)}
              {renderDuplicateMeal(meal.id)}
              <MealSection direct={!mealFocused}
                summary={`${managingMealId === meal.id ? "HIDE" : "SHOW"} MANAGE ${meal.name}`}
                open={managingMealId === meal.id}
                onToggle={(open) => setManagingMealId(open ? meal.id : null)}
              >
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
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
              </MealSection>
            </div>
          ))
        )}

        <FieldDisclosure
          summary={`${addMealOpen ? "HIDE" : "SHOW"} ADD MEAL`}
          open={addMealOpen}
          onToggle={setAddMealOpen}
        >
          <MealSection direct={!mealFocused} summary={`${lookupOpen ? "HIDE" : "SHOW"} FOOD LOOKUP (ONLINE)`}
            open={lookupOpen} onToggle={setLookupOpen}>
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
          </MealSection>
          <MealSection direct={mealFocused} summary={`${manualMealEntryOpen ? "HIDE" : "SHOW"} MANUAL MACROS`}
            open={manualMealEntryOpen} onToggle={setManualMealEntryOpen}>
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
            <p className="meta">Save a reusable meal first. Then tap LOG when you eat it.</p>
            <button className="btn-primary" disabled={busy} onClick={() => void handleCreateSavedMeal()}>
              SAVE MEAL
            </button>
          </MealSection>
        </FieldDisclosure>

        {mealConfirmation &&
          mealConfirmation.anchor !== "REPEAT" &&
          !savedMeals.some((m) => m.id === (mealConfirmation.anchor as { savedMealId: string }).savedMealId) &&
          mealBanner}

        {mealEntries.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <FieldDisclosure
              summary={`${mealHistoryOpen ? "HIDE" : "SHOW"} TODAY'S MEALS (${mealEntries.length})`}
              open={mealHistoryOpen}
              onToggle={setMealHistoryOpen}
            >
                {mealEntries.length === 0 && <p className="card-body">{MEALS_TODAY_EMPTY}</p>}
                {mealEntries.map((entry) => {
                  const editing = correctingMealEventId === entry.headEventId;
                  return (
                  <div
                    key={entry.rootEventId}
                    style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", padding: 12, marginBottom: 8 }}
                  >
                    {/* HOTFIX amendment (owner ruling 2026-10-03): the whole row is the
                        control — tap to edit, tap again to cancel. The chevron says so. */}
                    <button
                      type="button"
                      aria-label={`Edit ${entry.name}`}
                      aria-expanded={editing}
                      onClick={() => toggleMealEdit(entry)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        minHeight: 44,
                        padding: 0,
                        background: "none",
                        border: "none",
                        color: "inherit",
                        font: "inherit",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ display: "block", minWidth: 0 }}>
                        <span className="card-title" style={{ display: "block", marginBottom: 2, fontSize: 16 }}>{entry.name}</span>
                        <span className="meta" style={{ display: "block" }}>
                          {describeMacros(entry.effectiveCalories, entry.effectiveProteinG, entry.effectiveCarbsG, entry.effectiveFatG)}
                        </span>
                        <span className="meta" style={{ display: "block" }}>
                          {new Date(entry.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          {entry.correctionCount > 0 ? ` · corrected ${entry.correctionCount}x` : ""}
                        </span>
                      </span>
                      <svg
                        aria-hidden="true"
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        className="disclosure-chevron"
                        style={{ transform: editing ? "rotate(90deg)" : undefined }}
                      >
                        <path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" />
                      </svg>
                    </button>
                    {editing && (
                      <div className="fade-in" style={{ marginTop: 12 }}>
                        {renderMealMacroInputs(
                          mealCorrectionForm,
                          (patch) => setMealCorrectionForm((prev) => ({ ...prev, ...patch })),
                          `correct-meal-${entry.headEventId}`,
                          "Corrected",
                        )}
                        {mealEditNotice && (
                          <p className="meta" role="status" style={{ marginBottom: 8 }}>{mealEditNotice}</p>
                        )}
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <button className="btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => void handleSaveMealCorrection(entry)}>
                            SAVE
                          </button>
                          <HoldButton
                            className="btn-secondary"
                            style={{ flex: 1 }}
                            disabled={busy}
                            hint={MEAL_DELETE_HINT}
                            onConfirm={() => void handleDeleteMealLog(entry)}
                          >
                            DELETE
                          </HoldButton>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
            </FieldDisclosure>
          </div>
        )}
      </div>
    </div>
  );
}

/** Drop 5: the collapsed BODYWEIGHT row reports live state — the latest weigh-in, plus best-since when notable. */
function describeBodyweightRow(history: readonly WeighIn[], goalWeightLbs?: number): string | undefined {
  const latest = history.at(-1);
  if (!latest) return undefined;
  const bestSince = describeBestSince(history, trendDirection(history, goalWeightLbs));
  return bestSince ? `${latest.weightLbs} lb · ${bestSince.toLowerCase()}` : `${latest.weightLbs} lb`;
}

/** Drop 5: true when today's meals already include every meal (with repeats) from the day being offered. */
function alreadyLoggedAll(repeat: RepeatableMeals, today: readonly NutritionEntry[]): boolean {
  const remaining = new Map<string, number>();
  for (const e of today) remaining.set(e.savedMealId, (remaining.get(e.savedMealId) ?? 0) + 1);
  return repeat.meals.every((m) => {
    const left = remaining.get(m.savedMealId) ?? 0;
    if (left === 0) return false;
    remaining.set(m.savedMealId, left - 1);
    return true;
  });
}
