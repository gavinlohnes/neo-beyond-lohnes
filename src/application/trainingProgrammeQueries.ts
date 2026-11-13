import { getTrainingProgramme } from "./trainingProgramme";
import { getCustomTemplates } from "./customTemplateQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getSchedulePattern } from "./queries";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { resolveProgrammeSlot } from "../engine/trainingProgrammeResolution";
import { WORKOUT_TEMPLATE_ORDER } from "../domain/workout/types";
import { recordedBy, resolveWorkContext } from "./workContextResolution";
import { getConfirmedExceptions } from "./scheduleExceptions";

export async function getProgrammeView(now = new Date()) {
  const [revision, custom, summaries, schedule, exceptions] = await Promise.all([getTrainingProgramme(), getCustomTemplates(), getDaySummaries(), getSchedulePattern(), getConfirmedExceptions()]);
  const date = mostRecentBoundaryAtOrBefore(now);
  // CONTEXT-INTEGRATION-001: the shared rule, recorded first, then the saved rotation. Rotation mode is offered only with a
  // saved schedule (below), so an unknown day never reaches it as WORK or OFF.
  const context = (day: Date): "WORK" | "OFF" => {
    const recorded = summaries.filter((s) => s.livedDayStart === day.toISOString()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const latest = recorded[0];
    const resolved = resolveWorkContext(day, schedule, latest && latest.work.declared !== "UNKNOWN"
      ? { kind: latest.work.declared, by: recordedBy(latest.work.declaredSource) } : null,
      exceptions.get(formatLocalDate(day))?.kind);
    return resolved.kind ?? scheduledWorkContextForLivedDay(day, schedule);
  };
  const actual = summaries.filter((s) => s.livedDayStart === date.toISOString()).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const forecast = !actual || actual.work.declared === "UNKNOWN" || actual.work.declaredSource !== "MANUAL";
  const rotationAvailable = isOperatorSavedSchedule(schedule);
  const planned = revision.programme?.mode === "ROTATION" && !rotationAvailable ? { key: null, templateId: null } : resolveProgrammeSlot(revision.programme, date, context);
  const templates = [...WORKOUT_TEMPLATE_ORDER.map((id) => ({ id, name: `Workout ${id}` })), ...custom.map((t) => ({ id: t.id, name: t.name }))];
  return { revision, templates, planned, forecast, rotationAvailable, date: formatLocalDate(date) };
}
