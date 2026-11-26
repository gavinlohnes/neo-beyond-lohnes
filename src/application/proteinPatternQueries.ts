import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { DEFAULT_PROTEIN_HEADSUP, proteinHeadsUp, type ProteinDay, type ProteinHeadsUp, type ProteinHeadsUpSettings } from "../engine/proteinPattern";
import { getDaySummaries } from "./dayLedgerQueries";
import { getEffectiveProteinTargetG, getNutritionTargets } from "./nutritionTargetQueries";
import { saveNutritionTargets, type NutritionTargetsSave } from "./nutritionTargetCommands";

/**
 * GRAYSON-PROTEIN-HEADSUP-001: read only, plus his THAT'S FINE and his settings. Per-day protein comes from the day
 * ledger (protein logs plus meal protein); a day counts when it's finished and has at least one meal logged (`kcal`
 * present, the burn estimate's rule). Days marked "Not fully logged" leave it once MISSION-REVIEW-001 slice A lands
 * (`partialDayIds`, passed in by the caller when that exists).
 */
export function settingsOf(raw: ProteinHeadsUpSettings | undefined): ProteinHeadsUpSettings {
  return raw ? { ...raw } : { ...DEFAULT_PROTEIN_HEADSUP };
}

export async function getProteinHeadsUp(now: Date = new Date(), partialDayIds: ReadonlySet<string> = new Set(),
  /** The weekly numbers state the week's fact even when BODY's line was put to rest with THAT'S FINE. */
  options: { ignoreQuiet?: boolean } = {}): Promise<ProteinHeadsUp | null> {
  const [targets, targetG, summaries] = await Promise.all([getNutritionTargets(), getEffectiveProteinTargetG(), getDaySummaries()]);
  const { dismissedAt: _quiet, ...rest } = settingsOf(targets.proteinHeadsUp);
  const settings: ProteinHeadsUpSettings = options.ignoreQuiet ? rest : settingsOf(targets.proteinHeadsUp);
  if (!settings.on || targetG === undefined) return null;
  const today = mostRecentBoundaryAtOrBefore(now).getTime();
  const counted: ProteinDay[] = summaries
    .filter((d) => d.endedAt !== undefined && d.kcal !== undefined && Date.parse(d.livedDayStart) < today && !partialDayIds.has(d.beyondDayId))
    .map((d) => ({ beyondDayId: d.beyondDayId, livedDayStart: d.livedDayStart, proteinG: d.proteinG ?? 0 }));
  return proteinHeadsUp(counted, targetG, settings, now);
}

/** THAT'S FINE: quiet for 7 days, with the targets save's UNDO. */
export async function dismissProteinHeadsUp(now: Date = new Date()): Promise<NutritionTargetsSave> {
  const settings = settingsOf((await getNutritionTargets()).proteinHeadsUp);
  return saveNutritionTargets({ proteinHeadsUp: { ...settings, dismissedAt: now.toISOString() } });
}

/** His switch and numbers, from MORE · Nutrition targets. */
export async function saveProteinHeadsUpSettings(next: Omit<ProteinHeadsUpSettings, "dismissedAt">): Promise<NutritionTargetsSave> {
  const current = settingsOf((await getNutritionTargets()).proteinHeadsUp);
  return saveNutritionTargets({ proteinHeadsUp: { ...next, ...(current.dismissedAt ? { dismissedAt: current.dismissedAt } : {}) } });
}
