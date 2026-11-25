import {
  buildBridgePlan, helperPlanUrl, planBehind, readBridgePlanSettings, readPlanSent, writePlanSent, type BridgePlan,
} from "../application/bridgePlan";

/**
 * GRAYSON-PLAN-FRESH-001 (C7.2): one shared hand-off of the alert plan to Health Bridge, used after SAVE in KEY MOMENT
 * ALERTS, SAVE SCHEDULE and a confirmed schedule change, and by UPDATE ALERTS. Android only; Chrome opens the Bridge
 * only from a tap, so callers run it in the same tap, right after their save succeeds.
 */
export function isAndroidDevice(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

/** BEYOND's own address, the plan's `home`. */
export function beyondHome(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

/** Where a Bridge too old for the plan link sends Chrome: KEY MOMENT ALERTS, saying to update the Bridge. */
export function bridgeUpdateFallback(): string {
  return `${beyondHome()}?bridge=update`;
}

function savedBrief(): string {
  try { return (JSON.parse(localStorage.getItem("beyond.alfredBrief") ?? "null") as { text?: string } | null)?.text ?? ""; } catch { return ""; }
}

/** The plan as it would be handed over right now: the same one SYNC GARMIN carries. */
export function currentBridgePlan(now = new Date()): Promise<BridgePlan> {
  return buildBridgePlan(beyondHome(), savedBrief(), now);
}

/** How a Bridge link is opened. One place, so a browser test can watch it instead of leaving the page. */
export const bridgeLinks = { open: (url: string): void => { window.location.assign(url); } };

/** Opens the update link and records the hand-off. */
export function sendPlanToPhone(plan: BridgePlan, open: (url: string) => void = (url) => bridgeLinks.open(url)): void {
  writePlanSent(plan);
  open(helperPlanUrl(plan, bridgeUpdateFallback()));
}

/**
 * After a save: when he's on Android, hasn't turned "Update the phone when I save here" off, and the plan differs from
 * the one last handed over, hand it over. Returns whether it did. Never throws: the save already succeeded.
 */
export async function handPlanToPhone(open?: (url: string) => void): Promise<boolean> {
  try {
    if (!isAndroidDevice() || !readBridgePlanSettings().updateOnSave) return false;
    const plan = await currentBridgePlan();
    if (!planBehind(plan, readPlanSent())) return false;
    sendPlanToPhone(plan, open);
    return true;
  } catch { return false; }
}

/** The Bridge sent him back here because it's too old for the plan link. Kept for this visit only. */
const OUTDATED = "beyond.bridgePlan.outdated";
export function markBridgeOutdated(): void { try { sessionStorage.setItem(OUTDATED, "1"); } catch { /* the screen just won't say it */ } }
export function bridgeOutdated(): boolean { try { return sessionStorage.getItem(OUTDATED) === "1"; } catch { return false; } }
