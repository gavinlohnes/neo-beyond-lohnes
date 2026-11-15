import { useState } from "react";
import { saveNutritionTargets } from "../../../application/nutritionTargetCommands";
import { MAX_ABOVE_KCAL, MAX_BELOW_KCAL, MAX_WEEKLY_STEP_KCAL, WEIGHT_MAX_AGE_DAYS, type CalorieProposal as Proposal, type CurrentWeight } from "../../../application/targetProposal";

/**
 * TARGET-PROPOSAL-001 (Gavin, 2026-11-14: "Approved"): CALORIES FOR THIS WEEK in the weekly check-in. BEYOND offers a
 * calorie target from your burn estimate and your own goal weight and weekly rate; SAVE writes it through the existing
 * targets save (with UNDO), KEEP changes nothing. Nothing is stored about the choice, and Weekly is opened on purpose,
 * so it never nags. Words follow GARMIN-005: no deficit, surplus, net, remaining or "left".
 */
const kcal = (n: number) => Math.round(n).toLocaleString("en-US");
const lb = (n: number) => `${Math.abs(n).toFixed(1)} lb`;

export function describeProposalWaiting(reason: Extract<Proposal, { kind: "WAITING" }>["reason"]): string {
  switch (reason) {
    case "ESTIMATE": return "A proposal needs your burn estimate first (see EXPENDITURE above).";
    case "NO_GOAL": return "Set a goal weight in TARGETS and BEYOND will propose a calorie target here each week.";
    case "NO_WEIGHT": return `A proposal needs a weigh-in from the last ${WEIGHT_MAX_AGE_DAYS} days.`;
    case "NO_RATE": return "Set how fast you want your weight to change (% of bodyweight a week) in TARGETS and BEYOND will propose a calorie target here.";
  }
}

