import { getSchedulePattern } from "./queries";
import { livedDayShiftWindow } from "../engine/scheduledContext";

/**
 * BRIDGE-MOMENTS-001 (owner go 2026-10-31, ideas 12 and 13): what BEYOND hands Health Bridge on each
 * SYNC GARMIN tap, so the phone can speak at the key moments and show Alfred's brief on the home screen
 * without BEYOND open. Read only; the Bridge keeps nothing else. Moments come from the saved schedule.
 */
export interface BridgeMoment { at: number; title: string; text: string; go: string }
export interface BridgePlan { home: string; brief: string; moments: BridgeMoment[] }

const MIN = 60_000;

export async function buildBridgePlan(home: string, brief: string, now = new Date()): Promise<BridgePlan> {
  const pattern = await getSchedulePattern();
  const shifts = new Map<number, { start: Date; end: Date }>();
  for (let d = 0; d <= 7; d++) {
    const livedDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d - 1, 16, 30);
    const shift = livedDayShiftWindow(livedDay, pattern);
    if (shift) shifts.set(shift.start.getTime(), shift);
  }
  const moments: BridgeMoment[] = [];
  for (const { start, end } of [...shifts.values()].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    moments.push(
      { at: start.getTime() - 180 * MIN, title: "Up for the shift?", text: "Log your sleep; Alfred's brief is on TODAY.", go: "" },
      { at: start.getTime() - 30 * MIN, title: "Shift in 30 minutes", text: "Eat, water, and mark STARTED WORK when you're in.", go: "" },
      { at: end.getTime(), title: "Shift's done", text: "Tap to debrief with Alfred: say how it went.", go: "?alfred=debrief" },
    );
  }
  return { home, brief: brief.slice(0, 400), moments: moments.filter((m) => m.at > now.getTime()).slice(0, 24) };
}

/** The SYNC GARMIN link, carrying the plan to the Bridge. */
export function helperSyncUrl(plan?: BridgePlan): string {
  return `intent://sync${plan ? `?plan=${encodeURIComponent(JSON.stringify(plan))}` : ""}#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end`;
}
