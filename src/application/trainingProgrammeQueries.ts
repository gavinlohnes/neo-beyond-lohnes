import { getTrainingProgramme } from "./trainingProgramme";
import { getCustomTemplates } from "./customTemplateQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getSchedulePattern } from "./queries";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { resolveProgrammeSlot } from "../engine/trainingProgrammeResolution";
import { WORKOUT_TEMPLATE_ORDER } from "../domain/workout/types";

export async function getProgrammeView(now = new Date()) {
  const [revision, custom, summaries, schedule] = await Promise.all([getTrainingProgramme(), getCustomTemplates(), getDaySummaries(), getSchedulePattern()]);
  const date = mostRecentBoundaryAtOrBefore(now);
  const context = (day: Date): "WORK" | "OFF" => {
    const recorded = summaries.filter((s) => s.livedDayStart === day.toISOString()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const latest = recorded[0];
    return latest && latest.work.declared !== "UNKNOWN" ? latest.work.declared : scheduledWorkContextForLivedDay(day, schedule);
  };
  const actual = summaries.filter((s) => s.livedDayStart === date.toISOString()).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const forecast = !actual || actual.work.declared === "UNKNOWN" || actual.work.declaredSource !== "MANUAL";
  const rotationAvailable = isOperatorSavedSchedule(schedule);
  const planned = revision.programme?.mode === "ROTATION" && !rotationAvailable ? { key: null, templateId: null } : resolveProgrammeSlot(revision.programme, date, context);
  const templates = [...WORKOUT_TEMPLATE_ORDER.map((id) => ({ id, name: `Workout ${id}` })), ...custom.map((t) => ({ id: t.id, name: t.name }))];
  return { revision, templates, planned, forecast, rotationAvailable, date: formatLocalDate(date) };
}
