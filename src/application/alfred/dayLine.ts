import { getDaySummaries } from "../dayLedgerQueries";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const hm = (minutes: number) => `${Math.floor(minutes / 60)}h${String(Math.round(minutes % 60)).padStart(2, "0")}`;

type DaySummary = Awaited<ReturnType<typeof getDaySummaries>>[number];
/** One lived day as a line Alfred can cite (shared with ALFRED-004's get_days). */
export function dayLine(s: DaySummary): string {
  const sets = s.workouts.reduce((n, w) => n + (w.setsLogged ?? 0), 0);
  return `- ${day(s.livedDayStart)}: ${s.work.declared}${s.work.declared !== s.work.scheduled ? ` (scheduled ${s.work.scheduled})` : ""}; sleep ${s.sleep.primaryMinutes !== undefined ? hm(s.sleep.primaryMinutes) : "-"}${s.sleep.napMinutes ? ` + nap ${hm(s.sleep.napMinutes)}` : ""}; protein ${s.proteinG !== undefined ? Math.round(s.proteinG) + " g" : "-"}; kcal ${s.kcal !== undefined ? Math.round(s.kcal) : "-"}; water ${s.waterOz !== undefined ? Math.round(s.waterOz) + " oz" : "-"}; check-in ${s.checkIn?.capacity ?? "-"}; workouts ${s.workouts.length ? `${s.workouts.length} (${sets} sets)` : "-"}; urges ${s.urges.length}; clean day ${s.cleanDay ? "yes" : "-"}.`;
}

