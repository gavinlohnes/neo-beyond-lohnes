import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { LineIcon } from "../../icons/LineIcon";
import type { NutritionTargets } from "../../../domain/common/types";
import { getNutritionTargets } from "../../../application/nutritionTargetQueries";
import { updateNutritionTargets } from "../../../application/nutritionTargetCommands";

/**
 * DECLUTTER Drop 3 (owner ruling 2026-09-30): Nutrition Targets moved from
 * BODY to MORE → Settings. Same NUTRITION-003 form and command as before —
 * calorie target set directly, protein multiplier in g per lb — only its
 * home changed. BODY keeps the read-only progress lines.
 */
export function NutritionTargetsSettings() {
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [open, setOpen] = useState(false);
  const [calorieInput, setCalorieInput] = useState("");
  const [multiplierInput, setMultiplierInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    void getNutritionTargets().then((next) => {
      if (!disposedRef.current) setTargets(next);
    });
    return () => {
      disposedRef.current = true;
    };
  }, []);

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const calorieValue = calorieInput.trim() ? Number(calorieInput) : undefined;
      const multiplierValue = multiplierInput.trim() ? Number(multiplierInput) : undefined;
      const saved = await updateNutritionTargets({
        ...(calorieValue !== undefined ? { calorieTargetKcal: calorieValue } : {}),
        ...(multiplierValue !== undefined ? { proteinMultiplierGPerLb: multiplierValue } : {}),
      });
      if (disposedRef.current) return;
      setTargets(saved);
      setCalorieInput("");
      setMultiplierInput("");
      setOpen(false);
    } catch (e) {
      if (!disposedRef.current) setError(e instanceof Error ? e.message : "Could not save targets.");
    } finally {
      if (!disposedRef.current) setBusy(false);
    }
  }

  const calorieSummary = targets?.calorieTargetKcal !== undefined ? `${targets.calorieTargetKcal} kcal` : "No calorie target";
  const proteinSummary = `${targets?.proteinMultiplierGPerLb ?? 1.0} g/lb protein`;

  if (!open) {
    return (
      <CollapsibleRow name="NUTRITION TARGETS" icon={<LineIcon icon={Target} />} summary={`${calorieSummary} · ${proteinSummary}`} onOpen={() => setOpen(true)} />
    );
  }

  return (
    <div className="equipment-row">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p className="tool-label" style={{ margin: 0 }}>NUTRITION TARGETS</p>
        <button className="chip" onClick={() => setOpen(false)}>DONE</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label className="meta" htmlFor="calorie-target-input" style={{ display: "block", marginBottom: 4 }}>
            Calorie target (kcal/day)
          </label>
          <input
            id="calorie-target-input"
            type="number"
            aria-label="Calorie target (kcal/day)"
            placeholder={targets?.calorieTargetKcal?.toString() ?? "e.g. 2200"}
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
            placeholder={targets?.proteinMultiplierGPerLb.toString() ?? "1.0"}
            value={multiplierInput}
            onChange={(e) => setMultiplierInput(e.target.value)}
            className="input"
          />
          <p className="meta" style={{ marginTop: 4 }}>
            0.8–1.0 g/lb is the common range for a cut.
          </p>
        </div>
        {error && <p className="meta" role="alert">{error}</p>}
        <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSave()}>
          SAVE
        </button>
      </div>
    </div>
  );
}