/** Where the current weight came from, so an old or single weigh-in is never hidden. */
export function describeWeight(w: CurrentWeight): string {
  return `Current weight ${w.lbs.toFixed(1)} lb, ${w.basis === "WEEK_AVERAGE" ? "this week's average" : `your weigh-in on ${new Date(w.at!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}.`;
}

export function describeProposal(p: Extract<Proposal, { kind: "PROPOSAL" }>): string {
  const from = `From your burn estimate (${kcal(p.maintenance.lowKcal)}–${kcal(p.maintenance.highKcal)} a day)`;
  const aim = p.direction === "HOLD"
    ? `and your goal of ${kcal(p.goalWeightLbs)} lb: you're within a pound of it, so this holds your weight`
    : `and your aim: ${p.direction === "LOSE" ? "lose" : "gain"} ${p.ratePercent}% of your bodyweight a week toward ${kcal(p.goalWeightLbs)} lb`;
  // Review of #532: say the change the aim's number actually gives, with its direction; under a high floor it can be
  // steady or the other way from the aim, and the words must say so.
  const change = Math.abs(p.weeklyLbs) < 0.05 ? "about steady" : `about ${lb(p.weeklyLbs)} a week ${p.weeklyLbs < 0 ? "down" : "up"}`;
  const against = p.direction !== "HOLD" && Math.abs(p.weeklyLbs) >= 0.05 && (p.weeklyLbs < 0) !== (p.direction === "LOSE");
  const result = p.direction === "HOLD" ? "" : ` At ${kcal(p.aimKcal)} a day that's ${change}${against ? ", not toward your goal" : ""}.`;
  const notes = [
    p.limits.includes("BELOW_CAP") && `Your rate would be about ${lb(p.rateLbs)} a week; BEYOND caps it at ${kcal(MAX_BELOW_KCAL)} kcal a day under your burn.`,
    p.limits.includes("ABOVE_CAP") && `Your rate would be about ${lb(p.rateLbs)} a week; BEYOND caps it at ${kcal(MAX_ABOVE_KCAL)} kcal a day over your burn.`,
    p.limits.includes("FLOOR") && `Your floor is ${kcal(p.floorKcal)} kcal a day (set in TARGETS), so it goes no lower.`,
    p.limits.includes("UNDER_FLOOR") && `Your target is under your floor of ${kcal(p.floorKcal)}, so this starts from the floor.`,
    p.limits.includes("STEP") && `Your aim works out to about ${kcal(p.aimKcal)}; BEYOND moves a target at most ${MAX_WEEKLY_STEP_KCAL} kcal a week${p.limits.includes("UNDER_FLOOR") ? ", starting from your floor" : ""}.`,
  ].filter(Boolean).join(" ");
  return `${from} ${aim}.${result} ${describeWeight(p.weight)}${notes ? ` ${notes}` : ""} ${p.currentKcal !== undefined ? `Your target now: ${kcal(p.currentKcal)}.` : "You have no calorie target yet."}`;
}

type Outcome = { kind: "SAVED"; kcal: number; undo: () => Promise<boolean> } | { kind: "UNDONE" } | { kind: "KEPT" } | { kind: "ERROR"; message: string };

export function CalorieProposal({ proposal }: { proposal: Proposal }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  if (proposal.kind === "WAITING") return <p className="meta" data-calorie-proposal="waiting" style={{ margin: 0 }}>{describeProposalWaiting(proposal.reason)}</p>;
  if (proposal.kind === "FITS") {
    return <p className="meta" data-calorie-proposal="fits" style={{ margin: 0 }}>
      Your target of {kcal(proposal.currentKcal)} kcal a day already fits {proposal.floorHeld ? `your floor of ${kcal(proposal.aimKcal)}` : proposal.direction === "HOLD" ? `holding your weight at ${kcal(proposal.goalWeightLbs)} lb` : `your aim toward ${kcal(proposal.goalWeightLbs)} lb`}. Nothing to change this week.
    </p>;
  }
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await saveNutritionTargets({ calorieTargetKcal: proposal.kcal });
      setOutcome({ kind: "SAVED", kcal: proposal.kcal, undo: result.undo });
    } catch { setOutcome({ kind: "ERROR", message: "Couldn't save the target. Nothing changed." }); }
    finally { setBusy(false); }
  };
  const undo = async (fn: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    try { setOutcome((await fn()) ? { kind: "UNDONE" } : { kind: "ERROR", message: "The target was changed again since, so UNDO did nothing." }); }
    catch { setOutcome({ kind: "ERROR", message: "Couldn't undo. Your target is as saved." }); }
    finally { setBusy(false); }
  };

  return <div data-calorie-proposal="proposal">
    <p className="recommendation-title" style={{ marginBottom: 2 }}>About {kcal(proposal.kcal)} kcal a day</p>
    <p className="meta" style={{ margin: 0 }}>{describeProposal(proposal)}</p>
    {outcome === null || outcome.kind === "ERROR" ? <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void save()}>SAVE {kcal(proposal.kcal)}</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => setOutcome({ kind: "KEPT" })}>
          {proposal.currentKcal !== undefined ? `KEEP ${kcal(proposal.currentKcal)}` : "NOT NOW"}</button>
      </div>
      <p className="meta" style={{ margin: "6px 0 0" }}>{outcome?.kind === "ERROR" ? <span role="alert">{outcome.message}</span> : "Your choice: nothing changes until you save."}</p>
    </> : <div role="status" style={{ marginTop: 10 }}>
      {outcome.kind === "SAVED" ? <p className="meta" style={{ margin: 0 }}>Saved. Your calorie target is now {kcal(outcome.kcal)} kcal a day.{" "}
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void undo(outcome.undo)}>UNDO</button></p>
        : outcome.kind === "UNDONE" ? <p className="meta" style={{ margin: 0 }}>Undone. Your target is back as it was.</p>
        : <p className="meta" style={{ margin: 0 }}>{proposal.currentKcal !== undefined ? `Kept ${kcal(proposal.currentKcal)} kcal a day.` : "No target set."} Nothing changed.</p>}
    </div>}
  </div>;
}
