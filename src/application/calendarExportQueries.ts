import { buildCalendarExport } from "./calendarExport";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { getSchedulePattern } from "./queries";

export async function getCalendarExport(options: { weeks: 4 | 8; includePlans: boolean }, now = new Date()) {
  const [pattern, obligations] = await Promise.all([
    getSchedulePattern(),
    options.includePlans ? getCurrentlyEligibleUnresolvedObligations() : Promise.resolve([]),
  ]);
  return buildCalendarExport({ ...options, now, pattern, obligations });
}
