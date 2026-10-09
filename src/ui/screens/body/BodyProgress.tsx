import { useEffect, useRef, useState } from "react";
import { getWeeklySummary, type WeeklySummary } from "../../../application/weeklyQueries";
import type { WeighIn } from "../../../application/bodyTrendQueries";
import { describePersonalRecord } from "../../../application/personalRecordQueries";
import { FieldDisclosure } from "../../components/FieldDisclosure";
import { Ribbon } from "../weekly/Ribbon";
import { PersonalBaselines } from "../weekly/PersonalBaselines";
import { WeightTrend } from "./WeightTrend";
import { TransformationTimeline } from "./TransformationTimeline";
import { formatUsd } from "./quitCopy";

export function BodyProgress({ refreshKey, weightHistory, goalWeightLbs }: {
  refreshKey: number;
  weightHistory: readonly WeighIn[];
  goalWeightLbs?: number | undefined;
}) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const restoreRetryFocus = useRef(false);
  const [usualOpen, setUsualOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  useEffect(() => {
    let current = true;
    setFailed(false);
    setSummary(null);
    void getWeeklySummary().then((next) => { if (current) setSummary(next); }).catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [refreshKey, retry]);
  useEffect(() => {
    if (!summary || !restoreRetryFocus.current) return;
    restoreRetryFocus.current = false;
    if (document.activeElement === document.body) document.getElementById("health-progress-heading")?.focus({ preventScroll: true });
  }, [summary]);
  if (failed) return <div role="alert"><p className="meta">Could not read your progress. Your records are unchanged.</p><button className="btn-secondary" onClick={() => { restoreRetryFocus.current = true; setRetry((value) => value + 1); }}>RETRY PROGRESS</button></div>;
  if (!summary) return <p className="meta" role="status">Loading your recorded progress…</p>;
  return <div className="health-progress">
    <p className="meta">Existing records, not a score. The weekly summary uses the last 7 days; the ribbon shows 28 lived days.</p>
    <section aria-label="Training accomplishments"><h3 className="tool-label">TRAINING</h3>
      <p className="health-reading">{summary.training.workouts} {summary.training.workouts === 1 ? "workout" : "workouts"} · {summary.training.records.length} {summary.training.records.length === 1 ? "PR" : "PRs"}</p>
      {summary.training.records.map((record) => <p className="meta" key={record.exerciseName}>{record.exerciseName}: {describePersonalRecord(record.record).replace("NEW PR — ", "")}</p>)}
    </section>
    {summary.quit && <section aria-label="Recorded clean days"><h3 className="tool-label">{summary.quit.habitName}</h3><p className="health-reading">{summary.quit.cleanDays} clean days recorded this week</p>{summary.quit.savedUsd !== undefined && <p className="meta">{formatUsd(summary.quit.savedUsd)} saved</p>}</section>}
    <section aria-label="Recent lived days"><h3 className="tool-label">LAST 28 DAYS</h3><Ribbon dayPicker days={summary.ribbon.days} templateLabels={summary.ribbon.templateLabels} proteinTargetG={summary.ribbon.proteinTargetG} /></section>
    <section aria-label="Weight progress"><h3 className="tool-label">WEIGHT</h3>{weightHistory.length < 2 ? <p className="meta">{weightHistory.length ? "One weigh-in recorded. A trend needs more than one." : "No weigh-ins recorded. Your other progress is still available."}</p> : <WeightTrend history={weightHistory} goalWeightLbs={goalWeightLbs} hideChart={timelineOpen} />}</section>
    <FieldDisclosure summary={`${timelineOpen ? "HIDE" : "SHOW"} ACCOMPLISHMENT TIMELINE`} open={timelineOpen} onToggle={setTimelineOpen}>{timelineOpen && <TransformationTimeline />}</FieldDisclosure>
    <FieldDisclosure summary={`${usualOpen ? "HIDE" : "SHOW"} YOUR USUAL`} open={usualOpen} onToggle={setUsualOpen}><PersonalBaselines baselines={summary.baselines} /></FieldDisclosure>
  </div>;
}
