import { feedback } from "../../feel/feedback";
import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { ConfirmBanner } from "../../components/ConfirmBanner";
import { useUndoWindow } from "../../hooks/useUndoWindow";
import { LineIcon } from "../../icons/LineIcon";
import type { NutritionTargets } from "../../../domain/common/types";
import { getNutritionTargets } from "../../../application/nutritionTargetQueries";
import { saveNutritionTargets } from "../../../application/nutritionTargetCommands";
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
  undo: () => Promise<void>;
}

function formInputs(targets: NutritionTargets | null) {
  return {
    calorie: targets?.calorieTargetKcal?.toString() ?? "",
    multiplier: (targets?.proteinMultiplierGPerLb ?? 1.0).toString(),
    goal: targets?.goalWeightLbs?.toString() ?? "",
    weightRate: targets?.weightChangeTargetPercentPerWeek?.toString() ?? "",
    muscleSets: targets?.muscleSetsTargetPerWeek?.toString() ?? "",
    sessions: targets?.strengthSessionsTargetPerWeek?.toString() ?? "",
  };
}

function describeTargets(targets: NutritionTargets | null): string {
  const calorieSummary = targets?.calorieTargetKcal !== undefined ? `${targets.calorieTargetKcal} kcal` : "No calorie target";
  const proteinSummary = `${targets?.proteinMultiplierGPerLb ?? 1.0} g/lb protein`;
  const goalSummary = targets?.goalWeightLbs !== undefined ? ` · goal ${targets.goalWeightLbs} lb` : "";
  const reviewCount = [targets?.weightChangeTargetPercentPerWeek, targets?.muscleSetsTargetPerWeek, targets?.strengthSessionsTargetPerWeek].filter((value) => value !== undefined).length;
  return `${calorieSummary} · ${proteinSummary}${goalSummary}${reviewCount ? ` · ${reviewCount} review ${reviewCount === 1 ? "target" : "targets"}` : ""}`;
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
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    if (busy || loadState !== "ready") return;
    setError(null);
    const calorieValue = calorieInput.trim() ? Number(calorieInput) : undefined;
    const multiplierValue = multiplierInput.trim() ? Number(multiplierInput) : undefined;
    const goalValue = goalInput.trim() ? Number(goalInput) : undefined;
    const weightRateValue = weightRateInput.trim() ? Number(weightRateInput) : undefined;
    const muscleSetsValue = muscleSetsInput.trim() ? Number(muscleSetsInput) : undefined;
    const sessionsValue = sessionsInput.trim() ? Number(sessionsInput) : undefined;
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
    };
    if (Object.keys(changes).length === 0) {
      setError(NO_CHANGES_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      const { saved, undo } = await saveNutritionTargets(changes);
      feedback("LIGHT");
      if (disposedRef.current) return;
      setTargets(saved);
      setOpen(false);
      setConfirmation({ message: `Targets saved · ${describeTargets(saved)}`, undo });
    } catch (e) {
      if (!disposedRef.current) setError(describeError(e, "Could not save targets."));
    } finally {
      if (!disposedRef.current) setBusy(false);
    }
  }

  async function handleUndo() {
    if (busy || !confirmation) return;
    setBusy(true);
    try {
      await confirmation.undo();
      feedback("HEAVY");
      const restored = await getNutritionTargets();
      if (disposedRef.current) return;
      setTargets(restored);
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
