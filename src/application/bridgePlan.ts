import { getSchedulePattern } from "./queries";
import { getUnresolvedObligations } from "./intentQueries";
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
  // BRIDGE-MOMENTS-002: an open task due in the next week also reaches the phone, at 16:00 on its day.
  const tasks = await getUnresolvedObligations().catch(() => []);
  for (const t of tasks) {
    if (!t.dueAt || !/^\d{4}-\d{2}-\d{2}$/.test(t.dueAt)) continue;
    const [y, m, d] = t.dueAt.split("-").map(Number) as [number, number, number];
    const at = new Date(y, m - 1, d, 16, 0).getTime();
    if (at > now.getTime() && at - now.getTime() < 8 * 24 * 60 * MIN) moments.push({ at, title: "Due today", text: t.title.slice(0, 120), go: "" });
  }
  return { home, brief: brief.slice(0, 400), moments: moments.filter((m) => m.at > now.getTime()).sort((a, b) => a.at - b.at).slice(0, 24) };
}

/** The SYNC GARMIN link, carrying the plan to the Bridge. */
export function helperSyncUrl(plan?: BridgePlan): string {
  return `intent://sync${plan ? `?plan=${encodeURIComponent(JSON.stringify(plan))}` : ""}#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end`;
}
