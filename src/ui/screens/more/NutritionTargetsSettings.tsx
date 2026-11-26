import { captureCommitFeedback } from "../../feel/feedback";
import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { useUndoWindow } from "../../hooks/useUndoWindow";
import { LineIcon } from "../../icons/LineIcon";
import type { NutritionTargets } from "../../../domain/common/types";
import { getNutritionTargets, getTwoWeekDayTargetProjection } from "../../../application/nutritionTargetQueries";
import { saveNutritionTargets } from "../../../application/nutritionTargetCommands";
import { readFitsNowOn, writeFitsNowOn } from "../../../application/fitsNowQueries";
import { saveProteinHeadsUpSettings } from "../../../application/proteinPatternQueries";
import { DEFAULT_PROTEIN_HEADSUP } from "../../../engine/proteinPattern";
import { averageDayTargets, balancedOffAdjustment } from "../../../engine/dayTarget";
import { describeError, NO_CHANGES_MESSAGE } from "../../errorMessage";

/**
 * DECLUTTER Drop 3 (owner ruling 2026-09-30): Nutrition Targets moved from
 * BODY to MORE → Settings. Same NUTRITION-003 form and command as before —
 * calorie target set directly, protein multiplier in g per lb — only its
 * home changed. BODY keeps the read-only progress lines.
 *
 * Drop 5: also holds the optional goal weight DATA's projected goal date
 * uses. Saved with the same command, so it rides along in backups.
 *
 * HOTFIX (owner ruling 2026-10-03): the inputs open filled with the saved
 * values (real values, not gray placeholders); SAVE with nothing changed
 * says "No changes." and writes nothing; a real save shows what was saved
 * with UNDO for UNDO_WINDOW_MS.
 */
interface TargetsSaveConfirmation {
  message: string;
  undo: () => Promise<boolean>;
}
const EMPTY_DAY_TARGETS = { on: false, adjustKcal: { WORK: 0, RECOVERY: 0, OFF: 0, LIFT: 0 } } as const;

function formInputs(targets: NutritionTargets | null) {
  return {
    calorie: targets?.calorieTargetKcal?.toString() ?? "",
    multiplier: (targets?.proteinMultiplierGPerLb ?? 1.0).toString(),
    goal: targets?.goalWeightLbs?.toString() ?? "",
    weightRate: targets?.weightChangeTargetPercentPerWeek?.toString() ?? "",
    muscleSets: targets?.muscleSetsTargetPerWeek?.toString() ?? "",
    sessions: targets?.strengthSessionsTargetPerWeek?.toString() ?? "",
    floor: targets?.calorieFloorKcal?.toString() ?? "",
    water: targets?.waterTargetOz?.toString() ?? "",
  };
}

