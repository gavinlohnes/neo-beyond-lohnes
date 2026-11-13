import { deriveAhead, type AheadReading } from "./ahead";
import { deriveLifeState, getRecordedYesterday, lifeStateInput, type LifeStateReading } from "./lifeState";
import { getActiveDay, getSchedulePattern, getWorkContextSource } from "./queries";
import { getConfirmedKinds } from "./scheduleExceptions";
import { getWeekAhead } from "./weekAheadQueries";
import { recordedBy } from "./workContextResolution";

/**
 * OPERATOR-EXPERIENCE-001 slice 2: TODAY's NOW and NEXT, read the same way TODAY's band reads them, for Alfred's context
 * and the free helper, so "why is TODAY showing this?" gets the deterministic answer, with its sources. Read only; no
 * advice (the Engine's recommendation is separate and unchanged). Null without a started lived day.
 */
export interface TodayPicture { now: LifeStateReading | null; next: AheadReading | null }

export async function getTodayPicture(now: Date = new Date()): Promise<TodayPicture | null> {
  const day = await getActiveDay();
  if (!day) return null;
  const [pattern, source, yesterday, confirmed, week] = await Promise.all([
    getSchedulePattern(), getWorkContextSource(day.id), getRecordedYesterday(now), getConfirmedKinds(), getWeekAhead(now),
  ]);
  const recorded = day.workContext === "UNKNOWN" ? null : day.workContext;
  const input = lifeStateInput(now, pattern, recorded, yesterday, source ? recordedBy(source) : undefined, confirmed);
  return { now: deriveLifeState(input), next: deriveAhead(now, input.today.recorded ?? input.today.scheduled, week.days) };
}

/** Plain words for Alfred's context and the free helper. */
export function describeTodayPicture(picture: TodayPicture): string {
  const parts: string[] = [];
  parts.push(picture.now ? `${picture.now.label}: ${picture.now.line} Why: ${picture.now.why.join(" ")}` : "No operating state: today's work context isn't recorded and there's no saved schedule.");
  if (picture.next) parts.push(`NEXT: ${picture.next.line}. ${picture.next.why}`);
  return parts.join(" ");
}
