import { createContext } from "react";
import { getActiveDay, getLatestRecommendation, getRecommendationDecision, getSchedulePattern } from "../application/queries";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { readBootPhase } from "./screens/today/bootMode";
import { MODE_NAMES, predictedWorkPhase } from "./screens/today/shiftClock";
import { describeShiftRun, shiftRun } from "../application/shiftRun";
import { nextGoogleCalendarEvent } from "../application/googleCalendar";
import { getConfirmedKinds } from "../application/scheduleExceptions";

/**
 * PRESENCE-001 (#373 item 2): one shift-aware line under every screen's title (IDENTIFY → ORIENT →
 * KNOW → ACT). The mode is TODAY's own derivation (bootMode, a pin included); times come from the saved
 * schedule and say "scheduled"; "Next" is the Engine's own latest recommendation, unchanged, and goes to
 * TODAY. Read-only: nothing is stored or inferred, and an unanswered work context stays unknown.
 */
export interface Presence { mode: string; when: string | null; next: string | null; /** SHIFT-RUN-001: "scheduled: night 2 of 3 · next day off Thu". */ run?: string | null; /** Read-only primary-calendar context; never Engine input. */ calendar?: string | null }
export const PresenceContext = createContext<{ presence: Presence | null; openToday: () => void } | null>(null);

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
function until(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

export async function readPresence(now = new Date()): Promise<Presence | null> {
  const day = await getActiveDay();
  if (!day) return { mode: "NO DAY STARTED", when: null, next: null };
  const [phase, schedule, rec, confirmed] = await Promise.all([readBootPhase(now), getSchedulePattern(), getLatestRecommendation(day.id), getConfirmedKinds()]);
  const window = day.workContext === "OFF" ? null : livedDayShiftWindow(new Date(day.startedAt), schedule);
  let when: string | null = null;
  // NIGHT-POLISH-001: while the work question is unanswered, say what the schedule predicts, labelled as such.
  if (!phase && day.workContext === "UNKNOWN" && window) {
    const predicted = predictedWorkPhase({ now, workContext: "UNKNOWN", shiftWindow: window, workEnded: false, mainSleepLogged: false });
    if (predicted) when = `schedule says ${MODE_NAMES[predicted]}`;
  }
  if (phase === "PRE_WORK" && window && window.start > now) when = `scheduled shift in ${until(window.start.getTime() - now.getTime())}`;
  else if (phase === "SCHEDULED_SHIFT" && window) when = `scheduled to ${hhmm(window.end)}`;
  // Review of #382: once he has accepted or declined it, TODAY shows the decision; so does this line (by saying nothing).
  const decided = rec && rec.statusAtIssue === "ACTION" ? await getRecommendationDecision(day.id, rec.id) : undefined;
  const next = rec && rec.statusAtIssue === "ACTION" && !decided ? rec.title : null;
  // His own declaration wins: a day he set OFF on a scheduled night (or the reverse) shows no run.
  const scheduled = shiftRun(now, schedule, 21, confirmed);
  const run = scheduled && (day.workContext === "UNKNOWN" || day.workContext === scheduled.kind) ? scheduled : null;
  const calendarEvent = nextGoogleCalendarEvent(now);
  const calendar = calendarEvent ? `calendar: ${calendarEvent.title}${calendarEvent.allDay ? " · all day" : ` · ${new Date(calendarEvent.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}` : null;
  return { mode: phase ? MODE_NAMES[phase] : "MODE NOT SET", when, next, run: run ? `scheduled: ${describeShiftRun(run)}` : null, calendar };
}
