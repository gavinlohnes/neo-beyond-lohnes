import { useEffect, useState } from "react";
import type { WeeklyDashboard } from "../../../application/weeklyDashboardQueries";
import { getWeekInNumbers } from "../../../application/weeklyDebriefQueries";
import { deriveWeekInNumbers, type DebriefMeasure } from "../../../application/weeklyDebrief";
import { Readout, ReadoutGrid } from "../../components/ReadoutGrid";
const display = (m: DebriefMeasure, unit: string, digits = 1) => m.average === null ? "Not recorded" : `${m.average.toFixed(digits)} ${unit}`;
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export function WeekInNumbers({ dashboard }: { dashboard: WeeklyDashboard }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getWeekInNumbers>> | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const numbers = deriveWeekInNumbers(dashboard.rows, []);
  const weight = dashboard.headline.weight;
  useEffect(() => {
    let current = true; setData(null); setError(false);
    void getWeekInNumbers(dashboard).then((result) => { if (current) setData(result); }).catch(() => { if (current) setError(true); });
    return () => { current = false; };
  }, [dashboard, retry]);
  return <section aria-label="Week in numbers"><h3 className="tool-label">WEEK IN NUMBERS</h3>
    <p className="meta">Free facts from this finished Monday–Sunday lived week (16:30 boundaries). Missing logs are not zero. Targets below are your current settings.</p>
    <ReadoutGrid className="weekly-dashboard__metrics">
      <Readout label="SLEEP / AVERAGE" value={display(numbers.sleep, "h")} detail={<>{display(numbers.workSleep, "h")} work · {display(numbers.offSleep, "h")} off · {numbers.sleep.days} days<br />Work nights: {numbers.workSleep.days} of 7 days logged · Days off: {numbers.offSleep.days} of 7 days logged. Unknown work context is not assigned.</>} />
      <Readout label="PROTEIN / AVERAGE" value={display(numbers.protein, "g", 0)} detail={`${numbers.protein.days} of 7 days logged${data?.targets.proteinG ? ` · current target ${data.targets.proteinG}g` : data ? " · no protein target" : ""}`} />
      <Readout label="TRAINING" value={`${data?.training.sessions ?? dashboard.headline.sessions} ${(data?.training.sessions ?? dashboard.headline.sessions) === 1 ? "session" : "sessions"}`} detail={data ? `${data.training.sets} performed sets · ${data.training.volume.toLocaleString("en-US")} lb × reps · ${data.training.records} PRs · ${data.training.days} of 7 days recorded. Finished or partial sessions.` : "Reading recorded sets and volume…"} />
      <Readout label="WEIGHT CHANGE" value={weight ? `${weight.change > 0 ? "+" : ""}${weight.change.toFixed(1)} lb` : "Not enough"} detail={<>{weight ? `${dateLabel(weight.firstDay)} to ${dateLabel(weight.lastDay)}, first to last recorded` : "Needs two weighed days this week"}<br />{numbers.weight.weighIns} weigh-ins on {numbers.weight.days} of 7 days</>} />
      <Readout label="CALORIES / AVERAGE" value={display(numbers.calories, "kcal", 0)} detail={`${numbers.calories.days} of 7 days logged${data?.targets.calories ? ` · current target ${data.targets.calories} kcal` : data ? " · no calorie target" : ""}`} />
      <Readout label="WATER / AVERAGE" value={display(numbers.water, "oz")} detail={`${numbers.water.days} of 7 days logged`} />
      {data && <><Readout label="COMMITMENTS" value={`${data.commitments.done} completed`} detail={`Completed on ${data.commitments.days} of 7 days · ${data.commitments.open} eligible commitments still open now`} />
      <Readout label="SHIFTS" value={`${data.shifts.worked} work-ended records`} detail={`Work ended on ${data.shifts.worked} of 7 days · ${data.shifts.scheduled === null ? "no saved schedule" : `${data.shifts.scheduled} scheduled from your current saved schedule`} · ${data.shifts.recordedDays} of 7 days have completed records. A missing work-ended record does not mean a shift wasn't worked.`} /></>}
    </ReadoutGrid>
    <p className="meta">Averages cover logged days only. Food figures are logged amounts, not verified total intake.</p>
    {error ? <div><p role="alert">The remaining numbers couldn't be read. Your records have not changed.</p><button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY NUMBERS</button></div> : !data ? <p role="status">Reading recorded numbers…</p> : <p className="meta">{data.comparison}</p>}
  </section>;
}