function describeTargets(targets: NutritionTargets | null): string {
  const calorieSummary = targets?.calorieTargetKcal !== undefined ? `${targets.calorieTargetKcal} kcal` : "No calorie target";
  const proteinSummary = `${targets?.proteinMultiplierGPerLb ?? 1.0} g/lb protein`;
  const goalSummary = targets?.goalWeightLbs !== undefined ? ` · goal ${targets.goalWeightLbs} lb` : "";
  const waterSummary = targets?.waterTargetOz !== undefined ? ` · water ${targets.waterTargetOz} oz` : "";
  const reviewCount = [targets?.weightChangeTargetPercentPerWeek, targets?.muscleSetsTargetPerWeek, targets?.strengthSessionsTargetPerWeek].filter((value) => value !== undefined).length;
  return `${calorieSummary} · ${proteinSummary}${goalSummary}${waterSummary}${reviewCount ? ` · ${reviewCount} review ${reviewCount === 1 ? "target" : "targets"}` : ""}`;
}
export function NutritionTargetsSettings() {
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [open, setOpen] = useState(false);
  const [calorieInput, setCalorieInput] = useState("");
  const [multiplierInput, setMultiplierInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [weightRateInput, setWeightRateInput] = useState("");
  const [muscleSetsInput, setMuscleSetsInput] = useState("");
  const [sessionsInput, setSessionsInput] = useState("");
  const [floorInput, setFloorInput] = useState("");
  const [waterInput, setWaterInput] = useState("");
  const [dayTargets, setDayTargets] = useState<NutritionTargets["dayTargets"]>({ ...EMPTY_DAY_TARGETS, adjustKcal: { ...EMPTY_DAY_TARGETS.adjustKcal } });
  // The two weeks' kinds and lifts; the line and BALANCE read the steppers' current values against them (#736 review B1).
  const [fitsNowOn, setFitsNowOn] = useState(readFitsNowOn);
  const headsUp = { ...DEFAULT_PROTEIN_HEADSUP, ...(targets?.proteinHeadsUp ?? {}) };
  async function saveHeadsUp(next: { on: boolean; underPercent: number; days: number; windowDays: number }) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const { saved, undo } = await saveProteinHeadsUpSettings({ on: next.on, underPercent: next.underPercent, days: next.days, windowDays: next.windowDays });
      if (disposedRef.current) return;
      setTargets(saved);
      setConfirmation({ message: next.on ? `Protein heads-up: under ${next.underPercent}% on ${next.days} of the last ${next.windowDays} logged days.` : "Protein heads-up is off.", undo });
    } catch (e) { if (!disposedRef.current) setError(describeError(e, "Could not save the heads-up.")); }
    finally { if (!disposedRef.current) setBusy(false); }
  }
  const [projection, setProjection] = useState<Awaited<ReturnType<typeof getTwoWeekDayTargetProjection>> | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useUndoWindow<TargetsSaveConfirmation>();
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    void getNutritionTargets()
      .then((next) => {
        if (disposedRef.current) return;
        setTargets(next);
        setDayTargets(next.dayTargets ?? { ...EMPTY_DAY_TARGETS, adjustKcal: { ...EMPTY_DAY_TARGETS.adjustKcal } });
        void getTwoWeekDayTargetProjection().then(setProjection);
        setLoadState("ready");
      })
      .catch(() => {
        if (!disposedRef.current) setLoadState("error");
      });
    return () => {
      disposedRef.current = true;
    };
  }, []);

  function openForm() {
    if (loadState !== "ready") return;
    const filled = formInputs(targets);
    setCalorieInput(filled.calorie);
    setMultiplierInput(filled.multiplier);
    setGoalInput(filled.goal);
    setWeightRateInput(filled.weightRate);
    setMuscleSetsInput(filled.muscleSets);
    setSessionsInput(filled.sessions);
    setFloorInput(filled.floor);
    setWaterInput(filled.water);
    setDayTargets(targets?.dayTargets ?? { ...EMPTY_DAY_TARGETS, adjustKcal: { ...EMPTY_DAY_TARGETS.adjustKcal } });
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    const acknowledge = captureCommitFeedback();
    if (busy || loadState !== "ready") return;
    setError(null);
    const calorieValue = calorieInput.trim() ? Number(calorieInput) : undefined;
    const multiplierValue = multiplierInput.trim() ? Number(multiplierInput) : undefined;
    const goalValue = goalInput.trim() ? Number(goalInput) : undefined;
    const weightRateValue = weightRateInput.trim() ? Number(weightRateInput) : undefined;
    const muscleSetsValue = muscleSetsInput.trim() ? Number(muscleSetsInput) : undefined;
    const sessionsValue = sessionsInput.trim() ? Number(sessionsInput) : undefined;
    const floorValue = floorInput.trim() ? Number(floorInput) : undefined;
    const waterValue = waterInput.trim() ? Number(waterInput) : undefined;
    // Existing nutrition fields retain their historical "blank means unchanged"
    // behavior. The additive Review targets are optional, so blank clears them.
    const changes = {
      ...(calorieValue !== undefined && calorieValue !== targets?.calorieTargetKcal ? { calorieTargetKcal: calorieValue } : {}),
      ...(multiplierValue !== undefined && multiplierValue !== (targets?.proteinMultiplierGPerLb ?? 1.0)
        ? { proteinMultiplierGPerLb: multiplierValue }
        : {}),
      ...(goalValue !== undefined && goalValue !== targets?.goalWeightLbs ? { goalWeightLbs: goalValue } : {}),
      ...(weightRateValue !== targets?.weightChangeTargetPercentPerWeek ? { weightChangeTargetPercentPerWeek: weightRateValue ?? null } : {}),
      ...(muscleSetsValue !== targets?.muscleSetsTargetPerWeek ? { muscleSetsTargetPerWeek: muscleSetsValue ?? null } : {}),
      ...(sessionsValue !== targets?.strengthSessionsTargetPerWeek ? { strengthSessionsTargetPerWeek: sessionsValue ?? null } : {}),
      // TARGET-PROPOSAL-002: optional; blank goes back to the 1,500 default.
      ...(floorValue !== targets?.calorieFloorKcal ? { calorieFloorKcal: floorValue ?? null } : {}),
      // GRAYSON C4.6: optional; blank clears it (no target, nothing shown).
      ...(waterValue !== targets?.waterTargetOz ? { waterTargetOz: waterValue ?? null } : {}),
      ...(JSON.stringify(dayTargets) !== JSON.stringify(targets?.dayTargets ?? EMPTY_DAY_TARGETS) ? { dayTargets } : {}),
    };
    if (Object.keys(changes).length === 0) {
      setError(NO_CHANGES_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      const { saved, undo } = await saveNutritionTargets(changes);
      acknowledge("LIGHT");
      if (disposedRef.current) return;
      setTargets(saved);
      setDayTargets(saved.dayTargets ?? { ...EMPTY_DAY_TARGETS, adjustKcal: { ...EMPTY_DAY_TARGETS.adjustKcal } });
      setProjection(await getTwoWeekDayTargetProjection());
      setOpen(false);
      setConfirmation({ message: `Targets saved · ${describeTargets(saved)}`, undo });
    } catch (e) {
      if (!disposedRef.current) setError(describeError(e, "Could not save targets."));
    } finally {
      if (!disposedRef.current) setBusy(false);
    }
  }

  // BALANCE: from the adjustments on screen (saved or not), set Day off so the two weeks average his target, save
  // them in this one tap, and show UNDO here in the open form.
  const working = targets && dayTargets ? { ...targets, dayTargets } : null;
  const twoWeekAverage = working && projection ? averageDayTargets(working, projection.days) : undefined;
  const balanceTo = working && projection ? balancedOffAdjustment(working, projection.days) : null;
  async function handleBalance() {
    if (busy || !dayTargets || balanceTo === null) return;
    setBusy(true); setError(null);
    try {
      const next = { ...dayTargets, adjustKcal: { ...dayTargets.adjustKcal, OFF: Math.max(-1000, Math.min(1000, balanceTo)) } };
      const { saved, undo } = await saveNutritionTargets({ dayTargets: next });
      if (disposedRef.current) return;
      setTargets(saved); setDayTargets(saved.dayTargets!);
      setConfirmation({ message: `Day off set to ${next.adjustKcal.OFF >= 0 ? "+" : ""}${next.adjustKcal.OFF}, so two weeks average your target.`, undo });
    } catch (e) { if (!disposedRef.current) setError(describeError(e, "Could not balance day targets.")); }
    finally { if (!disposedRef.current) setBusy(false); }
  }

  async function handleUndo() {
    const acknowledge = captureCommitFeedback();
    if (busy || !confirmation) return;
    setBusy(true);
    try {
      if (await confirmation.undo()) acknowledge("HEAVY");
      const restored = await getNutritionTargets();
      if (disposedRef.current) return;
      setTargets(restored);
      // #736 review B1: the open form shows what UNDO put back.
      setDayTargets(restored.dayTargets ?? { ...EMPTY_DAY_TARGETS, adjustKcal: { ...EMPTY_DAY_TARGETS.adjustKcal } });
      setConfirmation(null);
    } finally {
      if (!disposedRef.current) setBusy(false);
    }
  }

  const banner = confirmation && (
    <ConfirmBanner message={confirmation.message} actionLabel="UNDO" disabled={busy} onAction={() => void handleUndo()} />
  );

  if (!open) {
    return (
      <>
        <CollapsibleRow
          name="TARGETS"
          icon={<LineIcon icon={Target} />}
          summary={loadState === "loading" ? "Loading targets…" : loadState === "error" ? "Targets unavailable" : describeTargets(targets)}
          onOpen={openForm}
          disabled={loadState !== "ready"}
        />
        {banner}
      </>
    );
  }

  return (
    <div className="equipment-row">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p className="tool-label" style={{ margin: 0 }}>TARGETS</p>
        <button className="chip" onClick={() => setOpen(false)}>DONE</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p className="tool-label" style={{ margin: 0 }}>NUTRITION TARGETS</p>
        <div>
          <label className="meta" htmlFor="calorie-target-input" style={{ display: "block", marginBottom: 4 }}>
            Calorie target (kcal/day)
          </label>
          <input
            id="calorie-target-input"
            type="number"
            aria-label="Calorie target (kcal/day)"
            placeholder="Not set"
            value={calorieInput}
            onChange={(e) => setCalorieInput(e.target.value)}
            className="input"
          />
        </div>
        {/* GRAYSON-PROTEIN-HEADSUP-001: on by default; his percent and days, saved as soon as they change, with UNDO. */}
        <fieldset style={{ border: "1px solid var(--border-subtle)", padding: 12 }}>
          <legend className="tool-label">PROTEIN HEADS-UP</legend>
          <label className="meta" style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44 }}>
            <input type="checkbox" checked={headsUp.on} disabled={busy} onChange={(e) => void saveHeadsUp({ ...headsUp, on: e.target.checked })} />
            Tell me when protein runs well under target on several logged days
          </label>
          {headsUp.on && <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <label className="meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 44 }}>Under
              <select className="input" style={{ width: "auto" }} value={headsUp.underPercent} disabled={busy} onChange={(e) => void saveHeadsUp({ ...headsUp, underPercent: Number(e.target.value) })}>
                {[50, 55, 60, 65, 70, 75, 80, 85, 90, 95].map((p) => <option key={p} value={p}>{p}% of target</option>)}
              </select></label>
            <label className="meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 44 }}>On
              <select className="input" style={{ width: "auto" }} value={headsUp.days} disabled={busy} onChange={(e) => { const days = Number(e.target.value); void saveHeadsUp({ ...headsUp, days, windowDays: Math.max(days, headsUp.windowDays) }); }}>
                {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} days</option>)}
              </select></label>
            <label className="meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 44 }}>Of the last
              <select className="input" style={{ width: "auto" }} value={headsUp.windowDays} disabled={busy} onChange={(e) => { const windowDays = Number(e.target.value); void saveHeadsUp({ ...headsUp, windowDays, days: Math.min(headsUp.days, windowDays) }); }}>
                {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} logged days</option>)}
              </select></label>
          </div>}
        </fieldset>
        {/* GRAYSON-FITS-NOW-001: on by default; this phone's choice, saved as soon as it's ticked (travels with backups). */}
        <label className="meta" style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44 }}>
          <input type="checkbox" checked={fitsNowOn} onChange={(e) => { writeFitsNowOn(e.target.checked); setFitsNowOn(e.target.checked); }} />
          Show Fits now: your saved meals that fit what's left of today
        </label>
        <fieldset style={{ border: "1px solid var(--border-subtle)", padding: 12 }}>
          <legend className="tool-label">TARGETS BY KIND OF DAY</legend>
          <label className="meta" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={dayTargets?.on ?? false} onChange={(e) => setDayTargets((old) => ({ ...(old ?? EMPTY_DAY_TARGETS), on: e.target.checked, adjustKcal: { ...(old?.adjustKcal ?? EMPTY_DAY_TARGETS.adjustKcal) } }))} />
            Use a different calorie target for each kind of day
          </label>
          {dayTargets?.on && <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {([['WORK', 'Work night'], ['RECOVERY', 'First day off'], ['OFF', 'Day off'], ['LIFT', 'Lift day']] as const).map(([key, label]) => <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span>{label} {dayTargets.adjustKcal[key] >= 0 ? "+" : ""}{dayTargets.adjustKcal[key]}</span>
              <span style={{ display: "flex", gap: 8 }}><button type="button" className="chip" style={{ minWidth: 44, minHeight: 44 }} aria-label={`Decrease ${label} by 50 kcal`} disabled={dayTargets.adjustKcal[key] <= -1000} onClick={() => setDayTargets((old) => ({ ...old!, adjustKcal: { ...old!.adjustKcal, [key]: old!.adjustKcal[key] - 50 } }))}>−</button><button type="button" className="chip" style={{ minWidth: 44, minHeight: 44 }} aria-label={`Increase ${label} by 50 kcal`} disabled={dayTargets.adjustKcal[key] >= 1000} onClick={() => setDayTargets((old) => ({ ...old!, adjustKcal: { ...old!.adjustKcal, [key]: old!.adjustKcal[key] + 50 } }))}>+</button></span>
            </div>)}
            <p className="meta" role="status">{twoWeekAverage !== undefined && projection?.target !== undefined ? `Over two weeks: ${Math.round(twoWeekAverage)} a day, ${Math.abs(twoWeekAverage - projection.target) < 25 ? "your target" : `${Math.abs(Math.round(twoWeekAverage - projection.target))} ${twoWeekAverage > projection.target ? "over" : "under"} your target`}` : "Save a schedule and calorie target to see the two-week average."}</p>
            <button type="button" className="btn-secondary" disabled={busy || balanceTo === null || balanceTo === dayTargets.adjustKcal.OFF} onClick={() => void handleBalance()}>BALANCE</button>
            {balanceTo === null && projection && <p className="meta">Your two weeks have no day off to balance with.</p>}
          </div>}
          {banner}
        </fieldset>
        <div>
          <label className="meta" htmlFor="calorie-floor-input" style={{ display: "block", marginBottom: 4 }}>
            Lowest calorie target BEYOND may propose (kcal/day)
          </label>
          <input id="calorie-floor-input" type="number" min="1000" max="4000" step="50" aria-label="Lowest calorie target BEYOND may propose (kcal/day)"
            placeholder="1500" value={floorInput} onChange={(e) => setFloorInput(e.target.value)} className="input" />
          <p className="meta" style={{ marginTop: 4 }}>
            Weekly's calorie proposal never goes below this. Blank uses 1,500. You can still type any target yourself.
          </p>
        </div>
        <div>
          <label className="meta" htmlFor="water-target-input" style={{ display: "block", marginBottom: 4 }}>
            Daily water target (oz)
          </label>
          <input id="water-target-input" type="number" min="16" max="300" step="1" aria-label="Daily water target (oz)"
            placeholder="No target" value={waterInput} onChange={(e) => setWaterInput(e.target.value)} className="input" />
          <p className="meta" style={{ marginTop: 4 }}>
            Your own number. TODAY and the water sheet show it beside what you've logged. Blank means no target.
          </p>
        </div>
        <div>
          <label className="meta" htmlFor="protein-multiplier-input" style={{ display: "block", marginBottom: 4 }}>
            Protein multiplier (g per lb bodyweight)
          </label>
          <input
            id="protein-multiplier-input"
            type="number"
            step="0.05"
            aria-label="Protein multiplier (g per lb bodyweight)"
            value={multiplierInput}
            onChange={(e) => setMultiplierInput(e.target.value)}
            className="input"
          />
          <p className="meta" style={{ marginTop: 4 }}>
            0.8–1.0 g/lb is the common range for a cut.
          </p>
        </div>
        <div>
          <p className="tool-label" style={{ marginBottom: 4 }}>REVIEW TARGETS</p>
          <p className="meta" style={{ marginTop: 0 }}>Your choices, not recommendations. Leave any field blank for no target.</p>
        </div>
        <div>
          <label className="meta" htmlFor="weight-rate-target-input">Weight change (% bodyweight/week)</label>
          <input id="weight-rate-target-input" type="number" min="0.1" max="5" step="0.05" aria-label="Weight change target (% bodyweight/week)" placeholder="Optional" value={weightRateInput} onChange={(e) => setWeightRateInput(e.target.value)} className="input" />
          <p className="meta" style={{ marginTop: 4 }}>
            Context only: <a href="https://jissn.biomedcentral.com/articles/10.1186/1550-2783-11-20" target="_blank" rel="noreferrer">Helms et al. (2014)</a> discusses 0.5–1% per week for resistance-trained physique athletes. It is not a universal target; you choose the number.
          </p>
        </div>
        <div>
          <label className="meta" htmlFor="muscle-sets-target-input">Working sets per muscle/week</label>
          <input id="muscle-sets-target-input" type="number" min="1" max="50" step="0.5" aria-label="Working sets target per muscle per week" placeholder="Optional" value={muscleSetsInput} onChange={(e) => setMuscleSetsInput(e.target.value)} className="input" />
          <p className="meta" style={{ marginTop: 4 }}>
            Context only: the <a href="https://pubmed.ncbi.nlm.nih.gov/41843416/" target="_blank" rel="noreferrer">ACSM 2026 position stand</a> reports greater hypertrophy with ≥10 sets/week, while a <a href="https://pubmed.ncbi.nlm.nih.gov/41343037/" target="_blank" rel="noreferrer">2026 meta-regression</a> finds diminishing returns. There is no universal target. BEYOND counts recorded working sets; you choose the number.
          </p>
        </div>
        <div>
          <label className="meta" htmlFor="strength-sessions-target-input">Strength sessions/week</label>
          <input id="strength-sessions-target-input" type="number" min="1" max="14" step="1" aria-label="Strength sessions target per week" placeholder="Optional" value={sessionsInput} onChange={(e) => setSessionsInput(e.target.value)} className="input" />
        </div>
        <div>
          <label className="meta" htmlFor="goal-weight-input" style={{ display: "block", marginBottom: 4 }}>
            Goal weight (lb)
          </label>
          <input
            id="goal-weight-input"
            type="number"
            step="0.5"
            aria-label="Goal weight (lb)"
            placeholder="Optional"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="input"
          />
          <p className="meta" style={{ marginTop: 4 }}>
            Used only for DATA's projected goal date.
          </p>
        </div>
        {error && <p className="meta" role={error === NO_CHANGES_MESSAGE ? "status" : "alert"}>{error}</p>}
        <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSave()}>
          SAVE
        </button>
      </div>
    </div>
  );
}
