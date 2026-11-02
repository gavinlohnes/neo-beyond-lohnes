import { createContext } from "react";
import { getActiveDay, getLatestRecommendation, getRecommendationDecision, getSchedulePattern } from "../application/queries";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { readBootPhase } from "./screens/today/bootMode";
import { MODE_NAMES } from "./screens/today/shiftClock";

/**
 * PRESENCE-001 (#373 item 2): one shift-aware line under every screen's title (IDENTIFY → ORIENT →
 * KNOW → ACT). The mode is TODAY's own derivation (bootMode, a pin included); times come from the saved
 * schedule and say "scheduled"; "Next" is the Engine's own latest recommendation, unchanged, and goes to
 * TODAY. Read-only: nothing is stored or inferred, and an unanswered work context stays unknown.
 */
export interface Presence { mode: string; when: string | null; next: string | null }
export const PresenceContext = createContext<{ presence: Presence | null; openToday: () => void } | null>(null);

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
function until(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

export async function readPresence(now = new Date()): Promise<Presence | null> {
  const day = await getActiveDay();
  if (!day) return { mode: "NO DAY STARTED", when: null, next: null };
  const [phase, schedule, rec] = await Promise.all([readBootPhase(now), getSchedulePattern(), getLatestRecommendation(day.id)]);
  const window = day.workContext === "OFF" ? null : livedDayShiftWindow(new Date(day.startedAt), schedule);
  let when: string | null = null;
  if (phase === "PRE_WORK" && window && window.start > now) when = `scheduled shift in ${until(window.start.getTime() - now.getTime())}`;
  else if (phase === "SCHEDULED_SHIFT" && window) when = `scheduled to ${hhmm(window.end)}`;
  // Review of #382: once he has accepted or declined it, TODAY shows the decision; so does this line (by saying nothing).
  const decided = rec && rec.statusAtIssue === "ACTION" ? await getRecommendationDecision(day.id, rec.id) : undefined;
  const next = rec && rec.statusAtIssue === "ACTION" && !decided ? rec.title : null;
  return { mode: phase ? MODE_NAMES[phase] : "MODE NOT SET", when, next };
}
