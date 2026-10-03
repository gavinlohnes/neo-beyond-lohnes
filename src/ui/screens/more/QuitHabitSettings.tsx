import { useEffect, useRef, useState } from "react";
import { Ban } from "lucide-react";
import { CollapsibleRow } from "../../components/CollapsibleRow";
import { LineIcon } from "../../icons/LineIcon";
import { URGE_TRIGGERS, type QuitHabit, type UrgeTrigger } from "../../../domain/common/types";
import { getQuitHabit } from "../../../application/quitQueries";
import { saveQuitHabit } from "../../../application/quitCommands";
import { describeIfThenPlanLabel, formatUsd } from "../body/quitCopy";

/**
 * Drop 6 (quit tracker, owner approval 2026-09-30): the habit to avoid, named
 * by the owner, with an optional daily cost (for "money saved") and a short
 * post-shift plan (shown inside SHIFT DOWN). The whole form is saved at
 * once, so clearing an optional field removes it.
 */
export function QuitHabitSettings() {
  const [habit, setHabit] = useState<QuitHabit | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [plan, setPlan] = useState("");
  // Drop 4: one optional if-then plan per urge trigger.
  const [ifThen, setIfThen] = useState<Partial<Record<UrgeTrigger, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    void getQuitHabit()
      .then((next) => {
        if (!disposedRef.current) setHabit(next);
      })
      .catch(() => {});
    return () => {
      disposedRef.current = true;
    };
  }, []);

  function beginEdit() {
    setName(habit?.name ?? "");
    setCost(habit?.dailyCostUsd !== undefined ? String(habit.dailyCostUsd) : "");
    setPlan(habit?.postShiftPlan ?? "");
    setIfThen({ ...(habit?.ifThenPlans ?? {}) });
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await saveQuitHabit({
        name,
        ...(cost.trim() ? { dailyCostUsd: Number(cost) } : {}),
        ...(plan.trim() ? { postShiftPlan: plan } : {}),
        ifThenPlans: Object.fromEntries(
          URGE_TRIGGERS.flatMap((t) => (ifThen[t]?.trim() ? [[t, ifThen[t]!.trim()]] : [])),
        ) as Partial<Record<UrgeTrigger, string>>,
      });
      if (disposedRef.current) return;
      setHabit(saved);
      setOpen(false);
    } catch {
      if (!disposedRef.current) setError("Give the habit a name (and a cost of $0 or more, if you add one).");
    } finally {
      if (!disposedRef.current) setBusy(false);
    }
  }

  if (!open) {
    const summary = habit
      ? `${habit.name}${habit.dailyCostUsd !== undefined ? ` · ${formatUsd(habit.dailyCostUsd)}/day` : ""}`
      : "Not set up";
    return <CollapsibleRow name="QUIT TRACKER" icon={<LineIcon icon={Ban} />} summary={summary} onOpen={beginEdit} />;
  }

  return (
    <div className="equipment-row">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p className="tool-label" style={{ margin: 0 }}>QUIT TRACKER</p>
        <button className="chip" onClick={() => setOpen(false)}>DONE</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label className="meta" htmlFor="quit-habit-name" style={{ display: "block", marginBottom: 4 }}>
            Habit to avoid
          </label>
          <input
            id="quit-habit-name"
            type="text"
            maxLength={60}
            placeholder="e.g. Drinking"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="meta" htmlFor="quit-habit-cost" style={{ display: "block", marginBottom: 4 }}>
            Cost per day ($, optional)
          </label>
          <input
            id="quit-habit-cost"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="meta" htmlFor="quit-habit-plan" style={{ display: "block", marginBottom: 4 }}>
            Post-shift plan (optional, shown in SHIFT DOWN)
          </label>
          <textarea
            id="quit-habit-plan"
            maxLength={280}
            rows={3}
            placeholder="e.g. Shower, eat, text Sam, bed by 9"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <p className="meta" style={{ marginBottom: 4 }}>If-then plans (optional, shown right after you log an urge with that trigger)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {URGE_TRIGGERS.map((trigger) => (
              <div key={trigger}>
                <label className="meta" htmlFor={`quit-if-then-${trigger}`} style={{ display: "block", marginBottom: 4 }}>
                  {describeIfThenPlanLabel(trigger)}
                </label>
                <input
                  id={`quit-if-then-${trigger}`}
                  type="text"
                  maxLength={140}
                  value={ifThen[trigger] ?? ""}
                  onChange={(e) => setIfThen((prev) => ({ ...prev, [trigger]: e.target.value }))}
                  className="input"
                />
              </div>
            ))}
          </div>
        </div>
        {error && <p className="meta" role="alert">{error}</p>}
        <button className="btn-primary" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => void handleSave()}>
          SAVE
        </button>
      </div>
    </div>
  );
}
